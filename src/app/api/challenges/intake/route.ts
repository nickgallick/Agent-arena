import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GauntletBundleSchema } from '@/lib/intake/bundle-schema'
import { validateBundle } from '@/lib/intake/bundle-validator'

// POST /api/challenges/intake
// Auth: Bearer token matching GAUNTLET_INTAKE_API_KEY env var
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Verify Bearer token ─────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '').trim()
  const expectedKey = process.env.GAUNTLET_INTAKE_API_KEY
  if (!expectedKey || token !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse + Zod validate body ──────────────────────────────────────────
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parseResult = GauntletBundleSchema.safeParse(rawBody)
  if (!parseResult.success) {
    const zodFailures = parseResult.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      rule: 'zod_validation',
      message: issue.message,
    }))
    return NextResponse.json(
      {
        status: 'rejected',
        bundle_id: (rawBody as Record<string, unknown>)?.bundle_id ?? null,
        failures: zodFailures,
        pipeline_status: 'draft_failed_validation',
      },
      { status: 422 }
    )
  }

  const bundle = parseResult.data
  const supabase = createAdminClient()

  // ── 3. Check content_hash uniqueness ──────────────────────────────────────
  const { data: existingBundle, error: hashCheckError } = await supabase
    .from('challenge_bundles')
    .select('bundle_id')
    .eq('content_hash', bundle.content_hash)
    .maybeSingle()

  if (hashCheckError) {
    return NextResponse.json({ error: 'Database error during hash check' }, { status: 500 })
  }

  if (existingBundle) {
    return NextResponse.json(
      {
        error: 'Duplicate bundle: content_hash already exists',
        existing_bundle_id: existingBundle.bundle_id,
      },
      { status: 409 }
    )
  }

  // ── 4. Run semantic validation ────────────────────────────────────────────
  const validation = validateBundle(bundle)

  // ── 5b. Validation failed ─────────────────────────────────────────────────
  if (!validation.passed) {
    const { error: insertError } = await supabase.from('challenge_bundles').insert({
      bundle_id: bundle.bundle_id,
      gauntlet_version: bundle.gauntlet_version,
      generation_timestamp: bundle.generation_timestamp,
      family: bundle.family,
      weight_class: bundle.weight_class,
      format: bundle.format,
      title: bundle.title,
      public_description: bundle.public_description,
      internal_brief: bundle.internal_brief,
      prompt: bundle.prompt,
      starter_state: bundle.starter_state ?? null,
      visible_tests: bundle.visible_tests,
      hidden_tests: bundle.hidden_tests,
      adversarial_tests: bundle.adversarial_tests,
      judge_weights: bundle.judge_weights,
      scoring_rubric: bundle.scoring_rubric,
      evidence_map: bundle.evidence_map,
      failure_mode_targets: bundle.failure_mode_targets,
      difficulty_profile: bundle.difficulty_profile,
      calibration_expectations: bundle.calibration_expectations,
      contamination_notes: bundle.contamination_notes ?? null,
      freshness_score: bundle.freshness_score ?? null,
      parent_bundle_id: bundle.parent_bundle_id ?? null,
      mutation_generation: bundle.mutation_generation,
      mutation_type: bundle.mutation_type ?? null,
      lineage: bundle.lineage ?? null,
      publish_recommendation: bundle.publish_recommendation,
      asset_references: bundle.asset_references,
      content_hash: bundle.content_hash,
      validation_status: 'failed',
      validation_results: validation.failures,
      challenge_id: null,
    })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to store rejected bundle' }, { status: 500 })
    }

    return NextResponse.json(
      {
        status: 'rejected',
        bundle_id: bundle.bundle_id,
        failures: validation.failures,
        warnings: validation.warnings,
        pipeline_status: 'draft_failed_validation',
      },
      { status: 422 }
    )
  }

  // ── 5a. Validation passed ─────────────────────────────────────────────────

  // Insert challenge
  const { data: newChallenge, error: challengeInsertError } = await supabase
    .from('challenges')
    .insert({
      title: bundle.title,
      description: bundle.public_description,
      prompt: bundle.prompt,
      format: bundle.format,
      category: bundle.family,
      challenge_type: bundle.family,
      pipeline_status: 'draft_review',
      generated_by: 'gauntlet',
      calibration_status: 'draft',
      status: 'upcoming',
    })
    .select('id')
    .single()

  if (challengeInsertError || !newChallenge) {
    return NextResponse.json({ error: 'Failed to create challenge record' }, { status: 500 })
  }

  // Insert bundle linked to challenge
  const { error: bundleInsertError } = await supabase.from('challenge_bundles').insert({
    bundle_id: bundle.bundle_id,
    challenge_id: newChallenge.id,
    gauntlet_version: bundle.gauntlet_version,
    generation_timestamp: bundle.generation_timestamp,
    family: bundle.family,
    weight_class: bundle.weight_class,
    format: bundle.format,
    title: bundle.title,
    public_description: bundle.public_description,
    internal_brief: bundle.internal_brief,
    prompt: bundle.prompt,
    starter_state: bundle.starter_state ?? null,
    visible_tests: bundle.visible_tests,
    hidden_tests: bundle.hidden_tests,
    adversarial_tests: bundle.adversarial_tests,
    judge_weights: bundle.judge_weights,
    scoring_rubric: bundle.scoring_rubric,
    evidence_map: bundle.evidence_map,
    failure_mode_targets: bundle.failure_mode_targets,
    difficulty_profile: bundle.difficulty_profile,
    calibration_expectations: bundle.calibration_expectations,
    contamination_notes: bundle.contamination_notes ?? null,
    freshness_score: bundle.freshness_score ?? null,
    parent_bundle_id: bundle.parent_bundle_id ?? null,
    mutation_generation: bundle.mutation_generation,
    mutation_type: bundle.mutation_type ?? null,
    lineage: bundle.lineage ?? null,
    publish_recommendation: bundle.publish_recommendation,
    asset_references: bundle.asset_references,
    content_hash: bundle.content_hash,
    validation_status: 'passed',
    validation_results: null,
  })

  if (bundleInsertError) {
    // Rollback challenge (best-effort)
    await supabase.from('challenges').delete().eq('id', newChallenge.id)
    return NextResponse.json({ error: 'Failed to store bundle record' }, { status: 500 })
  }

  return NextResponse.json(
    {
      status: 'accepted',
      challenge_id: newChallenge.id,
      bundle_id: bundle.bundle_id,
      pipeline_status: 'draft_review',
      warnings: validation.warnings,
    },
    { status: 201 }
  )
}
