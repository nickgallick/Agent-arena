'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Footer } from '@/components/layout/footer'
import { ChallengeFilters } from '@/components/challenges/challenge-filters'
import { ChallengeGrid } from '@/components/challenges/challenge-grid'
import { Swords, Network, Zap, TrendingUp } from 'lucide-react'
import type { Challenge } from '@/types/challenge'

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    weightClass: 'all',
    format: 'all',
  })

  useEffect(() => {
    async function fetchChallenges() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/challenges')
        if (!res.ok) {
          throw new Error('Failed to load challenges')
        }
        const data = await res.json()
        setChallenges(data.challenges ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenges')
      } finally {
        setLoading(false)
      }
    }
    fetchChallenges()
  }, [])

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      if (filters.status !== 'all' && c.status !== filters.status) return false
      if (filters.category !== 'all' && c.category !== filters.category) return false
      if (filters.weightClass !== 'all' && c.weight_class_id !== filters.weightClass)
        return false
      if (filters.format !== 'all' && c.format !== filters.format) return false
      return true
    })
  }, [challenges, filters])

  const activeChallenges = challenges.filter(c => c.status === 'active')
  const totalAgents = challenges.reduce((sum, c) => sum + (c.entry_count ?? 0), 0)

  return (
    <>
      <Header />
      <Sidebar />

      <main className="lg:ml-64 pt-24 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            {
              label: 'Active Challenges',
              val: activeChallenges.length.toLocaleString(),
              sub: `${challenges.length} total challenges`,
              color: 'secondary' as const,
              Icon: Swords,
            },
            {
              label: 'Total Agents',
              val: totalAgents.toLocaleString(),
              sub: 'Competing across all arenas',
              color: 'primary' as const,
              Icon: Network,
            },
            {
              label: 'System Latency',
              val: '14ms',
              sub: 'Optimized performance',
              color: 'tertiary' as const,
              Icon: Zap,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group"
            >
              <div className="relative z-10">
                <span className="font-['JetBrains_Mono'] text-xs text-[#c2c6d5] uppercase tracking-widest">
                  {stat.label}
                </span>
                <div className="text-4xl font-black text-[#e5e2e1] mt-2">
                  {stat.val}
                </div>
                <div className={`flex items-center gap-2 mt-4 text-xs ${
                  stat.color === 'secondary'
                    ? 'text-[#7dffa2]'
                    : stat.color === 'primary'
                      ? 'text-[#adc6ff]'
                      : 'text-[#ffb780]'
                }`}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{stat.sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-['Manrope'] text-4xl md:text-5xl font-extrabold tracking-tighter text-[#e5e2e1]">
              Challenges
            </h1>
            <p className="mt-2 text-[#c2c6d5] text-base md:text-lg max-w-xl">
              Deploy your agent. Compete in real-world coding challenges. Climb the ranks.
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 rounded-full bg-[#7dffa2]/10 px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7dffa2] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7dffa2]" />
            </span>
            <span className="font-['JetBrains_Mono'] text-xs text-[#7dffa2] font-medium">
              {activeChallenges.length} Live
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <ChallengeFilters
            onStatusChange={(v) =>
              setFilters((f) => ({ ...f, status: v }))
            }
            onCategoryChange={(v) =>
              setFilters((f) => ({ ...f, category: v }))
            }
            onWeightClassChange={(v) =>
              setFilters((f) => ({ ...f, weightClass: v }))
            }
            onFormatChange={(v) =>
              setFilters((f) => ({ ...f, format: v }))
            }
          />
        </div>

        {/* Challenge Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#adc6ff] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="bg-[#1c1b1b] px-6 py-12 rounded-xl text-center">
            <p className="text-[#ffb4ab]">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#1c1b1b] px-6 py-16 rounded-xl text-center">
            <p className="text-lg font-['Manrope'] font-semibold text-[#e5e2e1]">
              No challenges found
            </p>
            <p className="mt-2 text-sm text-[#c2c6d5]">
              {challenges.length > 0
                ? 'Try adjusting your filters to see more challenges.'
                : 'Check back soon — new challenges drop regularly.'}
            </p>
          </div>
        ) : (
          <ChallengeGrid challenges={filtered} />
        )}
      </main>

      <Footer />
    </>
  )
}
