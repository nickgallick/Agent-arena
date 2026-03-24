'use client'

import { useState, useEffect } from 'react'
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
  created_at: string
  completed_at: string | null
}

const statusColors: Record<JobStatus, string> = {
  pending: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  processing: 'border-blue-500/30 bg-[#4d8efe]/10 text-[#adc6ff]',
  completed: 'border-emerald-500/30 bg-[#7dffa2]/10 text-[#7dffa2]',
  failed: 'border-red-500/30 bg-red-500/10 text-[#ffb4ab]',
}

export function JobQueueViewer() {
  const [filter, setFilter] = useState<string>('all')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchJobs() {
    try {
      setError(null)
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'all') {
        params.set('status', filter)
      }
      const res = await fetch(`/api/admin/jobs?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to load jobs')
      }
      const data = await res.json()
      const mapped: Job[] = (data.jobs ?? []).map((j: Record<string, unknown>) => ({
        id: j.id ?? '',
        type: j.type ?? '',
        status: (j.status as JobStatus) ?? 'pending',
        payload: typeof j.payload === 'string' ? j.payload : JSON.stringify(j.payload ?? {}),
        attempts: (j.attempts as number) ?? 0,
        created_at: (j.created_at as string) ?? new Date().toISOString(),
        completed_at: (j.completed_at as string) ?? null,
      }))
      setJobs(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchJobs().finally(() => setLoading(false))
  }, [filter])

  function handleRefresh() {
    setRefreshing(true)
    fetchJobs().finally(() => {
      setTimeout(() => setRefreshing(false), 400)
    })
  }

  return (
    <Card className="border-[#424753]/15 bg-[#201f1f]/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#e5e2e1]">Job Queue</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={(v) => v !== null && setFilter(v)}>
              <SelectTrigger aria-label="Filter job status" className="w-[140px] border-[#424753]/15 bg-[#1c1b1b]/50 text-[#c2c6d5]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent className="border-[#424753]/15 bg-[#1c1b1b]">
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
              className="gap-2 border-[#424753]/15 text-[#c2c6d5]"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
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
            <p className="text-[#ffb4ab] text-sm">{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#8c909f] text-sm">No jobs in queue</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#424753]/15 hover:bg-transparent">
                  <TableHead className="text-[#8c909f]">Type</TableHead>
                  <TableHead className="text-[#8c909f]">Status</TableHead>
                  <TableHead className="text-[#8c909f]">Payload</TableHead>
                  <TableHead className="text-[#8c909f] text-center">Attempts</TableHead>
                  <TableHead className="text-[#8c909f]">Created</TableHead>
                  <TableHead className="text-[#8c909f]">Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="border-[#424753]/15 hover:bg-[#2a2a2a]/20">
                    <TableCell className="font-mono text-sm text-[#c2c6d5]">
                      {job.type}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[job.status] ?? statusColors.pending}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate font-mono text-xs text-[#e5e2e1]0"
                      title={job.payload}
                    >
                      {job.payload.length > 50
                        ? `${job.payload.slice(0, 50)}...`
                        : job.payload}
                    </TableCell>
                    <TableCell className="text-center text-sm text-[#8c909f]">
                      {job.attempts}
                    </TableCell>
                    <TableCell className="text-sm text-[#8c909f]">
                      {timeAgo(job.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-[#8c909f]">
                      {job.completed_at ? timeAgo(job.completed_at) : '—'}
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
