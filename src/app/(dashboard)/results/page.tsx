'use client'

import { useEffect, useState } from 'react'
import { Loader2, ListFilter, Coins, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/use-user'
import { formatDate } from '@/lib/utils/format'

interface ResultRow {
  id: string
  challenge: string
  category: string
  placement: number
  score: number
  eloChange: number
  coins: number
  date: string
}

export default function ResultsPage() {
  const { user, loading: userLoading } = useUser()
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchResults() {
      try {
        const res = await fetch('/api/me/results?limit=50')
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        const mapped: ResultRow[] = (data.results ?? []).map(
          (r: {
            id: string
            challenge?: { title?: string; category?: string; id?: string }
            placement: number | null
            final_score: number | null
            elo_change: number | null
            coins_awarded: number | null
            created_at: string
          }) => ({
            id: r.id,
            challenge: r.challenge?.title ?? 'Unknown Challenge',
            category: r.challenge?.category ?? 'unknown',
            placement: r.placement ?? 0,
            score: r.final_score ?? 0,
            eloChange: r.elo_change ?? 0,
            coins: r.coins_awarded ?? 0,
            date: r.created_at,
          })
        )
        setResults(mapped)
      } catch (err) {
        console.error('[ResultsPage] Failed to load results:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [user, userLoading])

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-on-surface-variant" />
      </div>
    )
  }

  const totalCoins = results.reduce((sum, r) => sum + r.coins, 0)
  const totalMatches = results.length
  const wins = results.filter((r) => r.placement > 0 && r.placement <= 3).length
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0'

  if (results.length === 0) {
    return (
      <div className="pt-24 pb-20 min-h-screen px-4 md:px-8 max-w-7xl mx-auto">
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-mono px-2 py-0.5 rounded border border-primary/20 tracking-widest">ARCHIVE_V.4.2</span>
            <h1 className="text-4xl font-headline font-extrabold tracking-tighter text-on-surface">Battle Results</h1>
          </div>
          <p className="text-on-surface-variant max-w-xl">Comprehensive performance telemetry from recent arena deployments. Analytical data for strategic optimization.</p>
        </section>
        <div className="relative overflow-hidden bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant/5">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="size-8 text-on-surface-variant" />
            </div>
            <h3 className="text-lg font-headline font-bold text-on-surface">No results yet</h3>
            <p className="text-on-surface-variant mb-6">Enter a challenge to earn coins and build your rank.</p>
            <Link href="/challenges" className="px-6 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-bold rounded">
              Deploy to Arena
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-20 min-h-screen px-4 md:px-8 max-w-7xl mx-auto">
      {/* Dashboard Header */}
      <section className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-mono px-2 py-0.5 rounded border border-primary/20 tracking-widest">ARCHIVE_V.4.2</span>
            <h1 className="text-4xl font-headline font-extrabold tracking-tighter text-on-surface">Battle Results</h1>
          </div>
          <p className="text-on-surface-variant max-w-xl">Comprehensive performance telemetry from recent arena deployments. Analytical data for strategic optimization.</p>
        </div>
        {/* Quick Stats Bento */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-xl">
          <div className="px-4 py-2 bg-surface-container rounded-lg">
            <span className="block text-[10px] font-mono text-on-surface-variant opacity-60 uppercase tracking-widest">Win Rate</span>
            <span className="text-xl font-headline font-bold text-secondary">{winRate}%</span>
          </div>
          <div className="px-4 py-2 bg-surface-container rounded-lg">
            <span className="block text-[10px] font-mono text-on-surface-variant opacity-60 uppercase tracking-widest">Net Coins</span>
            <span className="text-xl font-headline font-bold text-tertiary">+{totalCoins.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Main Results Terminal */}
      <div className="relative overflow-hidden bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant/5">
        {/* Table Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-high/50 border-b border-outline-variant/10">
          <div className="flex gap-4">
            <button className="text-xs font-mono px-3 py-1 bg-surface-container-highest text-primary rounded border border-primary/20">ALL_TIME</button>
            <button className="text-xs font-mono px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors">LAST_30D</button>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <ListFilter className="size-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Filter Results</span>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest/30">
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium">Challenge Name</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium">Category</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium">Placement</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium">Score</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium text-right">ELO Change</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium text-right">Coins</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium text-right">Date</th>
                <th className="px-6 py-4 text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-surface-container transition-colors group">
                  <td className="px-6 py-5">
                    <span className="block font-headline font-bold text-on-surface">{result.challenge}</span>
                    <span className="text-[10px] font-mono text-primary/60">ID: #{result.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-0.5 rounded-sm bg-surface-container-highest text-[10px] font-mono text-on-tertiary-fixed">
                      {result.category.toUpperCase().replace(/-/g, '_')}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`font-headline font-extrabold text-lg ${result.placement <= 3 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        {String(result.placement).padStart(2, '0')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-mono text-sm text-on-surface">{result.score.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right font-mono text-sm">
                    <span className={result.eloChange >= 0 ? 'text-secondary' : 'text-error'}>
                      {result.eloChange >= 0 ? '+' : ''}{String(Math.abs(result.eloChange)).padStart(2, '0')} pts
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-on-surface font-mono font-bold">{result.coins.toLocaleString()}</span>
                      <Coins className="size-3 text-tertiary" />
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-xs text-on-surface-variant">{formatDate(result.date)}</td>
                  <td className="px-6 py-5 text-right">
                    <Link href={`/replays/${result.id}`} className="text-primary hover:underline text-xs font-headline font-bold uppercase tracking-wider">
                      View Replay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-on-surface-variant">SHOWING 1-{results.length} OF {results.length} ENTRIES</span>
          <div className="flex gap-1">
            <button className="p-1 hover:bg-surface-container rounded transition-colors text-on-surface-variant">
              <ChevronLeft className="size-5" />
            </button>
            <button className="p-1 hover:bg-surface-container rounded transition-colors text-on-surface-variant">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytical Meta-Grid */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/5">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant mb-4">Top Performance Core</h4>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-800" />
            <div>
              <span className="block font-headline font-bold text-secondary">Neural Strike V2</span>
              <span className="text-xs text-on-surface-variant">Active in 84% of victories</span>
            </div>
          </div>
        </div>
        <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/5">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant mb-4">Recent Milestones</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-xs font-mono text-on-surface">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Reachable Elite Tier reached
            </li>
            <li className="flex items-center gap-2 text-xs font-mono text-on-surface">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              10k Coins Cumulative Bonus
            </li>
          </ul>
        </div>
        <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/5">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant mb-4">Challenge Map</h4>
          <div className="w-full h-16 bg-surface-container rounded overflow-hidden" />
        </div>
      </section>
    </div>
  )
}
