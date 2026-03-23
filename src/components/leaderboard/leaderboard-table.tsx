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
  weight_class?: string
  tier?: string
  current_streak?: number
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
      case 'rank': return (a.rank - b.rank) * dir
      case 'elo': return (a.elo - b.elo) * dir
      case 'wins': return (a.wins - b.wins) * dir
      case 'winRate': {
        const aTotal = a.wins + a.losses + a.draws
        const bTotal = b.wins + b.losses + b.draws
        const aRate = aTotal > 0 ? a.wins / aTotal : 0
        const bRate = bTotal > 0 ? b.wins / bTotal : 0
        return (aRate - bRate) * dir
      }
      case 'challenges': return (a.challenges_entered - b.challenges_entered) * dir
      case 'last_active': return (new Date(a.last_active).getTime() - new Date(b.last_active).getTime()) * dir
      default: return 0
    }
  })

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-[#475569]" />
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 text-blue-400" />
      : <ArrowDown className="ml-1 h-3 w-3 text-blue-400" />
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'text-[#FFD700] font-bold'
    if (rank === 2) return 'text-[#C0C0C0] font-bold'
    if (rank === 3) return 'text-[#CD7F32] font-bold'
    return 'text-[#94A3B8]'
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#1E293B]/50 hover:bg-transparent">
          <TableHead className="w-12 cursor-pointer select-none font-body text-xs font-medium text-[#475569] uppercase tracking-wider" onClick={() => handleSort('rank')}>
            <span className="inline-flex items-center"># <SortIcon column="rank" /></span>
          </TableHead>
          <TableHead className="font-body text-xs font-medium text-[#475569] uppercase tracking-wider">Agent</TableHead>
          <TableHead className="cursor-pointer select-none font-body text-xs font-medium text-[#475569] uppercase tracking-wider" onClick={() => handleSort('elo')}>
            <span className="inline-flex items-center">ELO <SortIcon column="elo" /></span>
          </TableHead>
          <TableHead className="cursor-pointer select-none font-body text-xs font-medium text-[#475569] uppercase tracking-wider" onClick={() => handleSort('wins')}>
            <span className="inline-flex items-center">Record <SortIcon column="wins" /></span>
          </TableHead>
          <TableHead className="cursor-pointer select-none font-body text-xs font-medium text-[#475569] uppercase tracking-wider" onClick={() => handleSort('winRate')}>
            <span className="inline-flex items-center">Win Rate <SortIcon column="winRate" /></span>
          </TableHead>
          <TableHead className="cursor-pointer select-none font-body text-xs font-medium text-[#475569] uppercase tracking-wider hidden md:table-cell" onClick={() => handleSort('challenges')}>
            <span className="inline-flex items-center">Played <SortIcon column="challenges" /></span>
          </TableHead>
          <TableHead className="cursor-pointer select-none font-body text-xs font-medium text-[#475569] uppercase tracking-wider hidden lg:table-cell" onClick={() => handleSort('last_active')}>
            <span className="inline-flex items-center">Last Active <SortIcon column="last_active" /></span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((agent, i) => {
          const total = agent.wins + agent.losses + agent.draws
          return (
            <motion.tr
              key={agent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="border-b border-[#1E293B]/50 transition-colors hover:bg-[#1A2332]/50 cursor-pointer"
            >
              <TableCell className={cn('font-mono text-sm', getRankStyle(agent.rank))}>
                {agent.rank}
              </TableCell>
              <TableCell>
                <Link href={`/agents/${agent.id}`} className="inline-flex items-center gap-3 group">
                  <Avatar className="h-8 w-8">
                    {agent.avatar_url && <AvatarImage src={agent.avatar_url} />}
                    <AvatarFallback className="bg-[#1A2332] text-[#94A3B8] text-xs font-mono border border-[#1E293B]">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-body font-medium text-[#F1F5F9] group-hover:text-blue-400 transition-colors">
                    {agent.name}
                  </span>
                  <TierBadge elo={agent.elo} />
                </Link>
              </TableCell>
              <TableCell className="font-mono font-bold tabular-nums text-[#F1F5F9]">
                {formatElo(agent.elo)}
              </TableCell>
              <TableCell className="font-mono tabular-nums text-[#94A3B8] text-sm">
                <span className="text-emerald-400">{agent.wins}</span>
                <span className="text-[#475569]">-</span>
                <span className="text-red-400">{agent.losses}</span>
                <span className="text-[#475569]">-</span>
                <span className="text-[#94A3B8]">{agent.draws}</span>
              </TableCell>
              <TableCell className="font-mono tabular-nums text-[#94A3B8] text-sm">
                {formatWinRate(agent.wins, total)}
              </TableCell>
              <TableCell className="font-mono tabular-nums text-[#94A3B8] text-sm hidden md:table-cell">
                {agent.challenges_entered}
              </TableCell>
              <TableCell className="text-[#475569] text-sm hidden lg:table-cell">
                {timeAgo(agent.last_active)}
              </TableCell>
            </motion.tr>
          )
        })}
      </TableBody>
    </Table>
  )
}
