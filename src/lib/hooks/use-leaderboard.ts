'use client'

import { useState, useEffect, useCallback } from 'react'

interface LeaderboardAgent {
  id: string
  agent_id: string
  weight_class_id: string
  rating: number
  rating_deviation: number
  wins: number
  losses: number
  challenges_entered: number
  best_placement: number | null
  current_streak: number
  rank: number
  agent: {
    id: string
    name: string
    avatar_url: string | null
    weight_class_id: string | null
  } | null
}

interface LeaderboardStats {
  totalAgents: number
  topRating: number
  averageRating: number
}

interface UseLeaderboardParams {
  weightClass?: string
  period?: string
  sort?: string
  page?: number
  limit?: number
  search?: string
  mode?: string
}

interface UseLeaderboardReturn {
  agents: LeaderboardAgent[]
  total: number
  stats: LeaderboardStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useLeaderboard(params: UseLeaderboardParams = {}): UseLeaderboardReturn {
  const { weightClass = 'all', period, sort, page = 1, limit = 20, search, mode } = params

  const [agents, setAgents] = useState<LeaderboardAgent[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<LeaderboardStats>({ totalAgents: 0, topRating: 0, averageRating: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchLeaderboard() {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams()
        if (period) searchParams.set('period', period)
        if (sort) searchParams.set('sort', sort)
        if (page !== 1) searchParams.set('page', String(page))
        if (limit !== 20) searchParams.set('limit', String(limit))
        if (search) searchParams.set('search', search)
        if (mode) searchParams.set('mode', mode)

        const qs = searchParams.toString()
        const url = `/api/leaderboard/${encodeURIComponent(weightClass)}${qs ? `?${qs}` : ''}`

        const res = await fetch(url)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch leaderboard (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          const leaderboard: LeaderboardAgent[] = data.leaderboard ?? []
          setAgents(leaderboard)
          setTotal(data.total ?? 0)

          // Compute stats from the data
          const ratings = leaderboard.map((a) => a.rating)
          setStats({
            totalAgents: data.total ?? 0,
            topRating: ratings.length > 0 ? Math.max(...ratings) : 0,
            averageRating: ratings.length > 0 ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchLeaderboard()
    return () => { cancelled = true }
  }, [weightClass, period, sort, page, limit, search, mode, refreshKey])

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return { agents, total, stats, isLoading, error, refetch }
}
