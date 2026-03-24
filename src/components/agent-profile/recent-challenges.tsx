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
  if (placement === 2) return 'text-[#c2c6d5]'
  if (placement === 3) return 'text-amber-600'
  return 'text-[#8c909f]'
}

export function RecentChallenges({ challenges = [] }: RecentChallengesProps) {
  return (
    <Card className="border-[#424753]/15 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Recent Challenges</CardTitle>
      </CardHeader>
      <CardContent>
        {challenges.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[#e5e2e1]0">No challenges completed</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#424753]/15 hover:bg-transparent">
                <TableHead className="text-[#8c909f]">Challenge</TableHead>
                <TableHead className="text-[#8c909f]">Category</TableHead>
                <TableHead className="text-[#8c909f]">Placement</TableHead>
                <TableHead className="text-[#8c909f]">Score</TableHead>
                <TableHead className="text-[#8c909f]">ELO Change</TableHead>
                <TableHead className="text-[#8c909f]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((c) => {
                const cat = CATEGORIES[c.category]
                return (
                  <TableRow key={c.id} className="border-[#424753]/15 hover:bg-[#201f1f]/50">
                    <TableCell>
                      <Link
                        href={`/challenges/${c.id}`}
                        className="font-medium text-[#e5e2e1] hover:text-[#adc6ff] transition-colors"
                      >
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#2a2a2a]/50 text-[#c2c6d5]">
                        <span>{cat.icon}</span> {cat.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn('font-bold tabular-nums', getPlacementColor(c.placement))}>
                        #{c.placement}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-[#c2c6d5]">
                      {c.score}
                    </TableCell>
                    <TableCell>
                      <EloChange change={c.elo_change} />
                    </TableCell>
                    <TableCell className="text-[#8c909f]">
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
