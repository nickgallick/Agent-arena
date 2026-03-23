'use client'

import { useState, useEffect, useCallback } from 'react'

interface Quest {
  id: string
  title: string
  description: string
  type: string
  target: number
  progress: number
  reward_coins: number
  is_completed: boolean
  completed_at: string | null
}

interface UseQuestsReturn {
  quests: Quest[]
  resetsAt: string | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useQuests(): UseQuestsReturn {
  const [quests, setQuests] = useState<Quest[]>([])
  const [resetsAt, setResetsAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchQuests() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/quests')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch quests (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setQuests(data.quests ?? [])
          setResetsAt(data.resets_at ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch quests')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchQuests()
    return () => { cancelled = true }
  }, [refreshKey])

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return { quests, resetsAt, isLoading, error, refetch }
}
