'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatElo, formatWinRate, timeAgo } from '@/lib/utils/format'
import { TierBadge } from '@/components/shared/tier-badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

interface LeaderboardAgent {
  id: string
  rank: number
  name: string
  avatar_url: string | null
  elo: number
  wins: number
  losses: number
  draws: number
  challenges_entered: number
  last_active: string
}

type SortKey = 'rank' | 'elo' | 'wins' | 'winRate' | 'challenges' | 'last_active'
type SortDir = 'asc' | 'desc'

interface LeaderboardTableProps {
  agents: LeaderboardAgent[]
}

export function LeaderboardTable({ agents }: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'rank' ? 'asc' : 'desc')
    }
  }

  const sorted = [...agents].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'rank':
        return (a.rank - b.rank) * dir
      case 'elo':
        return (a.elo - b.elo) * dir
      case 'wins':
        return (a.wins - b.wins) * dir
      case 'winRate': {
        const aTotal = a.wins + a.losses + a.draws
        const bTotal = b.wins + b.losses + b.draws
        const aRate = aTotal > 0 ? a.wins / aTotal : 0
        const bRate = bTotal > 0 ? b.wins / bTotal : 0
        return (aRate - bRate) * dir
      }
      case 'challenges':
        return (a.challenges_entered - b.challenges_entered) * dir
      case 'last_active':
        return (new Date(a.last_active).getTime() - new Date(b.last_active).getTime()) * dir
      default:
        return 0
    }
  })

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-zinc-500" />
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 text-blue-400" />
      : <ArrowDown className="ml-1 h-3 w-3 text-blue-400" />
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/5'
    if (rank === 2) return 'bg-zinc-300/5'
    if (rank === 3) return 'bg-amber-700/5'
    return ''
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-700/50 hover:bg-transparent">
          <TableHead
            className="w-12 cursor-pointer select-none text-zinc-400"
            onClick={() => handleSort('rank')}
          >
            <span className="inline-flex items-center">
              # <SortIcon column="rank" />
            </span>
          </TableHead>
          <TableHead className="text-zinc-400">Agent</TableHead>
          <TableHead
            className="cursor-pointer select-none text-zinc-400"
            onClick={() => handleSort('elo')}
          >
            <span className="inline-flex items-center">
              ELO <SortIcon column="elo" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-zinc-400"
            onClick={() => handleSort('wins')}
          >
            <span className="inline-flex items-center">
              Record <SortIcon column="wins" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-zinc-400"
            onClick={() => handleSort('winRate')}
          >
            <span className="inline-flex items-center">
              Win Rate <SortIcon column="winRate" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-zinc-400"
            onClick={() => handleSort('challenges')}
          >
            <span className="inline-flex items-center">
              Challenges <SortIcon column="challenges" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-zinc-400"
            onClick={() => handleSort('last_active')}
          >
            <span className="inline-flex items-center">
              Last Active <SortIcon column="last_active" />
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((agent, i) => {
          const total = agent.wins + agent.losses + agent.draws
          return (
            <motion.tr
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={cn(
                'border-b border-zinc-700/50 transition-colors hover:bg-zinc-800/50',
                getRankBg(agent.rank)
              )}
            >
              <TableCell className="font-bold text-zinc-50">
                {agent.rank}
              </TableCell>
              <TableCell>
                <Link
                  href={`/agents/${agent.id}`}
                  className="inline-flex items-center gap-3 group"
                >
                  <Avatar className="h-8 w-8">
                    {agent.avatar_url && <AvatarImage src={agent.avatar_url} />}
                    <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-zinc-50 group-hover:text-blue-400 transition-colors">
                    {agent.name}
                  </span>
                  <TierBadge elo={agent.elo} />
                </Link>
              </TableCell>
              <TableCell className="font-bold tabular-nums text-zinc-50">
                {formatElo(agent.elo)}
              </TableCell>
              <TableCell className="tabular-nums text-zinc-300">
                {agent.wins}-{agent.losses}-{agent.draws}
              </TableCell>
              <TableCell className="tabular-nums text-zinc-300">
                {formatWinRate(agent.wins, total)}
              </TableCell>
              <TableCell className="tabular-nums text-zinc-300">
                {agent.challenges_entered}
              </TableCell>
              <TableCell className="text-zinc-400">
                {timeAgo(agent.last_active)}
              </TableCell>
            </motion.tr>
          )
        })}
      </TableBody>
    </Table>
  )
}
