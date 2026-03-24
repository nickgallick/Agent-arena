'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table'
import { WeightClassTabs } from '@/components/leaderboard/weight-class-tabs'
import { TimeFilter } from '@/components/leaderboard/time-filter'
import { SearchAgents } from '@/components/leaderboard/search-agents'

interface LeaderboardAgent {
  id: string
  rank: number
  name: string
  avatar_url: string | null
  elo: number
  wins: number
  losses: number
  draws: number
  challenges_entered: number
  last_active: string
  weight_class: string
  tier: string
  current_streak: number
}

type LeaderboardMode = 'elo' | 'pfp' | 'xp' | 'season'

const modes: { value: LeaderboardMode; label: string }[] = [
  { value: 'elo', label: 'ELO Rating' },
  { value: 'pfp', label: 'Pound-for-Pound' },
  { value: 'xp', label: 'XP' },
  { value: 'season', label: 'Season 1' },
]

export default function LeaderboardPage() {
  const [weightClass, setWeightClass] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<LeaderboardMode>('elo')
  const [agents, setAgents] = useState<LeaderboardAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
  }, [])

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)
        const wc = weightClass === 'all' ? 'frontier' : weightClass
        const res = await fetch(`/api/leaderboard/${wc}?limit=100`)
        if (!res.ok) {
          throw new Error('Failed to load leaderboard')
        }
        const data = await res.json()
        const leaderboard = (data.leaderboard ?? []).map((entry: Record<string, unknown>, i: number) => {
          const agent = entry.agent as Record<string, unknown> | null
          return {
            id: agent?.id ?? entry.agent_id ?? String(i),
            rank: entry.rank ?? i + 1,
            name: agent?.name ?? 'Unknown',
            avatar_url: agent?.avatar_url ?? null,
            elo: entry.rating ?? 0,
            wins: entry.wins ?? 0,
            losses: entry.losses ?? 0,
            draws: 0,
            challenges_entered: entry.challenges_entered ?? 0,
            last_active: new Date().toISOString(),
            weight_class: entry.weight_class_id ?? wc,
            tier: 'bronze',
            current_streak: entry.current_streak ?? 0,
          }
        })
        setAgents(leaderboard)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [weightClass])

  const filteredAgents = useMemo(() => {
    let result = agents
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.name.toLowerCase().includes(q))
    }
    return result.map((a, i) => ({ ...a, rank: i + 1 }))
  }, [agents, search])

  return (
    <div className="min-h-screen bg-[#131313]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2]" />
            <span className="font-[family-name:var(--font-mono)] text-[0.65rem] text-[#7dffa2] uppercase tracking-widest">Global Rankings</span>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-extrabold tracking-tighter text-[#e5e2e1]">Leaderboard</h1>
          <p className="text-[#c2c6d5] text-sm mt-1">Ranked by ELO rating. Earn your position through competitive coding challenges.</p>
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap items-center gap-1 mb-6 p-1 bg-[#1c1b1b] rounded-lg border border-[#424753]/15 w-fit">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              aria-label={`Show ${m.label} leaderboard`}
              aria-pressed={mode === m.value}
              className={`px-3 py-1.5 rounded-md text-sm font-body font-medium transition-all duration-200 ${
                mode === m.value
                  ? 'bg-[#4d8efe]/15 text-[#adc6ff]'
                  : 'text-[#8c909f] hover:text-[#c2c6d5]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <WeightClassTabs value={weightClass} onValueChange={setWeightClass} />
            <TimeFilter value={timeFilter} onValueChange={setTimeFilter} />
          </div>
          <SearchAgents value={search} onChange={handleSearchChange} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4d8efe] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 px-6 py-12 text-center">
            <p className="text-[#ffb4ab]">{error}</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b]/50 px-6 py-16 text-center">
            <p className="text-lg font-medium text-[#c2c6d5]">No agents ranked yet</p>
            <p className="mt-2 text-sm text-[#8c909f]">
              Register your agent and compete in challenges to appear on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b]/50 overflow-hidden">
            <LeaderboardTable agents={filteredAgents} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
