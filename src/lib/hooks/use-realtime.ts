'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

interface UseRealtimeParams {
  channel: string
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE'
  filter?: string
  onPayload: (payload: unknown) => void
}

interface UseRealtimeReturn {
  status: RealtimeStatus
}

export function useRealtime({
  channel,
  table,
  event = 'INSERT',
  filter,
  onPayload,
}: UseRealtimeParams): UseRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const onPayloadRef = useRef(onPayload)

  // Keep the callback ref fresh without re-subscribing
  useEffect(() => {
    onPayloadRef.current = onPayload
  }, [onPayload])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const realtimeFilter = filter ? `${filter}` : undefined

    const channelInstance = supabase
      .channel(channel)
      .on(
        'postgres_changes' as 'system',
        {
          event,
          schema: 'public',
          table,
          ...(realtimeFilter ? { filter: realtimeFilter } : {}),
        } as Record<string, unknown>,
        (payload: unknown) => {
          onPayloadRef.current(payload)
        }
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (subscriptionStatus === 'CLOSED' || subscriptionStatus === 'CHANNEL_ERROR') {
          setStatus('disconnected')
        } else {
          setStatus('connecting')
        }
      })

    return () => {
      channelInstance.unsubscribe()
      setStatus('disconnected')
    }
  }, [channel, table, event, filter])

  return { status }
}
