'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgentEvent, BroadcastPayload, BufferedEvent, LiveEvent } from '@/types/spectator'

const EVENT_DELAY_MS = 30_000

interface UseSpectatorOptions {
  challengeId: string
  challengeStatus: string
  /** If set, only track events for this specific entry */
  focusEntryId?: string
}

interface UseSpectatorReturn {
  events: Map<string, AgentEvent[]> // entry_id -> events
  latestByAgent: Map<string, AgentEvent> // agent_id -> last event
  isConnected: boolean
}

export function useSpectator({ challengeId, challengeStatus, focusEntryId }: UseSpectatorOptions): UseSpectatorReturn {
  const [events, setEvents] = useState<Map<string, AgentEvent[]>>(new Map())
  const [latestByAgent, setLatestByAgent] = useState<Map<string, AgentEvent>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  const eventBuffer = useRef<BufferedEvent[]>([])
  const seenSeqs = useRef<Map<string, number>>(new Map())
  const isEnded = challengeStatus === 'complete' || challengeStatus === 'judging'

  const addEvent = useCallback((entryId: string, agentId: string, event: AgentEvent, seqNum: number) => {
    // Dedup by seq_num
    const currentMax = seenSeqs.current.get(entryId) || 0
    if (seqNum <= currentMax) return
    seenSeqs.current.set(entryId, seqNum)

    setEvents(prev => {
      const next = new Map(prev)
      const existing = next.get(entryId) || []
      next.set(entryId, [...existing, event])
      return next
    })

    setLatestByAgent(prev => {
      const next = new Map(prev)
      next.set(agentId, event)
      return next
    })
  }, [])

  // Backfill on join
  useEffect(() => {
    const supabase = createClient()

    async function backfill() {
      let query = supabase
        .from('live_events')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: true })

      if (focusEntryId) {
        query = query.eq('entry_id', focusEntryId)
      }

      if (!isEnded) {
        // For active challenges, load last 50 per agent
        query = query.limit(200)
      }

      const { data: recentEvents } = await query

      if (recentEvents && recentEvents.length > 0) {
        const newEvents = new Map<string, AgentEvent[]>()
        const newLatest = new Map<string, AgentEvent>()

        for (const e of recentEvents as LiveEvent[]) {
          const existing = newEvents.get(e.entry_id) || []
          existing.push(e.event_data)
          newEvents.set(e.entry_id, existing)

          const current = seenSeqs.current.get(e.entry_id) || 0
          seenSeqs.current.set(e.entry_id, Math.max(current, e.seq_num))

          newLatest.set(e.agent_id, e.event_data)
        }

        setEvents(newEvents)
        setLatestByAgent(newLatest)
      }
    }

    backfill()
  }, [challengeId, focusEntryId, isEnded])

  // Subscribe to Broadcast for new events
  useEffect(() => {
    if (isEnded) return // No need to subscribe if challenge is done

    const supabase = createClient()
    const channel = supabase.channel(`challenge:${challengeId}`)

    channel.on('broadcast', { event: 'agent_event' }, ({ payload }: { payload: BroadcastPayload }) => {
      if (focusEntryId && payload.entry_id !== focusEntryId) return

      // 30-second anti-cheat delay buffer
      eventBuffer.current.push({
        payload,
        displayAt: Date.now() + EVENT_DELAY_MS,
      })
    })

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    // Process buffer every second
    const interval = setInterval(() => {
      const now = Date.now()
      const ready = eventBuffer.current.filter(e => e.displayAt <= now)
      if (ready.length > 0) {
        for (const item of ready) {
          addEvent(item.payload.entry_id, item.payload.agent_id, item.payload.event, item.payload.seq_num)
        }
        eventBuffer.current = eventBuffer.current.filter(e => e.displayAt > now)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      channel.unsubscribe()
    }
  }, [challengeId, focusEntryId, isEnded, addEvent])

  return { events, latestByAgent, isConnected }
}
