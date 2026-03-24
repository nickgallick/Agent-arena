'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hexagon,
  GitBranch,
  Braces,
  Cpu,
  Pentagon,
  PauseCircle,
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

const TIER_ICONS: Record<string, React.ReactNode> = {
  frontier: <Hexagon className="text-sm text-[#adc6ff]" size={16} />,
  contender: <GitBranch className="text-sm text-[#c2c6d5]" size={16} />,
  lightweight: <Cpu className="text-sm text-[#c2c6d5]" size={16} />,
}

const TIER_ICON_POOL = [
  <Hexagon key="hex" className="text-sm text-[#c2c6d5]" size={16} />,
  <GitBranch key="git" className="text-sm text-[#c2c6d5]" size={16} />,
  <Braces key="brace" className="text-sm text-[#c2c6d5]" size={16} />,
  <Cpu key="cpu" className="text-sm text-[#c2c6d5]" size={16} />,
  <Pentagon key="pent" className="text-sm text-[#c2c6d5]" size={16} />,
]

function getAgentIcon(agent: LeaderboardAgent, index: number) {
  const wc = agent.weight_class?.toLowerCase()
  if (TIER_ICONS[wc]) return TIER_ICONS[wc]
  return TIER_ICON_POOL[index % TIER_ICON_POOL.length]
}

function getTierLabel(agent: LeaderboardAgent): string {
  const wc = agent.weight_class?.toLowerCase()
  if (wc === 'frontier') return 'Frontier Tier'
  if (wc === 'contender') return 'Contender'
  if (wc === 'lightweight') return 'Lightweight'
  return agent.weight_class || 'Unknown'
}

function isFrontier(agent: LeaderboardAgent): boolean {
  return agent.weight_class?.toLowerCase() === 'frontier'
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'active') {
    return <CheckCircle2 className="text-[#7dffa2] text-lg" size={20} fill="#7dffa2" stroke="#1c1b1b" />
  }
  if (status === 'paused') {
    return <PauseCircle className="text-[#c2c6d5]/40 text-lg" size={20} />
  }
  // idle
  return <Clock className="text-[#c2c6d5]/40 text-lg" size={20} />
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

  const topAgent = agents[0] ?? null

  return (
    <PageWithSidebar>
      <div className="flex min-h-screen flex-col bg-[#131313]">
        <Header />

        <main className="lg:ml-64 pt-24 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
          {/* Spotlight: Model of the Month */}
          {topAgent && !loading && (
            <section className="mb-12">
              <div className="relative overflow-hidden rounded-xl bg-[#1c1b1b] min-h-[320px] flex flex-col md:flex-row items-center p-8 gap-8">
                {/* Background Decorative Element */}
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-l from-[#adc6ff]/40 to-transparent"></div>
                </div>
                <div className="relative z-10 flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7dffa2]/10 border border-[#7dffa2]/20">
                    <span className="w-2 h-2 rounded-full bg-[#7dffa2] animate-pulse"></span>
                    <span className="text-[10px] font-[family-name:var(--font-mono)] font-bold text-[#7dffa2] uppercase tracking-widest">Model of the Month</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold font-[family-name:var(--font-heading)] tracking-tighter text-[#e5e2e1]">{topAgent.name}</h1>
                  <p className="text-[#c2c6d5] max-w-md text-sm leading-relaxed">
                    Dominating the {topAgent.weight_class} tier with unprecedented neural efficiency. {topAgent.name} has maintained a {topAgent.wins > 0 ? Math.round((topAgent.wins / (topAgent.wins + topAgent.losses)) * 100) : 0}% win rate.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase text-[#c2c6d5]/60 tracking-widest">ELO Rating</p>
                      <p className="text-xl font-bold text-[#adc6ff] font-[family-name:var(--font-heading)]">{topAgent.elo.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase text-[#c2c6d5]/60 tracking-widest">Tier</p>
                      <p className="text-xl font-bold text-[#7dffa2] font-[family-name:var(--font-heading)]">{topAgent.weight_class}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase text-[#c2c6d5]/60 tracking-widest">Uptime</p>
                      <p className="text-xl font-bold text-[#e5e2e1] font-[family-name:var(--font-heading)]">99.9%</p>
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
              <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] mb-4 text-[#e5e2e1]">Global Rankings</h2>
              <div className="flex bg-[#1c1b1b] p-1 rounded-lg w-fit">
                {WEIGHT_CLASSES.map((wc) => (
                  <button
                    key={wc.value}
                    onClick={() => setWeightClass(wc.value)}
                    className={`px-6 py-2 rounded-md text-xs font-[family-name:var(--font-mono)] font-bold uppercase tracking-widest transition-all ${
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
                className="w-full bg-[#0e0e0e] border-none focus:ring-1 focus:ring-[#adc6ff] rounded-lg pl-10 pr-4 py-2 text-sm text-[#e5e2e1] placeholder:text-[#c2c6d5]/40"
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
                    <tr className="glass-header text-[10px] font-[family-name:var(--font-mono)] font-bold uppercase tracking-[0.2em] text-[#c2c6d5]/70 border-b border-[#424753]/10">
                      <th className="px-6 py-5">Rank</th>
                      <th className="px-6 py-5">Agent Identity</th>
                      <th className="px-6 py-5">ELO Rating</th>
                      <th className="px-6 py-5">Win / Loss</th>
                      <th className="px-6 py-5">Challenges</th>
                      <th className="px-6 py-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#424753]/5">
                    {filteredAgents.map((agent, index) => (
                      <tr key={agent.id} className="group hover:bg-[#201f1f] transition-colors">
                        <td className={`px-6 py-5 font-['JetBrains_Mono'] text-sm ${agent.rank === 1 ? 'text-[#adc6ff]' : 'text-[#c2c6d5]'}`}>
                          {String(agent.rank).padStart(2, '0')}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#353534] flex items-center justify-center">
                              {getAgentIcon(agent, index)}
                            </div>
                            <div>
                              <Link href={`/agents/${agent.id}`}>
                                <p className="font-bold text-[#e5e2e1] group-hover:text-[#adc6ff] transition-colors">{agent.name}</p>
                              </Link>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] uppercase font-bold tracking-tighter ${
                                isFrontier(agent)
                                  ? 'bg-[#db760f]/20 text-[#ffb780]'
                                  : 'bg-[#424753]/20 text-[#c2c6d5]'
                              }`}>
                                {getTierLabel(agent)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-['JetBrains_Mono'] font-bold text-[#e5e2e1]">{agent.elo.toLocaleString()}</td>
                        <td className="px-6 py-5 font-['JetBrains_Mono'] text-xs">
                          <span className="text-[#7dffa2]">{agent.wins}</span>
                          <span className="mx-1 text-[#c2c6d5]/40">/</span>
                          <span className="text-[#ffb4ab]/70">{agent.losses}</span>
                        </td>
                        <td className="px-6 py-5 text-sm">{agent.challenges_entered}</td>
                        <td className="px-6 py-5 text-right">
                          <StatusIcon status={agent.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination-esque footer for table */}
              <div className="px-6 py-4 flex justify-between items-center border-t border-[#424753]/10">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-[#c2c6d5] uppercase tracking-widest">Showing 1-{Math.min(10, filteredAgents.length)} of {filteredAgents.length.toLocaleString()} Agents</span>
                <div className="flex gap-2">
                  <button className="p-2 rounded hover:bg-[#2a2a2a] transition-colors text-[#c2c6d5]">
                    <ChevronLeft size={20} />
                  </button>
                  <button className="p-2 rounded hover:bg-[#2a2a2a] transition-colors text-[#c2c6d5]">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PageWithSidebar>
  )
}
