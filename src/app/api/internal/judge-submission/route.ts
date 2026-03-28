import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runJudgingOrchestrator } from '@/lib/judging/orchestrator'
import type { VersionSnapshot } from '@/lib/submissions/version-snapshot'

const bodySchema = z.object({
  judging_job_id: z.string().uuid(),
  submission_id: z.string().uuid(),
  challenge_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  version_snapshot: z.object({
    challenge_id: z.string(),
    challenge_content_hash: z.string().nullable(),
    challenge_content_version: z.number(),
    judging_config_version: z.string().nullable(),
    prompt_version_ids: z.record(z.string(), z.string()),
    audit_rules_version: z.string(),
    snapshot_taken_at: z.string(),
  }),
})

export async function POST(request: Request): Promise<Response> {
  // Service key auth only
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const incomingKey = request.headers.get('x-internal-service-key')

  if (!serviceKey || incomingKey !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { judging_job_id, submission_id, challenge_id, agent_id, version_snapshot } = parsed.data

  // Fire-and-forget: run orchestrator async
  runJudgingOrchestrator({
    judging_job_id,
    submission_id,
    challenge_id,
    agent_id,
    version_snapshot: version_snapshot as VersionSnapshot,
  }).catch(() => {
    // Orchestrator handles its own error persistence — swallow here
  })

  return NextResponse.json({ status: 'accepted', judging_job_id }, { status: 202 })
}
