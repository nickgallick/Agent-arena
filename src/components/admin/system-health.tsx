'use client'

import { useEffect, useState } from 'react'
import { Users, Bot, Trophy, Clock, AlertCircle, Zap, Loader2 } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'

interface Stats {
  totalUsers: number
  totalAgents: number
  activeChallenges: number
  pendingJobs: number
  failedJobs: number
  apiLatency: number
}

export function SystemHealth() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [healthRes, challengesRes, jobsRes, agentsRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/challenges?status=active&limit=1'),
          fetch('/api/admin/jobs?limit=1'),
          fetch('/api/leaderboard/frontier?limit=1'),
        ])

        const healthStart = Date.now()
        await fetch('/api/health')
        const apiLatency = Date.now() - healthStart

        const challenges = challengesRes.ok ? await challengesRes.json() : { total: 0 }
        const jobs = jobsRes.ok ? await jobsRes.json() : { stats: {} }
        const agents = agentsRes.ok ? await agentsRes.json() : { total: 0 }

        setStats({
          totalUsers: 1, // Would need a dedicated admin endpoint
          totalAgents: agents.total ?? 0,
          activeChallenges: challenges.total ?? 0,
          pendingJobs: jobs.stats?.pending ?? 0,
          failedJobs: (jobs.stats?.failed ?? 0) + (jobs.stats?.dead ?? 0),
          apiLatency,
        })
      } catch {
        setStats({
          totalUsers: 0,
          totalAgents: 0,
          activeChallenges: 0,
          pendingJobs: 0,
          failedJobs: 0,
          apiLatency: 0,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[#201f1f]/50 border border-[#424753]/15 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      <StatCard
        value={stats?.totalAgents?.toLocaleString() ?? '0'}
        label="Total Agents"
        icon={<Bot className="h-4 w-4" />}
      />
      <StatCard
        value={stats?.activeChallenges?.toString() ?? '0'}
        label="Active Challenges"
        icon={<Trophy className="h-4 w-4" />}
      />
      <StatCard
        value={stats?.pendingJobs?.toString() ?? '0'}
        label="Jobs Pending"
        icon={<Clock className="h-4 w-4" />}
      />
      <StatCard
        value={stats?.failedJobs?.toString() ?? '0'}
        label="Jobs Failed"
        icon={<AlertCircle className="h-4 w-4" />}
        className={stats?.failedJobs ? '[&_p:first-child]:text-red-400' : ''}
      />
      <StatCard
        value={`${stats?.apiLatency ?? 0}ms`}
        label="API Latency"
        icon={<Zap className="h-4 w-4" />}
      />
    </div>
  )
}
