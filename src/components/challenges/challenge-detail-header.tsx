'use client'

import { CATEGORIES, type CategoryId } from '@/lib/constants/categories'
import { formatDuration } from '@/lib/utils/format'
import type { Challenge } from '@/types/challenge'

interface ChallengeDetailHeaderProps {
  challenge: Challenge
  actionSlot?: React.ReactNode
}

export function ChallengeDetailHeader({ challenge, actionSlot }: ChallengeDetailHeaderProps) {
  const cat = CATEGORIES[challenge.category as CategoryId]

  return (
    <div className="bg-[#1c1b1b] rounded-xl overflow-hidden shadow-2xl">
      {/* Hero image area with gradient overlay */}
      <div className="relative h-64 w-full bg-[#2a2a2a]">
        {/* Dark placeholder — no real image */}
        <div className="w-full h-full bg-[#2a2a2a] opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1b1b] via-[#1c1b1b]/40 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-4xl md:text-5xl font-extrabold font-[family-name:var(--font-heading)] tracking-tighter text-[#e5e2e1]">
            {challenge.title}
          </h1>
        </div>
      </div>

      {/* Content below hero */}
      <div className="p-8">
        {/* Metadata chips */}
        <div className="flex flex-wrap gap-3 mb-8">
          {cat && (
            <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
              <span className="text-[10px] text-[#8c909f] font-[family-name:var(--font-mono)] uppercase tracking-widest">Category</span>
              <span className="text-[#e5e2e1] font-[family-name:var(--font-heading)] font-bold">{cat.icon} {cat.name}</span>
            </div>
          )}
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="text-[10px] text-[#8c909f] font-[family-name:var(--font-mono)] uppercase tracking-widest">Weight Class</span>
            <span className="text-[#7dffa2] font-[family-name:var(--font-heading)] font-bold capitalize">{challenge.weight_class_id ?? 'Open'}</span>
          </div>
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="text-[10px] text-[#8c909f] font-[family-name:var(--font-mono)] uppercase tracking-widest">Time Limit</span>
            <span className="text-[#e5e2e1] font-[family-name:var(--font-heading)] font-bold">{formatDuration(challenge.time_limit_minutes)}</span>
          </div>
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="text-[10px] text-[#8c909f] font-[family-name:var(--font-mono)] uppercase tracking-widest">Format</span>
            <span className="text-[#e5e2e1] font-[family-name:var(--font-heading)] font-bold capitalize">{challenge.format}</span>
          </div>
          {challenge.entry_count > 0 && (
            <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
              <span className="text-[10px] text-[#8c909f] font-[family-name:var(--font-mono)] uppercase tracking-widest">Competitors</span>
              <span className="text-[#e5e2e1] font-[family-name:var(--font-heading)] font-bold">{challenge.entry_count}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {challenge.description && (
          <p className="text-[#c2c6d5] leading-relaxed text-lg mb-10">
            {challenge.description}
          </p>
        )}

        {/* Action buttons slot */}
        {actionSlot && (
          <div className="flex flex-col sm:flex-row gap-4">
            {actionSlot}
          </div>
        )}
      </div>
    </div>
  )
}
