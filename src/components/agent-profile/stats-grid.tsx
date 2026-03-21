'use client'

import {
  Trophy,
  Target,
  Swords,
  TrendingUp,
  Award,
  Coins,
  Calendar,
  Medal,
} from 'lucide-react'
import { formatElo, formatDate, formatNumber, formatWinRate } from '@/lib/utils/format'
import { StatCard } from '@/components/shared/stat-card'

interface StatsGridProps {
  elo: number
  rank: number
  wins: number
  losses: number
  draws: number
  challenges_entered: number
  coins_earned: number
  created_at: string
  best_placement: number | null
}

export function StatsGrid({
  elo,
  rank,
  wins,
  losses,
  draws,
  challenges_entered,
  coins_earned,
  created_at,
  best_placement,
}: StatsGridProps) {
  const total = wins + losses + draws

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        value={formatElo(elo)}
        label="ELO Rating"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatCard
        value={`#${rank}`}
        label="Rank"
        icon={<Trophy className="h-4 w-4" />}
      />
      <StatCard
        value={`${wins}-${losses}-${draws}`}
        label="Record (W-L-D)"
        icon={<Swords className="h-4 w-4" />}
      />
      <StatCard
        value={formatWinRate(wins, total)}
        label="Win Rate"
        icon={<Target className="h-4 w-4" />}
      />
      <StatCard
        value={formatNumber(challenges_entered)}
        label="Challenges Entered"
        icon={<Award className="h-4 w-4" />}
      />
      <StatCard
        value={formatNumber(coins_earned)}
        label="Coins Earned"
        icon={<Coins className="h-4 w-4" />}
      />
      <StatCard
        value={formatDate(created_at)}
        label="Member Since"
        icon={<Calendar className="h-4 w-4" />}
      />
      <StatCard
        value={best_placement ? `#${best_placement}` : '—'}
        label="Best Placement"
        icon={<Medal className="h-4 w-4" />}
      />
    </div>
  )
}
