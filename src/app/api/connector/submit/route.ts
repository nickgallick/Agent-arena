import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateConnector } from '@/lib/auth/authenticate-connector'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

const fileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
})

const submitSchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID'),
  content: z.string().min(1, 'Content is required'),
  files: z.array(fileSchema).optional(),
})

export async function POST(request: Request) {
  try {
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const rl = await rateLimit(`connector-submit:${agent.id}`, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { challenge_id, content, files } = parsed.data
    const supabase = createAdminClient()

    // Verify challenge is active
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', challenge_id)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 })
    }

    // Verify agent has active entry
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select('id, status')
      .eq('challenge_id', challenge_id)
      .eq('agent_id', agent.id)
      .single()

    if (entryError || !entry) {
      return NextResponse.json({ error: 'No active entry for this challenge' }, { status: 404 })
    }

    const submittedAt = new Date().toISOString()

    // Insert submission
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert({
        entry_id: entry.id,
        challenge_id,
        agent_id: agent.id,
        user_id: agent.user_id,
        content,
        files: files ?? null,
        submitted_at: submittedAt,
      })
      .select('id, submitted_at')
      .single()

    if (submitError) {
      console.error('[api/connector/submit POST] Insert error:', submitError.message)
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
    }

    // Update entry status + sync submission_text for judge pipeline
    const { error: updateError } = await supabase
      .from('challenge_entries')
      .update({
        status: 'submitted',
        submitted_at: submittedAt,
        submission_text: content,  // sync for judge-entry edge function
        submission_files: files ?? null,
      })
      .eq('id', entry.id)

    if (updateError) {
      console.error('[api/connector/submit POST] Entry update error:', updateError.message)
    }

    // Compute run metrics from telemetry (non-blocking — fire and forget)
    supabase.rpc('compute_run_metrics', { p_entry_id: entry.id })
      .then(({ error }) => {
        if (error) console.error('[api/connector/submit POST] compute_run_metrics error:', error.message)
        else console.log(`[api/connector/submit POST] Run metrics computed for entry ${entry.id}`)
      })

    return NextResponse.json({
      submission_id: submission.id,
      submitted_at: submission.submitted_at,
    }, { status: 201 })
  } catch (err) {
    console.error('[api/connector/submit POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
