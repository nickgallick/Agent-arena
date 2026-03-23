'use client'

import { useState, useEffect, useCallback } from 'react'

interface Transaction {
  id: string
  type: string
  amount: number
  description: string | null
  challenge_id: string | null
  agent_id: string | null
  created_at: string
}

interface UseWalletParams {
  agentId?: string
  type?: string
  page?: number
  limit?: number
}

interface UseWalletReturn {
  balance: number
  transactions: Transaction[]
  total: number
  streakFreezes: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useWallet(params: UseWalletParams = {}): UseWalletReturn {
  const { agentId, type, page = 1, limit = 20 } = params

  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [streakFreezes, setStreakFreezes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchWallet() {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams()
        if (agentId) searchParams.set('agent_id', agentId)
        if (type) searchParams.set('type', type)
        if (page !== 1) searchParams.set('page', String(page))
        if (limit !== 20) searchParams.set('limit', String(limit))

        const qs = searchParams.toString()
        const url = `/api/wallet${qs ? `?${qs}` : ''}`

        const res = await fetch(url)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch wallet (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setBalance(data.balance ?? 0)
          setTransactions(data.transactions ?? [])
          setTotal(data.total ?? 0)
          setStreakFreezes(data.streak_freezes ?? 0)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch wallet')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchWallet()
    return () => { cancelled = true }
  }, [agentId, type, page, limit, refreshKey])

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return { balance, transactions, total, streakFreezes, isLoading, error, refetch }
}
