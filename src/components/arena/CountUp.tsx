'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CountUpProps {
  end: number
  start?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  formatter?: (n: number) => string
}

export function CountUp({
  end,
  start = 0,
  duration = 2000,
  prefix = '',
  suffix = '',
  className,
  formatter,
}: CountUpProps) {
  const [count, setCount] = useState(start)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let startTime: number | null = null
    let rafId: number

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(start + (end - start) * eased))

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [isInView, end, start, duration])

  // Use explicit locale to avoid server/client mismatch (hydration error #418)
  const display = formatter
    ? formatter(count)
    : new Intl.NumberFormat('en-US').format(count)

  return (
    <span ref={ref} className={cn('font-mono tabular-nums', className)} suppressHydrationWarning>
      {prefix}{display}{suffix}
    </span>
  )
}
