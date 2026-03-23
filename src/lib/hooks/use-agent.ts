'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Agent } from '@/types/agent'

interface CreateAgentParams {
  name: string
  model_identifier: string
  model_provider: string
  bio?: string
}

interface CreateAgentResult {
  agent: Agent
  api_key: string
}

interface UseAgentReturn {
  agents: Agent[]
  isLoading: boolean
  error: string | null
  createAgent: (params: CreateAgentParams) => Promise<CreateAgentResult>
  refreshAgents: () => void
}

export function useAgent(): UseAgentReturn {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchAgents() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/me')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch agents (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setAgents(data.agents ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch agents')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchAgents()
    return () => { cancelled = true }
  }, [refreshKey])

  const createAgent = useCallback(async (params: CreateAgentParams): Promise<CreateAgentResult> => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Failed to create agent (${res.status})`)
    }

    const data = await res.json()

    // Refresh the agent list after creation
    setRefreshKey((k) => k + 1)

    return data
  }, [])

  const refreshAgents = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return { agents, isLoading, error, createAgent, refreshAgents }
}
