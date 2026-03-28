import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateConnector } from '@/lib/auth/authenticate-connector'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { validateSubmission } from '@/lib/submissions/validate-submission'
import { hashContent, storeArtifact } from '@/lib/submissions/artifact-store'
import { logSubmissionEvent } from '@/lib/submissions/event-logger'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'

const fileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
})

const submitSchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID'),
  content: z.string().min(1, 'Content is required').max(100_000, 'Submission too large (max 100KB)'),
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

    // Phase 1 runtime: validate submission
    const validation = await validateSubmission(supabase, {
      challenge_id,
      agent_id: agent.id,
      content,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.rejection_reason ?? 'Submission rejected' }, { status: 400 })
    }

    const submittedAt = new Date().toISOString()

    // Capture version snapshot before insert
    const version_snapshot = await captureVersionSnapshot(supabase, challenge_id)

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
        submission_status: 'received',
      })
      .select('id, submitted_at')
      .single()

    if (submitError) {
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
    }

    // Log received event
    await logSubmissionEvent(supabase, submission.id, 'received')

    // Store immutable artifact
    const { content_hash } = await storeArtifact(supabase, {
      submission_id: submission.id,
      content,
      artifact_type: 'solution',
      version_snapshot,
    })

    // Update artifact_hash on submission
    await supabase
      .from('submissions')
      .update({ artifact_hash: content_hash })
      .eq('id', submission.id)

    // Update entry status + sync submission_text for judge pipeline
    const { error: updateError } = await supabase
      .from('challenge_entries')
      .update({
        status: 'submitted',
        submitted_at: submittedAt,
        submission_text: content,
        submission_files: files ?? null,
      })
      .eq('id', entry.id)

    if (updateError) {
      return NextResponse.json({ error: 'Submission recorded but entry state update failed — contact support' }, { status: 500 })
    }

    // Enqueue judging job
    const { error: enqueueError } = await supabase.rpc('enqueue_judging_job', {
      p_submission_id: submission.id,
      p_challenge_id: challenge_id,
      p_agent_id: agent.id,
      p_version_snapshot: version_snapshot as unknown as Record<string, unknown>,
    })

    if (enqueueError) {
      // Non-fatal: submission is stored, but judging won't auto-start
      await logSubmissionEvent(supabase, submission.id, 'failed', {
        error: `Failed to enqueue judging job: ${enqueueError.message}`,
      })
    } else {
      await logSubmissionEvent(supabase, submission.id, 'queued')
      await supabase
        .from('submissions')
        .update({ submission_status: 'queued' })
        .eq('id', submission.id)
    }

    // Compute run metrics from telemetry (non-blocking)
    supabase.rpc('compute_run_metrics', { p_entry_id: entry.id }).then()

    return NextResponse.json({
      submission_id: submission.id,
      submitted_at: submission.submitted_at,
      status: enqueueError ? 'received' : 'queued',
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
