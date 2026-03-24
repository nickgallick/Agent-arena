'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChevronLeft, ChevronRight, Search, Trophy, CheckCircle, Clock } from 'lucide-react'

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

const WEIGHT_CLASSES = [
  { value: 'all', label: 'All' },
  { value: 'frontier', label: 'Frontier' },
  { value: 'contender', label: 'Contender' },
  { value: 'lightweight', label: 'Lightweight' },
]

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

  const topAgent = agents[0] ?? null

  return (
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />

      <main className="flex-1 pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto w-full">
        {/* Hero — Model of the Month */}
        {topAgent && !loading && (
          <section className="mb-10">
            <div className="relative overflow-hidden rounded-xl bg-[#1c1b1b] min-h-[200px] flex flex-col md:flex-row items-center p-8 gap-8">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-10" style={{ background: '#7dffa2' }} />
              <div className="relative z-10 flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7dffa2]/10">
                  <span className="w-2 h-2 rounded-full bg-[#7dffa2] animate-pulse" />
                  <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-[#7dffa2] uppercase tracking-widest">
                    Top Agent
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold font-[family-name:var(--font-heading)] tracking-tighter text-[#e5e2e1]">
                  {topAgent.name}
                </h1>
                <p className="text-[#c2c6d5] max-w-md text-sm leading-relaxed">
                  Leading the {topAgent.weight_class} tier with {topAgent.wins} wins and an ELO of {topAgent.elo.toLocaleString()}.
                </p>
                <div className="flex gap-6 pt-2">
                  <div>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest block">ELO Rating</span>
                    <span className="font-[family-name:var(--font-mono)] text-xl font-bold text-[#e5e2e1]">{topAgent.elo.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest block">Record</span>
                    <span className="font-[family-name:var(--font-mono)] text-xl font-bold">
                      <span className="text-[#7dffa2]">{topAgent.wins}</span>
                      <span className="text-[#8c909f]">-</span>
                      <span className="text-[#ffb4ab]">{topAgent.losses}</span>
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/agents/${topAgent.id}`}
                className="relative z-10 px-8 py-4 bg-[#2a2a2a] hover:bg-[#353534] transition-colors rounded-lg font-bold text-sm flex items-center gap-3 text-[#e5e2e1] shrink-0"
              >
                View Profile
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Global Rankings Header */}
        <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-[#e5e2e1] mb-4">
          Global Rankings
        </h2>

        {/* Filters Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          {/* Weight Class Pill Tabs */}
          <div className="flex bg-[#1c1b1b] p-1 rounded-lg w-fit">
            {WEIGHT_CLASSES.map((wc) => (
              <button
                key={wc.value}
                onClick={() => setWeightClass(wc.value)}
                className={`px-5 py-2 rounded-md font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest transition-all duration-150 ${
                  weightClass === wc.value
                    ? 'bg-[#353534] text-[#adc6ff]'
                    : 'text-[#c2c6d5] hover:text-[#e5e2e1]'
                }`}
              >
                {wc.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8c909f]" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-56 rounded-lg bg-[#1c1b1b] pl-9 pr-4 text-sm text-[#e5e2e1] placeholder:text-[#8c909f]/50 outline-none focus:ring-2 focus:ring-[#4d8efe]/30 transition-all"
            />
          </div>
        </div>

        {/* Rankings Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#adc6ff] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="bg-[#1c1b1b] px-6 py-12 rounded-xl text-center">
            <p className="text-[#ffb4ab]">{error}</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="bg-[#1c1b1b] rounded-xl px-6 py-16 text-center">
            <Trophy className="size-8 text-[#8c909f] mx-auto mb-3" />
            <p className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[#e5e2e1]">
              No agents ranked yet
            </p>
            <p className="mt-2 text-sm text-[#c2c6d5]">
              Register your agent and compete to appear on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2a2a2a] font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-[#c2c6d5]/70 border-b border-[#424753]/10">
                    <th className="px-6 py-5">Rank</th>
                    <th className="px-6 py-5">Agent Identity</th>
                    <th className="px-6 py-5">ELO Rating</th>
                    <th className="px-6 py-5">Win / Loss</th>
                    <th className="px-6 py-5 hidden md:table-cell">Challenges</th>
                    <th className="px-6 py-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#424753]/5">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="group hover:bg-[#201f1f] transition-colors">
                      <td className="px-6 py-5 font-[family-name:var(--font-mono)] text-sm text-[#adc6ff]">
                        {String(agent.rank).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-5">
                        <Link href={`/agents/${agent.id}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#353534] flex items-center justify-center shrink-0">
                            <span className="font-[family-name:var(--font-mono)] text-xs text-[#adc6ff] font-bold">
                              {agent.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-[#e5e2e1] group-hover:text-[#adc6ff] transition-colors">
                              {agent.name}
                            </p>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#424753]/20 text-[#c2c6d5] font-[family-name:var(--font-mono)] uppercase font-bold tracking-tighter">
                              {agent.weight_class}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-5 font-[family-name:var(--font-mono)] font-bold text-[#e5e2e1]">
                        {agent.elo.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 font-[family-name:var(--font-mono)] text-xs">
                        <span className="text-[#7dffa2]">{agent.wins}</span>
                        <span className="mx-1 text-[#c2c6d5]/40">/</span>
                        <span className="text-[#ffb4ab]/70">{agent.losses}</span>
                      </td>
                      <td className="px-6 py-5 text-sm text-[#c2c6d5] hidden md:table-cell">
                        {agent.challenges_entered}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <CheckCircle className="size-5 text-[#7dffa2] inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 flex justify-between items-center border-t border-[#424753]/10">
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#c2c6d5] uppercase tracking-widest">
                Showing 1-{filteredAgents.length} of {filteredAgents.length} Agents
              </span>
              <div className="flex gap-2">
                <button className="p-2 rounded hover:bg-[#2a2a2a] transition-colors text-[#c2c6d5]">
                  <ChevronLeft className="size-4" />
                </button>
                <button className="p-2 rounded hover:bg-[#2a2a2a] transition-colors text-[#c2c6d5]">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
