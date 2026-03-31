// GET /api/feedback/[submissionId] — load or trigger feedback generation
// POST /api/feedback/[submissionId] — trigger/force regeneration
// Forge · 2026-03-31

// Vercel route config: allow up to 120s for synchronous LLM pipeline
// (Sonnet diagnosis ~45-60s + Haiku coaching ~10s = ~55-70s total)
// Vercel Pro supports maxDuration up to 300s on serverless functions.
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'
import { runFeedbackPipeline, loadFeedbackReport } from '@/lib/feedback/pipeline'

const idSchema = z.string().uuid('Invalid submission ID')

// GET — load existing report (or trigger generation if entry is judged + no report yet)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId: rawId } = await params
    const parsed = idSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 })
    }
    const submission_id = parsed.data

    // Rate limit
    const ip = getClientIp(request)
    const rl = await rateLimit(`feedback-get:${ip}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    // Auth — owner or admin
    let user = null
    try { user = await getUser() } catch { /* unauthenticated */ }

    const supabase = createAdminClient()

    // Load submission to verify ownership and status
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, user_id, entry_id, submission_status, session_id, environment')
      .eq('id', submission_id)
      .maybeSingle()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const s = submission as Record<string, unknown>

    // Only owner or admin can read feedback
    if (user?.id !== String(s.user_id ?? '')) {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id ?? '')
        .maybeSingle()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    // Only generate feedback for completed (non-sandbox) submissions
    const isCompleted = ['completed', 'judged', 'scored'].includes(String(s.submission_status ?? ''))
    const isSandbox = String(s.environment ?? '') === 'sandbox'

    if (!isCompleted) {
      return NextResponse.json({ status: 'pending', message: 'Feedback will be available after judging completes.' }, { status: 202 })
    }

    if (isSandbox) {
      return NextResponse.json({ status: 'not_available', message: 'Performance Breakdown is not available for sandbox submissions.' }, { status: 200 })
    }

    // Try to load existing ready report
    const existing = await loadFeedbackReport(supabase, submission_id)
    if (existing && existing.status === 'ready') {
      return NextResponse.json({ report: existing })
    }

    // No report yet — trigger generation async-style.
    // We kick it off and return the report_id with status=generating.
    // Client polls until status=ready.
    const entry_id = s.entry_id ? String(s.entry_id) : null

    // Get agent_id from entry
    let agent_id = ''
    let challenge_id = ''
    let challenge_title: string | null = null
    if (entry_id) {
      const { data: entry } = await supabase
        .from('challenge_entries')
        .select('agent_id, challenge_id, challenge:challenges(id, title)')
        .eq('id', entry_id)
        .maybeSingle()

      if (entry) {
        const e = entry as Record<string, unknown>
        agent_id = String(e.agent_id ?? '')
        challenge_id = String(e.challenge_id ?? '')
        const challengeObj = e.challenge as Record<string, unknown> | null
        challenge_title = challengeObj?.title ? String(challengeObj.title) : null
      }
    }

    if (!agent_id || !challenge_id) {
      return NextResponse.json({ error: 'Cannot generate feedback — missing agent or challenge context' }, { status: 422 })
    }

    // A2 FIX: Run pipeline synchronously on GET (first generation).
    // Fire-and-forget is unreliable on Vercel serverless — the request context
    // is torn down as soon as the response is sent, killing the pipeline mid-run.
    // Running synchronously guarantees the report completes before responding.
    // The LLM calls take ~15–45s which is within Vercel's 60s function timeout.
    // Client receives either { report } (ready) or { status: 'failed' } — no polling dead-end.
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

    // Pipeline failed — return degraded response so client shows classic fallback
    return NextResponse.json({
      status: 'failed',
      message: 'Performance Breakdown is temporarily unavailable. Score breakdown is available below.',
    }, { status: 202 })

  } catch (err) {
    console.error('[api/feedback/GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — force regenerate (admin or owner)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId: rawId } = await params
    const parsed = idSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 })
    }
    const submission_id = parsed.data

    const ip = getClientIp(request)
    const rl = await rateLimit(`feedback-post:${ip}`, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    let user = null
    try { user = await getUser() } catch { /* unauthenticated */ }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    const { data: submission } = await supabase
      .from('submissions')
      .select('id, user_id, entry_id, submission_status, environment')
      .eq('id', submission_id)
      .maybeSingle()

    if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const s = submission as Record<string, unknown>

    // Must be owner or admin
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle()
    const isAdmin = profile?.role === 'admin'

    if (String(s.user_id) !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const entry_id = s.entry_id ? String(s.entry_id) : null
    let agent_id = ''
    let challenge_id = ''
    let challenge_title: string | null = null

    if (entry_id) {
      const { data: entry } = await supabase
        .from('challenge_entries')
        .select('agent_id, challenge_id, challenge:challenges(id, title)')
        .eq('id', entry_id)
        .maybeSingle()

      if (entry) {
        const e = entry as Record<string, unknown>
        agent_id = String(e.agent_id ?? '')
        challenge_id = String(e.challenge_id ?? '')
        const challengeObj = e.challenge as Record<string, unknown> | null
        challenge_title = challengeObj?.title ? String(challengeObj.title) : null
      }
    }

    if (!agent_id || !challenge_id) {
      return NextResponse.json({ error: 'Missing context' }, { status: 422 })
    }

    // Run pipeline synchronously on POST (force=true)
    const result = await runFeedbackPipeline(supabase, {
      submission_id,
      entry_id,
      agent_id,
      challenge_id,
      challenge_title,
      force: true,
    })

    if (result.status === 'ready') {
      const report = await loadFeedbackReport(supabase, submission_id)
      return NextResponse.json({ report })
    }

    return NextResponse.json({ error: 'Pipeline failed', report_id: result.report_id }, { status: 500 })

  } catch (err) {
    console.error('[api/feedback/POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
