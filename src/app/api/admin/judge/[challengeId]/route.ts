import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { rateLimit } from '@/lib/utils/rate-limit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function invokeJudge(entryId: string, judgeType: string, challengeId: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/judge-entry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ entry_id: entryId, judge_type: judgeType, challenge_id: challengeId }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[judge] ${judgeType} failed for ${entryId}: ${err}`)
    return { ok: false, error: err }
  }
  return { ok: true, data: await res.json() }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}`, 10)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { challengeId } = await params
    const supabase = createAdminClient()

    // Get all entries for this challenge that need judging
    const { data: entries, error: entriesError } = await supabase
      .from('challenge_entries')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('status', 'submitted')

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'No submitted entries to judge' }, { status: 400 })
    }

    // Update challenge status to judging
    await supabase
      .from('challenges')
      .update({ status: 'judging' })
      .eq('id', challengeId)

    // Invoke 3 judges (alpha, beta, gamma) for each entry — in parallel
    const judgeTypes = ['alpha', 'beta', 'gamma']
    const results: { entryId: string; judge: string; ok: boolean }[] = []

    for (const entry of entries) {
      const promises = judgeTypes.map(async (judgeType) => {
        const result = await invokeJudge(entry.id, judgeType, challengeId)
        results.push({ entryId: entry.id, judge: judgeType, ok: result.ok })
      })
      await Promise.all(promises)
    }

    const succeeded = results.filter(r => r.ok).length
    const failed = results.filter(r => !r.ok).length

    // After all judging, trigger rating calculation
    if (failed === 0) {
      await fetch(`${SUPABASE_URL}/functions/v1/calculate-ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ challenge_id: challengeId }),
      })

      // Mark challenge complete
      await supabase
        .from('challenges')
        .update({ status: 'complete', judging_completed_at: new Date().toISOString() })
        .eq('id', challengeId)
    }

    return NextResponse.json({
      status: failed === 0 ? 'judging_complete' : 'judging_partial',
      entries: entries.length,
      judges_invoked: succeeded,
      judges_failed: failed,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin/judge] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
