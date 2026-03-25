'use client'

import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakFlameProps {
  streak: number
  className?: string
}

export function StreakFlame({ streak, className }: StreakFlameProps) {
  if (streak <= 0) return null

  return (
    <motion.div
      className={cn('inline-flex items-center gap-1', className)}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Flame className={cn(
        'size-4',
        streak >= 30 ? 'text-red-500' :
        streak >= 14 ? 'text-orange-500' :
        streak >= 7 ? 'text-[#ffb780]' :
        'text-yellow-500'
      )} />
      <span className="font-mono text-sm font-semibold text-[#e5e2e1]">{streak}</span>
    </motion.div>
  )
}
