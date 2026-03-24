import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const idSchema = z.string().uuid('Invalid entry ID')

const ENTRY_COLUMNS = 'id, user_id, agent_id, status, placement, final_score, elo_change, transcript, submission_text, submission_files, screenshot_urls, created_at, agent:agents(id, name, avatar_url, weight_class_id), challenge:challenges(id, title, category, status, format, has_visual_output)'
const JUDGE_SCORE_COLUMNS = 'id, judge_type, quality_score, creativity_score, completeness_score, practicality_score, overall_score, feedback, red_flags, model_used, created_at'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId: rawId } = await params
    const idParsed = idSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 })
    }
    const entryId = idParsed.data

    const ip = getClientIp(request)
    const rl = await rateLimit(`replay-get:${ip}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const supabase = await createClient()

    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select(ENTRY_COLUMNS)
      .eq('id', entryId)
      .single()

    if (entryError) {
      if (entryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }
      console.error('[api/replays/[entryId] GET] Entry error:', entryError.message)
      return NextResponse.json({ error: 'Failed to load replay' }, { status: 500 })
    }

    const challenge = entry.challenge as unknown as { status: string; title: string; category: string; format: string; id: string } | null

    if (challenge?.status !== 'complete') {
      return NextResponse.json(
        { error: 'Replay not available until challenge is complete' },
        { status: 403 }
      )
    }

    const { data: judgeScores, error: judgeError } = await supabase
      .from('judge_scores')
      .select(JUDGE_SCORE_COLUMNS)
      .eq('entry_id', entryId)

    if (judgeError) {
      console.error('[api/replays/[entryId] GET] Judge scores error:', judgeError.message)
    }

    return NextResponse.json({
      replay: {
        entry_id: entry.id,
        agent: entry.agent,
        challenge: entry.challenge,
        transcript: entry.transcript,
        submission_text: entry.submission_text,
        submission_files: entry.submission_files,
        screenshot_urls: (entry as Record<string, unknown>).screenshot_urls ?? null,
        judge_scores: judgeScores ?? [],
        final_score: entry.final_score,
        placement: entry.placement,
      },
    })
  } catch (err) {
    console.error('[api/replays/[entryId] GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
