import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { submissionSchema } from '@/lib/validators/submission'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'
import { authenticateConnectorWithDebug } from '@/lib/auth/authenticate-connector'
import { autoTransitionChallengeStatus, validateChallengeTimeWindow } from '@/lib/utils/challenge-time'

const SUBMITTABLE_STATUSES = ['entered', 'assigned', 'in_progress']

export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const { agent, debug } = await authenticateConnectorWithDebug(request)
    if (!agent) {
      return NextResponse.json({
        error: 'Unauthorized',
        hint: 'Send API key via x-arena-api-key header or Authorization: Bearer aa_xxx',
        debug: {
          key_received: debug?.key_received,
          key_length: debug?.key_length,
          key_prefix: debug?.key_prefix,
          hash_prefix: debug?.hash_prefix,
          source: debug?.source,
          expected_key_length: "67-68",
        },
      }, { status: 401 })
    }

    // Rate limit: 5 submissions per agent per minute (anti-spam)
    const ip = getClientIp(request)
    const rl = await rateLimit(`connector-submit:${agent.id}`, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }
    void ip // used for future rate limiting by IP

    const body = await request.json() as unknown
    const parsed = submissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { entry_id, submission_text, submission_files, transcript, actual_mps } = parsed.data
    const supabase = createAdminClient()

    // Verify the entry belongs to this agent
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select('id, agent_id, user_id, status')
      .eq('id', entry_id)
      .single()

    if (entryError) {
      if (entryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }
      console.error('[v1/submissions POST] Entry lookup error:', entryError.message)
      return NextResponse.json({ error: 'Failed to verify entry' }, { status: 500 })
    }

    if (entry.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!SUBMITTABLE_STATUSES.includes(entry.status)) {
      return NextResponse.json(
        { error: `Entry cannot be submitted from status: ${entry.status}` },
        { status: 409 }
      )
    }

    // Look up the challenge and enforce time window
    const { data: challenge, error: challengeError } = await supabase
      .from('challenge_entries')
      .select('challenge:challenges(id, status, starts_at, ends_at)')
      .eq('id', entry_id)
      .single()

    if (challengeError || !challenge?.challenge) {
      return NextResponse.json({ error: 'Challenge not found for this entry' }, { status: 404 })
    }

    const ch = challenge.challenge as unknown as { id: string; status: string; starts_at: string | null; ends_at: string | null }

    // Auto-transition status if needed
    const currentStatus = await autoTransitionChallengeStatus(supabase, ch)

    // Block if challenge is no longer accepting submissions
    if (currentStatus !== 'active') {
      return NextResponse.json(
        { error: `Challenge is not active (status: ${currentStatus}). Submissions are closed.` },
        { status: 403 }
      )
    }

    // Enforce time window
    const timeError = validateChallengeTimeWindow(ch)
    if (timeError) {
      return NextResponse.json({ error: timeError }, { status: 403 })
    }

    // Direct admin update — service role bypasses RLS, no DB function gate needed
    const { data: submitted, error: submitError } = await supabase
      .from('challenge_entries')
      .update({
        status: 'submitted',
        submission_text: submission_text ?? '',
        submission_files: submission_files ?? null,
        transcript: transcript ?? null,
        actual_mps: actual_mps ?? null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry_id)
      .select('id, status, submitted_at')
      .single()

    if (submitError) {
      console.error('[v1/submissions POST] Submit error:', submitError.message)
      return NextResponse.json({ error: 'Failed to submit entry' }, { status: 500 })
    }

    return NextResponse.json({
      submission_id: submitted.id,
      status: 'submitted',
    })
  } catch (err) {
    console.error('[v1/submissions POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
