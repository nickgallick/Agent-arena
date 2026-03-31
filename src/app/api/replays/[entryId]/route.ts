import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const idSchema = z.string().uuid('Invalid entry ID')

// Migration 00042 applied — overall_verdict, positive_signal, primary_weakness all exist.
const ENTRY_COLUMNS = 'id, user_id, agent_id, status, placement, final_score, elo_change, transcript, submission_text, submission_files, screenshot_urls, created_at, composite_score, process_score, strategy_score, integrity_adjustment, efficiency_score, dispute_flagged, dispute_reason, challenge_format, overall_verdict, agent:agents(id, name, avatar_url, weight_class_id), challenge:challenges(id, title, category, status, format, has_visual_output, difficulty_profile, judge_weights, ends_at)'
const JUDGE_SCORE_COLUMNS = 'id, judge_type, provider, lane, lane_score, quality_score, creativity_score, completeness_score, practicality_score, overall_score, feedback, red_flags, model_used, short_rationale, dimension_scores, confidence, integrity_outcome, integrity_adjustment, created_at'
// Public columns — never expose: model_id (infra detail), latency_ms (infra timing),
// is_fallback (internal pipeline state). short_rationale is scoped per audience below.
const JUDGE_OUTPUT_COLUMNS_PUBLIC = 'id, lane, score, confidence, dimension_scores, evidence_refs, flags, integrity_outcome, integrity_adjustment, positive_signal, primary_weakness, created_at'
// Owner/admin columns — includes short_rationale + infra fields for transparency
const JUDGE_OUTPUT_COLUMNS_OWNER = 'id, lane, model_id, score, confidence, dimension_scores, evidence_refs, short_rationale, flags, integrity_outcome, integrity_adjustment, latency_ms, is_fallback, positive_signal, primary_weakness, created_at'

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

    // Use admin client for challenge_entries query — avoids RLS recursion from entries_admin_read
    // policy (migration 00040) which has an inline profiles subquery triggering profiles RLS.
    // Public replays are intentionally accessible post-completion — admin client is safe here.
    // Migration 00042 (SECURITY DEFINER is_admin()) fixes the RLS policies permanently.
    const supabase = createAdminClient()

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

    // Determine audience for field scoping.
    // Owner and admin see infra fields (model_id, latency_ms, is_fallback, short_rationale).
    // Public viewers see sanitized output only.
    let isOwnerOrAdmin = false
    try {
      const viewer = await getUser()
      if (viewer) {
        const entryRecord = entry as Record<string, unknown>
        if (viewer.id === String(entryRecord.user_id ?? '')) {
          isOwnerOrAdmin = true
        } else {
          const { data: viewerProfile } = await supabase
            .from('profiles').select('role').eq('id', viewer.id).maybeSingle()
          if (viewerProfile?.role === 'admin') isOwnerOrAdmin = true
        }
      }
    } catch { /* unauthenticated viewer — stays false */ }

    const judgeOutputColumns = isOwnerOrAdmin
      ? JUDGE_OUTPUT_COLUMNS_OWNER
      : JUDGE_OUTPUT_COLUMNS_PUBLIC

    // Fetch legacy judge_scores (backcompat)
    const { data: judgeScores } = await supabase
      .from('judge_scores')
      .select(JUDGE_SCORE_COLUMNS)
      .eq('entry_id', entryId)

    // Fetch new lane-based judge_outputs (Phase 1+) — field-scoped by audience
    // The select column string is dynamic (audience-scoped) — cast to avoid TS union-type explosion
    const { data: judgeOutputs } = await (supabase
      .from('judge_outputs')
      .select(judgeOutputColumns as string)
      .eq('entry_id', entryId)
      .eq('is_arbitration', false)
      .order('created_at', { ascending: true }) as unknown as Promise<{ data: Record<string, unknown>[] | null }>)

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

    // Provisional placement context: total scored entries + rank for active challenges.
    // For closed challenges, stored entry.placement is authoritative.
    // For active challenges, stored placement may be null (not yet finalized) —
    // we compute a live provisional rank from current scored entries.
    let total_entries: number | null = null
    let provisional_placement: number | null = null
    const challengeObj = (entry.challenge as unknown) as Record<string, unknown> | null
    const challengeId = challengeObj?.id as string | undefined
    const challengeEndsAt = (challengeObj?.ends_at as string | null) ?? null
    const challengeIsOpen = challengeEndsAt ? new Date(challengeEndsAt).getTime() > Date.now() : false

    if (challengeId) {
      const { count } = await supabase
        .from('challenge_entries')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .in('status', ['judged', 'scored', 'completed'])
      total_entries = count ?? null

      // For active challenges where stored placement is null, compute provisional rank
      // by counting how many entries have a higher composite/final score than this entry.
      if (challengeIsOpen && entry.placement == null) {
        const thisScore = (e.composite_score as number | null) ?? (entry.final_score as number | null)
        if (thisScore != null) {
          const { count: aboveCount } = await supabase
            .from('challenge_entries')
            .select('id', { count: 'exact', head: true })
            .eq('challenge_id', challengeId)
            .in('status', ['judged', 'scored', 'completed'])
            .gt('composite_score', thisScore)
          provisional_placement = (aboveCount ?? 0) + 1
        }
      }
    }

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
        // Fall back to challenge.format if challenge_format column is null (not always backfilled).
        // Prevents "COMPOSITE SCORE · FORMAT" display artifact in PostMatchBreakdown.
        challenge_format: (e.challenge_format as string | null) ?? (challengeObj?.format as string | null) ?? null,
        dispute_flagged: e.dispute_flagged ?? false,
        dispute_reason: e.dispute_reason ?? null,
        dispute_flag: disputeFlag ?? null,
        // Telemetry
        run_metrics: runMetrics ?? null,
        // Feedback model (migration 00041/00042) — null until migration applied.
        // PostMatchBreakdown synthesizes from lane data when null.
        overall_verdict: (e.overall_verdict as string | null) ?? null,
        // Placement context — placement is authoritative for closed challenges.
        // For open challenges where stored placement is null, provisional_placement
        // is computed from live scored entries. UI should prefer placement ?? provisional_placement.
        total_entries,
        provisional_placement,
        challenge_ends_at: challengeEndsAt,
      },
    })
  } catch (err) {
    console.error('[api/replays/[entryId] GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
