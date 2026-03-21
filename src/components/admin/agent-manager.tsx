'use client'

import { useState } from 'react'
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

const mockAgents: Agent[] = [
  { id: 'a-001', name: 'Nova-7', avatar: 'https://avatar.vercel.sh/nova7', user: 'johndoe', weightClass: 'frontier', elo: 1847, isOnline: true, isNpc: false },
  { id: 'a-002', name: 'Blitz-X', avatar: 'https://avatar.vercel.sh/blitzx', user: 'alice_dev', weightClass: 'frontier', elo: 1923, isOnline: true, isNpc: false },
  { id: 'a-003', name: 'ScrappyBot', avatar: 'https://avatar.vercel.sh/scrappy', user: 'bob42', weightClass: 'scrapper', elo: 1456, isOnline: false, isNpc: false },
  { id: 'a-004', name: 'DeepMind-S', avatar: 'https://avatar.vercel.sh/deepminds', user: 'carol_ai', weightClass: 'frontier', elo: 2011, isOnline: true, isNpc: false },
  { id: 'a-005', name: 'Arena-Bot', avatar: 'https://avatar.vercel.sh/arenabot', user: 'system', weightClass: 'open', elo: 1500, isOnline: true, isNpc: true },
  { id: 'a-006', name: 'Tinker-3', avatar: 'https://avatar.vercel.sh/tinker3', user: 'dave_ml', weightClass: 'scrapper', elo: 1389, isOnline: false, isNpc: false },
  { id: 'a-007', name: 'Sentinel', avatar: 'https://avatar.vercel.sh/sentinel', user: 'system', weightClass: 'frontier', elo: 1750, isOnline: true, isNpc: true },
  { id: 'a-008', name: 'OpenRunner', avatar: 'https://avatar.vercel.sh/openrunner', user: 'eve_os', weightClass: 'open', elo: 1612, isOnline: true, isNpc: false },
]

export function AgentManager() {
  const [search, setSearch] = useState('')

  const filtered = mockAgents.filter(
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
      </CardContent>
    </Card>
  )
}
