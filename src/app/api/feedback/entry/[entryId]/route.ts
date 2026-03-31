// GET /api/feedback/entry/[entryId] — load or trigger feedback by entry_id
// Forge · 2026-03-31

// Vercel route config: 120s max duration for synchronous LLM pipeline
export const maxDuration = 120
//
// Proxy that resolves entry_id → submission_id, then delegates to the main pipeline.
// The replay page only has entry_id, so this adapter is required.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'
import { runFeedbackPipeline, loadFeedbackReport } from '@/lib/feedback/pipeline'

const idSchema = z.string().uuid('Invalid entry ID')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId: rawId } = await params
    const parsed = idSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 })
    }
    const entry_id = parsed.data

    const ip = getClientIp(request)
    const rl = await rateLimit(`feedback-entry:${ip}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Auth — owner or admin only
    let user = null
    try { user = await getUser() } catch { /* unauthenticated */ }

    const supabase = createAdminClient()

    // Resolve entry → submission + ownership check
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select('id, user_id, agent_id, challenge_id, status, challenge:challenges(id, title)')
      .eq('id', entry_id)
      .maybeSingle()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const e = entry as Record<string, unknown>

    // Only owner or admin
    if (user?.id !== String(e.user_id ?? '')) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user?.id ?? '').maybeSingle()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    // Entry must be in a judged state
    const judgedStatuses = ['judged', 'scored', 'completed', 'complete']
    if (!judgedStatuses.includes(String(e.status ?? ''))) {
      return NextResponse.json(
        { status: 'pending', message: 'Performance Breakdown will be available after judging completes.' },
        { status: 202 }
      )
    }

    // Get submission_id — find the most recent completed submission for this entry
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, submission_status, environment')
      .eq('entry_id', entry_id)
      .in('submission_status', ['completed', 'judged', 'scored'])
      .neq('environment', 'sandbox')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!submission) {
      return NextResponse.json({ status: 'not_available', message: 'No completed production submission found for this entry.' })
    }

    const s = submission as Record<string, unknown>
    const submission_id = String(s.id)

    // Try to load existing ready report by submission_id
    const existing = await loadFeedbackReport(supabase, submission_id)
    if (existing && existing.status === 'ready') {
      return NextResponse.json({ report: existing })
    }

    // No ready report — trigger generation
    const agent_id = String(e.agent_id ?? '')
    const challenge_id = String(e.challenge_id ?? '')
    const challengeObj = e.challenge as Record<string, unknown> | null
    const challenge_title = challengeObj?.title ? String(challengeObj.title) : null

    if (!agent_id || !challenge_id) {
      return NextResponse.json({ status: 'not_available', message: 'Missing context for feedback generation.' })
    }

    // A2 FIX: Run pipeline synchronously (same reason as /api/feedback/[submissionId]).
    // Fire-and-forget is not reliable on Vercel — function context terminates with the response.
    const result = await runFeedbackPipeline(supabase, {
      submission_id,
      entry_id,
      agent_id,
      challenge_id,
      challenge_title,
    })

    if (result.status === 'ready') {
      const report = await loadFeedbackReport(supabase, submission_id)
      if (report) {
        return NextResponse.json({ report })
      }
    }

    return NextResponse.json(
      { status: 'failed', message: 'Performance Breakdown is temporarily unavailable. Score breakdown is available below.' },
      { status: 202 }
    )

  } catch (err) {
    console.error('[api/feedback/entry/GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
