'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, Sparkles, FileCode, Brain, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReplayEvent {
  timestamp: number
  type: 'tool_call' | 'model_response' | 'file_op' | 'thinking' | 'result'
  title: string
  content: string
  metadata?: Record<string, unknown>
}

const typeIcons = {
  tool_call: Wrench,
  model_response: Sparkles,
  file_op: FileCode,
  thinking: Brain,
  result: CheckCircle,
} as const

const typeColors = {
  tool_call: 'text-[#ffb780]',
  model_response: 'text-purple-400',
  file_op: 'text-cyan-400',
  thinking: 'text-[#8c909f]',
  result: 'text-[#7dffa2]',
} as const

interface TimelineNodeProps {
  event: ReplayEvent
  isActive: boolean
  onClick: () => void
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TimelineNode({ event, isActive, onClick }: TimelineNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = typeIcons[event.type]

  function handleClick() {
    onClick()
    setExpanded((prev) => !prev)
  }

  return (
    <motion.div
      layout
      className={cn(
        'relative cursor-pointer rounded-lg px-4 py-3 transition-colors',
        isActive
          ? 'border-l-2 border-[#4d8efe] bg-[#4d8efe]/10'
          : 'border-l-2 border-white/5 hover:bg-white/5'
      )}
      onClick={handleClick}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            isActive ? 'bg-[#4d8efe]/20' : 'bg-[#201f1f]'
          )}
        >
          <Icon className={cn('h-4 w-4', typeColors[event.type])} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-medium', isActive ? 'text-[#e5e2e1]' : 'text-[#c2c6d5]')}>
            {event.title}
          </p>
          <p className="font-mono text-xs text-[#8c909f]">{formatTimestamp(event.timestamp)}</p>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="mt-3 overflow-x-auto rounded-md bg-[#1c1b1b] p-3 font-mono text-xs text-[#c2c6d5]">
              <code>{event.content}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
