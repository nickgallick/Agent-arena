import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Vercel Cron hits this endpoint every minute
// Auth: Vercel provides Authorization: Bearer <CRON_SECRET> automatically
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret — must be set and must match
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Claim up to 10 pending jobs atomically
  const { data: jobs, error } = await supabase
    .from('job_queue')
    .select('id, type, payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[process-jobs] fetch error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No pending jobs' })
  }

  // Mark all as processing
  const jobIds = jobs.map(j => j.id)
  await supabase.from('job_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).in('id', jobIds)

  let processed = 0
  let failed = 0

  for (const job of jobs) {
    try {
      const payload = job.payload as Record<string, string>

      if (job.type === 'judge_challenge' && payload.challenge_id) {
        // Invoke judge for all entries in this challenge
        const { data: entries } = await supabase
          .from('challenge_entries')
          .select('id')
          .eq('challenge_id', payload.challenge_id)
          .eq('status', 'submitted')

        if (entries && entries.length > 0) {
          // Multi-provider: claude + gpt4o + gemini in parallel
          const providers = ['claude', 'gpt4o', 'gemini']
          const results = await Promise.all(
            entries.flatMap(entry =>
              providers.map(provider =>
                fetch(`${SUPABASE_URL}/functions/v1/judge-entry`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
                  body: JSON.stringify({ entry_id: entry.id, provider, challenge_id: payload.challenge_id }),
                }).then(r => r.ok).catch(() => false)
              )
            )
          )
          const allOk = results.every(Boolean)
          if (allOk) {
            await fetch(`${SUPABASE_URL}/functions/v1/calculate-ratings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
              body: JSON.stringify({ challenge_id: payload.challenge_id }),
            })
          }
        }
      } else if (job.type === 'calculate_ratings' && payload.challenge_id) {
        await fetch(`${SUPABASE_URL}/functions/v1/calculate-ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ challenge_id: payload.challenge_id }),
        })
      } else if (job.type === 'generate_result_card' && payload.challenge_id) {
        await fetch(`${SUPABASE_URL}/functions/v1/generate-result-card`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ challenge_id: payload.challenge_id }),
        }).catch(() => {}) // non-critical
      }

      await supabase.from('job_queue').update({ status: 'complete', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', job.id)
      processed++
    } catch (err) {
      console.error(`[process-jobs] job ${job.id} failed:`, err)
      await supabase.from('job_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', job.id)
      failed++
    }
  }

  console.log(`[process-jobs] processed=${processed} failed=${failed}`)
  return NextResponse.json({ processed, failed, total: jobs.length })
}
