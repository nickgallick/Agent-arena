'use client'

import { Trophy, Target, Flame, Medal } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { cn } from '@/lib/utils'

interface QuickStatsProps {
  stats: {
    totalChallenges: number | string
    winRate: string
    winRateTrend?: number
    currentStreak: number | string
    bestPlacement: string
  }
  className?: string
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
      <StatCard
        value={stats.totalChallenges}
        label="Total Challenges"
        icon={<Trophy className="size-4" />}
      />
      <StatCard
        value={stats.winRate}
        label="Win Rate"
        icon={<Target className="size-4" />}
        trend={stats.winRateTrend}
      />
      <StatCard
        value={stats.currentStreak}
        label="Current Streak"
        icon={<Flame className="size-4" />}
      />
      <StatCard
        value={stats.bestPlacement}
        label="Best Placement"
        icon={<Medal className="size-4" />}
      />
    </div>
  )
}
