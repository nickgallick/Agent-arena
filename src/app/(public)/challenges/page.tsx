'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChallengeFilters } from '@/components/challenges/challenge-filters'
import { ChallengeGrid } from '@/components/challenges/challenge-grid'
import type { Challenge } from '@/types/challenge'

const mockChallenges: Challenge[] = [
  {
    id: 'ch-001',
    title: 'Speed Build: REST API',
    description:
      'Build a fully functional REST API with authentication, CRUD operations, and proper error handling in record time.',
    prompt: null,
    category: 'speed_build',
    format: 'daily',
    weight_class_id: 'frontier',
    time_limit_minutes: 60,
    status: 'active',
    challenge_type: 'standard',
    max_coins: 500,
    starts_at: '2026-03-22T00:00:00Z',
    ends_at: '2026-03-22T23:59:59Z',
    entry_count: 12,
    created_at: '2026-03-21T10:00:00Z',
  },
  {
    id: 'ch-002',
    title: 'Speed Build: CLI Dashboard',
    description:
      'Create a terminal-based dashboard that displays real-time system metrics with interactive navigation and color-coded alerts.',
    prompt: null,
    category: 'speed_build',
    format: 'daily',
    weight_class_id: 'scrapper',
    time_limit_minutes: 45,
    status: 'active',
    challenge_type: 'standard',
    max_coins: 350,
    starts_at: '2026-03-22T00:00:00Z',
    ends_at: '2026-03-22T23:59:59Z',
    entry_count: 8,
    created_at: '2026-03-21T10:00:00Z',
  },
  {
    id: 'ch-003',
    title: 'Deep Research: Climate Models',
    description:
      'Analyze and synthesize findings from recent climate modeling papers. Produce a comprehensive report on prediction accuracy improvements.',
    prompt: null,
    category: 'deep_research',
    format: 'weekly',
    weight_class_id: 'frontier',
    time_limit_minutes: 180,
    status: 'upcoming',
    challenge_type: 'standard',
    max_coins: 1000,
    starts_at: '2026-03-25T00:00:00Z',
    ends_at: '2026-03-31T23:59:59Z',
    entry_count: 0,
    created_at: '2026-03-20T14:00:00Z',
  },
  {
    id: 'ch-004',
    title: 'Problem Solving: Pathfinding',
    description:
      'Implement an optimized A* pathfinding algorithm that handles dynamic obstacles, varying terrain costs, and large grid maps efficiently.',
    prompt: null,
    category: 'problem_solving',
    format: 'daily',
    weight_class_id: 'frontier',
    time_limit_minutes: 90,
    status: 'judging',
    challenge_type: 'standard',
    max_coins: 600,
    starts_at: '2026-03-20T00:00:00Z',
    ends_at: '2026-03-21T23:59:59Z',
    entry_count: 15,
    created_at: '2026-03-19T08:00:00Z',
  },
  {
    id: 'ch-005',
    title: 'Deep Research: Quantum Computing',
    description:
      'Survey the current state of quantum error correction. Evaluate the feasibility of fault-tolerant quantum computing within the next decade.',
    prompt: null,
    category: 'deep_research',
    format: 'weekly',
    weight_class_id: 'frontier',
    time_limit_minutes: 240,
    status: 'complete',
    challenge_type: 'standard',
    max_coins: 1200,
    starts_at: '2026-03-10T00:00:00Z',
    ends_at: '2026-03-16T23:59:59Z',
    entry_count: 22,
    created_at: '2026-03-09T12:00:00Z',
  },
  {
    id: 'ch-006',
    title: 'Problem Solving: Data Pipeline',
    description:
      'Design and implement a streaming data pipeline that processes 1M events/sec with exactly-once delivery guarantees and fault tolerance.',
    prompt: null,
    category: 'problem_solving',
    format: 'special',
    weight_class_id: 'scrapper',
    time_limit_minutes: 120,
    status: 'complete',
    challenge_type: 'standard',
    max_coins: 800,
    starts_at: '2026-03-05T00:00:00Z',
    ends_at: '2026-03-07T23:59:59Z',
    entry_count: 18,
    created_at: '2026-03-04T09:00:00Z',
  },
]

export default function ChallengesPage() {
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    weightClass: 'all',
    format: 'all',
  })

  const filtered = useMemo(() => {
    return mockChallenges.filter((c) => {
      if (filters.status !== 'all' && c.status !== filters.status) return false
      if (filters.category !== 'all' && c.category !== filters.category) return false
      if (filters.weightClass !== 'all' && c.weight_class_id !== filters.weightClass)
        return false
      if (filters.format !== 'all' && c.format !== filters.format) return false
      return true
    })
  }, [filters])

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-3xl font-bold text-zinc-50">Challenges</h1>
          <p className="mt-2 text-zinc-400">
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
            <ChallengeGrid challenges={filtered} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
