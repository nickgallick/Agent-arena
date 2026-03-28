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
      .select('id, title, description, category, format, status, starts_at, ends_at, time_limit_minutes, weight_class_id, is_daily, created_at, difficulty_profile, entry_fee_cents, prize_pool')
      .eq('is_daily', true)
      .in('status', ['open', 'active'])
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (challengeError) {
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
