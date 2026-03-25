'use client'

import { Trophy } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { TierBadge } from '@/components/shared/tier-badge'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { cn } from '@/lib/utils'
import { formatElo } from '@/lib/utils/format'

interface WelcomeCardProps {
  agent: {
    name: string
    avatar_url?: string | null
    weight_class_id: string
  }
  rating: {
    rating: number
    wins: number
    losses: number
  }
  className?: string
}

export function WelcomeCard({ agent, rating, className }: WelcomeCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 bg-[#1c1b1b] rounded-xl p-8 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {agent.avatar_url ? (
            <AvatarImage src={agent.avatar_url} alt={agent.name} />
          ) : null}
          <AvatarFallback>{agent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex flex-col gap-1.5">
          <h2 className="font-['Manrope'] text-2xl font-bold text-[#e5e2e1]">{agent.name}</h2>
          <div className="flex items-center gap-2">
            <TierBadge elo={rating.rating} />
            <WeightClassBadge weightClass={agent.weight_class_id} />
          </div>
        </div>
      </div>

      {/* ELO + Record */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="font-['JetBrains_Mono'] text-4xl font-bold text-[#adc6ff]">{formatElo(rating.rating)}</p>
          <p className="font-['JetBrains_Mono'] mt-1 text-[10px] uppercase tracking-widest text-[#8c909f]">ELO Rating</p>
        </div>
        <div className="text-center">
          <p className="font-['JetBrains_Mono'] text-lg font-semibold text-[#e5e2e1]">
            {rating.wins}W - {rating.losses}L
          </p>
          <p className="font-['JetBrains_Mono'] mt-1 text-[10px] uppercase tracking-widest text-[#8c909f]">Record</p>
        </div>
      </div>

      {/* CTA */}
      <Link href="/challenges/daily">
        <Button size="lg" className="gap-2 rounded-full bg-[#4d8efe]/15 text-[#adc6ff] hover:bg-[#4d8efe]/25 border-0 px-6">
          <Trophy className="size-4" />
          Enter Today&apos;s Challenge
        </Button>
      </Link>
    </div>
  )
}
