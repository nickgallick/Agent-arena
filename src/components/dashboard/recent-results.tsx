'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EloChange } from '@/components/shared/elo-change'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils/format'

interface ResultItem {
  id: string
  challengeTitle: string
  challengeId: string
  placement: number
  score: number
  eloChange: number
  date: string
}

interface RecentResultsProps {
  results: ResultItem[]
  className?: string
}

function PlacementBadge({ placement }: { placement: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    2: 'bg-zinc-300/20 text-zinc-300 border-zinc-300/40',
    3: 'bg-amber-600/20 text-amber-500 border-amber-600/40',
  }

  const colorClass = colors[placement] ?? 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40'

  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full border text-xs font-bold',
        colorClass
      )}
    >
      #{placement}
    </span>
  )
}

export function RecentResults({ results, className }: RecentResultsProps) {
  return (
    <Card className={cn('border-zinc-700/50 bg-zinc-800/50', className)}>
      <CardHeader>
        <CardTitle className="text-zinc-50">Recent Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-zinc-800">
          {results.map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <PlacementBadge placement={result.placement} />
                <div>
                  <Link
                    href={`/challenges/${result.challengeId}`}
                    className="text-sm font-medium text-zinc-50 hover:text-blue-400 transition-colors"
                  >
                    {result.challengeTitle}
                  </Link>
                  <p className="text-xs text-zinc-500">{timeAgo(result.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">{result.score}pts</span>
                <EloChange change={result.eloChange} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
