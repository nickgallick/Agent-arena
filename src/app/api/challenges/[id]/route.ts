import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const idSchema = z.string().uuid('Invalid challenge ID')

// Safe challenge columns — never include internal admin fields
const CHALLENGE_COLUMNS = 'id, title, description, category, format, weight_class_id, status, time_limit_minutes, max_coins, entry_fee_cents, prize_pool, platform_fee_percent, starts_at, ends_at, entry_count, is_featured, is_daily, has_visual_output, web_submission_supported, remote_invocation_supported, is_sandbox, org_id, created_at'
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

    const supabaseAdmin = createAdminClient()

    const { data: challenge, error: challengeError } = await supabaseAdmin
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

    let user = null
    let isAdmin = false
    try {
      user = await getUser()
      if (user) {
        const supabaseAuth = await createClient()
        const { data: profile } = await supabaseAuth
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        isAdmin = profile?.role === 'admin'
      }
    } catch {
      // Not authenticated — fine for public challenges
    }

    // Anonymous visibility guard: non-admins can only see active/complete public non-sandbox challenges
    const ch = challenge as unknown as { status: string; is_sandbox?: boolean; org_id?: string | null } & Record<string, unknown>
    if (!isAdmin) {
      const visibleStatuses = ['active', 'complete']
      if (
        ch.is_sandbox ||
        !visibleStatuses.includes(ch.status) ||
        ch.org_id != null
      ) {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
      }
    }

    const supabase = await createClient()

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

    // Strip scoring fields from non-owner entries until challenge completes
    const processedEntries = (entries ?? []).map((entry) => {
      const isOwner = user && entry.user_id === user.id
      if (ch.status !== 'complete' && !isOwner) {
        const { final_score, placement, elo_change, coins_awarded, ...rest } = entry
        void final_score; void placement; void elo_change; void coins_awarded
        return rest
      }
      return entry
    })

    // Compute is_entered + user's entry state for the authenticated user
    const userEntry = user
      ? (entries ?? []).find(e => e.user_id === user.id) ?? null
      : null
    const isEntered = !!userEntry

    // Derive explicit participation state for the web UI
    // Maps challenge_entries.status → UI participation state
    // 'judging' is NOT a real entry status — entries go submitted → judged directly.
    // challenge_sessions.status has 'judging' but that never propagates to entries.
    type ParticipationState =
      | 'not_entered'
      | 'entered'
      | 'workspace_open'
      | 'submitted'
      | 'result_ready'
      | 'expired'
      | 'failed'

    let participationState: ParticipationState = 'not_entered'
    if (userEntry) {
      const s = userEntry.status as string
      if (s === 'workspace_open')                                              participationState = 'workspace_open'
      else if (s === 'submitted' || s === 'in_progress' || s === 'assigned')  participationState = 'submitted'
      else if (s === 'judged' || s === 'scored')                               participationState = 'result_ready'
      else if (s === 'failed')                                                  participationState = 'failed'
      else if (s === 'expired')                                                 participationState = 'expired'
      else                                                                      participationState = 'entered'
    }

    return NextResponse.json({
      challenge: {
        ...(ch as Record<string, unknown>),
        entries: processedEntries,
        is_entered: isEntered,
        participation_state: participationState,
        user_entry_id: userEntry?.id ?? null,
      },
    })
  } catch (err) {
    console.error('[api/challenges/[id] GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
