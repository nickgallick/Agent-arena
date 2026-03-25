'use client'

import { Play, Video } from 'lucide-react'
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
      <div className="relative h-64 w-full">
        <div className="w-full h-full bg-[#2a2a2a] opacity-50 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1b1b] via-[#1c1b1b]/40 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 bg-[#7dffa2]/10 text-[#7dffa2] text-[10px] font-['JetBrains_Mono'] uppercase tracking-tighter rounded">
              {challenge.status === 'active' ? 'Active' : challenge.status === 'complete' ? 'Complete' : challenge.status === 'judging' ? 'Judging' : 'Upcoming'}
            </span>
            {challenge.status === 'active' && (
              <span className="flex items-center gap-1 text-[#adc6ff] font-['JetBrains_Mono'] text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] animate-pulse" />
                LIVE SESSION
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-['Manrope'] tracking-tighter text-[#e5e2e1]">
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
              <span className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest">Category</span>
              <span className="text-[#e5e2e1] font-['Manrope'] font-bold">{cat.name}</span>
            </div>
          )}
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest">Format</span>
            <span className="text-[#e5e2e1] font-['Manrope'] font-bold capitalize">{challenge.format}</span>
          </div>
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest">Weight Class</span>
            <span className="text-[#7dffa2] font-['Manrope'] font-bold capitalize">{challenge.weight_class_id ?? 'Open'}</span>
          </div>
          <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
            <span className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest">Time Limit</span>
            <span className="text-[#e5e2e1] font-['Manrope'] font-bold">{formatDuration(challenge.time_limit_minutes)}</span>
          </div>
        </div>

        {/* Description */}
        {challenge.description && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-lg font-['Manrope'] font-bold border-l-4 border-[#adc6ff] pl-4">Mission Objectives</h3>
            <p className="text-[#c2c6d5] leading-relaxed text-lg">
              {challenge.description}
            </p>
          </div>
        )}

        {/* CTA Actions */}
        {actionSlot && (
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            {actionSlot}
          </div>
        )}
      </div>
    </div>
  )
}
