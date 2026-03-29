import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateConnectorWithDebug } from '@/lib/auth/authenticate-connector'
import { eventStreamSchema } from '@/lib/validators/event-stream'
import { sanitizeEvent } from '@/lib/utils/sanitize-event'
import { rateLimit } from '@/lib/utils/rate-limit'
import { autoTransitionChallengeStatus, validateChallengeTimeWindow } from '@/lib/utils/challenge-time'

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key → get agent
    const { agent, debug } = await authenticateConnectorWithDebug(request)
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized', debug: { key_received: debug?.key_received, key_length: debug?.key_length, key_prefix: debug?.key_prefix, source: debug?.source, expected_key_length: "67-68" } }, { status: 401 })
    }

    // 2. Server-side rate limit: 30 events/min per agent
    const { success: rateLimitOk } = await rateLimit(`events:${agent.id}`, 30)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // 3. Parse and validate body
    const body = await request.json()
    const parsed = eventStreamSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event data', details: parsed.error.issues[0]?.message },
        { status: 400 }
      )
    }

    const { challengeId, event } = parsed.data
    const supabase = createAdminClient()

    // 4. Verify agent has an active entry in this challenge
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select('id, status')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .in('status', ['entered', 'workspace_open', 'assigned', 'in_progress'])
      .single()

    if (!entry) {
      return NextResponse.json(
        { error: 'Not in active challenge' },
        { status: 403 }
      )
    }

    // Verify the challenge is active and within time window
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, status, starts_at, ends_at')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      )
    }

    // Auto-transition status based on time
    const currentStatus = await autoTransitionChallengeStatus(supabase, challenge)

    if (currentStatus !== 'active') {
      return NextResponse.json(
        { error: `Challenge not active (status: ${currentStatus})` },
        { status: 403 }
      )
    }

    // Enforce time window (block events before starts_at)
    const timeError = validateChallengeTimeWindow(challenge)
    if (timeError) {
      return NextResponse.json({ error: timeError }, { status: 403 })
    }

    // 5. Server-side sanitization (double-check even though connector sanitizes)
    const sanitizedEvent = sanitizeEvent(event)

    // 6. Get next sequence number (via database function for atomicity)
    const { data: seqResult } = await supabase
      .rpc('get_next_seq_num', { p_entry_id: entry.id })

    const seqNum = typeof seqResult === 'number' ? seqResult : 1

    // 7. Insert into live_events table
    const { error: insertError } = await supabase
      .from('live_events')
      .insert({
        challenge_id: challengeId,
        agent_id: agent.id,
        entry_id: entry.id,
        event_type: sanitizedEvent.type,
        event_data: sanitizedEvent,
        seq_num: seqNum,
      })

    if (insertError) {
      console.error('Failed to insert live event:', insertError)
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 })
    }

    // 8. Broadcast to spectators via Supabase Broadcast (NOT Postgres Changes)
    const channel = supabase.channel(`challenge:${challengeId}`)
    await channel.send({
      type: 'broadcast',
      event: 'agent_event',
      payload: {
        agent_id: agent.id,
        entry_id: entry.id,
        event: sanitizedEvent,
        seq_num: seqNum,
      },
    })

    // 9. Return immediately
    return NextResponse.json({ received: true, seq_num: seqNum })
  } catch (err) {
    console.error('Event stream error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
