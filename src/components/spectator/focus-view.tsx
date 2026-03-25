'use client'

import { useEffect, useRef } from 'react'
import { ArrowLeft, Clock, Code, Terminal, AlertTriangle, Zap, CheckCircle } from 'lucide-react'
import { EventCard } from './event-card'
import type { AgentEvent } from '@/types/spectator'
import type { ChallengeEntry } from '@/types/challenge'
import { formatDistanceToNow } from 'date-fns'

interface FocusViewProps {
  entry: ChallengeEntry
  events: AgentEvent[]
  onBack: () => void
}

function computeStats(events: AgentEvent[]) {
  let toolsUsed = 0
  let linesWritten = 0
  let errorsHit = 0
  let selfCorrections = 0

  for (const e of events) {
    if (e.type === 'tool_call') toolsUsed++
    if (e.type === 'code_write' && e.snippet) linesWritten += e.snippet.split('\n').length
    if (e.type === 'error_hit') errorsHit++
    if (e.type === 'self_correct') selfCorrections++
  }

  return { toolsUsed, linesWritten, errorsHit, selfCorrections }
}

export function FocusView({ entry, events, onBack }: FocusViewProps) {
  const feedRef = useRef<HTMLDivElement>(null)
  const stats = computeStats(events)

  // Auto-scroll on new events
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [events.length])

  return (
    <div className="flex gap-6">
      {/* Left panel: Event timeline (60%) */}
      <div className="flex-[3] min-w-0">
        <button
          onClick={onBack}
          aria-label="Back to grid view"
          className="mb-4 flex items-center gap-1.5 text-sm text-[#8c909f] hover:text-[#e5e2e1] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Grid
        </button>

        <div
          ref={feedRef}
          className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-2"
        >
          {events.length === 0 && (
            <div className="flex items-center justify-center rounded-lg border border-white/5 bg-[#201f1f]/30 py-12">
              <p className="text-sm text-[#8c909f]">Waiting for events…</p>
            </div>
          )}
          {events.map((event, i) => (
            <EventCard key={`${event.timestamp}-${i}`} event={event} index={i} />
          ))}
        </div>
      </div>

      {/* Right panel: Agent info + live stats (40%) */}
      <div className="flex-[2] space-y-4">
        {/* Agent profile card */}
        <div className="rounded-xl border border-white/5 bg-[#201f1f]/50 p-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-[#2a2a2a]">
              {entry.agent?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.agent.avatar_url}
                  alt={entry.agent?.name || 'Agent'}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#e5e2e1]">
                {entry.agent?.name || 'Unknown Agent'}
              </h3>
              {entry.agent?.weight_class_id && (
                <span className="text-sm text-[#8c909f] capitalize">
                  {entry.agent.weight_class_id}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-[#8c909f]">
            Joined {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </div>
        </div>

        {/* Live stats */}
        <div className="rounded-xl border border-white/5 bg-[#201f1f]/50 p-5">
          <h4 className="mb-3 text-sm font-semibold text-[#c2c6d5]">Live Stats</h4>
          <div className="grid grid-cols-2 gap-3">
            <StatItem icon={<Zap className="h-4 w-4 text-[#adc6ff]" />} label="Events" value={events.length} />
            <StatItem icon={<Clock className="h-4 w-4 text-[#8c909f]" />} label="Elapsed" value={formatDistanceToNow(new Date(entry.created_at), { addSuffix: false })} />
            <StatItem icon={<Terminal className="h-4 w-4 text-purple-400" />} label="Tools Used" value={stats.toolsUsed} />
            <StatItem icon={<Code className="h-4 w-4 text-[#7dffa2]" />} label="Lines Written" value={stats.linesWritten} />
            <StatItem icon={<AlertTriangle className="h-4 w-4 text-[#ffb4ab]" />} label="Errors" value={stats.errorsHit} />
            <StatItem icon={<CheckCircle className="h-4 w-4 text-[#ffb780]" />} label="Self-fixes" value={stats.selfCorrections} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#1c1b1b]/50 px-3 py-2">
      {icon}
      <div>
        <p className="text-sm font-bold tabular-nums text-[#e5e2e1]">{value}</p>
        <p className="text-xs text-[#8c909f]">{label}</p>
      </div>
    </div>
  )
}
