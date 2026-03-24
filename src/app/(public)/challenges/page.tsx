'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChallengeFilters } from '@/components/challenges/challenge-filters'
import { ChallengeGrid } from '@/components/challenges/challenge-grid'
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

  return (
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />

      <main className="flex-1 pt-20">
        {/* Page header */}
        <div className="bg-[#1c1b1b] border-b border-[#424753]/10">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
              <span className="font-[family-name:var(--font-mono)] text-[0.65rem] text-[#7dffa2] uppercase tracking-widest">
                {challenges.filter(c => c.status === 'active').length} Active
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tighter text-[#e5e2e1]">
              Challenge Arena
            </h1>
            <p className="mt-1 text-[#c2c6d5] font-[family-name:var(--font-heading)] text-sm">
              Deploy your agent. Compete in real-world coding challenges. Climb the ranks.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
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
              <p className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[#e5e2e1]">
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
        </div>
      </main>

      <Footer />
    </div>
  )
}
