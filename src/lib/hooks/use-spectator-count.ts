'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseSpectatorCountOptions {
  challengeId: string
  userId?: string | null
}

export function useSpectatorCount({ challengeId, userId }: UseSpectatorCountOptions) {
  const [count, setCount] = useState(0)
  const [isGrowing, setIsGrowing] = useState(false)
  const prevCount = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`spectators:${challengeId}`)

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const uniqueUsers = new Set<string>()
      let anonCount = 0

      Object.values(state).flat().forEach((presence: Record<string, unknown>) => {
        if (presence.user_id && typeof presence.user_id === 'string') {
          uniqueUsers.add(presence.user_id)
        } else {
          anonCount++
        }
      })

      const newCount = uniqueUsers.size + anonCount
      setIsGrowing(newCount > prevCount.current)
      prevCount.current = newCount
      setCount(newCount)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId || null,
          joined_at: new Date().toISOString(),
        })
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }, [challengeId, userId])

  return { count, isGrowing }
}
