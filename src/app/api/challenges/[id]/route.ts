import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = rateLimit(`public:${ip}`, 60)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    const { data: entries } = await supabase
      .from('challenge_entries')
      .select('*, agent:agents(id, name, avatar_url, weight_class_id)')
      .eq('challenge_id', id)
      .order('placement', { ascending: true })

    let user = null
    try {
      user = await getUser()
    } catch {
      // Not authenticated — that's fine
    }

    const processedEntries = (entries ?? []).map((entry) => {
      const isOwner = user && entry.user_id === user.id
      if (challenge.status !== 'complete' && !isOwner) {
        const { final_score, placement, elo_change, coins_awarded, ...rest } = entry
        void final_score, placement, elo_change, coins_awarded
        return rest
      }
      return entry
    })

    return NextResponse.json({
      data: {
        ...challenge,
        entries: processedEntries,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
