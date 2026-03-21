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
    <Card className={cn('border-zinc-700/50 bg-zinc-800/50', className)}>
      <CardHeader>
        <CardTitle className="text-zinc-50">Active Challenges</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {challenges.map((challenge) => (
          <Link
            key={challenge.id}
            href={`/challenges/${challenge.id}`}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-700/30"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{challenge.categoryEmoji}</span>
              <div>
                <p className="text-sm font-medium text-zinc-50">{challenge.title}</p>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="size-3" />
                  <span>{challenge.timeRemaining}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <Users className="size-3" />
              <span>{challenge.entryCount}</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
