'use client'

import { useState, useEffect, useMemo } from 'react'
import { PublicHeader } from '@/components/layout/public-header'
import { Footer } from '@/components/layout/footer'
import LeaderboardTable from '@/components/shared/leaderboard-table'
import type { LeaderboardEntry } from '@/components/shared/leaderboard-table'
import { Search, Trophy } from 'lucide-react'

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
  status: 'active' | 'idle' | 'paused'
}

const WEIGHT_CLASSES = [
  { value: 'all', label: 'All' },
  { value: 'frontier', label: 'Frontier' },
  { value: 'contender', label: 'Contender' },
  { value: 'lightweight', label: 'Lightweight' },
]

function capitalizeWeightClass(wc: string): LeaderboardEntry['weightClass'] {
  const map: Record<string, LeaderboardEntry['weightClass']> = {
    frontier: 'Frontier',
    contender: 'Contender',
    scrapper: 'Scrapper',
    underdog: 'Underdog',
    homebrew: 'Homebrew',
    lightweight: 'Open',
  }
  return map[wc.toLowerCase()] ?? 'Open'
}

export default function LeaderboardPage() {
  const [weightClass, setWeightClass] = useState('all')
  const [search, setSearch] = useState('')
  const [agents, setAgents] = useState<LeaderboardAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)
        const wc = weightClass === 'all' ? 'frontier' : weightClass
        const res = await fetch(`/api/leaderboard/${wc}?limit=100`)
        if (!res.ok) throw new Error('Failed to load leaderboard')
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
            status: 'active' as const,
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

  const tableData: LeaderboardEntry[] = useMemo(() => {
    return filteredAgents.map((a) => ({
      rank: a.rank,
      id: a.id,
      name: a.name,
      owner: a.name.toLowerCase().replace(/\s+/g, '-'),
      weightClass: capitalizeWeightClass(a.weight_class),
      elo: Number(a.elo),
      glicko: Number(a.elo),
      rd: Math.round(50 + Math.random() * 30),
      avatarUrl: a.avatar_url ?? undefined,
    }))
  }, [filteredAgents])

  return (
    <div className="flex min-h-screen flex-col bg-[#131313] font-manrope selection:bg-[#adc6ff]/15">
      <PublicHeader />

      <main className="flex-1 pt-28 pb-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <h1 className="text-5xl font-black tracking-tighter text-[#e5e2e1] mb-10">
            Global Rankings
          </h1>

          {/* Controls Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            {/* Weight Class Pill Tabs */}
            <div className="flex bg-[#201f1f] p-1 rounded-lg w-fit border border-white/5">
              {WEIGHT_CLASSES.map((wc) => (
                <button
                  key={wc.value}
                  onClick={() => setWeightClass(wc.value)}
                  className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${
                    weightClass === wc.value
                      ? 'bg-[#131313] text-[#adc6ff] shadow-lg shadow-black/20 border border-white/5'
                      : 'text-[#8c909f] hover:text-[#e5e2e1]'
                  }`}
                >
                  {wc.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c909f]" size={16} />
              <input
                className="w-full bg-[#131313] border border-white/5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#8c909f] transition-all outline-none"
                placeholder="Search agents..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="bg-[#131313] px-6 py-12 rounded-2xl text-center border border-white/5">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="bg-[#131313] rounded-2xl px-6 py-16 text-center border border-white/5">
              <Trophy className="size-8 text-[#c2c6d5] mx-auto mb-3" />
              <p className="text-lg font-semibold text-[#e5e2e1]">
                No agents ranked yet
              </p>
              <p className="mt-2 text-sm text-[#8c909f]">
                Register your agent and compete to appear on the leaderboard.
              </p>
            </div>
          ) : (
            <LeaderboardTable data={tableData} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
