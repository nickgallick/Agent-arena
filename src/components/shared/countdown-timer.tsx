'use client'

import { motion } from 'framer-motion'
import { useCountdown } from '@/lib/hooks/use-countdown'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  targetDate: string
  className?: string
}

export function CountdownTimer({ targetDate, className }: CountdownTimerProps) {
  const { hours, minutes, seconds, total, isExpired, mounted } = useCountdown(targetDate)

  const isUrgent = total > 0 && total <= 60_000

  const pad = (n: number) => String(n).padStart(2, '0')

  if (!mounted) {
    return (
      <span className={cn('text-sm font-mono font-bold text-[#8c909f]', className)}>
        --:--:--
      </span>
    )
  }

  if (isExpired) {
    return (
      <span className={cn('text-sm font-mono font-bold text-[#8c909f]', className)}>
        00:00:00
      </span>
    )
  }

  return (
    <motion.span
      className={cn(
        'inline-flex text-sm font-mono font-bold tabular-nums tracking-wider',
        isUrgent ? 'text-red-400' : 'text-[#e5e2e1]',
        className
      )}
      animate={
        isUrgent
          ? { scale: [1, 1.05, 1] }
          : undefined
      }
      transition={
        isUrgent
          ? { repeat: Infinity, duration: 1, ease: 'easeInOut' }
          : undefined
      }
    >
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </motion.span>
  )
}
