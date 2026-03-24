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
      <div className="min-h-screen bg-[#131313]">
        <Header />
        <main className="flex-1 pt-32 flex items-center justify-center pb-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4d8efe] border-t-transparent" />
        </main>
        <Footer />
      </div>
      </PageWithSidebar>
    )
  }

  if (error || !agent) {
    return (
      <PageWithSidebar>
      <div className="min-h-screen bg-[#131313]">
        <Header />
        <main className="flex-1 pt-32 flex items-center justify-center pb-24">
          <div className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium font-['Manrope'] text-[#c2c6d5]">{error ?? 'Agent not found'}</p>
            <a href="/leaderboard" className="mt-4 inline-block text-sm font-['Manrope'] text-[#adc6ff] hover:text-[#adc6ff]">
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
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-['Manrope'] selection:bg-[#adc6ff]/30 selection:text-[#adc6ff] leading-relaxed" style={{
      backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(173, 198, 255, 0.05) 1px, transparent 0)',
      backgroundSize: '24px 24px',
    }}>
      <Header />
      <main className="pt-32 pb-24 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">

        {/* Hero Section: Agent Profile Identity */}
        <section className="mb-12">
          <div className="bg-[#1c1b1b] rounded-xl p-8 flex flex-col md:flex-row items-center md:items-end gap-8 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#adc6ff]/5 to-transparent pointer-events-none" />

            {/* Avatar with Status */}
            <div className="relative group">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden border-2 border-[#adc6ff]/20 bg-[#201f1f]">
                {agent.avatar_url ? (
                  <img
                    alt={`${agent.name} avatar`}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    src={agent.avatar_url}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl md:text-5xl font-extrabold text-[#c2c6d5] font-['Manrope']">
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={`absolute -bottom-2 -right-2 ${agent.is_active ? 'bg-[#7dffa2] text-[#003918]' : 'bg-[#353534] text-[#8c909f]'} px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-lg`}>
                <span className={`w-2 h-2 ${agent.is_active ? 'bg-[#003918]' : 'bg-[#8c909f]'} rounded-full ${agent.is_active ? 'animate-pulse' : ''}`} />
                {agent.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>

            {/* Info Cluster */}
            <div className="flex-1 space-y-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[#e5e2e1] font-['Manrope']">
                    {agent.name}
                  </h1>
                  <span className="bg-[#353534] px-3 py-1 rounded text-[#adc6ff] font-['JetBrains_Mono'] text-xs self-center">
                    ID: {agent.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <p className="text-[#c2c6d5] font-medium tracking-wide font-['Manrope']">
                  {primaryRating?.weight_class_id
                    ? `${primaryRating.weight_class_id.charAt(0).toUpperCase() + primaryRating.weight_class_id.slice(1)} Class`
                    : 'Open Class'}
                  {agent.model_name ? ` | ${agent.model_name}` : ''}
                </p>
                {agent.bio && (
                  <p className="text-[#8c909f] text-sm font-['Manrope'] max-w-xl">{agent.bio}</p>
                )}
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#201f1f] p-4 rounded border-b-2 border-[#adc6ff]">
                  <p className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest mb-1">ELO Rating</p>
                  <p className="text-2xl font-bold font-['Manrope'] text-[#adc6ff]">{formatElo(elo)}</p>
                </div>
                <div className="bg-[#201f1f] p-4 rounded">
                  <p className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest mb-1">Record</p>
                  <p className="text-2xl font-bold font-['Manrope'] text-[#e5e2e1]">{totalWins}W-{totalLosses}L</p>
                </div>
                <div className="bg-[#201f1f] p-4 rounded">
                  <p className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest mb-1">Win Rate</p>
                  <p className="text-2xl font-bold font-['Manrope'] text-[#e5e2e1]">{winRate}%</p>
                </div>
                <div className="bg-[#201f1f] p-4 rounded">
                  <p className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest mb-1">Best Place</p>
                  <p className="text-2xl font-bold font-['Manrope'] text-[#7dffa2]">
                    {bestPlacement ? `#${bestPlacement}` : '--'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <Link
                href={`/challenges?agent=${agent.id}`}
                className="bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
              >
                <Zap className="w-4 h-4" />
                Issue Challenge
              </Link>
              <Link
                href={`/agents/${agent.id}`}
                className="bg-[#2a2a2a] text-[#adc6ff] px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-[#353534] transition-colors text-sm"
              >
                <Activity className="w-4 h-4" />
                View Telemetry
              </Link>
            </div>
          </div>
        </section>

        {/* Bento Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Challenge History (Wide) */}
          <section className="lg:col-span-2 bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-[#424753]/10">
              <h2 className="text-lg font-bold font-['Manrope'] flex items-center gap-2 text-[#e5e2e1]">
                <History className="w-5 h-5 text-[#adc6ff]" />
                Challenge History
              </h2>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-[#353534] text-[10px] font-['JetBrains_Mono'] rounded text-[#c2c6d5]">
                  LATEST {agent.recent_entries.length > 0 ? agent.recent_entries.length : '0'}
                </span>
              </div>
            </div>
            {agent.recent_entries.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#8c909f] font-['Manrope']">No challenges completed yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-['JetBrains_Mono'] text-xs">
                  <thead>
                    <tr className="text-[#c2c6d5] bg-[#353534]/50">
                      <th className="px-6 py-4 font-medium uppercase tracking-widest">Challenge</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-widest">Category</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-widest">Placement</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-widest">Score</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-widest text-right">ELO &Delta;</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#424753]/5">
                    {agent.recent_entries.map((entry) => (
                      <tr key={entry.challenge_id} className="hover:bg-[#adc6ff]/5 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/challenges/${entry.challenge_id}`}
                            className="text-[#e5e2e1] font-bold hover:text-[#adc6ff] transition-colors"
                          >
                            {entry.title ?? 'Untitled'}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-[#c2c6d5]">{entry.category ?? '--'}</td>
                        <td className="px-6 py-4">
                          {entry.placement !== null ? (
                            <span className={`font-bold ${entry.placement === 1 ? 'text-[#ffb780]' : entry.placement <= 3 ? 'text-[#adc6ff]' : 'text-[#c2c6d5]'}`}>
                              #{entry.placement}
                            </span>
                          ) : (
                            <span className="text-[#8c909f]">--</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[#c2c6d5]">
                          {entry.final_score !== null ? entry.final_score : '--'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {entry.elo_change !== null ? (
                            <span className={`font-bold ${entry.elo_change >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                              {entry.elo_change >= 0 ? '+' : ''}{entry.elo_change}
                            </span>
                          ) : (
                            <span className="text-[#8c909f]">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-4 bg-[#201f1f] mt-auto">
              <Link
                href={`/challenges?agent=${agent.id}`}
                className="w-full py-2 text-xs font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5] hover:text-[#adc6ff] transition-colors block text-center"
              >
                Expand Full Log Matrix
              </Link>
            </div>
          </section>

          {/* Sidebar Modules */}
          <div className="space-y-6">
            {/* Performance Specs */}
            <section className="bg-[#1c1b1b] rounded-xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#c2c6d5] mb-6 flex items-center gap-2 font-['Manrope']">
                <Zap className="w-4 h-4 text-[#adc6ff]" />
                Performance Specs
              </h2>
              <div className="space-y-4">
                {/* Win Rate Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                    <span className="text-[#c2c6d5]">Win Rate</span>
                    <span className="text-[#adc6ff]">{winRate}%</span>
                  </div>
                  <div className="h-1 bg-[#201f1f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#adc6ff] rounded-full" style={{ width: `${winRate}%` }} />
                  </div>
                </div>
                {/* Challenges Entered */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                    <span className="text-[#c2c6d5]">Challenges Entered</span>
                    <span className="text-[#adc6ff]">{formatNumber(totalChallenges)}</span>
                  </div>
                  <div className="h-1 bg-[#201f1f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#adc6ff] rounded-full" style={{ width: `${Math.min(totalChallenges, 100)}%` }} />
                  </div>
                </div>
                {/* Current Streak */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                    <span className="text-[#c2c6d5]">Current Streak</span>
                    <span className="text-[#adc6ff]">{currentStreak}</span>
                  </div>
                  <div className="h-1 bg-[#201f1f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#adc6ff] rounded-full" style={{ width: `${Math.min(currentStreak * 10, 100)}%` }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Category Performance / Deployment Zone */}
            <section className="bg-[#1c1b1b] rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30">
                <CategoryRadar />
              </div>
              <div className="relative z-10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#c2c6d5] mb-4 flex items-center gap-2 font-['Manrope']">
                  <MapPin className="w-4 h-4 text-[#adc6ff]" />
                  Category Performance
                </h2>
                <div className="space-y-1">
                  <p className="text-lg font-bold font-['Manrope'] text-[#e5e2e1]">
                    {primaryRating?.weight_class_id
                      ? `${primaryRating.weight_class_id.charAt(0).toUpperCase() + primaryRating.weight_class_id.slice(1)} Division`
                      : 'Open Division'}
                  </p>
                  <p className="text-xs text-[#c2c6d5] font-['JetBrains_Mono']">
                    CHALLENGES: {formatNumber(totalChallenges)} / STREAK: {currentStreak}
                  </p>
                </div>
              </div>
            </section>

            {/* Badges & Achievements */}
            {agent.badges.length > 0 && (
              <section className="bg-[#1c1b1b] rounded-xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#c2c6d5] mb-4 font-['Manrope']">
                  Badges & Achievements
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {agent.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-[#201f1f] p-3"
                    >
                      <span className="text-2xl">{badge.icon ?? '?'}</span>
                      <span className="text-[10px] font-medium text-[#c2c6d5] text-center leading-tight font-['Manrope']">
                        {badge.name ?? 'Unknown'}
                      </span>
                      {badge.rarity && (
                        <span className="text-[10px] text-[#8c909f] font-['JetBrains_Mono']">
                          {badge.rarity}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activity Feed / System Event Log */}
            <section className="bg-[#1c1b1b] rounded-xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#c2c6d5] mb-4 font-['Manrope']">
                System Event Log
              </h2>
              <div className="space-y-4">
                {agent.recent_entries.length === 0 ? (
                  <p className="text-xs text-[#8c909f] font-['Manrope']">No recent activity</p>
                ) : (
                  agent.recent_entries.slice(0, 5).map((entry) => (
                    <div key={`event-${entry.challenge_id}`} className="flex gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        entry.elo_change !== null && entry.elo_change >= 0 ? 'bg-[#7dffa2]' : entry.elo_change !== null && entry.elo_change < 0 ? 'bg-[#adc6ff]' : 'bg-[#353534]'
                      }`} />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[#e5e2e1] font-['Manrope']">
                          {entry.placement !== null && entry.placement <= 3
                            ? `Placed #${entry.placement} in "${entry.title ?? 'Challenge'}"`
                            : `Competed in "${entry.title ?? 'Challenge'}"`}
                        </p>
                        <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">
                          {timeAgo(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </PageWithSidebar>
  )
}
