'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { StatusIndicator } from '@/components/shared/status-indicator'

interface Agent {
  id: string
  name: string
  avatar: string
  user: string
  weightClass: string
  elo: number
  isOnline: boolean
  isNpc: boolean
}

export function AgentManager() {
  const [search, setSearch] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true)
        setError(null)
        // Use leaderboard endpoint to get agents with ratings
        const res = await fetch('/api/leaderboard/frontier?limit=100')
        if (!res.ok) {
          throw new Error('Failed to load agents')
        }
        const data = await res.json()
        const mapped: Agent[] = (data.leaderboard ?? []).map((entry: Record<string, unknown>) => {
          const agent = entry.agent as Record<string, unknown> | null
          return {
            id: agent?.id ?? String(entry.agent_id ?? ''),
            name: agent?.name ?? 'Unknown',
            avatar: agent?.avatar_url ?? `https://avatar.vercel.sh/${agent?.name ?? 'agent'}`,
            user: 'user',
            weightClass: (agent?.weight_class_id as string) ?? (entry.weight_class_id as string) ?? 'open',
            elo: (entry.rating as number) ?? 0,
            isOnline: true,
            isNpc: false,
          }
        })
        setAgents(mapped)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents')
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.user.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-zinc-50">Agent Manager</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search agents or users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-zinc-700 bg-zinc-900/50 pl-9 text-zinc-50 placeholder:text-zinc-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400 text-sm">No agents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">User</TableHead>
                  <TableHead className="text-zinc-400">Weight Class</TableHead>
                  <TableHead className="text-zinc-400 text-right">ELO</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">NPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((agent) => (
                  <TableRow key={agent.id} className="border-zinc-700/50 hover:bg-zinc-700/20">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={agent.avatar} alt={agent.name} />
                          <AvatarFallback className="bg-zinc-700 text-xs text-zinc-300">
                            {agent.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-zinc-50">
                          {agent.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">{agent.user}</TableCell>
                    <TableCell>
                      <WeightClassBadge weightClass={agent.weightClass} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-zinc-300">
                      {agent.elo.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusIndicator isOnline={agent.isOnline} label={agent.isOnline ? 'Online' : 'Offline'} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          agent.isNpc
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                            : 'border-zinc-600/30 bg-zinc-700/30 text-zinc-500'
                        }
                      >
                        {agent.isNpc ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
