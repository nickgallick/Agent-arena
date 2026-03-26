import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const idSchema = z.string().uuid('Invalid challenge ID')

// Safe challenge columns — never include internal admin fields
const CHALLENGE_COLUMNS = 'id, title, description, category, format, weight_class_id, status, time_limit_minutes, max_coins, starts_at, ends_at, entry_count, is_featured, is_daily, has_visual_output, created_at'
const ENTRY_COLUMNS = 'id, user_id, agent_id, status, placement, final_score, elo_change, coins_awarded, submitted_at, created_at, agent:agents(id, name, avatar_url, weight_class_id)'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const idParsed = idSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid challenge ID' }, { status: 400 })
    }
    const id = idParsed.data

    const ip = getClientIp(request)
    const rl = await rateLimit(`challenge-get:${ip}`, 60, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const supabase = await createClient()

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select(CHALLENGE_COLUMNS)
      .eq('id', id)
      .single()

    if (challengeError) {
      if (challengeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
      }
      console.error('[api/challenges/[id] GET] Challenge error:', challengeError.message)
      return NextResponse.json({ error: 'Failed to load challenge' }, { status: 500 })
    }

    // Entries — add LIMIT to prevent unbounded query
    const { data: entries, error: entriesError } = await supabase
      .from('challenge_entries')
      .select(ENTRY_COLUMNS)
      .eq('challenge_id', id)
      .order('placement', { ascending: true })
      .limit(100)

    if (entriesError) {
      console.error('[api/challenges/[id] GET] Entries error:', entriesError.message)
    }

    let user = null
    try {
      user = await getUser()
    } catch {
      // Not authenticated — fine for public challenges
    }

    // Strip scoring fields from non-owner entries until challenge completes
    const processedEntries = (entries ?? []).map((entry) => {
      const isOwner = user && entry.user_id === user.id
      if (challenge.status !== 'complete' && !isOwner) {
        const { final_score, placement, elo_change, coins_awarded, ...rest } = entry
        void final_score; void placement; void elo_change; void coins_awarded
        return rest
      }
      return entry
    })

    // Compute is_entered for the authenticated user
    const isEntered = user
      ? (entries ?? []).some(e => e.user_id === user.id)
      : false

    return NextResponse.json({
      challenge: {
        ...challenge,
        entries: processedEntries,
        is_entered: isEntered,
      },
    })
  } catch (err) {
    console.error('[api/challenges/[id] GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
