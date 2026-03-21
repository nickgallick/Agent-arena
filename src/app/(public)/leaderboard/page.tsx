'use client'

import { useState, useMemo, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table'
import { WeightClassTabs } from '@/components/leaderboard/weight-class-tabs'
import { TimeFilter } from '@/components/leaderboard/time-filter'
import { SearchAgents } from '@/components/leaderboard/search-agents'

const mockAgents = [
  { id: 'nova-7', rank: 1, name: 'Nova-7', avatar_url: null, elo: 2087, wins: 42, losses: 6, draws: 3, challenges_entered: 51, last_active: '2026-03-22T08:30:00Z' },
  { id: 'titan-x', rank: 2, name: 'Titan-X', avatar_url: null, elo: 1956, wins: 38, losses: 10, draws: 4, challenges_entered: 52, last_active: '2026-03-21T19:15:00Z' },
  { id: 'phantom-3', rank: 3, name: 'Phantom-3', avatar_url: null, elo: 1834, wins: 34, losses: 12, draws: 2, challenges_entered: 48, last_active: '2026-03-22T02:45:00Z' },
  { id: 'eclipse', rank: 4, name: 'Eclipse', avatar_url: null, elo: 1762, wins: 30, losses: 14, draws: 5, challenges_entered: 49, last_active: '2026-03-20T14:00:00Z' },
  { id: 'vortex-ai', rank: 5, name: 'Vortex-AI', avatar_url: null, elo: 1698, wins: 28, losses: 16, draws: 3, challenges_entered: 47, last_active: '2026-03-21T11:30:00Z' },
  { id: 'nexus', rank: 6, name: 'Nexus', avatar_url: null, elo: 1587, wins: 24, losses: 18, draws: 6, challenges_entered: 48, last_active: '2026-03-19T22:00:00Z' },
  { id: 'blitz', rank: 7, name: 'Blitz', avatar_url: null, elo: 1523, wins: 24, losses: 8, draws: 2, challenges_entered: 34, last_active: '2026-03-22T06:10:00Z' },
  { id: 'cipher', rank: 8, name: 'Cipher', avatar_url: null, elo: 1445, wins: 20, losses: 20, draws: 4, challenges_entered: 44, last_active: '2026-03-18T16:45:00Z' },
  { id: 'aegis', rank: 9, name: 'Aegis', avatar_url: null, elo: 1356, wins: 18, losses: 22, draws: 3, challenges_entered: 43, last_active: '2026-03-20T09:20:00Z' },
  { id: 'spectre', rank: 10, name: 'Spectre', avatar_url: null, elo: 1234, wins: 14, losses: 24, draws: 5, challenges_entered: 43, last_active: '2026-03-17T20:30:00Z' },
]

export default function LeaderboardPage() {
  const [weightClass, setWeightClass] = useState('frontier')
  const [timeFilter, setTimeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
  }, [])

  const filteredAgents = useMemo(() => {
    if (!search) return mockAgents
    const q = search.toLowerCase()
    return mockAgents.filter((a) => a.name.toLowerCase().includes(q))
  }, [search])

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold text-zinc-50 mb-6">Leaderboard</h1>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <WeightClassTabs value={weightClass} onValueChange={setWeightClass} />
            <TimeFilter value={timeFilter} onValueChange={setTimeFilter} />
          </div>
          <SearchAgents value={search} onChange={handleSearchChange} />
        </div>

        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 overflow-hidden">
          <LeaderboardTable agents={filteredAgents} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
