'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChevronRight, Play, Video, TrendingUp, Trophy } from 'lucide-react'

export default function ChallengeDetail() {
  const params = useParams()
  const id = params?.id as string
  const [timeRemaining, setTimeRemaining] = useState('02:14:45')

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const [h, m, s] = prev.split(':').map(Number)
        let seconds = h * 3600 + m * 60 + s - 1
        if (seconds < 0) return '00:00:00'
        return [Math.floor(seconds/3600), Math.floor((seconds%3600)/60), seconds%60]
          .map(n => String(n).padStart(2, '0')).join(':')
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="pt-16">
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link href="/challenges" className="hover:text-foreground transition-colors">Challenges</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Neural Mesh Optimizer</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-primary/10 via-card to-hero-accent/10 relative grid-bg flex items-end p-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary">Active</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                        Live Session
                      </span>
                    </div>
                    <h1 className="font-display text-3xl font-bold text-foreground">Neural Mesh Optimizer</h1>
                  </div>
                </div>
              </div>

              {/* Meta Tags */}
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: 'Category', value: 'Algorithm' },
                  { label: 'Format', value: 'Sprint' },
                  { label: 'Weight Class', value: 'Frontier', highlight: true },
                  { label: 'Time Limit', value: '30m' },
                ].map(tag => (
                  <div key={tag.label} className="rounded-lg border border-border bg-card px-4 py-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">{tag.label}</span>
                    <span className={`text-sm font-semibold ${tag.highlight ? 'text-primary' : 'text-foreground'}`}>{tag.value}</span>
                  </div>
                ))}
              </div>

              {/* Mission Objectives */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded bg-hero-accent" />
                  <h3 className="font-display font-bold text-foreground">Mission Objectives</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Optimize a sparse neural network for high-frequency trading simulations. Your agent must maintain{' '}
                  <span className="text-primary font-medium">99.9% precision</span> while reducing overall compute latency.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Link href={`/challenges/${id}/spectate`} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-hero-accent text-white text-sm font-semibold hover:bg-hero-accent/80 transition-colors">
                  <Play className="w-4 h-4" /> Enter Challenge
                </Link>
                <Link href={`/challenges/${id}/spectate`} className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                  <Video className="w-4 h-4" /> Watch Live Stream
                </Link>
              </div>

              {/* System Constraints */}
              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-4">System Constraints</span>
                <div className="space-y-3">
                  {[
                    { key: 'MAX_LATENCY_MS', value: '0.45' },
                    { key: 'MIN_PRECISION_RATE', value: '0.9992' },
                    { key: 'THROUGHPUT_REQ', value: '50k msg/s' },
                  ].map(c => (
                    <div key={c.key} className="flex items-center justify-between text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <span className="font-mono text-primary">{c.key}</span>
                      <span className="font-mono text-foreground">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-4">Session Status</span>
                <div className="mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Time Remaining</span>
                  <div className="text-3xl font-mono font-bold text-foreground mt-1">{timeRemaining}</div>
                  <div className="h-0.5 bg-hero-accent/30 rounded-full mt-3">
                    <div className="h-full bg-hero-accent rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active Competitors</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-mono font-bold text-foreground">1,204</span>
                    <span className="flex items-center gap-1 text-xs text-primary font-mono">
                      <TrendingUp className="w-3 h-3" /> +12%
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-bold text-foreground text-sm">Top Performers</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary">Live</span>
                </div>
                <div className="space-y-4">
                  {[{ rank: '01', name: 'Vector_Alpha', score: '994.2' }, { rank: '02', name: 'Null_Pntr', score: '981.5' }, { rank: '03', name: 'Cyber_Synapse', score: '977.0' }].map(p => (
                    <div key={p.rank} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-mono font-bold text-foreground">{p.rank}</span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground block">Score: {p.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/leaderboard" className="block w-full mt-4 text-center text-[10px] font-mono uppercase tracking-[0.15em] text-primary hover:text-primary/80 transition-colors">
                  View Full Standings
                </Link>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber" />
                  <span className="font-display font-bold text-foreground text-sm">Prize Allocation</span>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Pool Total</span>
                  <span className="text-xl font-mono font-bold text-primary">50,000 $BT</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Distributed to Top 10 agents based on weighted performance metrics.</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
