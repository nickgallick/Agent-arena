/**
 * POST /api/internal/auto-calibrate
 *
 * Drains the calibration queue:
 * 1. Pulls up to N challenges with calibration_status = 'pending'
 * 2. Runs real LLM calibration on each
 * 3. Applies result:
 *    - pass     → calibration_status = 'passed', status = 'reserve'
 *    - borderline → calibration_status = 'flagged' (human review needed)
 *    - fail     → challenge deleted
 *
 * Called by the Forge cron every 30 minutes.
 * Auth: CRON_SECRET header (same as challenge-quality cron).
 *
 * Forge · 2026-03-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RealLLMCalibrationRunner } from '@/lib/calibration/real-llm-runner'
import type { ChallengeCalibrationInput } from '@/lib/calibration/types'

export const runtime = 'nodejs'
export const maxDuration = 300  // Vercel Pro — 5 min for real LLM calibration

const BATCH_SIZE = 3  // process 3 challenges per run to stay within timeout

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const runner = new RealLLMCalibrationRunner()

  // Pull pending queue
  const { data: queue, error: queueError } = await supabase
    .rpc('get_pending_calibration_queue', { p_limit: BATCH_SIZE })

  if (queueError) {
    console.error('[auto-calibrate] queue fetch error:', queueError.message)
    return NextResponse.json({ error: queueError.message }, { status: 500 })
  }

  if (!queue || queue.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'Queue empty' })
  }

  console.log(`[auto-calibrate] Processing ${queue.length} challenges`)

  const results = []

  for (const challenge of queue) {
    const challengeId = challenge.challenge_id
    const title = challenge.title

    // Mark as calibrating
    await supabase
      .from('challenges')
      .update({ calibration_status: 'calibrating', updated_at: new Date().toISOString() })
      .eq('id', challengeId)

    try {
      const input: ChallengeCalibrationInput = {
        challenge_id: challengeId,
        title: challenge.title,
        prompt: challenge.prompt,
        format: challenge.format ?? 'standard',
        category: challenge.category ?? 'general',
        difficulty_profile: null,
        judge_weights: null,
        time_limit_minutes: 60,
        has_objective_tests: false,
        challenge_type: challenge.challenge_type ?? 'standard',
      }

      console.log(`[auto-calibrate] Running real LLM calibration for: ${title}`)
      const result = await runner.run(input)

      // Persist calibration result
      await supabase
        .from('challenge_calibration_results')
        .upsert({
          challenge_id:          challengeId,
          runner_type:           'real_llm',
          separation_score:      result.separation_score,
          tier_spread:           result.tier_spread,
          discrimination_verdict: result.discrimination_verdict,
          recommendation:        result.recommendation,
          reason:                result.reason ?? null,
          tier_results:          result.tiers,
          run_at:                result.run_at,
        }, { onConflict: 'challenge_id,runner_type' })

      // Apply result via DB function
      const { data: applyResult, error: applyError } = await supabase
        .rpc('apply_calibration_result', {
          p_challenge_id: challengeId,
          p_verdict:      result.discrimination_verdict,
          p_reason:       result.reason ?? null,
        })

      if (applyError) {
        console.error(`[auto-calibrate] apply_calibration_result error for ${title}:`, applyError.message)
        results.push({ challenge_id: challengeId, title, verdict: result.discrimination_verdict, action: 'error', error: applyError.message })
        continue
      }

      const action = (applyResult as { action?: string })?.action ?? 'unknown'
      console.log(`[auto-calibrate] ${title}: verdict=${result.discrimination_verdict} action=${action} sep=${result.separation_score}pts`)

      results.push({
        challenge_id: challengeId,
        title,
        verdict:     result.discrimination_verdict,
        action,
        separation:  result.separation_score,
        reason:      result.reason ?? null,
      })

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[auto-calibrate] Unexpected error for ${title}:`, message)

      // Reset to draft so it can be retried
      await supabase
        .from('challenges')
        .update({ calibration_status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', challengeId)

      results.push({ challenge_id: challengeId, title, verdict: 'error', action: 'reset_to_draft', error: message })
    }
  }

  const summary = {
    processed:         results.length,
    promoted_to_reserve: results.filter(r => r.action === 'promoted_to_reserve').length,
    flagged:           results.filter(r => r.action === 'flagged_for_review').length,
    deleted:           results.filter(r => r.action === 'deleted').length,
    errors:            results.filter(r => r.action === 'error' || r.action === 'reset_to_draft').length,
  }

  console.log('[auto-calibrate] Summary:', summary)

  return NextResponse.json({
    success: true,
    summary,
    results,
    run_at: new Date().toISOString(),
  })
}
