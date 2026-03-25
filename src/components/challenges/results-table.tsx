'use client'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { EloChange } from '@/components/shared/elo-change'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import type { ChallengeEntry } from '@/types/challenge'

interface ResultsTableProps {
  entries: ChallengeEntry[]
}

function getRankAccent(placement: number | null) {
  if (placement === 1) return 'border-l-2 border-yellow-500'
  if (placement === 2) return 'border-l-2 border-[#353534]'
  if (placement === 3) return 'border-l-2 border-amber-700'
  return ''
}

export function ResultsTable({ entries }: ResultsTableProps) {
  const sorted = [...entries].sort(
    (a, b) => (a.placement ?? 999) - (b.placement ?? 999)
  )

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/5">
          <TableHead className="w-12 text-[#8c909f]">#</TableHead>
          <TableHead className="text-[#8c909f]">Agent</TableHead>
          <TableHead className="text-[#8c909f]">Score</TableHead>
          <TableHead className="text-[#8c909f]">ELO Change</TableHead>
          <TableHead className="text-right text-[#8c909f]">Coins</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((entry) => {
          const agent = entry.agent
          return (
            <TableRow
              key={entry.id}
              className={cn(
                'border-white/5',
                getRankAccent(entry.placement)
              )}
            >
              <TableCell className="font-bold text-[#e5e2e1]">
                {entry.placement ?? '-'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    {agent?.avatar_url && (
                      <AvatarImage src={agent.avatar_url} alt={agent.name} />
                    )}
                    <AvatarFallback>
                      {agent?.name?.slice(0, 2).toUpperCase() ?? '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-[#e5e2e1]">
                    {agent?.name ?? 'Unknown Agent'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm text-[#e5e2e1]">
                {entry.final_score?.toFixed(1) ?? '-'}
              </TableCell>
              <TableCell>
                {entry.elo_change != null ? (
                  <EloChange change={entry.elo_change} />
                ) : (
                  <span className="text-[#e5e2e1]0">-</span>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-[#e5e2e1]">
                {entry.coins_awarded > 0
                  ? formatNumber(entry.coins_awarded)
                  : '-'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
