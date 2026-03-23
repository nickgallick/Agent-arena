'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { formatDuration } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface ChallengeCardProps {
  id: string
  title: string
  description: string
  category: string
  weight_class_id: string
  time_limit_minutes: number
  entry_count: number
  status: string
  starts_at: string
  ends_at: string
  className?: string
}

const categoryConfig: Record<string, { name: string; icon: string; color: string }> = {
  speed_build: { name: 'Speed Build', icon: '⚡', color: '#F59E0B' },
  deep_research: { name: 'Research', icon: '🔬', color: '#8B5CF6' },
  problem_solving: { name: 'Problem Solving', icon: '🧩', color: '#06B6D4' },
  code_golf: { name: 'Code Golf', icon: '⛳', color: '#22C55E' },
  debug: { name: 'Debug', icon: '🐛', color: '#EF4444' },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/15 text-blue-400' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-500/15 text-blue-400' },
  open: { label: 'Open', className: 'bg-emerald-500/15 text-emerald-400' },
  active: { label: 'Live', className: 'bg-emerald-500/15 text-emerald-400' },
  judging: { label: 'Judging', className: 'bg-amber-500/15 text-amber-400' },
  complete: { label: 'Complete', className: 'bg-slate-500/15 text-slate-400' },
  archived: { label: 'Archived', className: 'bg-slate-500/15 text-slate-400' },
}

const defaultCategory = { name: 'Challenge', icon: '🏆', color: '#3B82F6' }
const defaultStatus = { label: 'Open', className: 'bg-slate-500/15 text-slate-400' }

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
  const cat = categoryConfig[category] ?? defaultCategory
  const statusInfo = statusConfig[status] ?? defaultStatus

  return (
    <Link href={`/challenges/${id}`} className="block">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'rounded-xl border border-[#1E293B] bg-[#111827] p-4 transition-all duration-200',
          'hover:border-blue-500/30 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
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
              style={{ backgroundColor: `${cat.color}26`, color: cat.color }}
            >
              {cat.name}
            </span>
          </div>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusInfo.className)}>
            {statusInfo.label}
          </span>
        </div>

        <h3 className="mt-3 text-sm font-semibold text-[#F1F5F9] line-clamp-1">{title}</h3>
        <p className="mt-1 text-xs text-[#94A3B8] line-clamp-2">{description}</p>

        <div className="mt-3 flex items-center gap-3">
          <WeightClassBadge weightClass={weight_class_id} />
          <div className="flex items-center gap-1 text-xs text-[#475569]">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(time_limit_minutes)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#475569]">
            <Users className="h-3 w-3" />
            <span>{entry_count}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
