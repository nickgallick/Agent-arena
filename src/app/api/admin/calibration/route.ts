/**
 * POST /api/admin/calibration
 * Run calibration on a challenge or generate a mutation.
 * 
 * Actions:
 * - run_synthetic: run synthetic calibration only
 * - run_real_llm: run real LLM calibration only
 * - run_full: run both (follows policy)
 * - run_forced_real: force real LLM regardless of policy
 * - mutate: generate a mutation variant
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { runCalibration } from '@/lib/calibration/orchestrator'
import { SyntheticCalibrationRunner } from '@/lib/calibration/synthetic-runner'
import { RealLLMCalibrationRunner } from '@/lib/calibration/real-llm-runner'
import { generateMutation } from '@/lib/calibration/mutation-engine'
import type { ChallengeCalibrationInput, MutationType } from '@/lib/calibration/types'

export async function POST(req: NextRequest) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const body = await req.json()
  const { action, challenge_id, mutation_type } = body

  if (!challenge_id) return NextResponse.json({ error: 'challenge_id required' }, { status: 400 })

  // Fetch challenge
  const { data: challenge, error: fetchError } = await supabase
    .from('challenges')
    .select('id, title, prompt, description, category, format, challenge_type, difficulty_profile, judge_weights, time_limit_minutes, has_objective_tests, mutation_generation, lineage, max_coins')
    .eq('id', challenge_id)
    .single()

  if (fetchError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  if (!challenge.prompt) {
    return NextResponse.json({ error: 'Challenge has no prompt — cannot calibrate' }, { status: 400 })
  }

  const input: ChallengeCalibrationInput = {
    challenge_id: challenge.id,
    title: challenge.title,
    prompt: challenge.prompt,
    format: challenge.format,
    category: challenge.category,
    difficulty_profile: challenge.difficulty_profile,
    judge_weights: challenge.judge_weights,
    time_limit_minutes: challenge.time_limit_minutes,
    has_objective_tests: challenge.has_objective_tests ?? false,
    challenge_type: challenge.challenge_type,
  }

  switch (action) {
    case 'run_synthetic': {
      const runner = new SyntheticCalibrationRunner()
      const result = await runner.run(input)
      return NextResponse.json({ success: true, result })
    }

    case 'run_real_llm': {
      const runner = new RealLLMCalibrationRunner()
      const result = await runner.run(input)
      return NextResponse.json({ success: true, result })
    }

    case 'run_full': {
      const results = await runCalibration(input, false)
      return NextResponse.json({ success: true, ...results })
    }

    case 'run_forced_real': {
      const results = await runCalibration(input, true)
      return NextResponse.json({ success: true, ...results })
    }

    case 'mutate': {
      if (!mutation_type || !['semantic', 'structural', 'adversarial'].includes(mutation_type)) {
        return NextResponse.json({ error: 'mutation_type must be semantic | structural | adversarial' }, { status: 400 })
      }

      const mutation = await generateMutation({
        challenge_id: challenge.id,
        title: challenge.title,
        prompt: challenge.prompt,
        category: challenge.category,
        format: challenge.format,
        challenge_type: challenge.challenge_type,
        difficulty_profile: challenge.difficulty_profile,
        mutation_type: mutation_type as MutationType,
        mutation_generation: challenge.mutation_generation ?? 0,
      })

      if (!mutation) {
        return NextResponse.json({ error: 'Mutation generation failed' }, { status: 500 })
      }

      // Create the mutated challenge as a new draft
      const { data: newChallenge, error: createError } = await supabase
        .from('challenges')
        .insert({
          title: mutation.title,
          description: mutation.description,
          prompt: mutation.prompt,
          category: mutation.category,
          format: mutation.format,
          challenge_type: mutation.challenge_type,
          difficulty_profile: mutation.difficulty_profile,
          parent_challenge_id: mutation.parent_challenge_id,
          mutation_generation: mutation.mutation_generation,
          lineage: mutation.lineage,
          calibration_status: 'draft',
          status: 'upcoming',
          time_limit_minutes: challenge.time_limit_minutes,
          max_coins: challenge.max_coins,
          judge_weights: challenge.judge_weights,
        })
        .select('id, title, calibration_status')
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      // Log mutation action with anti-drift data
      await supabase.from('challenge_admin_actions').insert({
        challenge_id: newChallenge.id,
        actor: 'mutation_engine',
        action: 'mutation_created',
        reason: `${mutation_type} mutation from parent ${challenge_id}. Gen ${mutation.mutation_generation}. ${mutation.mutation_notes}`,
        new_status: 'draft',
        metadata: {
          parent_challenge_id: challenge_id,
          mutation_type,
          generation: mutation.mutation_generation,
          invariants_preserved: mutation.invariants_preserved,
          invariants_changed: mutation.invariants_changed,
          family_identity_preserved: mutation.family_identity_preserved,
          freshness_delta: mutation.freshness_delta,
          anti_drift_warnings: mutation.anti_drift_warnings,
        },
      })

      // Item 3: Block flagship mutations that fail hard gates
      const mutationWithGates = mutation as typeof mutation & { hard_gate_blocked?: boolean }
      if (mutationWithGates.hard_gate_blocked) {
        return NextResponse.json({
          success: false,
          error: 'Flagship anti-drift hard gate failed',
          hard_gate_violations: mutation.anti_drift_warnings.filter(w => w.startsWith('HARD GATE')),
          mutation_notes: mutation.mutation_notes,
        }, { status: 422 })
      }

      return NextResponse.json({
        success: true,
        mutation_notes: mutation.mutation_notes,
        invariants_preserved: mutation.invariants_preserved,
        invariants_changed: mutation.invariants_changed,
        family_identity_preserved: mutation.family_identity_preserved,
        freshness_delta: mutation.freshness_delta,
        anti_drift_warnings: mutation.anti_drift_warnings,
        new_challenge: newChallenge,
      })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}

// GET /api/admin/calibration?challenge_id=xxx — get calibration results for a challenge
export async function GET(req: NextRequest) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const challenge_id = req.nextUrl.searchParams.get('challenge_id')
  if (!challenge_id) return NextResponse.json({ error: 'challenge_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('challenge_calibration_results')
    .select('*')
    .eq('challenge_id', challenge_id)
    .order('run_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data })
}
