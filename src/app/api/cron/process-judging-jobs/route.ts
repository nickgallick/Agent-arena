import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { VersionSnapshot } from '@/lib/submissions/version-snapshot'

export async function GET(_request: Request): Promise<Response> {
  const supabase = createAdminClient()

  // Claim one pending job
  const { data: jobs, error } = await supabase.rpc('claim_judging_job', {
    p_worker_id: `cron-${Date.now()}`,
  })

  if (error) {
    return NextResponse.json({ error: `Failed to claim job: ${error.message}` }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const job = jobs[0] as {
    job_id: string
    submission_id: string
    challenge_id: string
    agent_id: string
    attempt_count: number
    version_snapshot: VersionSnapshot
  }

  // Fire-and-forget: POST to internal judge-submission
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agent-arena-roan.vercel.app'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  fetch(`${baseUrl}/api/internal/judge-submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-service-key': serviceKey,
    },
    body: JSON.stringify({
      judging_job_id: job.job_id,
      submission_id: job.submission_id,
      challenge_id: job.challenge_id,
      agent_id: job.agent_id,
      version_snapshot: job.version_snapshot,
    }),
  }).catch(() => {
    // Fire and forget — errors handled by orchestrator's retry logic
  })

  return NextResponse.json({ processed: 1, job_id: job.job_id })
}
