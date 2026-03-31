import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Request schema
// ─────────────────────────────────────────────────────────────────────────────

const BlockingIssueSchema = z.object({
  severity: z.string().min(1),
  description: z.string().min(1),
  fix: z.string().min(1),
})

const ForgeReviewSubmitSchema = z.object({
  challenge_id: z.string().uuid(),
  bundle_id: z.string().optional(),
  verdict: z.enum(['approved_for_calibration', 'needs_revision']),
  objective_test_completeness: z.enum(['pass', 'partial', 'fail']),
  fairness_assessment: z.string().min(1),
  solvability_verdict: z.string().min(1),
  exploit_surface_notes: z.string().min(1),
  hidden_test_quality: z.string().min(1),
  technical_credibility: z.string().min(1),
  blocking_issues: z.array(BlockingIssueSchema).default([]),
  warnings: z.array(z.string()).default([]),
  positives: z.array(z.string()).default([]),
  revision_required: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Checklist template returned with review package
// ─────────────────────────────────────────────────────────────────────────────

const FORGE_REVIEW_CHECKLIST = {
  sections: [
    {
      key: 'objective_test_completeness',
      label: 'Objective Test Completeness',
      description: 'Are visible + hidden tests sufficient to objectively score agents?',
      options: ['pass', 'partial', 'fail'],
    },
    {
      key: 'fairness_assessment',
      label: 'Fairness Assessment',
      description: 'Is the challenge fair to all agent capability levels? No bias toward specific architectures?',
    },
    {
      key: 'solvability_verdict',
      label: 'Solvability Verdict',
      description: 'Can this challenge actually be solved? Is there a clear correct answer/approach?',
    },
    {
      key: 'exploit_surface_notes',
      label: 'Exploit Surface Notes',
      description: 'Are there prompt injection vectors, shortcut exploits, or gaming opportunities?',
    },
    {
      key: 'hidden_test_quality',
      label: 'Hidden Test Quality',
      description: 'Do hidden tests adequately cover edge cases not revealed in visible tests?',
    },
    {
      key: 'technical_credibility',
      label: 'Technical Credibility',
      description: 'Is the technical framing accurate? Would a real engineer find this plausible?',
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/forge-review
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const challengeId = searchParams.get('id')

    // GET ?id=xxx → full review package
    if (challengeId) {
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single()

      if (challengeError || !challenge) {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
      }

      const { data: bundle } = await supabase
        .from('challenge_bundles')
        .select('*')
        .eq('challenge_id', challengeId)
        .maybeSingle()

      const { data: previousReviews } = await supabase
        .from('challenge_forge_reviews')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false })

      return NextResponse.json({
        challenge,
        bundle,
        previous_reviews: previousReviews ?? [],
        checklist_template: FORGE_REVIEW_CHECKLIST,
      })
    }

    // GET (no id) → list all draft_review challenges
    const { data: challenges, error: listError } = await supabase
      .from('challenges')
      .select(`
        id,
        title,
        prompt,
        pipeline_status,
        category,
        format,
        challenge_type,
        generated_by,
        created_at
      `)
      .eq('pipeline_status', 'draft_review')
      .order('created_at', { ascending: true })

    if (listError) {
      return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 })
    }

    // Attach bundle_id to each challenge
    const challengeIds = (challenges ?? []).map((c) => c.id)
    let bundleMap: Record<string, string> = {}

    if (challengeIds.length > 0) {
      const { data: bundles } = await supabase
        .from('challenge_bundles')
        .select('challenge_id, bundle_id')
        .in('challenge_id', challengeIds)

      bundleMap = (bundles ?? []).reduce<Record<string, string>>((acc, b) => {
        if (b.challenge_id) acc[b.challenge_id] = b.bundle_id
        return acc
      }, {})
    }

    const enriched = (challenges ?? []).map((c) => ({
      ...c,
      bundle_id: bundleMap[c.id] ?? null,
    }))

    return NextResponse.json({
      review_queue: enriched,
      total: enriched.length,
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/forge-review
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  return withAdmin(async (admin) => {
    const supabase = createAdminClient()

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = ForgeReviewSubmitSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parseResult.error.issues,
        },
        { status: 422 }
      )
    }

    const body = parseResult.data

    // Fetch current challenge to get before_status
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, pipeline_status, title')
      .eq('id', body.challenge_id)
      .single()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.pipeline_status !== 'draft_review') {
      return NextResponse.json(
        {
          error: `Challenge is not in draft_review status (current: ${challenge.pipeline_status})`,
        },
        { status: 409 }
      )
    }

    const beforeStatus = challenge.pipeline_status
    const afterStatus = body.verdict

    // Insert forge review
    const { data: review, error: reviewInsertError } = await supabase
      .from('challenge_forge_reviews')
      .insert({
        challenge_id: body.challenge_id,
        bundle_id: body.bundle_id ?? null,
        reviewer: `forge:${admin.id}`,
        verdict: body.verdict,
        objective_test_completeness: body.objective_test_completeness,
        fairness_assessment: body.fairness_assessment,
        solvability_verdict: body.solvability_verdict,
        exploit_surface_notes: body.exploit_surface_notes,
        hidden_test_quality: body.hidden_test_quality,
        technical_credibility: body.technical_credibility,
        blocking_issues: body.blocking_issues,
        warnings: body.warnings,
        positives: body.positives,
        revision_required: body.revision_required ?? null,
      })
      .select()
      .single()

    if (reviewInsertError || !review) {
      return NextResponse.json({ error: 'Failed to save forge review' }, { status: 500 })
    }

    // Update challenge pipeline_status
    const { data: updatedChallenge, error: updateError } = await supabase
      .from('challenges')
      .update({
        pipeline_status: afterStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.challenge_id)
      .select()
      .single()

    if (updateError || !updatedChallenge) {
      return NextResponse.json({ error: 'Failed to update challenge status' }, { status: 500 })
    }

    // Log to challenge_admin_actions
    const { error: logError } = await supabase.from('challenge_admin_actions').insert({
      challenge_id: body.challenge_id,
      action: 'forge_review',
      actor: admin.id,
      previous_status: beforeStatus,
      new_status: afterStatus,
      reason: body.verdict,
      metadata: {
        review_id: review.id,
        blocking_issues_count: body.blocking_issues.length,
        warnings_count: body.warnings.length,
      },
    })

    if (logError) {
      // Non-fatal: log but don't fail the request
      // structured logging without console.log
      void logError
    }

    return NextResponse.json({
      review,
      challenge: updatedChallenge,
    })
  })
}
