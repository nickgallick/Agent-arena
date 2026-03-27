import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateConnector } from '@/lib/auth/authenticate-connector'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

const eventTypeEnum = z.enum([
  // Existing
  'code_write',
  'tool_call',
  'thinking',
  'error',
  'file_created',
  'test_run',
  'status_change',
  'submitted',
  // Phase 2: structured telemetry events
  'checkpoint',      // agent explicitly checkpointing state
  'pivot',           // agent changing strategy
  'hypothesis',      // agent forming a hypothesis
  'revert',          // agent reverting a change
  'retry',           // agent retrying a failed action
  'recovery_start',  // agent beginning recovery from error
  'recovery_end',    // agent completed recovery
  'phase_change',    // explicit phase transition: explore|plan|implement|verify|recover
])

const eventSchema = z.object({
  event_type: eventTypeEnum,
  timestamp_ms: z.number().positive(),
  data: z.record(z.string(), z.unknown()),
  // Optional structured fields (can be top-level or nested in data)
  tool: z.string().optional(),
  phase: z.enum(['explore', 'plan', 'implement', 'verify', 'recover']).optional(),
  tokens: z.number().int().positive().optional(),
  duration_ms: z.number().int().positive().optional(),
  success: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

const eventsBodySchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID'),
  events: z.array(eventSchema).min(1).max(50),
})

export async function POST(request: Request) {
  try {
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const rl = await rateLimit(`connector-events:${agent.id}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = eventsBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { challenge_id, events } = parsed.data
    const supabase = createAdminClient()

    // Find entry for agent + challenge
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select('id')
      .eq('challenge_id', challenge_id)
      .eq('agent_id', agent.id)
      .single()

    if (entryError || !entry) {
      return NextResponse.json({ error: 'No entry found for this challenge' }, { status: 404 })
    }

    // Insert all events — structured fields merged into event_data for trigger enrichment
    const rows = events.map((evt) => ({
      entry_id: entry.id,
      challenge_id,
      agent_id: agent.id,
      event_type: evt.event_type,
      timestamp_ms: evt.timestamp_ms,
      // Merge top-level structured fields into event_data so trigger can enrich
      event_data: {
        ...evt.data,
        ...(evt.tool        !== undefined && { tool: evt.tool }),
        ...(evt.phase       !== undefined && { phase: evt.phase }),
        ...(evt.tokens      !== undefined && { tokens: evt.tokens }),
        ...(evt.duration_ms !== undefined && { duration_ms: evt.duration_ms }),
        ...(evt.success     !== undefined && { success: evt.success }),
        ...(evt.confidence  !== undefined && { confidence: evt.confidence }),
      },
    }))

    const { error: insertError } = await supabase
      .from('replay_events')
      .insert(rows)

    if (insertError) {
      console.error('[api/connector/events POST] Insert error:', insertError.message)
      return NextResponse.json({ error: 'Failed to insert events' }, { status: 500 })
    }

    return NextResponse.json({ received: events.length })
  } catch (err) {
    console.error('[api/connector/events POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
