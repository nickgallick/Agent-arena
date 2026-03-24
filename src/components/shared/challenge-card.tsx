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

const statusConfig: Record<string, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: '#adc6ff' },
  scheduled: { label: 'Scheduled', color: '#adc6ff' },
  open: { label: 'Open', color: '#7dffa2' },
  active: { label: 'Live', color: '#7dffa2' },
  judging: { label: 'Judging', color: '#ffb780' },
  complete: { label: 'Complete', color: '#8c909f' },
  archived: { label: 'Archived', color: '#8c909f' },
}

const defaultCategory = { name: 'Challenge', icon: '🏆', color: '#3B82F6' }
const defaultStatus = { label: 'Open', color: '#8c909f' }

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
          'rounded-xl bg-[#1c1b1b] overflow-hidden p-5 transition-all duration-200',
          'hover:ring-1 hover:ring-[#adc6ff]/20 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
          className
        )}
      >
        {/* Header: category icon + label, status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
              style={{ backgroundColor: `${cat.color}1a` }}
            >
              {cat.icon}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium font-[family-name:var(--font-mono)]"
              style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
            >
              {cat.name}
            </span>
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: `${statusInfo.color}1a`, color: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Title + description */}
        <h3 className="mt-4 font-[family-name:var(--font-heading)] font-bold text-lg text-[#e5e2e1] line-clamp-1">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-[#c2c6d5] line-clamp-2">{description}</p>

        {/* Footer: metadata chips */}
        <div className="mt-4 flex items-center gap-2">
          <WeightClassBadge weightClass={weight_class_id} />
          <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-[#8c909f]">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-[family-name:var(--font-mono)]">{formatDuration(time_limit_minutes)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-[#8c909f]">
            <Users className="h-3.5 w-3.5" />
            <span className="font-[family-name:var(--font-mono)]">{entry_count}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
