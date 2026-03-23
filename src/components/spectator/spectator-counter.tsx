'use client'

import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { useSpectatorCount } from '@/lib/hooks/use-spectator-count'
import { cn } from '@/lib/utils'

interface SpectatorCounterProps {
  challengeId: string
  userId?: string | null
  className?: string
}

export function SpectatorCounter({ challengeId, userId, className }: SpectatorCounterProps) {
  const { count, isGrowing } = useSpectatorCount({ challengeId, userId })

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-zinc-400', className)}>
      <div className="relative">
        <Eye className="h-3.5 w-3.5" />
        {isGrowing && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </div>
      <motion.span
        key={count}
        initial={{ opacity: 0.5, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="tabular-nums"
      >
        {count} watching
      </motion.span>
    </div>
  )
}
