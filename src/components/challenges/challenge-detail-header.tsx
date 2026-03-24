'use client'

import { Clock, Users, Trophy } from 'lucide-react'
import { CATEGORIES, type CategoryId } from '@/lib/constants/categories'
import { formatDuration } from '@/lib/utils/format'
import type { Challenge } from '@/types/challenge'

const statusConfig = {
  upcoming: { label: 'Upcoming', className: 'bg-[#4d8efe]/15 text-[#adc6ff]', dot: '#adc6ff' },
  active: { label: 'ACTIVE', className: 'bg-[#7dffa2]/15 text-[#7dffa2]', dot: '#7dffa2' },
  judging: { label: 'Judging', className: 'bg-[#ffb780]/15 text-[#ffb780]', dot: '#ffb780' },
  complete: { label: 'Complete', className: 'bg-[#353534]/20 text-[#8c909f]', dot: '#8c909f' },
} as const

interface ChallengeDetailHeaderProps {
  challenge: Challenge
}

export function ChallengeDetailHeader({ challenge }: ChallengeDetailHeaderProps) {
  const statusInfo = statusConfig[challenge.status as keyof typeof statusConfig] ?? statusConfig.upcoming
  const cat = CATEGORIES[challenge.category as CategoryId]

  return (
    <div>
      {/* Status + Live indicator */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-[10px] font-[family-name:var(--font-mono)] font-bold uppercase tracking-wider ${statusInfo.className}`}>
          {challenge.status === 'active' && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusInfo.dot }} />
          )}
          {statusInfo.label}
        </span>
        {challenge.status === 'active' && (
          <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] text-[#7dffa2] uppercase tracking-wider">
            ● Live Session
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-extrabold tracking-tighter text-[#e5e2e1] mb-6">
        {challenge.title}
      </h1>

      {/* Metadata pills */}
      <div className="flex flex-wrap gap-3 mb-6">
        {cat && (
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Category</span>
            <span className="font-[family-name:var(--font-heading)] font-bold text-[#e5e2e1] mt-0.5">{cat.icon} {cat.name}</span>
          </div>
        )}
        <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Format</span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[#e5e2e1] mt-0.5 capitalize">{challenge.format}</span>
        </div>
        <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Weight Class</span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[#7dffa2] mt-0.5 capitalize">{challenge.weight_class_id ?? 'Open'}</span>
        </div>
        <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Time Limit</span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[#e5e2e1] mt-0.5">{formatDuration(challenge.time_limit_minutes)}</span>
        </div>
        {challenge.entry_count > 0 && (
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Competitors</span>
            <span className="font-[family-name:var(--font-heading)] font-bold text-[#e5e2e1] mt-0.5">{challenge.entry_count}</span>
          </div>
        )}
      </div>

      {/* Mission Objectives */}
      {challenge.description && (
        <div className="border-l-4 border-[#4d8efe] pl-5 py-1 mb-6">
          <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#8c909f] mb-2">
            Mission Objectives
          </h2>
          <p className="text-[#c2c6d5] leading-relaxed">{challenge.description}</p>
        </div>
      )}

      {/* Prize pool if available */}
      {challenge.max_coins > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="size-4 text-[#adc6ff]" />
          <span className="font-[family-name:var(--font-mono)] text-[#c2c6d5] text-[11px] uppercase tracking-wider">
            Pool Total: <span className="text-[#adc6ff] font-bold">{challenge.max_coins.toLocaleString()} Credits</span>
          </span>
        </div>
      )}
    </div>
  )
}
