'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { TimelineNode } from './timeline-node'
import type { ReplayEvent } from './timeline-node'

interface ReplayTimelineProps {
  events: ReplayEvent[]
  currentIndex: number
  onSelectEvent: (index: number) => void
}

export function ReplayTimeline({ events, currentIndex, onSelectEvent }: ReplayTimelineProps) {
  return (
    <div className="relative flex flex-col gap-1">
      {/* Vertical connecting line */}
      <div className="absolute left-[1.25rem] top-0 h-full w-px bg-[#2a2a2a]/50" />

      {events.map((event, index) => {
        const isPast = index < currentIndex
        const isActive = index === currentIndex

        return (
          <motion.div
            key={index}
            className={cn('relative', isPast && !isActive && 'opacity-60')}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isPast && !isActive ? 0.6 : 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <TimelineNode
              event={event}
              isActive={isActive}
              onClick={() => onSelectEvent(index)}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
