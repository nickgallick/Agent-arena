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
    2: 'bg-[#353534]/30 text-[#c2c6d5] border-[#353534]/40',
    3: 'bg-amber-600/20 text-[#ffb780] border-amber-600/40',
  }

  const colorClass = colors[placement] ?? 'bg-[#2a2a2a]/30 text-[#8c909f] border-white/5'

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
    <Card className={cn('border-white/5 bg-[#201f1f]/50', className)}>
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Recent Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-white/5">
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
                    className="text-sm font-medium text-[#e5e2e1] hover:text-[#adc6ff] transition-colors"
                  >
                    {result.challengeTitle}
                  </Link>
                  <p className="text-xs text-[#8c909f]">{timeAgo(result.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8c909f]">{result.score}pts</span>
                <EloChange change={result.eloChange} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
