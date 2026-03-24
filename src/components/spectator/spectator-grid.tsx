'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AgentEvent } from '@/types/spectator'
import type { ChallengeEntry } from '@/types/challenge'
import { formatDistanceToNow } from 'date-fns'

interface SpectatorGridProps {
  entries: ChallengeEntry[]
  latestByAgent: Map<string, AgentEvent>
  eventCounts: Map<string, number>
  onSelectAgent: (entryId: string) => void
  challengeStartedAt?: string
}

function getStatusFromEvent(event: AgentEvent | null | undefined): string {
  if (!event) return 'active'
  switch (event.type) {
    case 'thinking':
      return 'thinking'
    case 'error_hit':
      return 'error'
    case 'submitted':
      return 'submitted'
    case 'timed_out':
      return 'timed_out'
    default:
      return 'active'
  }
}

function getStatusLabel(event: AgentEvent | null | undefined): string {
  if (!event) return 'Waiting…'
  switch (event.type) {
    case 'started':
      return 'Starting…'
    case 'thinking':
      return 'Thinking…'
    case 'tool_call':
      return `Using ${event.tool || 'tool'}…`
    case 'code_write':
      return `Writing ${event.filename || 'code'}…`
    case 'command_run':
      return 'Running command…'
    case 'error_hit':
      return 'Hit an error'
    case 'self_correct':
      return 'Self-correcting…'
    case 'progress':
      return event.stage || `${event.percent || 0}% complete`
    case 'submitted':
      return 'Submitted ✓'
    case 'timed_out':
      return 'Timed out'
    default:
      return 'Working…'
  }
}

const STATUS_BORDERS: Record<string, string> = {
  active: 'border-l-emerald-500',
  thinking: 'border-l-amber-500',
  error: 'border-l-red-500',
  submitted: 'border-l-blue-500',
  timed_out: 'border-l-zinc-500',
}

export function SpectatorGrid({
  entries,
  latestByAgent,
  eventCounts,
  onSelectAgent,
}: SpectatorGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => {
        const lastEvent = latestByAgent.get(entry.agent_id)
        const status = getStatusFromEvent(lastEvent)
        const evtCount = eventCounts.get(entry.id) || 0

        return (
          <motion.button
            key={entry.id}
            onClick={() => onSelectAgent(entry.id)}
            className={cn(
              'group relative flex flex-col gap-3 rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 p-4 text-left transition-colors',
              'border-l-2',
              STATUS_BORDERS[status] || 'border-l-zinc-600',
              'hover:border-white/20',
              status === 'active' && 'ring-1 ring-emerald-500/20'
            )}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
          >
            {/* Agent info */}
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-zinc-700">
                {entry.agent?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.agent.avatar_url}
                    alt={entry.agent?.name || 'Agent'}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#e5e2e1]">
                  {entry.agent?.name || 'Unknown Agent'}
                </p>
                {entry.agent?.weight_class_id && (
                  <span className="text-xs text-[#8c909f] capitalize">
                    {entry.agent.weight_class_id}
                  </span>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  status === 'active' && 'bg-emerald-500 animate-pulse',
                  status === 'thinking' && 'bg-amber-500 animate-pulse',
                  status === 'error' && 'bg-red-500',
                  status === 'submitted' && 'bg-[#4d8efe]',
                  status === 'timed_out' && 'bg-zinc-500'
                )}
              />
              <span className="text-xs text-zinc-300">{getStatusLabel(lastEvent)}</span>
            </div>

            {/* Last event summary */}
            {lastEvent?.summary && (
              <p className="line-clamp-1 text-xs text-[#8c909f]">
                {lastEvent.summary}
              </p>
            )}

            {/* Progress bar */}
            {lastEvent?.type === 'progress' && lastEvent.percent != null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
                <motion.div
                  className="h-full rounded-full bg-[#4d8efe]"
                  initial={{ width: 0 }}
                  animate={{ width: `${lastEvent.percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Footer: elapsed time + event count */}
            <div className="flex items-center justify-between text-xs text-[#e5e2e1]0">
              <span className="tabular-nums">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: false })}
              </span>
              <span>{evtCount} events</span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
