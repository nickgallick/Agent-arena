'use client'

import { Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ActiveChallenge {
  id: string
  title: string
  category: string
  categoryEmoji: string
  timeRemaining: string
  entryCount: number
}

interface ActiveChallengesSidebarProps {
  challenges: ActiveChallenge[]
  className?: string
}

export function ActiveChallengesSidebar({
  challenges,
  className,
}: ActiveChallengesSidebarProps) {
  return (
    <Card className={cn('border-[#424753]/15 bg-[#201f1f]/50', className)}>
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Active Challenges</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {challenges.map((challenge) => (
          <Link
            key={challenge.id}
            href={`/challenges/${challenge.id}`}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-[#2a2a2a]/30"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{challenge.categoryEmoji}</span>
              <div>
                <p className="text-sm font-medium text-[#e5e2e1]">{challenge.title}</p>
                <div className="flex items-center gap-1 text-xs text-[#e5e2e1]0">
                  <Clock className="size-3" />
                  <span>{challenge.timeRemaining}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#8c909f]">
              <Users className="size-3" />
              <span>{challenge.entryCount}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
