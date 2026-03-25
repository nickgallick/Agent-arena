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
    case 'thinking': return 'thinking'
    case 'error_hit': return 'error'
    case 'submitted': return 'submitted'
    case 'timed_out': return 'timed_out'
    default: return 'active'
  }
}

function getStatusLabel(event: AgentEvent | null | undefined): string {
  if (!event) return 'Waiting…'
  switch (event.type) {
    case 'started': return 'Starting…'
    case 'thinking': return 'Thinking…'
    case 'tool_call': return `Using ${event.tool || 'tool'}…`
    case 'code_write': return `Writing ${event.filename || 'code'}…`
    case 'command_run': return 'Running command…'
    case 'error_hit': return 'Hit an error'
    case 'self_correct': return 'Self-correcting…'
    case 'progress': return event.stage || `${event.percent || 0}% complete`
    case 'submitted': return 'Submitted ✓'
    case 'timed_out': return 'Timed out'
    default: return 'Working…'
  }
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#7dffa2]',
  thinking: 'bg-[#ffb780]',
  error: 'bg-[#ffb4ab]',
  submitted: 'bg-[#adc6ff]',
  timed_out: 'bg-[#353534]',
}

export function SpectatorGrid({
  entries,
  latestByAgent,
  eventCounts,
  onSelectAgent,
}: SpectatorGridProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {entries.map((entry) => {
        const lastEvent = latestByAgent.get(entry.agent_id)
        const status = getStatusFromEvent(lastEvent)
        const evtCount = eventCounts.get(entry.id) || 0

        return (
          <motion.button
            key={entry.id}
            onClick={() => onSelectAgent(entry.id)}
            className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col text-left transition-all hover:ring-1 hover:ring-[#adc6ff]/20"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
          >
            {/* Agent header bar */}
            <div className="p-5 flex items-center justify-between bg-[#201f1f]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#353534] flex items-center justify-center overflow-hidden">
                  {entry.agent?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.agent.avatar_url} alt="" className="w-full h-full object-cover grayscale" />
                  ) : (
                    <span className="font-['JetBrains_Mono'] text-[#adc6ff] font-bold text-lg">
                      {(entry.agent?.name || 'A')[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-['Manrope'] font-bold text-lg text-[#e5e2e1]">
                    {entry.agent?.name || 'Unknown Agent'}
                  </h2>
                  {entry.agent?.weight_class_id && (
                    <span className="font-['JetBrains_Mono'] text-[9px] px-1.5 py-0.5 rounded bg-[#ffb780]/20 text-[#ffb780] uppercase font-bold">
                      {entry.agent.weight_class_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', STATUS_COLORS[status] || 'bg-[#353534]', (status === 'active' || status === 'thinking') && 'animate-pulse')} />
                <span className="font-['JetBrains_Mono'] text-xs text-[#c2c6d5]">{getStatusLabel(lastEvent)}</span>
              </div>
            </div>

            {/* Terminal output area */}
            <div className="p-4 h-48 bg-[#0e0e0e] font-['JetBrains_Mono'] text-[11px] overflow-y-auto">
              {lastEvent?.summary ? (
                <>
                  <div className="text-[#8c909f] mb-1">[SYS] Agent connected</div>
                  <div className="text-[#7dffa2] mb-1">[OUT] {lastEvent.summary}</div>
                  {status === 'active' && (
                    <div className="text-[#adc6ff] animate-pulse">[EXE] Processing...</div>
                  )}
                </>
              ) : (
                <div className="text-[#8c909f]">[SYS] Awaiting agent events...</div>
              )}
            </div>

            {/* Footer stats */}
            <div className="px-5 py-3 flex items-center justify-between bg-[#1c1b1b] border-t border-white/5">
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f] uppercase tracking-widest">
                {evtCount} events
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f] tabular-nums uppercase tracking-widest">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: false })} elapsed
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
