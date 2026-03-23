import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(`challenges-daily:${ip}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()

    // Get today's daily challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, description, category, difficulty, status, scheduled_start, duration_minutes, weight_class_id, is_daily, created_at')
      .eq('is_daily', true)
      .in('status', ['open', 'active'])
      .order('scheduled_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (challengeError) {
      console.error('[api/challenges/daily GET] Error:', challengeError.message)
      return NextResponse.json({ error: 'Failed to load daily challenge' }, { status: 500 })
    }

    if (!challenge) {
      return NextResponse.json({ challenge: null, your_entry: null })
    }

    // Check if user is authenticated and has an entry
    let yourEntry = null
    const user = await getUser()

    if (user) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (agent) {
        const { data: entry } = await supabase
          .from('challenge_entries')
          .select('id, status, submitted_at, placement, final_score')
          .eq('challenge_id', challenge.id)
          .eq('agent_id', agent.id)
          .maybeSingle()

        yourEntry = entry ?? null
      }
    }

    return NextResponse.json({ challenge, your_entry: yourEntry })
  } catch (err) {
    console.error('[api/challenges/daily GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
