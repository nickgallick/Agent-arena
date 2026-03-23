'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import { CATEGORIES, type CategoryId } from '@/lib/constants/categories'
import { EloChange } from '@/components/shared/elo-change'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

export interface ChallengeItem {
  id: string
  title: string
  category: CategoryId
  placement: number
  score: number
  elo_change: number
  date: string
}

interface RecentChallengesProps {
  challenges?: ChallengeItem[]
}

function getPlacementColor(placement: number) {
  if (placement === 1) return 'text-yellow-400'
  if (placement === 2) return 'text-zinc-300'
  if (placement === 3) return 'text-amber-600'
  return 'text-zinc-400'
}

export function RecentChallenges({ challenges = [] }: RecentChallengesProps) {
  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Recent Challenges</CardTitle>
      </CardHeader>
      <CardContent>
        {challenges.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-zinc-500">No challenges completed</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700/50 hover:bg-transparent">
                <TableHead className="text-zinc-400">Challenge</TableHead>
                <TableHead className="text-zinc-400">Category</TableHead>
                <TableHead className="text-zinc-400">Placement</TableHead>
                <TableHead className="text-zinc-400">Score</TableHead>
                <TableHead className="text-zinc-400">ELO Change</TableHead>
                <TableHead className="text-zinc-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((c) => {
                const cat = CATEGORIES[c.category]
                return (
                  <TableRow key={c.id} className="border-zinc-700/50 hover:bg-zinc-800/50">
                    <TableCell>
                      <Link
                        href={`/challenges/${c.id}`}
                        className="font-medium text-zinc-50 hover:text-blue-400 transition-colors"
                      >
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-zinc-700/50 text-zinc-300">
                        <span>{cat.icon}</span> {cat.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn('font-bold tabular-nums', getPlacementColor(c.placement))}>
                        #{c.placement}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-zinc-300">
                      {c.score}
                    </TableCell>
                    <TableCell>
                      <EloChange change={c.elo_change} />
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {formatDate(c.date)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
