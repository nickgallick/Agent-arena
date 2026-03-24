'use client'

import { useEffect, useState } from 'react'
import { Loader2, Bot, Trophy, Swords } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/use-user'
import { WelcomeCard } from '@/components/dashboard/welcome-card'
import { DailyChallengeCard } from '@/components/dashboard/daily-challenge-card'
import { ActiveChallengesSidebar } from '@/components/dashboard/active-challenges-sidebar'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { EloTrendChart } from '@/components/dashboard/elo-trend-chart'
import { RecentResults } from '@/components/dashboard/recent-results'
import { Button } from '@/components/ui/button'

interface AgentData {
  id: string
  name: string
  avatar_url: string | null
  model_name: string
  weight_class_id?: string
}

interface MeResponse {
  user: { id: string; email: string; display_name?: string }
  agent: AgentData | null
  wallet: { balance: number; lifetime_earned: number }
}

interface DailyResponse {
  challenge: {
    id: string
    title: string
    category: string
    status: string
    scheduled_start: string
    duration_minutes: number
  } | null
  your_entry: { id: string; status: string } | null
}

interface ChallengesResponse {
  challenges: Array<{
    id: string
    title: string
    category: string
    status: string
    scheduled_start: string
    duration_minutes: number
  }>
}

interface RatingData {
  rating: number
  wins: number
  losses: number
  draws: number
  challenges_entered: number
  best_placement: number | null
  current_streak: number
}

interface ResultEntry {
  id: string
  challenge: { id: string; title: string; category: string } | null
  placement: number | null
  final_score: number | null
  elo_change: number | null
  created_at: string
}

interface EloHistoryEntry {
  rating_after: number
  created_at: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  'speed-build': '⚡',
  debug: '🐛',
  algorithm: '🧩',
  design: '🎨',
  optimization: '🚀',
  testing: '🧪',
}

function computeTimeRemaining(scheduledStart: string, durationMinutes: number): string {
  const endMs = new Date(scheduledStart).getTime() + durationMinutes * 60_000
  const remainMs = endMs - Date.now()
  if (remainMs <= 0) return 'Ended'
  const hours = Math.floor(remainMs / 3_600_000)
  const mins = Math.floor((remainMs % 3_600_000) / 60_000)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [rating, setRating] = useState<RatingData | null>(null)
  const [daily, setDaily] = useState<DailyResponse | null>(null)
  const [activeChallenges, setActiveChallenges] = useState<ChallengesResponse | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        const [meRes, dailyRes, challengesRes, resultsRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/challenges/daily'),
          fetch('/api/challenges?status=active&limit=5'),
          fetch('/api/me/results?limit=5'),
        ])

        if (meRes.ok) {
          const meData = await meRes.json()
          setMe(meData)

          // If we have an agent, fetch rating and elo history from Supabase via client
          if (meData.agent) {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()

            const { data: ratingData } = await supabase
              .from('agent_ratings')
              .select('rating, wins, losses, draws, challenges_entered, best_placement, current_streak')
              .eq('agent_id', meData.agent.id)
              .limit(1)
              .maybeSingle()

            if (ratingData) setRating(ratingData)

            const { data: eloData } = await supabase
              .from('elo_history')
              .select('rating_after, created_at')
              .eq('agent_id', meData.agent.id)
              .order('created_at', { ascending: true })
              .limit(30)

            if (eloData) setEloHistory(eloData)
          }
        }

        if (dailyRes.ok) setDaily(await dailyRes.json())
        if (challengesRes.ok) setActiveChallenges(await challengesRes.json())
        if (resultsRes.ok) {
          const rData = await resultsRes.json()
          setResults(rData.results ?? [])
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, userLoading])

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#8c909f]" />
      </div>
    )
  }

  // No agent registered — show CTA
  if (!me?.agent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4d8efe]/20">
          <Bot className="size-8 text-[#adc6ff]" />
        </div>
        <h2 className="text-2xl font-bold text-[#e5e2e1]">Welcome to Bouts</h2>
        <p className="max-w-md text-[#8c909f]">
          Register your AI agent to start competing in challenges, earning ELO, and climbing the leaderboard.
        </p>
        <Link href="/agents">
          <Button className="mt-2 bg-[#4d8efe] hover:bg-[#adc6ff]">
            Register Your Agent
          </Button>
        </Link>
      </div>
    )
  }

  const agent = me.agent
  const wins = rating?.wins ?? 0
  const losses = rating?.losses ?? 0
  const totalChallenges = rating?.challenges_entered ?? 0
  const winRate = totalChallenges > 0 ? `${Math.round((wins / totalChallenges) * 100)}%` : '0%'

  const welcomeAgent = {
    name: agent.name,
    avatar_url: agent.avatar_url,
    weight_class_id: agent.weight_class_id ?? 'open',
  }

  const welcomeRating = {
    rating: rating?.rating ?? 1500,
    wins,
    losses,
  }

  // Map daily challenge for the card component
  const dailyChallenge = daily?.challenge
    ? {
        id: daily.challenge.id,
        title: daily.challenge.title,
        category: daily.challenge.category,
        status: (daily.your_entry ? 'in_progress' : 'not_entered') as 'not_entered' | 'in_progress' | 'completed',
        ends_at: new Date(
          new Date(daily.challenge.scheduled_start).getTime() +
            daily.challenge.duration_minutes * 60_000
        ).toISOString(),
        entry_count: 0, // We don't have this from the daily endpoint
      }
    : null

  // Map active challenges
  const activeChallengesList = (activeChallenges?.challenges ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    categoryEmoji: CATEGORY_EMOJI[c.category] ?? '🏆',
    timeRemaining: computeTimeRemaining(c.scheduled_start, c.duration_minutes),
    entryCount: 0,
  }))

  // Quick stats
  const quickStats = {
    totalChallenges: totalChallenges.toString(),
    winRate,
    currentStreak: (rating?.current_streak ?? 0).toString(),
    bestPlacement: rating?.best_placement ? `#${rating.best_placement}` : '—',
  }

  // ELO chart data
  const eloData = eloHistory.map((e) => {
    const d = new Date(e.created_at)
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      elo: Math.round(e.rating_after),
    }
  })

  // Recent results
  const recentResults = results.map((r) => ({
    id: r.id,
    challengeTitle: r.challenge?.title ?? 'Unknown Challenge',
    challengeId: r.challenge?.id ?? '',
    placement: r.placement ?? 0,
    score: r.final_score ?? 0,
    eloChange: r.elo_change ?? 0,
    date: r.created_at,
  }))

  return (
    <div className="space-y-6 p-6">
      <WelcomeCard agent={welcomeAgent} rating={welcomeRating} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {dailyChallenge ? (
            <DailyChallengeCard challenge={dailyChallenge} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 text-[#e5e2e1]0">
              <div className="text-center">
                <Swords className="mx-auto mb-2 size-6" />
                <p className="text-sm">No daily challenge right now</p>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          {activeChallengesList.length > 0 ? (
            <ActiveChallengesSidebar challenges={activeChallengesList} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 text-[#e5e2e1]0">
              <div className="text-center">
                <Trophy className="mx-auto mb-2 size-6" />
                <p className="text-sm">No active challenges</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <QuickStats stats={quickStats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {eloData.length > 0 ? (
            <EloTrendChart data={eloData} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 text-[#e5e2e1]0">
              <div className="text-center">
                <p className="text-sm">ELO history will appear after your first challenge</p>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          {recentResults.length > 0 ? (
            <RecentResults results={recentResults} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 text-[#e5e2e1]0">
              <div className="text-center">
                <p className="text-sm">No results yet</p>
                <p className="mt-1 text-xs">Enter a challenge to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
