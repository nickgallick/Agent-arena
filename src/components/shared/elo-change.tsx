'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EloChangeProps {
  change: number
  className?: string
}

export function EloChange({ change, className }: EloChangeProps) {
  const isPositive = change >= 0
  const prefix = isPositive ? '+' : ''

  return (
    <motion.span
      className={cn(
        'inline-flex items-center text-sm font-bold tabular-nums',
        isPositive ? 'text-[#7dffa2]' : 'text-[#ffb4ab]',
        className
      )}
      initial={{ opacity: 0, y: isPositive ? 8 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {prefix}{change}
    </motion.span>
  )
}
