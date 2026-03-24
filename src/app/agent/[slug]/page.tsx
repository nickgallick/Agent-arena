'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { AgentProfileClient } from './AgentProfileClient'

interface AgentData {
  name: string
  slug: string
  avatar_url: string | null
  model_identifier: string
  model_provider: string
  weight_class: string
  tier: string
  elo_rating: number
  elo_peak: number
  level: number
  xp: number
  wins: number
  losses: number
  draws: number
  current_streak: number
  best_streak: number
  bio: string | null
}

export default function AgentProfilePage() {
  const params = useParams<{ slug: string }>()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [badges, setBadges] = useState<{ id: string; name: string; description: string; icon: string; rarity: string; earned_at: string }[]>([])
  const [lockedBadges] = useState<{ id: string; name: string; description: string; icon: string; rarity: string; progress: number; target: number }[]>([])
  const [eloHistory, setEloHistory] = useState<{ date: string; elo: number; change: number }[]>([])
  const [categoryStats, setCategoryStats] = useState<{ category: string; completed: number; win_rate: number; avg_score: number }[]>([])
  const [rivals] = useState<{ rival_name: string; rival_slug: string; rival_elo: number; total_matchups: number; agent_wins: number; rival_wins: number; last_matchup_at: string }[]>([])
  const [results, setResults] = useState<{ id: string; challenge_title: string; category: string; placement: number; total_entries?: number; score: number; elo_change: number; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgent() {
      try {
        setLoading(true)
        setError(null)

        // The API uses agent ID, but we have a slug. Try fetching via slug-based lookup.
        // If no dedicated slug endpoint exists, we use the agents list or direct ID.
        const res = await fetch(`/api/agents/${params.slug}`)
        if (res.status === 404 || res.status === 400) {
          setError('Agent not found')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to load agent')
        }
        const data = await res.json()
        const a = data.agent
        if (!a) {
          setError('Agent not found')
          return
        }

        // Map API response to component props
        const primaryRating = a.ratings?.[0]
        setAgent({
          name: a.name ?? 'Unknown',
          slug: params.slug,
          avatar_url: a.avatar_url ?? null,
          model_identifier: a.model_name ?? '',
          model_provider: '',
          weight_class: primaryRating?.weight_class_id ?? 'open',
          tier: 'bronze',
          elo_rating: primaryRating?.rating ?? 1200,
          elo_peak: primaryRating?.rating ?? 1200,
          level: 1,
          xp: 0,
          wins: primaryRating?.wins ?? 0,
          losses: primaryRating?.losses ?? 0,
          draws: 0,
          current_streak: primaryRating?.current_streak ?? 0,
          best_streak: primaryRating?.current_streak ?? 0,
          bio: a.bio ?? null,
        })

        // Map badges
        setBadges(
          (a.badges ?? []).map((b: Record<string, unknown>) => ({
            id: b.id ?? '',
            name: b.name ?? '',
            description: '',
            icon: (b.icon as string) ?? 'Star',
            rarity: (b.rarity as string) ?? 'common',
            earned_at: (b.awarded_at as string) ?? new Date().toISOString(),
          }))
        )

        // Map recent entries to results
        setResults(
          (a.recent_entries ?? []).map((e: Record<string, unknown>, i: number) => ({
            id: `r-${i}`,
            challenge_title: (e.title as string) ?? 'Challenge',
            category: (e.category as string) ?? 'unknown',
            placement: (e.placement as number) ?? 0,
            score: (e.final_score as number) ?? 0,
            elo_change: (e.elo_change as number) ?? 0,
            created_at: (e.created_at as string) ?? new Date().toISOString(),
          }))
        )

        // Category stats and ELO history are not returned by the current API
        setCategoryStats([])
        setEloHistory([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    }
    fetchAgent()
  }, [params.slug])

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

  return (
    <div className="min-h-screen bg-[#131313]">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-16">
        <AgentProfileClient
          agent={agent}
          badges={badges}
          lockedBadges={lockedBadges}
          eloHistory={eloHistory}
          categoryStats={categoryStats}
          rivals={rivals}
          results={results}
        />
      </main>
      <Footer />
    </div>
  )
}
