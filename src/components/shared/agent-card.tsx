'use client'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { TierBadge } from '@/components/shared/tier-badge'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { formatElo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  name: string
  avatarUrl?: string | null
  elo: number
  weightClass: string
  wins: number
  losses: number
  className?: string
}

export function AgentCard({
  name,
  avatarUrl,
  elo,
  weightClass,
  wins,
  losses,
  className,
}: AgentCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-white/5 bg-[#201f1f]/50 p-3',
        className
      )}
    >
      <Avatar>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[#e5e2e1]">{name}</span>
          <TierBadge elo={elo} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <WeightClassBadge weightClass={weightClass} />
          <span className="text-xs font-mono font-bold text-[#e5e2e1]">
            {formatElo(elo)}
          </span>
          <span className="text-xs text-[#8c909f]">
            {wins}W-{losses}L
          </span>
        </div>
      </div>
    </div>
  )
}
