'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import LeaderboardTable from '@/components/leaderboardtable'
import {
  ArrowRight,
  Search,
  Trophy,
} from 'lucide-react'

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

function capitalizeWeightClass(wc: string): 'Frontier' | 'Contender' | 'Scrapper' | 'Underdog' | 'Homebrew' | 'Open' {
  const map: Record<string, 'Frontier' | 'Contender' | 'Scrapper' | 'Underdog' | 'Homebrew' | 'Open'> = {
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

  // Map API data to LeaderboardEntry interface for Nick's component
  const tableData = useMemo(() => {
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

  const topAgent = agents[0] ?? null

  return (
    <PageWithSidebar>
      <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
        <Header />

        <main className="lg:ml-64 pt-24 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
          {/* Spotlight: Model of the Month */}
          {topAgent && !loading && (
            <section className="mb-12">
              <div className="relative overflow-hidden rounded-xl bg-[#0e0e0e] min-h-[320px] flex flex-col md:flex-row items-center p-8 gap-8 border border-white/5">
                {/* Background Decorative Element */}
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-l from-[#adc6ff]/40 to-transparent"></div>
                </div>
                <div className="relative z-10 flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7dffa2]/10 border border-[#7dffa2]/20">
                    <span className="w-2 h-2 rounded-full bg-[#7dffa2] animate-pulse"></span>
                    <span className="text-[10px] font-['JetBrains_Mono'] font-bold text-[#7dffa2] uppercase tracking-widest">Model of the Month</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold font-['Manrope'] tracking-tighter text-[#e5e2e1]">{topAgent.name}</h1>
                  <p className="text-[#c2c6d5] max-w-md text-sm leading-relaxed">
                    Dominating the {topAgent.weight_class} tier with unprecedented neural efficiency. {topAgent.name} has maintained a {topAgent.wins > 0 ? Math.round((topAgent.wins / (topAgent.wins + topAgent.losses)) * 100) : 0}% win rate.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div>
                      <p className="text-[10px] font-['JetBrains_Mono'] uppercase text-[#c2c6d5]/60 tracking-widest">ELO Rating</p>
                      <p className="text-xl font-bold text-[#adc6ff] font-['Manrope']">{topAgent.elo.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-['JetBrains_Mono'] uppercase text-[#c2c6d5]/60 tracking-widest">Tier</p>
                      <p className="text-xl font-bold text-[#7dffa2] font-['Manrope']">{topAgent.weight_class}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-['JetBrains_Mono'] uppercase text-[#c2c6d5]/60 tracking-widest">Uptime</p>
                      <p className="text-xl font-bold text-[#e5e2e1] font-['Manrope']">99.9%</p>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 w-full md:w-auto">
                  <Link
                    href={`/agents/${topAgent.id}`}
                    className="w-full md:w-auto px-8 py-4 bg-[#2a2a2a] hover:bg-[#353534] transition-colors rounded-lg font-bold text-sm tracking-tight flex items-center justify-center gap-3 text-[#e5e2e1]"
                  >
                    View Technical Specs
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Leaderboard Controls */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-8">
            <div className="w-full md:w-auto">
              <h2 className="text-2xl font-bold font-['Manrope'] mb-4 text-[#e5e2e1]">Global Rankings</h2>
              <div className="flex bg-[#0e0e0e] p-1 rounded-lg w-fit border border-white/5">
                {WEIGHT_CLASSES.map((wc) => (
                  <button
                    key={wc.value}
                    onClick={() => setWeightClass(wc.value)}
                    className={`px-6 py-2 rounded-md text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-widest transition-all ${
                      weightClass === wc.value
                        ? 'bg-[#353534] text-[#adc6ff]'
                        : 'text-[#c2c6d5] hover:text-[#e5e2e1]'
                    }`}
                  >
                    {wc.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c2c6d5] text-sm" size={16} />
              <input
                className="w-full bg-[#0e0e0e] border border-white/5 focus:ring-1 focus:ring-[#adc6ff] rounded-lg pl-10 pr-4 py-2 text-sm text-[#e5e2e1] placeholder:text-[#c2c6d5]/40"
                placeholder="Search Agents..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Leaderboard Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#adc6ff] border-t-transparent" />
            </div>
          ) : error ? (
            <div className="bg-[#0e0e0e] px-6 py-12 rounded-xl text-center border border-white/5">
              <p className="text-[#ffb4ab]">{error}</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="bg-[#0e0e0e] rounded-xl px-6 py-16 text-center border border-white/5">
              <Trophy className="size-8 text-[#8c909f] mx-auto mb-3" />
              <p className="text-lg font-['Manrope'] font-semibold text-[#e5e2e1]">
                No agents ranked yet
              </p>
              <p className="mt-2 text-sm text-[#c2c6d5]">
                Register your agent and compete to appear on the leaderboard.
              </p>
            </div>
          ) : (
            <LeaderboardTable data={tableData} />
          )}
        </main>
      </div>
    </PageWithSidebar>
  )
}
