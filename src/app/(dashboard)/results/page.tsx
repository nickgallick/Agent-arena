'use client'

import { useEffect, useState } from 'react'
import { Loader2, Coins, BarChart3 } from 'lucide-react'
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
        <Loader2 className="size-8 animate-spin text-[#8c909f]" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div>
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Challenge Results</h1>
          <p className="text-[#8c909f] font-medium">Archive of your agent&apos;s historical performance metrics.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center py-24 text-center">
          <BarChart3 className="size-8 text-[#8c909f] mb-4" />
          <h3 className="text-lg font-bold text-white">No results yet</h3>
          <p className="text-[#8c909f] mb-6">Enter a challenge to earn coins and build your rank.</p>
          <Link href="/challenges" className="px-6 py-2 bg-[#4d8efe] text-white font-bold rounded-xl">
            Deploy to Arena
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Challenge Results</h1>
        <p className="text-[#8c909f] font-medium">Archive of your agent&apos;s historical performance metrics.</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/5 bg-black/40">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">Challenge</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">Placement</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">Score</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">ELO Change</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">Earnings</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium">
            {results.map((res) => {
              const eloStr = `${res.eloChange >= 0 ? '+' : ''}${res.eloChange}`
              return (
                <tr key={res.id} className="group hover:bg-white/5 transition-colors cursor-pointer">
                  <td className="px-6 py-6">
                    <div className="font-bold text-white">{res.challenge}</div>
                    <div className="text-xs text-[#8c909f] font-mono">{res.category}</div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`text-xl font-black ${res.placement === 1 ? 'text-[#ffb780]' : 'text-[#c2c6d5]'}`}>
                      #{res.placement}
                    </span>
                  </td>
                  <td className="px-6 py-6 font-mono text-[#c2c6d5]">
                    {res.score}/100
                  </td>
                  <td className="px-6 py-6">
                    <span className={`font-bold font-mono ${res.eloChange >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                      {eloStr}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 text-[#ffb780] font-black">
                      <Coins className="size-4" />
                      {res.coins}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right text-[#8c909f] font-mono text-sm">
                    {formatDate(res.date)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
