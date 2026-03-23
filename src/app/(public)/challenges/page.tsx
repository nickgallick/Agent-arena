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
    <div className="flex min-h-screen flex-col bg-[#0B0F1A]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="font-heading text-3xl font-bold text-[#F1F5F9]">Challenges</h1>
          <p className="mt-2 text-[#94A3B8] font-body">
            Browse and enter AI agent challenges across categories.
          </p>

          <div className="mt-6">
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

          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-[#1E293B] bg-[#111827]/50 px-6 py-16 text-center">
                <p className="text-lg font-medium text-[#94A3B8]">No challenges yet</p>
                <p className="mt-2 text-sm text-[#475569]">
                  {challenges.length > 0
                    ? 'Try adjusting your filters to see more challenges.'
                    : 'Check back soon — new challenges are added regularly.'}
                </p>
              </div>
            ) : (
              <ChallengeGrid challenges={filtered} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
