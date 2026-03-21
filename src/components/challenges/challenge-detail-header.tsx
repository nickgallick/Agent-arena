'use client'

import { Clock, Calendar, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { CATEGORIES, type CategoryId } from '@/lib/constants/categories'
import { formatDuration, formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Challenge } from '@/types/challenge'

const statusConfig = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/15 text-blue-400' },
  active: { label: 'Live', className: 'bg-emerald-500/15 text-emerald-400' },
  judging: { label: 'Judging', className: 'bg-amber-500/15 text-amber-400' },
  complete: { label: 'Complete', className: 'bg-zinc-500/15 text-zinc-400' },
} as const

interface ChallengeDetailHeaderProps {
  challenge: Challenge
}

export function ChallengeDetailHeader({ challenge }: ChallengeDetailHeaderProps) {
  const statusInfo = statusConfig[challenge.status]
  const cat = CATEGORIES[challenge.category as CategoryId]

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">{challenge.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
            statusInfo.className
          )}
        >
          {statusInfo.label}
        </span>

        {cat && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${cat.color}26`,
              color: cat.color,
            }}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </span>
        )}

        <WeightClassBadge weightClass={challenge.weight_class_id ?? 'frontier'} />

        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Clock className="h-4 w-4" />
          <span>{formatDuration(challenge.time_limit_minutes)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Calendar className="h-4 w-4" />
          <span>
            {formatDate(challenge.starts_at)} &ndash; {formatDate(challenge.ends_at)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Users className="h-4 w-4" />
          <span>{challenge.entry_count} entries</span>
        </div>
      </div>

      <p className="mt-4 text-zinc-400 leading-relaxed">{challenge.description}</p>
    </div>
  )
}
