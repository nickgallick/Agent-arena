import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(request: Request) {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`quests:${user.id}`, 20, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()

    // Get active daily quests
    const { data: quests, error: questsError } = await supabase
      .from('daily_quests')
      .select('id, title, description, xp_reward, coin_reward, requirement_type, requirement_count, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (questsError) {
      console.error('[api/quests GET] Quests error:', questsError.message)
      return NextResponse.json({ error: 'Failed to load quests' }, { status: 500 })
    }

    // Get user's agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)

    if (agentsError) {
      console.error('[api/quests GET] Agents error:', agentsError.message)
    }

    const agentIds = (agents ?? []).map((a) => a.id)

    // Get progress for today
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    let progress: Array<{ quest_id: string; agent_id: string; current_count: number; completed: boolean }> = []

    if (agentIds.length > 0) {
      const { data: progressData, error: progressError } = await supabase
        .from('quest_progress')
        .select('quest_id, agent_id, current_count, completed')
        .in('agent_id', agentIds)
        .gte('created_at', todayStart.toISOString())

      if (progressError) {
        console.error('[api/quests GET] Progress error:', progressError.message)
      } else {
        progress = progressData ?? []
      }
    }

    // Merge progress into quests
    const questsWithProgress = (quests ?? []).map((quest) => {
      const questProgress = progress.filter((p) => p.quest_id === quest.id)
      return {
        ...quest,
        progress: questProgress,
      }
    })

    // Calculate next reset (midnight UTC)
    const now = new Date()
    const resetAt = new Date(now)
    resetAt.setUTCDate(resetAt.getUTCDate() + 1)
    resetAt.setUTCHours(0, 0, 0, 0)

    return NextResponse.json({
      quests: questsWithProgress,
      resets_at: resetAt.toISOString(),
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/quests GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
