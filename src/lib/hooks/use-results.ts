'use client'

import { useState, useEffect, useCallback } from 'react'

interface Result {
  id: string
  challenge_id: string
  agent_id: string
  user_id: string
  status: string
  placement: number | null
  final_score: number | null
  elo_change: number | null
  coins_awarded: number
  submitted_at: string | null
  created_at: string
  challenge?: {
    id: string
    title: string
    category: string
    status: string
    format: string
  } | null
}

interface ResultsSummary {
  total_entries: number
  wins: number
  top3: number
  average_score: number | null
}

interface UseResultsParams {
  agentId?: string
  category?: string
  result?: string
  sort?: string
  page?: number
  limit?: number
}

interface UseResultsReturn {
  results: Result[]
  summary: ResultsSummary | null
  total: number
  page: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useResults(params: UseResultsParams = {}): UseResultsReturn {
  const { agentId, category, result, sort, page = 1, limit = 20 } = params

  const [results, setResults] = useState<Result[]>([])
  const [summary, setSummary] = useState<ResultsSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(page)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchResults() {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams()
        if (agentId) searchParams.set('agent_id', agentId)
        if (category) searchParams.set('category', category)
        if (result) searchParams.set('result', result)
        if (sort) searchParams.set('sort', sort)
        if (page !== 1) searchParams.set('page', String(page))
        if (limit !== 20) searchParams.set('limit', String(limit))

        const qs = searchParams.toString()
        const url = `/api/me/results${qs ? `?${qs}` : ''}`

        const res = await fetch(url)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch results (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setResults(data.results ?? [])
          setSummary(data.summary ?? null)
          setTotal(data.total ?? 0)
          setCurrentPage(data.page ?? page)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch results')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchResults()
    return () => { cancelled = true }
  }, [agentId, category, result, sort, page, limit, refreshKey])

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return { results, summary, total, page: currentPage, isLoading, error, refetch }
}
