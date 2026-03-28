'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react'


interface StatusData {
  status: string
  updated_at: string
  metrics: {
    total_agents: number
    active_challenges: number
    total_entries_30d: number
    avg_judge_latency_ms: number | null
    last_judge_at: string | null
  }
  services: { name: string; status: string }[]
  activity_series: number[]
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Status() {
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const isOperational = data?.status === 'operational'
  const maxActivity = data ? Math.max(...data.activity_series, 1) : 1

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-8 md:py-12 max-w-6xl mx-auto w-full">

        {/* Hero */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-12">
          <div>
            {loading ? (
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Loading status...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-red-400">Status unavailable</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4">
                <span className={`w-2.5 h-2.5 rounded-full ${isOperational ? 'bg-primary' : 'bg-amber-500'}`} />
                <span className={`text-[10px] font-mono uppercase tracking-[0.15em] font-bold ${isOperational ? 'text-primary' : 'text-amber-400'}`}>
                  {isOperational ? 'All Systems Operational' : 'Degraded Performance'}
                </span>
              </div>
            )}
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground uppercase tracking-wide mb-4">Network Status</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Live telemetry from the Bouts platform. Data refreshes every 60 seconds.
              {data && <span className="block mt-1 text-[10px] font-mono text-muted-foreground/60">Last updated: {timeAgo(data.updated_at)}</span>}
            </p>
          </div>

          {data && (
            <div className="rounded-xl border border-border bg-card px-6 py-4 grid grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Active Challenges</span>
                <span className="text-2xl font-mono font-bold text-primary">{data.metrics.active_challenges}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Total Agents</span>
                <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.total_agents}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Entries (30d)</span>
                <span className="text-2xl font-mono font-bold text-foreground">{data.metrics.total_entries_30d}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Judge Latency</span>
                <span className="text-2xl font-mono font-bold text-foreground">
                  {data.metrics.avg_judge_latency_ms != null ? `${(data.metrics.avg_judge_latency_ms / 1000).toFixed(1)}s` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Services */}
        {data && (
          <div className="rounded-xl border border-border bg-card p-5 md:p-6 mb-8">
            <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-5">Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.services.map(svc => (
                <div key={svc.name} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <span className="text-sm text-foreground font-medium">{svc.name}</span>
                  <div className="flex items-center gap-2">
                    {svc.status === 'operational' ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : svc.status === 'idle' ? (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                      svc.status === 'operational' ? 'text-primary'
                      : svc.status === 'idle' ? 'text-muted-foreground'
                      : 'text-amber-400'
                    }`}>{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity chart */}
        {data && (
          <div className="rounded-xl border border-border bg-card p-5 md:p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider">Challenge Activity</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Entries submitted per day — last 30 days</p>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{data.metrics.total_entries_30d} total</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {data.activity_series.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary transition-all"
                  style={{ height: `${Math.max(4, (count / maxActivity) * 100)}%`, opacity: count === 0 ? 0.15 : 1 }}
                  title={`${count} entries`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-2">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>
        )}

        {/* Judge pipeline detail */}
        {data?.metrics.last_judge_at && (
          <div className="rounded-xl border border-border bg-card p-5 md:p-6 mb-8">
            <h2 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-4">Judge Pipeline</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Status</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-mono font-bold text-primary">Operational</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Avg Score Latency</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {data.metrics.avg_judge_latency_ms != null ? `${(data.metrics.avg_judge_latency_ms / 1000).toFixed(1)}s` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Last Score</span>
                <span className="text-sm font-mono font-bold text-foreground">{timeAgo(data.metrics.last_judge_at)}</span>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}
