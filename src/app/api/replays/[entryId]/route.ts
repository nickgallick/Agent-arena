import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const idSchema = z.string().uuid('Invalid entry ID')

const ENTRY_COLUMNS = 'id, user_id, agent_id, status, placement, final_score, elo_change, transcript, submission_text, submission_files, screenshot_urls, created_at, composite_score, process_score, strategy_score, integrity_adjustment, efficiency_score, dispute_flagged, dispute_reason, challenge_format, agent:agents(id, name, avatar_url, weight_class_id), challenge:challenges(id, title, category, status, format, has_visual_output, difficulty_profile, judge_weights)'
const JUDGE_SCORE_COLUMNS = 'id, judge_type, provider, lane, lane_score, quality_score, creativity_score, completeness_score, practicality_score, overall_score, feedback, red_flags, model_used, short_rationale, dimension_scores, confidence, integrity_outcome, integrity_adjustment, created_at'
const JUDGE_OUTPUT_COLUMNS = 'id, lane, model_id, score, confidence, dimension_scores, evidence_refs, short_rationale, flags, integrity_outcome, integrity_adjustment, latency_ms, is_fallback, created_at'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId: rawId } = await params
    const idParsed = idSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 })
    }
    const entryId = idParsed.data

    const ip = getClientIp(request)
    const rl = await rateLimit(`replay-get:${ip}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const supabase = await createClient()

    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select(ENTRY_COLUMNS)
      .eq('id', entryId)
      .single()

    if (entryError) {
      if (entryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }
      console.error('[api/replays/[entryId] GET] Entry error:', entryError.message)
      return NextResponse.json({ error: 'Failed to load replay' }, { status: 500 })
    }

    const challenge = entry.challenge as unknown as { status: string; title: string; category: string; format: string; id: string; org_id?: string | null } | null

    // Gate on entry status (judged/scored/complete) — not challenge status.
    // Challenges may stay 'active' after individual entries are judged.
    // Post-competition, submission content is intentionally public (per product decision).
    const judgedStatuses = ['judged', 'scored', 'complete', 'completed']
    if (!judgedStatuses.includes(entry.status)) {
      return NextResponse.json(
        { error: 'Replay not available — result has not been finalized yet' },
        { status: 403 }
      )
    }

    // Org/private replay guard:
    // If challenge has org_id set → it's a private org challenge → require membership
    // If no org_id → public challenge → replay is publicly accessible after completion (intentional)
    if (challenge?.org_id) {
      // Fetch full challenge to confirm org_id (entry join may not have it fully typed)
      const supabaseAdmin = createAdminClient()
      const { data: fullChallenge } = await supabaseAdmin
        .from('challenges')
        .select('org_id')
        .eq('id', challenge.id)
        .maybeSingle()

      const orgId = (fullChallenge as { org_id?: string | null } | null)?.org_id ?? null

      if (orgId) {
        // Org-private challenge — require authenticated org membership
        let user = null
        try { user = await getUser() } catch { /* unauthenticated */ }

        if (!user) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        // Check if admin
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role !== 'admin') {
          // Check org membership
          const { data: membership } = await supabaseAdmin
            .from('org_members')
            .select('user_id')
            .eq('org_id', orgId)
            .eq('user_id', user.id)
            .maybeSingle()

          if (!membership) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
          }
        }
      }
    }

    // Post-completion, submission content is intentionally public.
    // Competitors can see each other's solutions after the challenge closes.
    // This enables learning, verification, and community review.
    // This is a deliberate product decision for Bouts as a competition platform.

    // Fetch legacy judge_scores (backcompat)
    const { data: judgeScores } = await supabase
      .from('judge_scores')
      .select(JUDGE_SCORE_COLUMNS)
      .eq('entry_id', entryId)

    // Fetch new lane-based judge_outputs (Phase 1+)
    const { data: judgeOutputs } = await supabase
      .from('judge_outputs')
      .select(JUDGE_OUTPUT_COLUMNS)
      .eq('entry_id', entryId)
      .eq('is_arbitration', false)
      .order('created_at', { ascending: true })

    // Fetch run metrics for telemetry breakdown
    const { data: runMetrics } = await supabase
      .from('run_metrics')
      .select('total_events, tool_call_count, retry_count, revert_count, pivot_count, error_count, test_run_count, thrash_rate, revert_ratio, tool_discipline, verification_density, wasted_action_ratio, total_duration_ms, pct_explore, pct_plan, pct_implement, pct_verify, pct_recover, telemetry_process_score, telemetry_recovery_score, telemetry_efficiency_score')
      .eq('entry_id', entryId)
      .maybeSingle()

    // Fetch dispute flag if any
    const { data: disputeFlag } = await supabase
      .from('dispute_flags')
      .select('trigger_reason, max_judge_spread, status, adjudicated_score, adjudication_rationale')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const e = entry as Record<string, unknown>

    return NextResponse.json({
      replay: {
        entry_id: entry.id,
        agent: entry.agent,
        challenge: entry.challenge,
        transcript: entry.transcript,
        submission_text: entry.submission_text,
        submission_files: entry.submission_files,
        screenshot_urls: e.screenshot_urls ?? null,
        // Legacy scores
        judge_scores: judgeScores ?? [],
        final_score: entry.final_score,
        placement: entry.placement,
        // Phase 1+ lane scores
        judge_outputs: judgeOutputs ?? [],
        composite_score: e.composite_score ?? null,
        process_score: e.process_score ?? null,
        strategy_score: e.strategy_score ?? null,
        integrity_adjustment: e.integrity_adjustment ?? 0,
        efficiency_score: e.efficiency_score ?? null,
        challenge_format: e.challenge_format ?? null,
        dispute_flagged: e.dispute_flagged ?? false,
        dispute_reason: e.dispute_reason ?? null,
        dispute_flag: disputeFlag ?? null,
        // Telemetry
        run_metrics: runMetrics ?? null,
      },
    })
  } catch (err) {
    console.error('[api/replays/[entryId] GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
