'use client'

import { useEffect, useState } from 'react'
import { Trophy, Coins, Loader2, FileText } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/use-user'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

const CATEGORY_EMOJI: Record<string, string> = {
  'speed-build': '⚡',
  debug: '🐛',
  algorithm: '🧩',
  design: '🎨',
  optimization: '🚀',
  testing: '🧪',
}

function PlacementCell({ placement }: { placement: number }) {
  if (!placement || placement === 0) {
    return <span className="text-xs text-[#e5e2e1]0">—</span>
  }
  const colors: Record<number, string> = {
    1: 'bg-yellow-500/20 text-yellow-400',
    2: 'bg-zinc-300/20 text-zinc-300',
    3: 'bg-amber-600/20 text-amber-500',
  }
  const colorClass = colors[placement] ?? 'bg-zinc-700/30 text-[#8c909f]'

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

export default function ResultsPage() {
  const { user, loading: userLoading } = useUser()
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchResults() {
      try {
        const res = await fetch('/api/me/results?limit=50')
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        const mapped: ResultRow[] = (data.results ?? []).map(
          (r: {
            id: string
            challenge?: { title?: string; category?: string; id?: string }
            placement: number | null
            final_score: number | null
            elo_change: number | null
            coins_awarded: number | null
            created_at: string
          }) => ({
            id: r.id,
            challenge: r.challenge?.title ?? 'Unknown Challenge',
            category: r.challenge?.category ?? 'unknown',
            placement: r.placement ?? 0,
            score: r.final_score ?? 0,
            eloChange: r.elo_change ?? 0,
            coins: r.coins_awarded ?? 0,
            date: r.created_at,
          })
        )
        setResults(mapped)
      } catch (err) {
        console.error('[ResultsPage] Failed to load results:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [user, userLoading])

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#8c909f]" />
      </div>
    )
  }

  const totalCoins = results.reduce((sum, r) => sum + r.coins, 0)

  // Empty state
  if (results.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold text-[#e5e2e1]">My Results</h1>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-700/30">
            <FileText className="size-8 text-[#e5e2e1]0" />
          </div>
          <h2 className="text-xl font-bold text-[#e5e2e1]">No results yet</h2>
          <p className="max-w-md text-[#8c909f]">
            Enter a challenge to get started. Your results, placements, and ELO changes will appear here.
          </p>
          <Link href="/challenges">
            <Button variant="outline" className="mt-2 border-zinc-700">
              Browse Challenges
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e5e2e1]">My Results</h1>
        <div className="flex items-center gap-2 rounded-lg border border-[#424753]/15 bg-[#201f1f]/50 px-4 py-2">
          <Coins className="size-5 text-yellow-400" />
          <span className="text-sm text-[#8c909f]">Total Earned:</span>
          <span className="font-bold text-yellow-400">{totalCoins.toLocaleString()}</span>
        </div>
      </div>

      <Card className="border-[#424753]/15 bg-[#201f1f]/50">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-[#424753]/15 hover:bg-transparent">
                <TableHead className="text-[#8c909f]">Challenge</TableHead>
                <TableHead className="text-[#8c909f]">Category</TableHead>
                <TableHead className="text-[#8c909f]">Placement</TableHead>
                <TableHead className="text-[#8c909f]">Score</TableHead>
                <TableHead className="text-[#8c909f]">ELO Change</TableHead>
                <TableHead className="text-[#8c909f]">Coins</TableHead>
                <TableHead className="text-[#8c909f]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id} className="border-[#424753]/15">
                  <TableCell className="font-medium text-[#e5e2e1]">{result.challenge}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-zinc-700/50 text-zinc-300">
                      {CATEGORY_EMOJI[result.category] ?? ''}{' '}
                      {result.category.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PlacementCell placement={result.placement} />
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {result.score > 0 ? `${result.score}pts` : '—'}
                  </TableCell>
                  <TableCell>
                    <EloChange change={result.eloChange} />
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Coins className="size-3" />
                      {result.coins}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#8c909f]">{formatDate(result.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
