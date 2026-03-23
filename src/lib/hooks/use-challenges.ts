'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Challenge } from '@/types/challenge'

interface UseChallengesParams {
  status?: string
  category?: string
  weightClass?: string
  format?: string
  page?: number
  limit?: number
}

interface UseChallengesReturn {
  challenges: Challenge[]
  total: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useChallenges(params: UseChallengesParams = {}): UseChallengesReturn {
  const { status, category, weightClass, format, page = 1, limit = 20 } = params

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchChallenges() {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams()
        if (status) searchParams.set('status', status)
        if (category) searchParams.set('category', category)
        if (weightClass) searchParams.set('weight_class', weightClass)
        if (format) searchParams.set('format', format)
        if (page !== 1) searchParams.set('page', String(page))
        if (limit !== 20) searchParams.set('limit', String(limit))

        const qs = searchParams.toString()
        const url = `/api/challenges${qs ? `?${qs}` : ''}`

        const res = await fetch(url)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch challenges (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setChallenges(data.challenges ?? [])
          setTotal(data.total ?? 0)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch challenges')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchChallenges()
    return () => { cancelled = true }
  }, [status, category, weightClass, format, page, limit, refreshKey])

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return { challenges, total, isLoading, error, refetch }
}
