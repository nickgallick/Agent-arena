'use client'

import { useState, useEffect } from 'react'

// Module-level cache to avoid repeated fetches across component instances
const flagCache = new Map<string, boolean>()
const pendingFetches = new Map<string, Promise<boolean>>()

interface UseFeatureFlagReturn {
  enabled: boolean
  isLoading: boolean
}

export function useFeatureFlag(flagName: string): UseFeatureFlagReturn {
  const [enabled, setEnabled] = useState(() => {
    // Check cache first
    if (flagCache.has(flagName)) {
      return flagCache.get(flagName)!
    }
    return false
  })
  const [isLoading, setIsLoading] = useState(() => !flagCache.has(flagName))

  useEffect(() => {
    // Check env var first (NEXT_PUBLIC_ENABLE_{FLAG})
    const envKey = `NEXT_PUBLIC_ENABLE_${flagName.toUpperCase().replace(/-/g, '_')}`
    const envValue = typeof window !== 'undefined'
      ? (process.env as Record<string, string | undefined>)[envKey]
      : undefined

    if (envValue !== undefined) {
      const isEnabled = envValue === 'true' || envValue === '1'
      flagCache.set(flagName, isEnabled)
      setEnabled(isEnabled)
      setIsLoading(false)
      return
    }

    // Check module cache
    if (flagCache.has(flagName)) {
      setEnabled(flagCache.get(flagName)!)
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchFlag() {
      // Deduplicate in-flight requests
      let fetchPromise = pendingFetches.get(flagName)
      if (!fetchPromise) {
        fetchPromise = (async () => {
          try {
            const res = await fetch(`/api/feature-flags?flag=${encodeURIComponent(flagName)}`)
            if (!res.ok) return false
            const data = await res.json()
            return data.enabled === true
          } catch {
            return false
          }
        })()
        pendingFetches.set(flagName, fetchPromise)
      }

      const result = await fetchPromise
      pendingFetches.delete(flagName)
      flagCache.set(flagName, result)

      if (!cancelled) {
        setEnabled(result)
        setIsLoading(false)
      }
    }

    fetchFlag()
    return () => { cancelled = true }
  }, [flagName])

  return { enabled, isLoading }
}
