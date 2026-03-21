'use client'

import { Trophy, Coins } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { EloChange } from '@/components/shared/elo-change'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'

interface ResultRow {
  id: string
  challenge: string
  category: string
  placement: number
  score: number
  eloChange: number
  coins: number
  date: string
}

const mockResults: ResultRow[] = [
  { id: 'r1', challenge: 'Algorithm: Graph Traversal', category: 'algorithm', placement: 1, score: 98, eloChange: 24, coins: 150, date: '2026-03-21' },
  { id: 'r2', challenge: 'Speed Build: CLI Tool', category: 'speed-build', placement: 3, score: 87, eloChange: 8, coins: 75, date: '2026-03-20' },
  { id: 'r3', challenge: 'Debug: Race Condition', category: 'debug', placement: 2, score: 92, eloChange: 15, coins: 100, date: '2026-03-18' },
  { id: 'r4', challenge: 'Optimize: Image Pipeline', category: 'optimization', placement: 5, score: 74, eloChange: -6, coins: 30, date: '2026-03-16' },
  { id: 'r5', challenge: 'Design: Component Library', category: 'design', placement: 1, score: 96, eloChange: 22, coins: 150, date: '2026-03-14' },
  { id: 'r6', challenge: 'Algorithm: Dynamic Programming', category: 'algorithm', placement: 4, score: 79, eloChange: -2, coins: 40, date: '2026-03-12' },
  { id: 'r7', challenge: 'Speed Build: Auth System', category: 'speed-build', placement: 2, score: 91, eloChange: 14, coins: 100, date: '2026-03-10' },
  { id: 'r8', challenge: 'Testing: E2E Suite', category: 'testing', placement: 1, score: 95, eloChange: 20, coins: 150, date: '2026-03-08' },
  { id: 'r9', challenge: 'Debug: Async Deadlock', category: 'debug', placement: 6, score: 68, eloChange: -10, coins: 20, date: '2026-03-06' },
  { id: 'r10', challenge: 'Optimize: Bundle Size', category: 'optimization', placement: 3, score: 85, eloChange: 7, coins: 75, date: '2026-03-04' },
]

const totalCoins = mockResults.reduce((sum, r) => sum + r.coins, 0)

function PlacementCell({ placement }: { placement: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-500/20 text-yellow-400',
    2: 'bg-zinc-300/20 text-zinc-300',
    3: 'bg-amber-600/20 text-amber-500',
  }
  const colorClass = colors[placement] ?? 'bg-zinc-700/30 text-zinc-400'

  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full text-xs font-bold',
        colorClass
      )}
    >
      #{placement}
    </span>
  )
}

const CATEGORY_EMOJI: Record<string, string> = {
  'speed-build': '\u26A1',
  'debug': '\uD83D\uDC1B',
  'algorithm': '\uD83E\udDE9',
  'design': '\uD83C\uDFA8',
  'optimization': '\uD83D\uDE80',
  'testing': '\uD83E\uddEA',
}

export default function ResultsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-50">My Results</h1>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-4 py-2">
          <Coins className="size-5 text-yellow-400" />
          <span className="text-sm text-zinc-400">Total Earned:</span>
          <span className="font-bold text-yellow-400">{totalCoins.toLocaleString()}</span>
        </div>
      </div>

      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700/50 hover:bg-transparent">
                <TableHead className="text-zinc-400">Challenge</TableHead>
                <TableHead className="text-zinc-400">Category</TableHead>
                <TableHead className="text-zinc-400">Placement</TableHead>
                <TableHead className="text-zinc-400">Score</TableHead>
                <TableHead className="text-zinc-400">ELO Change</TableHead>
                <TableHead className="text-zinc-400">Coins</TableHead>
                <TableHead className="text-zinc-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockResults.map((result) => (
                <TableRow key={result.id} className="border-zinc-700/50">
                  <TableCell className="font-medium text-zinc-50">{result.challenge}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-zinc-700/50 text-zinc-300">
                      {CATEGORY_EMOJI[result.category] ?? ''} {result.category.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PlacementCell placement={result.placement} />
                  </TableCell>
                  <TableCell className="text-zinc-300">{result.score}pts</TableCell>
                  <TableCell>
                    <EloChange change={result.eloChange} />
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Coins className="size-3" />
                      {result.coins}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-400">{formatDate(result.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
