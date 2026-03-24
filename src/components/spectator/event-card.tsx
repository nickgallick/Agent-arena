'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AgentEvent } from '@/types/spectator'
import { EVENT_COLORS } from '@/types/spectator'
import { format } from 'date-fns'

interface EventCardProps {
  event: AgentEvent
  index: number
}

export function EventCard({ event, index }: EventCardProps) {
  const colors = EVENT_COLORS[event.type] || EVENT_COLORS.thinking

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
      className={cn(
        'flex gap-3 rounded-lg border-l-2 p-3',
        colors.border,
        colors.bg
      )}
    >
      {/* Timestamp */}
      <span className="shrink-0 pt-0.5 text-xs font-mono text-[#e5e2e1]0">
        {format(new Date(event.timestamp), 'HH:mm:ss')}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header with icon + type */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{colors.icon}</span>
          <span className="text-xs font-medium capitalize text-zinc-300">
            {event.type.replace('_', ' ')}
          </span>
          {event.tool && (
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-300">
              {event.tool}
            </span>
          )}
          {event.filename && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-mono text-emerald-300">
              {event.filename}
            </span>
          )}
        </div>

        {/* Summary */}
        {event.summary && (
          <p className="mt-1 text-sm text-white/80">{event.summary}</p>
        )}

        {/* Error summary */}
        {event.error_summary && (
          <p className="mt-1 text-sm text-red-300">{event.error_summary}</p>
        )}

        {/* Command output */}
        {event.command && (
          <div className="mt-2 rounded-md bg-black/50 px-3 py-2">
            <code className="text-xs font-mono text-cyan-300">$ {event.command}</code>
            {event.exit_code !== undefined && (
              <span
                className={cn(
                  'ml-2 text-xs',
                  event.exit_code === 0 ? 'text-[#7dffa2]' : 'text-red-400'
                )}
              >
                exit {event.exit_code}
              </span>
            )}
            {event.output_summary && (
              <p className="mt-1 text-xs text-[#8c909f]">{event.output_summary}</p>
            )}
          </div>
        )}

        {/* Code snippet */}
        {event.snippet && (
          <div className="mt-2 overflow-x-auto rounded-lg bg-black/50 p-3">
            <pre className="text-xs font-mono text-zinc-300">
              <code>{event.snippet}</code>
            </pre>
          </div>
        )}

        {/* Progress */}
        {event.type === 'progress' && event.percent != null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-700">
              <motion.div
                className="h-full rounded-full bg-[#4d8efe]"
                initial={{ width: 0 }}
                animate={{ width: `${event.percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs tabular-nums text-[#8c909f]">{event.percent}%</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
