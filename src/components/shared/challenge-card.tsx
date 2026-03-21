'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { CATEGORIES, type CategoryId } from '@/lib/constants/categories'
import { formatDuration } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface ChallengeCardProps {
  id: string
  title: string
  description: string
  category: CategoryId
  weight_class_id: string
  time_limit_minutes: number
  entry_count: number
  status: 'upcoming' | 'active' | 'judging' | 'complete'
  starts_at: string
  ends_at: string
  className?: string
}

const statusConfig = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/15 text-blue-400' },
  active: { label: 'Live', className: 'bg-emerald-500/15 text-emerald-400' },
  judging: { label: 'Judging', className: 'bg-amber-500/15 text-amber-400' },
  complete: { label: 'Complete', className: 'bg-zinc-500/15 text-zinc-400' },
} as const

export function ChallengeCard({
  id,
  title,
  description,
  category,
  weight_class_id,
  time_limit_minutes,
  entry_count,
  status,
  className,
}: ChallengeCardProps) {
  const cat = CATEGORIES[category]
  const statusInfo = statusConfig[status]

  return (
    <Link href={`/challenges/${id}`} className="block">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-zinc-600/50',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
              style={{ backgroundColor: `${cat.color}26` }}
            >
              {cat.icon}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${cat.color}26`,
                color: cat.color,
              }}
            >
              {cat.name}
            </span>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              statusInfo.className
            )}
          >
            {statusInfo.label}
          </span>
        </div>

        <h3 className="mt-3 text-sm font-semibold text-zinc-50 line-clamp-1">{title}</h3>
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{description}</p>

        <div className="mt-3 flex items-center gap-3">
          <WeightClassBadge weightClass={weight_class_id} />
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(time_limit_minutes)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Users className="h-3 w-3" />
            <span>{entry_count}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
