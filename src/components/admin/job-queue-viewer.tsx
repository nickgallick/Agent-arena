'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface Job {
  id: string
  type: string
  status: JobStatus
  payload: string
  attempts: number
  createdAt: string
  completedAt: string | null
}

const mockJobs: Job[] = [
  { id: 'j-001', type: 'judge_entry', status: 'completed', payload: '{"entry_id":"e-4a1b","challenge_id":"c-daily-089","criteria":["correctness","performance"]}', attempts: 1, createdAt: '2026-03-22T08:12:00Z', completedAt: '2026-03-22T08:12:04Z' },
  { id: 'j-002', type: 'calculate_elo', status: 'completed', payload: '{"challenge_id":"c-daily-089","participants":24,"weight_class":"frontier"}', attempts: 1, createdAt: '2026-03-22T08:15:00Z', completedAt: '2026-03-22T08:15:02Z' },
  { id: 'j-003', type: 'send_notification', status: 'completed', payload: '{"user_id":"u-78f2","template":"results_ready","channel":"email"}', attempts: 1, createdAt: '2026-03-22T08:16:00Z', completedAt: '2026-03-22T08:16:01Z' },
  { id: 'j-004', type: 'judge_entry', status: 'processing', payload: '{"entry_id":"e-9c3d","challenge_id":"c-weekly-012","criteria":["creativity","depth"]}', attempts: 1, createdAt: '2026-03-22T09:30:00Z', completedAt: null },
  { id: 'j-005', type: 'calculate_elo', status: 'pending', payload: '{"challenge_id":"c-weekly-012","participants":18,"weight_class":"scrapper"}', attempts: 0, createdAt: '2026-03-22T09:31:00Z', completedAt: null },
  { id: 'j-006', type: 'send_notification', status: 'pending', payload: '{"user_id":"u-12ab","template":"daily_reminder","channel":"push"}', attempts: 0, createdAt: '2026-03-22T09:32:00Z', completedAt: null },
  { id: 'j-007', type: 'judge_entry', status: 'failed', payload: '{"entry_id":"e-0f7a","challenge_id":"c-special-003","criteria":["speed","accuracy"]}', attempts: 3, createdAt: '2026-03-22T07:00:00Z', completedAt: null },
  { id: 'j-008', type: 'send_notification', status: 'failed', payload: '{"user_id":"u-44cc","template":"weekly_digest","channel":"email"}', attempts: 3, createdAt: '2026-03-22T06:45:00Z', completedAt: null },
]

const statusColors: Record<JobStatus, string> = {
  pending: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  processing: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  failed: 'border-red-500/30 bg-red-500/10 text-red-400',
}

export function JobQueueViewer() {
  const [filter, setFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  const filtered = filter === 'all'
    ? mockJobs
    : mockJobs.filter((j) => j.status === filter)

  function handleRefresh() {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-zinc-50">Job Queue</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={(v) => v !== null && setFilter(v)}>
              <SelectTrigger className="w-[140px] border-zinc-700 bg-zinc-900/50 text-zinc-300">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2 border-zinc-700 text-zinc-300"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-700/50 hover:bg-transparent">
                <TableHead className="text-zinc-400">Type</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Payload</TableHead>
                <TableHead className="text-zinc-400 text-center">Attempts</TableHead>
                <TableHead className="text-zinc-400">Created</TableHead>
                <TableHead className="text-zinc-400">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow key={job.id} className="border-zinc-700/50 hover:bg-zinc-700/20">
                  <TableCell className="font-mono text-sm text-zinc-300">
                    {job.type}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[job.status]}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate font-mono text-xs text-zinc-500"
                    title={job.payload}
                  >
                    {job.payload.length > 50
                      ? `${job.payload.slice(0, 50)}...`
                      : job.payload}
                  </TableCell>
                  <TableCell className="text-center text-sm text-zinc-400">
                    {job.attempts}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400">
                    {timeAgo(job.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400">
                    {job.completedAt ? timeAgo(job.completedAt) : '—'}
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
