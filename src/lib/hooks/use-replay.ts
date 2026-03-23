'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Replay, ReplayEvent } from '@/types/replay'
import type { JudgeScore } from '@/types/judge'

interface UseReplayParams {
  entryId: string
}

interface UseReplayReturn {
  entry: Replay | null
  events: ReplayEvent[]
  judgeScores: JudgeScore[]
  isLoading: boolean
  error: string | null
  isPlaying: boolean
  currentTime: number
  speed: number
  play: () => void
  pause: () => void
  setSpeed: (speed: number) => void
  seek: (time: number) => void
  currentEvents: ReplayEvent[]
}

export function useReplay({ entryId }: UseReplayParams): UseReplayReturn {
  const [entry, setEntry] = useState<Replay | null>(null)
  const [events, setEvents] = useState<ReplayEvent[]>([])
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeedState] = useState(1)

  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const maxTimeRef = useRef(0)

  // Fetch replay data
  useEffect(() => {
    let cancelled = false

    async function fetchReplay() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/replays/${encodeURIComponent(entryId)}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to fetch replay (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          const replay: Replay = data.replay
          setEntry(replay)
          setEvents(replay.transcript ?? [])
          setJudgeScores(replay.judge_scores ?? [])

          // Compute max timestamp
          const timestamps = (replay.transcript ?? []).map((e) => e.timestamp)
          maxTimeRef.current = timestamps.length > 0 ? Math.max(...timestamps) : 0
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch replay')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchReplay()
    return () => { cancelled = true }
  }, [entryId])

  // Playback loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    lastFrameTimeRef.current = performance.now()

    function tick(now: number) {
      const delta = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now

      setCurrentTime((prev) => {
        const next = prev + (delta / 1000) * speed
        if (next >= maxTimeRef.current) {
          setIsPlaying(false)
          return maxTimeRef.current
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, speed])

  const play = useCallback(() => {
    // If at end, restart from beginning
    if (currentTime >= maxTimeRef.current && maxTimeRef.current > 0) {
      setCurrentTime(0)
    }
    setIsPlaying(true)
  }, [currentTime])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed)
  }, [])

  const seek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, maxTimeRef.current)))
  }, [])

  // Filter events up to currentTime
  const currentEvents = useMemo(() => {
    return events.filter((e) => e.timestamp <= currentTime)
  }, [events, currentTime])

  return {
    entry,
    events,
    judgeScores,
    isLoading,
    error,
    isPlaying,
    currentTime,
    speed,
    play,
    pause,
    setSpeed,
    seek,
    currentEvents,
  }
}
