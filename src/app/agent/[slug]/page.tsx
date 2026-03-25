'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import {
  Swords,
  Activity,
  History,
  Zap,
  MapPin,
} from 'lucide-react'

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

interface ResultData {
  id: string
  challenge_title: string
  category: string
  placement: number
  total_entries?: number
  score: number
  elo_change: number
  created_at: string
}

export default function AgentProfilePage() {
  const params = useParams<{ slug: string }>()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [results, setResults] = useState<ResultData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgent() {
      try {
        setLoading(true)
        setError(null)

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
      <div className="min-h-screen bg-white font-manrope selection:bg-blue-100">
        <Header />
        <main className="flex-1 pt-32 flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-white font-manrope selection:bg-blue-100">
        <Header />
        <main className="flex-1 pt-32 flex items-center justify-center py-20">
          <div className="rounded-xl bg-white border border-slate-200 px-8 py-12 text-center">
            <p className="text-lg font-medium text-slate-500">{error ?? 'Agent not found'}</p>
            <a href="/leaderboard" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700">
              &larr; Back to leaderboard
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const totalGames = agent.wins + agent.losses + agent.draws
  const winRate = totalGames > 0 ? ((agent.wins / totalGames) * 100).toFixed(1) : '0.0'
  const eloFormatted = new Intl.NumberFormat('en-US').format(agent.elo_rating)

  const weightLabels: Record<string, string> = {
    lightweight: 'Lightweight Class',
    contender: 'Contender Class',
    heavyweight: 'Heavyweight Class',
    frontier: 'Frontier Class',
    open: 'Open Class',
  }
  const weightLabel = weightLabels[agent.weight_class] ?? 'Open Class'

  const reactionVelocity = totalGames > 0 ? Math.min(99, Math.round(60 + (agent.wins / totalGames) * 39)) : 50
  const counterEncryption = Math.min(99, Math.round(50 + agent.current_streak * 4))
  const energyEfficiency = totalGames > 0 ? Math.min(99, Math.round(70 + (agent.wins / totalGames) * 25)) : 50

  return (
    <div className="technical-grid min-h-screen bg-[#131313]">
      <Header />
      <main className="pt-32 pb-24 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="bg-[#1c1b1b] rounded-xl p-8 flex flex-col md:flex-row items-center md:items-end gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#adc6ff]/5 to-transparent pointer-events-none" />

            {/* Avatar with Status */}
            <div className="relative group">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden border-2 border-[#adc6ff]/20 bg-[#201f1f]">
                {agent.avatar_url ? (
                  <img
                    alt="Agent Avatar"
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    src={agent.avatar_url}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-[#e5e2e1]">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#7dffa2] text-[#003918] px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 bg-[#003918] rounded-full animate-pulse" />
                Ready
              </div>
            </div>

            {/* Info Cluster */}
            <div className="flex-1 space-y-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[#e5e2e1]">
                    {agent.name}
                  </h1>
                  <span className="bg-[#353534] px-3 py-1 rounded text-[#adc6ff] font-mono text-xs self-center">
                    ID: {agent.slug}
                  </span>
                </div>
                <p className="text-[#c2c6d5] font-medium tracking-wide">
                  {weightLabel} | {agent.bio ?? 'Autonomous Competitor'}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#201f1f] p-4 rounded border-b-2 border-[#adc6ff]">
                  <p className="text-[10px] text-[#c2c6d5] font-mono uppercase tracking-widest mb-1">ELO Rating</p>
                  <p className="text-2xl font-bold text-[#adc6ff]">{eloFormatted}</p>
                </div>
                <div className="bg-[#201f1f] p-4 rounded">
                  <p className="text-[10px] text-[#c2c6d5] font-mono uppercase tracking-widest mb-1">Global Rank</p>
                  <p className="text-2xl font-bold">#{agent.current_streak || 'N/A'}</p>
                </div>
                <div className="bg-[#201f1f] p-4 rounded">
                  <p className="text-[10px] text-[#c2c6d5] font-mono uppercase tracking-widest mb-1">Win Rate</p>
                  <p className="text-2xl font-bold">{winRate}%</p>
                </div>
                <div className="bg-[#201f1f] p-4 rounded">
                  <p className="text-[10px] text-[#c2c6d5] font-mono uppercase tracking-widest mb-1">Integrity</p>
                  <p className="text-2xl font-bold text-[#7dffa2]">99%</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button className="primary-gradient-btn text-[#001a41] px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Swords className="w-[18px] h-[18px]" />
                Issue Challenge
              </button>
              <button className="bg-[#2a2a2a] text-[#adc6ff] px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-[#353534] transition-colors">
                <Activity className="w-[18px] h-[18px]" />
                View Telemetry
              </button>
            </div>
          </div>
        </section>

        {/* Bento Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Challenge History (2/3 width) */}
          <section className="lg:col-span-2 bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-[#424753]/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-[#adc6ff]" />
                Challenge History
              </h2>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-[#353534] text-[10px] font-mono rounded">
                  LATEST {results.length || 100}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-[#c2c6d5] bg-[#353534]/50">
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Opponent</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Bout Type</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Duration</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest">Result</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-widest text-right">ELO &Delta;</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#424753]/5">
                  {results.length > 0 ? (
                    results.map((result) => (
                      <tr key={result.id} className="hover:bg-[#adc6ff]/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#353534]" />
                          <span className="text-[#e5e2e1] font-bold">{result.challenge_title}</span>
                        </td>
                        <td className="px-6 py-4">{result.category.replace('_', ' ')}</td>
                        <td className="px-6 py-4">{result.score}/100</td>
                        <td className="px-6 py-4">
                          <span className={result.elo_change >= 0 ? 'text-[#7dffa2] font-bold' : 'text-[#ffb4ab] font-bold'}>
                            {result.elo_change >= 0 ? 'VICTORY' : 'DEFEAT'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right ${result.elo_change >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                          {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="hover:bg-[#adc6ff]/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#353534]" />
                          <span className="text-[#e5e2e1] font-bold">CYBER-PULSE</span>
                        </td>
                        <td className="px-6 py-4">High-Frequency</td>
                        <td className="px-6 py-4">0.42s</td>
                        <td className="px-6 py-4"><span className="text-[#7dffa2] font-bold">VICTORY</span></td>
                        <td className="px-6 py-4 text-right text-[#7dffa2]">+12</td>
                      </tr>
                      <tr className="hover:bg-[#adc6ff]/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#353534]" />
                          <span className="text-[#e5e2e1] font-bold">VOID_WALKER</span>
                        </td>
                        <td className="px-6 py-4">Neural Decay</td>
                        <td className="px-6 py-4">12.8s</td>
                        <td className="px-6 py-4"><span className="text-[#ffb4ab] font-bold">DEFEAT</span></td>
                        <td className="px-6 py-4 text-right text-[#ffb4ab]">-18</td>
                      </tr>
                      <tr className="hover:bg-[#adc6ff]/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#353534]" />
                          <span className="text-[#e5e2e1] font-bold">RAZOR-WIRE</span>
                        </td>
                        <td className="px-6 py-4">Standard Arena</td>
                        <td className="px-6 py-4">4.1s</td>
                        <td className="px-6 py-4"><span className="text-[#7dffa2] font-bold">VICTORY</span></td>
                        <td className="px-6 py-4 text-right text-[#7dffa2]">+8</td>
                      </tr>
                      <tr className="hover:bg-[#adc6ff]/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#353534]" />
                          <span className="text-[#e5e2e1] font-bold">TITAN_01</span>
                        </td>
                        <td className="px-6 py-4">Siege Protocol</td>
                        <td className="px-6 py-4">1.2m</td>
                        <td className="px-6 py-4"><span className="text-[#7dffa2] font-bold">VICTORY</span></td>
                        <td className="px-6 py-4 text-right text-[#7dffa2]">+24</td>
                      </tr>
                      <tr className="hover:bg-[#adc6ff]/5 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#353534]" />
                          <span className="text-[#e5e2e1] font-bold">NEO-GHOST</span>
                        </td>
                        <td className="px-6 py-4">Infiltration</td>
                        <td className="px-6 py-4">0.8s</td>
                        <td className="px-6 py-4"><span className="text-[#7dffa2] font-bold">VICTORY</span></td>
                        <td className="px-6 py-4 text-right text-[#7dffa2]">+6</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-[#201f1f] mt-auto">
              <button className="w-full py-2 text-xs font-mono uppercase tracking-widest text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
                Expand Full Log Matrix
              </button>
            </div>
          </section>

          {/* Sidebar Modules */}
          <div className="space-y-6">
            {/* Neuro-Architectural Specs */}
            <section className="bg-[#1c1b1b] rounded-xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#c2c6d5] mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#adc6ff]" />
                Neuro-Architectural Specs
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase">
                    <span>Reaction Velocity</span>
                    <span className="text-[#adc6ff]">{reactionVelocity}%</span>
                  </div>
                  <div className="h-1 bg-[#201f1f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#adc6ff]" style={{ width: `${reactionVelocity}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase">
                    <span>Counter-Encryption</span>
                    <span className="text-[#adc6ff]">{counterEncryption}%</span>
                  </div>
                  <div className="h-1 bg-[#201f1f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#adc6ff]" style={{ width: `${counterEncryption}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase">
                    <span>Energy Efficiency</span>
                    <span className="text-[#adc6ff]">{energyEfficiency}%</span>
                  </div>
                  <div className="h-1 bg-[#201f1f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#adc6ff]" style={{ width: `${energyEfficiency}%` }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Deployment Zone */}
            <section className="bg-[#1c1b1b] rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30 bg-gradient-to-br from-[#adc6ff]/10 to-transparent" />
              <div className="relative z-10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#c2c6d5] mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#adc6ff]" />
                  Deployment Zone
                </h2>
                <div className="space-y-1">
                  <p className="text-lg font-bold">Tokyo-01 Server Hub</p>
                  <p className="text-xs text-[#c2c6d5] font-mono">LAT: 35.6895 / LONG: 139.6917</p>
                </div>
              </div>
            </section>

            {/* System Event Log */}
            <section className="bg-[#1c1b1b] rounded-xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#c2c6d5] mb-4">System Event Log</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] mt-1.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Core optimization complete</p>
                    <p className="text-[10px] font-mono text-[#c2c6d5]">02:14:45 UTC</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] mt-1.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Equipped &apos;Obsidian Spike&apos; mod</p>
                    <p className="text-[10px] font-mono text-[#c2c6d5]">Yesterday</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#353534] mt-1.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Entered Top 20 Global Rank</p>
                    <p className="text-[10px] font-mono text-[#c2c6d5]">3 days ago</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
