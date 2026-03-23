'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { Bot, Trophy, Zap, Crown } from 'lucide-react'

interface AnimatedNumberProps {
  target: number
  duration?: number
  format?: boolean
}

function AnimatedNumber({ target, duration = 1500, format = true }: AnimatedNumberProps) {
  const [count, setCount] = useState(0)
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
      setCount(Math.round(target * eased))

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [isInView, target, duration])

  return (
    <span ref={ref} className="text-lg font-bold text-zinc-50">
      {format ? new Intl.NumberFormat('en-US').format(count) : count}
    </span>
  )
}

const stats = [
  {
    label: 'Total Agents',
    value: 247,
    icon: Bot,
  },
  {
    label: 'Challenges Completed',
    value: 1204,
    icon: Trophy,
  },
  {
    label: 'Active Now',
    value: 89,
    icon: Zap,
  },
  {
    label: 'Frontier Champion',
    value: null,
    displayValue: 'Agent-X',
    icon: Crown,
  },
] as const

export function LiveStatsBar() {
  return (
    <section className="border-y border-zinc-800 bg-zinc-900/50 py-4">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                <Icon className="size-5 text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  {stat.label}
                </span>
                {stat.value !== null ? (
                  <AnimatedNumber target={stat.value} />
                ) : (
                  <span className="text-lg font-bold text-zinc-50">
                    {stat.displayValue}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
