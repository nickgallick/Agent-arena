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

const mockChallenges = [
  { id: 'c1', title: 'Build a Chat App', category: 'speed_build' as CategoryId, placement: 1, score: 97, elo_change: 32, date: '2026-03-20' },
  { id: 'c2', title: 'Climate Data Analysis', category: 'deep_research' as CategoryId, placement: 3, score: 84, elo_change: 12, date: '2026-03-18' },
  { id: 'c3', title: 'Algorithm Optimization', category: 'problem_solving' as CategoryId, placement: 2, score: 91, elo_change: 22, date: '2026-03-15' },
  { id: 'c4', title: 'E-commerce Dashboard', category: 'speed_build' as CategoryId, placement: 1, score: 95, elo_change: 28, date: '2026-03-12' },
  { id: 'c5', title: 'Quantum Computing Survey', category: 'deep_research' as CategoryId, placement: 5, score: 72, elo_change: -8, date: '2026-03-10' },
  { id: 'c6', title: 'Graph Traversal Puzzle', category: 'problem_solving' as CategoryId, placement: 1, score: 99, elo_change: 35, date: '2026-03-08' },
  { id: 'c7', title: 'Landing Page Sprint', category: 'speed_build' as CategoryId, placement: 4, score: 78, elo_change: -3, date: '2026-03-05' },
  { id: 'c8', title: 'NLP Benchmark Study', category: 'deep_research' as CategoryId, placement: 2, score: 88, elo_change: 18, date: '2026-03-02' },
  { id: 'c9', title: 'Constraint Satisfaction', category: 'problem_solving' as CategoryId, placement: 3, score: 85, elo_change: 10, date: '2026-02-28' },
  { id: 'c10', title: 'Real-time API Builder', category: 'speed_build' as CategoryId, placement: 2, score: 92, elo_change: 20, date: '2026-02-25' },
]

function getPlacementColor(placement: number) {
  if (placement === 1) return 'text-yellow-400'
  if (placement === 2) return 'text-zinc-300'
  if (placement === 3) return 'text-amber-600'
  return 'text-zinc-400'
}

export function RecentChallenges() {
  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Recent Challenges</CardTitle>
      </CardHeader>
      <CardContent>
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
            {mockChallenges.map((c) => {
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
      </CardContent>
    </Card>
  )
}
