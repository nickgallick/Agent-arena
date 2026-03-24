'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { ProfileHeader } from '@/components/agent-profile/profile-header'
import { StatsGrid } from '@/components/agent-profile/stats-grid'
import { EloHistoryChart } from '@/components/agent-profile/elo-history-chart'
import { CategoryRadar } from '@/components/agent-profile/category-radar'
import { RecentChallenges } from '@/components/agent-profile/recent-challenges'
import { BadgesCollection } from '@/components/agent-profile/badges-collection'
import {
  History,
  Zap,
  MapPin,
  Activity,
  Key,
  Copy,
  Trash2,
  RefreshCw,
  Eye,
  AlertTriangle,
  SlidersHorizontal,
  Download,
  ChevronDown,
} from 'lucide-react'
import { formatElo, formatWinRate, formatDate, formatNumber, timeAgo } from '@/lib/utils/format'

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
      <PageWithSidebar>
        <div className="min-h-screen bg-surface">
          <Header />
          <main className="flex-1 pt-32 flex items-center justify-center pb-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
          </main>
          <Footer />
        </div>
      </PageWithSidebar>
    )
  }

  if (error || !agent) {
    return (
      <PageWithSidebar>
        <div className="min-h-screen bg-surface">
          <Header />
          <main className="flex-1 pt-32 flex items-center justify-center pb-24">
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 px-8 py-12 text-center">
              <p className="text-lg font-medium font-[family-name:var(--font-heading)] text-on-surface-variant">{error ?? 'Agent not found'}</p>
              <a href="/leaderboard" className="mt-4 inline-block text-sm font-[family-name:var(--font-heading)] text-primary hover:text-primary">
                Back to leaderboard
              </a>
            </div>
          </main>
          <Footer />
        </div>
      </PageWithSidebar>
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
  const totalMatches = totalWins + totalLosses
  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0'
  const currentStreak = primaryRating?.current_streak ?? 0

  return (
    <PageWithSidebar>
      <div className="min-h-screen bg-surface text-on-surface font-[family-name:var(--font-heading)] selection:bg-primary/30">
        <Header />
        <main className="pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-8">

          {/* Core Identity Section (Bento Style) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Agent Visual & Primary Identity */}
            <div className="lg:col-span-8 bg-surface-container-low p-8 rounded-xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center border border-outline-variant/10">
              <div className="relative w-48 h-48 flex-shrink-0 group">
                <div className="absolute inset-0 bg-primary/20 blur-3xl group-hover:bg-primary/40 transition-colors" />
                {agent.avatar_url ? (
                  <img
                    alt={`${agent.name} avatar`}
                    className="w-full h-full rounded-lg relative z-10 grayscale brightness-125 contrast-125 border border-primary/20"
                    src={agent.avatar_url}
                  />
                ) : (
                  <div className="w-full h-full rounded-lg relative z-10 grayscale brightness-125 contrast-125 border border-primary/20 bg-surface-container flex items-center justify-center text-5xl font-extrabold text-on-surface-variant">
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className={`absolute -bottom-2 -right-2 ${agent.is_active ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-outline'} px-3 py-1 rounded text-xs font-[family-name:var(--font-mono)] font-bold tracking-widest z-20`}>
                  {agent.is_active ? 'ACTIVE' : 'INACTIVE'}
                </div>
              </div>
              <div className="flex-grow space-y-4 text-center md:text-left">
                <div>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-primary/60 tracking-widest uppercase">
                    Agent Serial: {agent.id.slice(0, 8).toUpperCase()}
                  </span>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface mt-1">
                    {agent.name}
                  </h1>
                </div>
                {agent.bio && (
                  <p className="text-on-surface-variant leading-relaxed max-w-xl">
                    {agent.bio}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {agent.model_name && (
                    <span className="bg-surface-container-highest px-3 py-1.5 rounded text-[10px] font-[family-name:var(--font-mono)] text-secondary tracking-widest border border-secondary/10 uppercase">
                      Model: {agent.model_name}
                    </span>
                  )}
                  <span className="bg-surface-container-highest px-3 py-1.5 rounded text-[10px] font-[family-name:var(--font-mono)] text-secondary tracking-widest border border-secondary/10 uppercase">
                    Domain: {primaryRating?.weight_class_id?.toUpperCase() ?? 'OPEN'}
                  </span>
                  <span className="bg-surface-container-highest px-3 py-1.5 rounded text-[10px] font-[family-name:var(--font-mono)] text-secondary tracking-widest border border-secondary/10 uppercase">
                    Streak: {currentStreak}
                  </span>
                </div>
              </div>
            </div>

            {/* ELO & Performance Metrics */}
            <div className="lg:col-span-4 bg-surface-container p-8 rounded-xl border border-outline-variant/10 flex flex-col justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-6">Performance Matrix</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-outline-variant/10 pb-4">
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase">Current ELO</p>
                      <p className="text-4xl font-black text-primary font-[family-name:var(--font-mono)] tracking-tighter">{formatElo(elo)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-[family-name:var(--font-mono)] text-secondary uppercase">Best Placement</p>
                      <p className="text-2xl font-bold text-on-surface tracking-tighter">
                        {bestPlacement ? `#${bestPlacement}` : '--'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase">Win / Loss</p>
                      <p className="text-xl font-bold text-on-surface tracking-tighter font-[family-name:var(--font-mono)]">{totalWins} / {totalLosses}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase">Win Rate</p>
                      <p className="text-xl font-bold text-secondary tracking-tighter font-[family-name:var(--font-mono)]">{winRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  href={`/challenges?agent=${agent.id}`}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all rounded shadow-lg shadow-primary/10 block text-center"
                >
                  Initiate Challenge
                </Link>
              </div>
            </div>
          </section>

          {/* Performance Specs & Challenge History Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Performance Specs (Left Sidebar) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/10 h-full">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-on-surface-variant">Performance Specs</h3>
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-6">
                  {/* Win Rate Bar */}
                  <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/10">
                    <label className="block text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase mb-2">Win Rate</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-grow">
                        <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${winRate}%` }} />
                        </div>
                      </div>
                      <code className="text-sm font-[family-name:var(--font-mono)] text-primary">{winRate}%</code>
                    </div>
                  </div>

                  {/* Challenges Entered */}
                  <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/10">
                    <label className="block text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase mb-2">Challenges Entered</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-grow">
                        <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(totalChallenges, 100)}%` }} />
                        </div>
                      </div>
                      <code className="text-sm font-[family-name:var(--font-mono)] text-secondary">{formatNumber(totalChallenges)}</code>
                    </div>
                  </div>

                  {/* Current Streak */}
                  <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/10">
                    <label className="block text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase mb-2">Current Streak</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-grow">
                        <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.min(currentStreak * 10, 100)}%` }} />
                        </div>
                      </div>
                      <code className="text-sm font-[family-name:var(--font-mono)] text-tertiary">{currentStreak}</code>
                    </div>
                  </div>

                  {/* Category Info */}
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded">
                    <div className="flex gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">
                          {primaryRating?.weight_class_id
                            ? `${primaryRating.weight_class_id.charAt(0).toUpperCase() + primaryRating.weight_class_id.slice(1)} Division`
                            : 'Open Division'}
                        </p>
                        <p className="text-[11px] leading-relaxed text-on-surface-variant mt-1">
                          Challenges: {formatNumber(totalChallenges)} / Streak: {currentStreak}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Challenge History */}
            <div className="lg:col-span-7 bg-surface-container-low rounded-xl border border-outline-variant/10 flex flex-col">
              <div className="p-8 pb-4 flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-on-surface-variant">Challenge History</h3>
                <div className="flex gap-2">
                  <button className="bg-surface-container-high p-1.5 rounded hover:bg-primary/10 transition-colors">
                    <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" />
                  </button>
                  <button className="bg-surface-container-high p-1.5 rounded hover:bg-primary/10 transition-colors">
                    <Download className="w-4 h-4 text-on-surface-variant" />
                  </button>
                </div>
              </div>
              <div className="flex-grow overflow-hidden px-8 pb-8">
                <div className="w-full overflow-x-auto no-scrollbar">
                  {agent.recent_entries.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-outline font-[family-name:var(--font-heading)]">No challenges completed yet</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/10">
                          <th className="py-4 text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase tracking-widest">Challenge</th>
                          <th className="py-4 text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase tracking-widest">Category</th>
                          <th className="py-4 text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase tracking-widest">Outcome</th>
                          <th className="py-4 text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase tracking-widest text-right">ELO &Delta;</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {agent.recent_entries.map((entry) => (
                          <tr key={entry.challenge_id} className="hover:bg-surface-container/40 transition-colors group">
                            <td className="py-4">
                              <Link href={`/challenges/${entry.challenge_id}`} className="hover:text-primary transition-colors">
                                <p className="text-xs font-[family-name:var(--font-mono)] text-on-surface">
                                  {entry.title ?? 'Untitled'}
                                </p>
                                <p className="text-[10px] text-on-surface-variant">{formatDate(entry.created_at)}</p>
                              </Link>
                            </td>
                            <td className="py-4">
                              <span className="text-sm font-bold">{entry.category ?? '--'}</span>
                            </td>
                            <td className="py-4">
                              {entry.placement !== null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-mono)] ${
                                  entry.placement <= 3
                                    ? 'bg-secondary/10 text-secondary border border-secondary/20'
                                    : 'bg-outline-variant/10 text-on-surface-variant border border-outline-variant/20'
                                }`}>
                                  #{entry.placement}
                                </span>
                              ) : (
                                <span className="text-outline text-sm">--</span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              {entry.elo_change !== null ? (
                                <span className={`text-sm font-[family-name:var(--font-mono)] ${entry.elo_change >= 0 ? 'text-secondary' : 'text-error'}`}>
                                  {entry.elo_change >= 0 ? '+' : ''}{entry.elo_change}
                                </span>
                              ) : (
                                <span className="text-outline text-sm">--</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="mt-6 flex justify-center">
                  <Link
                    href={`/challenges?agent=${agent.id}`}
                    className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant hover:text-primary transition-colors tracking-widest uppercase flex items-center gap-2"
                  >
                    Load Full History
                    <ChevronDown className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* System Telemetry & Stats */}
          <section className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/10">
            <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-8">System Telemetry &amp; Performance Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {/* Mini Stats */}
              <div className="bg-surface-container-lowest p-4 rounded border-l-2 border-primary">
                <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase mb-1">Total Matches</p>
                <p className="text-xl font-bold font-[family-name:var(--font-mono)]">{formatNumber(totalMatches)}</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded border-l-2 border-secondary">
                <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase mb-1">Win Rate</p>
                <p className="text-xl font-bold font-[family-name:var(--font-mono)]">{winRate}%</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded border-l-2 border-tertiary">
                <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase mb-1">Best Place</p>
                <p className="text-xl font-bold font-[family-name:var(--font-mono)]">{bestPlacement ? `#${bestPlacement}` : '--'}</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded border-l-2 border-outline-variant">
                <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase mb-1">Streak</p>
                <p className="text-xl font-bold font-[family-name:var(--font-mono)]">{currentStreak}</p>
              </div>

              {/* Badges / Visual Element */}
              <div className="col-span-2 bg-surface-container-lowest p-4 rounded border border-outline-variant/10 flex items-center justify-center relative overflow-hidden">
                {agent.badges.length > 0 ? (
                  <div className="relative z-10 flex flex-wrap gap-2 justify-center">
                    {agent.badges.slice(0, 6).map((badge) => (
                      <div key={badge.id} className="flex flex-col items-center gap-1 p-2">
                        <span className="text-xl">{badge.icon ?? '?'}</span>
                        <span className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant">{badge.name ?? 'Unknown'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-end justify-between px-4 pb-4 gap-1">
                      <div className="w-full bg-primary/20 h-1/4 rounded-t" />
                      <div className="w-full bg-primary/20 h-2/4 rounded-t" />
                      <div className="w-full bg-primary/40 h-3/4 rounded-t" />
                      <div className="w-full bg-primary/60 h-2/4 rounded-t" />
                      <div className="w-full bg-primary/20 h-4/5 rounded-t" />
                      <div className="w-full bg-primary/30 h-1/2 rounded-t" />
                      <div className="w-full bg-primary/50 h-3/5 rounded-t" />
                    </div>
                    <p className="relative z-10 text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant uppercase tracking-widest">Spectral Activity</p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* System Event Log */}
          {agent.recent_entries.length > 0 && (
            <section className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/10">
              <h3 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-6">System Event Log</h3>
              <div className="space-y-4">
                {agent.recent_entries.slice(0, 5).map((entry) => (
                  <div key={`event-${entry.challenge_id}`} className="flex gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      entry.elo_change !== null && entry.elo_change >= 0 ? 'bg-secondary' : entry.elo_change !== null && entry.elo_change < 0 ? 'bg-error' : 'bg-surface-container-highest'
                    }`} />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-on-surface">
                        {entry.placement !== null && entry.placement <= 3
                          ? `Placed #${entry.placement} in "${entry.title ?? 'Challenge'}"`
                          : `Competed in "${entry.title ?? 'Challenge'}"`}
                      </p>
                      <p className="text-[10px] font-[family-name:var(--font-mono)] text-on-surface-variant">
                        {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
        <Footer />
      </div>
    </PageWithSidebar>
  )
}
