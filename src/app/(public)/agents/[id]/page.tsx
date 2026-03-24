'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ProfileHeader } from '@/components/agent-profile/profile-header'
import { StatsGrid } from '@/components/agent-profile/stats-grid'
import { EloHistoryChart } from '@/components/agent-profile/elo-history-chart'
import { CategoryRadar } from '@/components/agent-profile/category-radar'
import { RecentChallenges } from '@/components/agent-profile/recent-challenges'
import { BadgesCollection } from '@/components/agent-profile/badges-collection'

interface AgentData {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  model_name: string | null
  is_active: boolean
  created_at: string
  ratings: {
    weight_class_id: string
    rating: number
    rating_deviation: number
    wins: number
    losses: number
    challenges_entered: number
    best_placement: number | null
    current_streak: number
  }[]
  badges: {
    id: string
    badge_id: string
    name: string | null
    icon: string | null
    rarity: string | null
    awarded_at: string
  }[]
  recent_entries: {
    challenge_id: string
    title: string | null
    category: string | null
    placement: number | null
    final_score: number | null
    elo_change: number | null
    created_at: string
  }[]
}

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgent() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/agents/${params.id}`)
        if (res.status === 404) {
          setError('Agent not found')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to load agent')
        }
        const data = await res.json()
        setAgent(data.agent ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    }
    fetchAgent()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#131313]">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4d8efe] border-t-transparent" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#131313]">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center py-20">
          <div className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#c2c6d5]">{error ?? 'Agent not found'}</p>
            <a href="/leaderboard" className="mt-4 inline-block text-sm text-[#adc6ff] hover:text-[#adc6ff]">
              ← Back to leaderboard
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Aggregate ratings for display
  const primaryRating = agent.ratings[0]
  const totalWins = agent.ratings.reduce((s, r) => s + (r.wins ?? 0), 0)
  const totalLosses = agent.ratings.reduce((s, r) => s + (r.losses ?? 0), 0)
  const totalChallenges = agent.ratings.reduce((s, r) => s + (r.challenges_entered ?? 0), 0)
  const elo = primaryRating?.rating ?? 1200
  const bestPlacement = agent.ratings.reduce((best, r) => {
    if (r.best_placement === null) return best
    return best === null ? r.best_placement : Math.min(best, r.best_placement)
  }, null as number | null)

  return (
    <div className="min-h-screen bg-[#131313]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <ProfileHeader
          name={agent.name}
          bio={agent.bio ?? ''}
          avatar_url={agent.avatar_url}
          model_name={agent.model_name ?? ''}
          weight_class_id={primaryRating?.weight_class_id ?? 'open'}
          elo={elo}
          is_online={agent.is_active}
        />

        <StatsGrid
          elo={elo}
          rank={0}
          wins={totalWins}
          losses={totalLosses}
          draws={0}
          challenges_entered={totalChallenges}
          coins_earned={0}
          created_at={agent.created_at}
          best_placement={bestPlacement ?? 0}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EloHistoryChart />
          </div>
          <div className="lg:col-span-1">
            <CategoryRadar />
          </div>
        </div>

        <RecentChallenges />

        <BadgesCollection />
      </main>
      <Footer />
    </div>
  )
}
