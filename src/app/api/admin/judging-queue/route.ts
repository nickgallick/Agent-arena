import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(): Promise<Response> {
  return withAdmin(async () => {
    const supabase = createAdminClient()
    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Queue depth by status
    const [pendingResult, claimedResult, runningResult, deadLetterResult] = await Promise.all([
      supabase.from('judging_jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('judging_jobs').select('id', { count: 'exact', head: true }).eq('status', 'claimed'),
      supabase.from('judging_jobs').select('id', { count: 'exact', head: true }).eq('status', 'running'),
      supabase.from('judging_jobs').select('id', { count: 'exact', head: true }).eq('status', 'dead_letter'),
    ])

    // Avg judging latency (from completed jobs)
    const { data: completedJobs } = await supabase
      .from('judging_jobs')
      .select('started_at, completed_at')
      .eq('status', 'completed')
      .not('started_at', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100)

    let avg_judging_latency_seconds: number | null = null
    if (completedJobs && completedJobs.length > 0) {
      const latencies = completedJobs.map(j => {
        const start = new Date(j.started_at as string).getTime()
        const end = new Date(j.completed_at as string).getTime()
        return (end - start) / 1000
      })
      avg_judging_latency_seconds = latencies.reduce((a, b) => a + b, 0) / latencies.length
    }

    // Stuck jobs (claimed > 5min ago)
    const { data: stuckJobs } = await supabase
      .from('judging_jobs')
      .select('id, submission_id, claimed_at, claimed_by, attempt_count, error_stage')
      .eq('status', 'claimed')
      .lt('claimed_at', fiveMinAgo)

    // Dead letters with error info
    const { data: deadLetters } = await supabase
      .from('judging_jobs')
      .select('id, submission_id, error_message, error_stage, attempt_count, updated_at')
      .eq('status', 'dead_letter')
      .order('updated_at', { ascending: false })
      .limit(50)

    // Lane timeout count (24h)
    const { count: lane_timeout_count_24h } = await supabase
      .from('judge_execution_logs')
      .select('id', { count: 'exact', head: true })
      .eq('event', 'timeout')
      .gte('created_at', twentyFourHoursAgo)

    // Audit trigger rate (7d)
    const [totalRunsResult, auditRunsResult] = await Promise.all([
      supabase.from('judge_runs').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('judge_runs').select('id', { count: 'exact', head: true }).eq('audit_triggered', true).gte('created_at', sevenDaysAgo),
    ])

    const totalRuns = totalRunsResult.count ?? 0
    const auditRuns = auditRunsResult.count ?? 0
    const audit_trigger_rate_7d = totalRuns > 0 ? auditRuns / totalRuns : 0

    // Breakdown failures (24h)
    const { count: breakdown_failure_count_24h } = await supabase
      .from('match_breakdowns')
      .select('id', { count: 'exact', head: true })
      .eq('leakage_audit_passed', false)
      .gte('created_at', twentyFourHoursAgo)

    return NextResponse.json({
      queue_depth: {
        pending: pendingResult.count ?? 0,
        claimed: claimedResult.count ?? 0,
        running: runningResult.count ?? 0,
        dead_letter: deadLetterResult.count ?? 0,
      },
      avg_judging_latency_seconds,
      stuck_jobs: stuckJobs ?? [],
      dead_letters: deadLetters ?? [],
      lane_timeout_count_24h: lane_timeout_count_24h ?? 0,
      audit_trigger_rate_7d,
      breakdown_failure_count_24h: breakdown_failure_count_24h ?? 0,
    })
  })
}
