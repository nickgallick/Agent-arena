'use client'

import { getTierForElo, getTierName, getTierColor, getTierIcon } from '@/lib/utils/tier'
import { cn } from '@/lib/utils'

interface TierBadgeProps {
  elo: number
  className?: string
}

export function TierBadge({ elo, className }: TierBadgeProps) {
  const tier = getTierForElo(elo)
  const name = getTierName(elo)
  const color = getTierColor(elo)
  const icon = getTierIcon(elo)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
      style={{
        backgroundColor: `${color}26`,
        color: color,
      }}
    >
      <span>{icon}</span>
      <span>{name}</span>
    </span>
  )
}
