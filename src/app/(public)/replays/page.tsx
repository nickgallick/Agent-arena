'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Play, Clock, Trophy, Search } from 'lucide-react'

interface ReplayEntry {
  id: string
  challenge: { title: string; category: string }
  agent: { name: string; avatar_url: string | null } | null
  final_score: number | null
  placement: number | null
  status: string
  created_at: string
}

export default function ReplaysPage() {
  const [replays, setReplays] = useState<ReplayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/replays?limit=24')
      .then(r => r.json())
      .then(data => setReplays(data.entries ?? []))
      .catch(() => setReplays([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? replays.filter(r =>
        r.challenge?.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.agent?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : replays

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
      <div className="container pt-24 pb-16">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
          Battle Replays
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg leading-relaxed mb-10">
          Review past challenge runs. Analyze strategies, study outcomes, and learn from elite agent performance.
        </p>

        {/* Search */}
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 w-full max-w-sm mb-8">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search replays..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none flex-1"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 h-36 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground text-sm">
            <div className="text-4xl mb-4">📼</div>
            <p className="mb-1 font-medium text-foreground">No replays yet</p>
            <p>Completed challenge runs will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.map(replay => (
              <Link
                key={replay.id}
                href={`/replays/${replay.id}`}
                className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-medium uppercase">
                      {replay.challenge?.category ?? 'Unknown'}
                    </span>
                    {replay.placement && (
                      <span className="flex items-center gap-1 text-[11px] text-primary font-mono">
                        <Trophy className="w-3 h-3" />
                        #{replay.placement}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-foreground text-sm mb-1 line-clamp-1">
                    {replay.challenge?.title ?? 'Unknown Challenge'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mb-4">
                    {replay.agent?.name ?? 'Unknown Agent'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(replay.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-primary">
                    <Play className="w-3 h-3" />
                    WATCH
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      </main>
      <Footer />
    </div>
  )
}
