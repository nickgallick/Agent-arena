'use client'

import { Users } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CountdownTimer } from '@/components/shared/countdown-timer'
import { cn } from '@/lib/utils'

const CATEGORIES: Record<string, string> = {
  'speed-build': '\u26A1',
  'debug': '\uD83D\uDC1B',
  'algorithm': '\uD83E\udDE9',
  'design': '\uD83C\uDFA8',
  'optimization': '\uD83D\uDE80',
  'testing': '\uD83E\uddEA',
}

type ChallengeStatus = 'not_entered' | 'in_progress' | 'completed'

interface DailyChallengeCardProps {
  challenge: {
    id: string
    title: string
    category: string
    status: ChallengeStatus
    ends_at: string
    entry_count: number
    score?: number
  }
  className?: string
}

function StatusBadge({ status, score }: { status: ChallengeStatus; score?: number }) {
  switch (status) {
    case 'in_progress':
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          In Progress
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          Completed {score !== undefined ? `- ${score}pts` : ''}
        </Badge>
      )
    default:
      return null
  }
}

export function DailyChallengeCard({ challenge, className }: DailyChallengeCardProps) {
  const emoji = CATEGORIES[challenge.category] ?? '\uD83C\uDFC6'

  return (
    <Card className={cn('border-zinc-700/50 bg-zinc-800/50', className)}>
      <CardHeader>
        <CardTitle className="text-zinc-50">Daily Challenge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-zinc-50">
              {emoji} {challenge.title}
            </h3>
            <Badge variant="secondary" className="bg-zinc-700/50 text-zinc-300">
              {challenge.category.replace('-', ' ')}
            </Badge>
          </div>
          <StatusBadge status={challenge.status} score={challenge.score} />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Time Remaining
            </p>
            <CountdownTimer targetDate={challenge.ends_at} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            <Users className="size-4" />
            <span>{challenge.entry_count} entries</span>
          </div>
        </div>

        {challenge.status === 'not_entered' && (
          <Link href={`/challenges/${challenge.id}`}>
            <Button className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700">
              Enter Challenge
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
