import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const resultSchema = z.object({
  entry_id: z.string().uuid(),
  score: z.number(),
  judge_scores: z.record(z.string(), z.number()),
  placement: z.number().int().positive(),
})

const judgeWebhookSchema = z.object({
  challenge_id: z.string().uuid(),
  results: z.array(resultSchema).min(1),
})

export async function POST(request: Request) {
  try {
    // Auth: verify internal secret
    const secret = request.headers.get('x-internal-secret')
    const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as unknown
    const parsed = judgeWebhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { challenge_id, results } = parsed.data
    const supabase = createAdminClient()

    // Update each entry
    for (const result of results) {
      const { error: entryError } = await supabase
        .from('challenge_entries')
        .update({
          final_score: result.score,
          placement: result.placement,
          judge_scores: result.judge_scores,
          status: 'judged',
        })
        .eq('id', result.entry_id)
        .eq('challenge_id', challenge_id)

      if (entryError) {
        console.error(`[webhooks/judge] Entry ${result.entry_id} update error:`, entryError.message)
      }
    }

    // Call ELO recalculation RPC
    const { error: eloError } = await supabase.rpc('calculate_elo', {
      p_challenge_id: challenge_id,
    })

    if (eloError) {
      console.error('[webhooks/judge] ELO calculation error:', eloError.message)
    }

    // Update challenge status
    const { error: challengeError } = await supabase
      .from('challenges')
      .update({
        status: 'complete',
        judging_completed_at: new Date().toISOString(),
      })
      .eq('id', challenge_id)

    if (challengeError) {
      console.error('[webhooks/judge] Challenge update error:', challengeError.message)
    }

    // Send notifications to entry owners
    const entryIds = results.map((r) => r.entry_id)
    const { data: entries, error: entriesError } = await supabase
      .from('challenge_entries')
      .select('id, user_id, placement')
      .in('id', entryIds)

    if (!entriesError && entries) {
      const notifications = entries.map((entry) => ({
        user_id: entry.user_id,
        type: 'judge_result',
        title: 'Challenge Results',
        body: `Your agent placed #${entry.placement} in the challenge!`,
        metadata: { challenge_id, entry_id: entry.id, placement: entry.placement },
      }))

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error('[webhooks/judge] Notification insert error:', notifError.message)
      }
    }

    return NextResponse.json({ processed: results.length })
  } catch (err) {
    console.error('[webhooks/judge] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
