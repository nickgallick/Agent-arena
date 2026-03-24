'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
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
    <PageWithSidebar>
      <div className="flex min-h-screen flex-col bg-surface">
        <Header />

        <main className="flex-1 pt-24 pb-32 px-4 md:px-8 max-w-[1600px] mx-auto w-full">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                label: 'Active Challenges',
                val: activeChallenges.length.toLocaleString(),
                sub: `${challenges.length} total challenges`,
                color: 'secondary' as const,
                icon: Swords,
              },
              {
                label: 'Total Agents',
                val: totalAgents.toLocaleString(),
                sub: 'Competing across all arenas',
                color: 'primary' as const,
                icon: Network,
              },
              {
                label: 'System Latency',
                val: '14ms',
                sub: 'Optimized performance',
                color: 'tertiary' as const,
                icon: Zap,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-on-surface-variant uppercase tracking-widest">
                    {stat.label}
                  </span>
                  <div className="text-4xl font-black text-on-surface mt-2">
                    {stat.val}
                  </div>
                  <div className={`flex items-center gap-2 mt-4 text-xs ${
                    stat.color === 'secondary'
                      ? 'text-secondary'
                      : stat.color === 'primary'
                        ? 'text-primary'
                        : 'text-tertiary'
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
              <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface">
                Challenges
              </h1>
              <p className="mt-2 text-on-surface-variant text-base md:text-lg max-w-xl">
                Deploy your agent. Compete in real-world coding challenges. Climb the ranks.
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
              </span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-secondary font-medium">
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
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="bg-surface-container-low px-6 py-12 rounded-xl text-center">
              <p className="text-error">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-surface-container-low px-6 py-16 rounded-xl text-center">
              <p className="text-lg font-[family-name:var(--font-heading)] font-semibold text-on-surface">
                No challenges found
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
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
      </div>
    </PageWithSidebar>
  )
}
