'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid3X3, Focus, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpectator } from '@/lib/hooks/use-spectator'
import { SpectatorGrid } from './spectator-grid'
import { FocusView } from './focus-view'
import { SpectatorCounter } from './spectator-counter'
import { CountdownTimer } from '@/components/shared/countdown-timer'
import type { Challenge, ChallengeEntry } from '@/types/challenge'

interface LiveSpectatorViewProps {
  challenge: Challenge
  entries: ChallengeEntry[]
  userId?: string | null
}

type ViewMode = 'grid' | 'focus'

export function LiveSpectatorView({ challenge, entries, userId }: LiveSpectatorViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const viewParam = searchParams.get('view') as ViewMode | null
  const focusEntryParam = searchParams.get('entry')

  const [viewMode, setViewMode] = useState<ViewMode>(viewParam || 'grid')
  const [focusEntryId, setFocusEntryId] = useState<string | null>(focusEntryParam)

  const { events, latestByAgent, isConnected } = useSpectator({
    challengeId: challenge.id,
    challengeStatus: challenge.status,
    focusEntryId: focusEntryId || undefined,
  })

  // Compute event counts per entry
  const eventCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [entryId, entryEvents] of events) {
      counts.set(entryId, entryEvents.length)
    }
    return counts
  }, [events])

  const handleSelectAgent = useCallback((entryId: string) => {
    setFocusEntryId(entryId)
    setViewMode('focus')
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'focus')
    params.set('entry', entryId)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const handleBackToGrid = useCallback(() => {
    setFocusEntryId(null)
    setViewMode('grid')
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'grid')
    params.delete('entry')
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const handleViewToggle = useCallback((mode: ViewMode) => {
    if (mode === 'grid') {
      handleBackToGrid()
    } else {
      setViewMode('focus')
    }
  }, [handleBackToGrid])

  const focusEntry = focusEntryId ? entries.find(e => e.id === focusEntryId) : null
  const focusEvents = focusEntryId ? events.get(focusEntryId) || [] : []

  return (
    <div className="space-y-4">
      {/* Header: Timer + View Toggle + Spectator Count + Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Challenge countdown */}
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-[#e5e2e1]0 uppercase tracking-wider">Time Remaining</p>
            <CountdownTimer
              targetDate={challenge.ends_at}
              className="text-2xl font-mono"
            />
          </div>

          {/* Connection indicator */}
          <div className="flex items-center gap-1 text-xs">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-[#e5e2e1]0" />
                <span className="text-[#e5e2e1]0">Connecting…</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Spectator counter */}
          <SpectatorCounter challengeId={challenge.id} userId={userId} />

          {/* View toggle */}
          <div className="flex rounded-lg border border-[#424753]/15 bg-[#201f1f]/50 p-0.5">
            <button
              onClick={() => handleViewToggle('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-[#2a2a2a] text-[#e5e2e1]'
                  : 'text-[#8c909f] hover:text-[#e5e2e1]'
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => handleViewToggle('focus')}
              aria-label="Focus view"
              aria-pressed={viewMode === 'focus'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'focus'
                  ? 'bg-[#2a2a2a] text-[#e5e2e1]'
                  : 'text-[#8c909f] hover:text-[#e5e2e1]'
              )}
            >
              <Focus className="h-3.5 w-3.5" />
              Focus
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SpectatorGrid
              entries={entries}
              latestByAgent={latestByAgent}
              eventCounts={eventCounts}
              onSelectAgent={handleSelectAgent}
              challengeStartedAt={challenge.starts_at}
            />
          </motion.div>
        ) : focusEntry ? (
          <motion.div
            key="focus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <FocusView
              entry={focusEntry}
              events={focusEvents}
              onBack={handleBackToGrid}
            />
          </motion.div>
        ) : (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center rounded-lg border border-[#424753]/15 bg-[#201f1f]/30 py-16"
          >
            <p className="text-sm text-[#e5e2e1]0">
              Select an agent from the grid to view their live feed
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
