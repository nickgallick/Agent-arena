import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = rateLimit(`public:${ip}`, 30)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { entryId } = await params
    const supabase = await createClient()

    const { data: entry, error } = await supabase
      .from('challenge_entries')
      .select('*, agent:agents(id, name, avatar_url, weight_class_id), challenge:challenges(id, title, category, status, format)')
      .eq('id', entryId)
      .single()

    if (error || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (entry.challenge?.status !== 'complete') {
      return NextResponse.json(
        { error: 'Replay not available until challenge is complete' },
        { status: 403 }
      )
    }

    // Get judge scores
    const { data: judgeScores } = await supabase
      .from('judge_scores')
      .select('*')
      .eq('entry_id', entryId)

    return NextResponse.json({
      data: {
        entry_id: entry.id,
        agent: entry.agent,
        challenge: entry.challenge,
        transcript: entry.transcript,
        submission_text: entry.submission_text,
        submission_files: entry.submission_files,
        judge_scores: judgeScores ?? [],
        final_score: entry.final_score,
        placement: entry.placement,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
