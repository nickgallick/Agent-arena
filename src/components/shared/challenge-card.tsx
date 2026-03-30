'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { formatDuration } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface DifficultyProfile {
  reasoning_depth?: number
  tool_dependence?: number
  ambiguity?: number
  deception?: number
  time_pressure?: number
  error_recovery?: number
  non_local_dependency?: number
  evaluation_strictness?: number
}

interface ChallengeCardProps {
  id: string
  title: string
  description: string
  category: string
  weight_class_id: string
  time_limit_minutes: number
  entry_count: number
  entry_fee_cents?: number | null
  prize_pool?: number | null
  platform_fee_percent?: number | null
  status: string
  starts_at: string
  ends_at: string
  difficulty_profile?: DifficultyProfile | null
  challenge_family?: string | null
  challenge_type?: string | null
  format?: string
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

const familyLabels: Record<string, string> = {
  'blacksite-debug': 'Blacksite Debug',
  'fog-of-war': 'Fog of War',
  'false-summit': 'False Summit',
  'constraint-maze': 'Constraint Maze',
  'versus-arena': 'Versus',
  'forensic-cascade': 'Forensic Cascade',
  'toolchain-disaster': 'Toolchain Disaster',
}

function DifficultyBar({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? '#f9a8d4' : value >= 6 ? '#ffb780' : value >= 4 ? '#adc6ff' : '#7dffa2'
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] text-[#8c909f] w-20 shrink-0 uppercase tracking-wider truncate">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-[#2a2a2a]">
        <div className="h-1 rounded-full transition-all" style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-[9px] w-3 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

export function ChallengeCard({
  id,
  title,
  description,
  category,
  weight_class_id,
  time_limit_minutes,
  entry_count,
  entry_fee_cents,
  prize_pool,
  status,
  difficulty_profile,
  challenge_family,
  challenge_type,
  format,
  className,
}: ChallengeCardProps) {
  const cat = categoryConfig[category] ?? defaultCategory
  const statusInfo = statusConfig[status] ?? defaultStatus
  const prizePoolUSD = prize_pool && prize_pool > 0 ? (prize_pool / 100).toFixed(0) : null
  const entryFeeUSD = entry_fee_cents && entry_fee_cents > 0 ? (entry_fee_cents / 100).toFixed(2) : null
  const rawFamily = challenge_family ?? challenge_type
  const familyLabel = rawFamily ? (familyLabels[rawFamily] ?? null) : null

  // Pick top 3 highest difficulty dimensions to surface
  const topDimensions = difficulty_profile
    ? Object.entries({
        'Reasoning': difficulty_profile.reasoning_depth,
        'Tool dep.': difficulty_profile.tool_dependence,
        'Ambiguity': difficulty_profile.ambiguity,
        'Deception': difficulty_profile.deception,
        'Recovery': difficulty_profile.error_recovery,
      })
        .filter(([, v]) => v != null)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3) as [string, number][]
    : []

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
            <div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium font-['JetBrains_Mono']"
                style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
              >
                {cat.name}
              </span>
              {familyLabel && (
                <span className="ml-1.5 text-[10px] font-mono text-[#8c909f]">{familyLabel}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {format && (
              <span className="rounded px-2 py-0.5 text-[10px] font-mono text-[#8c909f] bg-[#252525]">
                {format.charAt(0).toUpperCase() + format.slice(1)}
              </span>
            )}
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${statusInfo.color}1a`, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Title + description */}
        <h3 className="mt-4 font-['Manrope'] font-bold text-lg text-[#e5e2e1] line-clamp-1">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-[#c2c6d5] line-clamp-2">{description}</p>

        {/* Difficulty profile bars */}
        {topDimensions.length > 0 && (
          <div className="mt-4 space-y-1.5 pt-3 border-t border-white/5">
            {topDimensions.map(([label, value]) => (
              <DifficultyBar key={label} label={label} value={value} />
            ))}
          </div>
        )}

        {/* Footer: metadata chips */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <WeightClassBadge weightClass={weight_class_id} />
          <div className="flex items-center gap-1.5 rounded-full bg-[#131313]/[0.06] px-2.5 py-1 text-xs text-[#8c909f]">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-['JetBrains_Mono']">{formatDuration(time_limit_minutes)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#131313]/[0.06] px-2.5 py-1 text-xs text-[#8c909f]">
            <Users className="h-3.5 w-3.5" />
            <span className="font-['JetBrains_Mono']">{entry_count}</span>
          </div>
          {prizePoolUSD && (
            <div className="flex items-center gap-1.5 rounded-full bg-[#7dffa2]/10 border border-[#7dffa2]/20 px-2.5 py-1 text-xs text-[#7dffa2] font-bold">
              <span className="font-['JetBrains_Mono']">${prizePoolUSD} USDC</span>
            </div>
          )}
          {/* Entry fee display suppressed at launch — all challenges free */}
        </div>
      </motion.div>
    </Link>
  )
}
