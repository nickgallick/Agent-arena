'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

interface EntryResult {
  id: string          // challenge_entry.id — used for /replays/[id]
  challengeName: string
  placement: number | null
  score: number | null
  date: string | null
  status: string
}

export default function ResultsPage() {
  const [results, setResults] = useState<EntryResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/results')
      .then(r => r.json())
      .then(data => {
        // me/results returns { results: challenge_entries[], total }
        // Each entry has: id, challenge_id, status, placement, final_score (composite_score),
        //                 created_at, challenge: { id, title, ... }
        const raw = Array.isArray(data.results) ? data.results : []
        const mapped: EntryResult[] = raw.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          challengeName: (e.challenge as Record<string, unknown> | null)?.title as string ?? 'Unknown Challenge',
          placement: (e.placement as number | null) ?? null,
          score: (e.composite_score ?? e.final_score ?? e.objective_score) as number | null,
          date: (e.submitted_at ?? e.created_at) as string | null,
          status: e.status as string ?? '',
        }))
        setResults(mapped)
        setTotal(data.total ?? mapped.length)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const completedResults = results.filter(r => ['submitted', 'judged', 'scored', 'completed'].includes(r.status))
  const winCount = completedResults.filter(r => r.placement === 1).length
  const winRate = completedResults.length > 0
    ? ((winCount / completedResults.length) * 100).toFixed(1) + '%'
    : null

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-['Manrope'] font-extrabold tracking-tighter text-[#e5e2e1]">Your Results</h1>
            <p className="text-[#8c909f] max-w-xl mt-1">
              {total > 0 ? `${total} challenge entr${total === 1 ? 'y' : 'ies'}` : 'Your challenge history and evaluation results.'}
            </p>
          </div>

          {/* Win rate stat — single card, no orphaned grid */}
          {winRate && (
            <div className="px-5 py-3 bg-[#1c1b1b] rounded-xl border border-[#424753]/20">
              <span className="block text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-wider">Win Rate</span>
              <span className="text-2xl font-['Manrope'] font-bold text-[#7dffa2]">{winRate}</span>
              <span className="text-[10px] text-[#8c909f] font-mono ml-2">{winCount}/{completedResults.length} completed</span>
            </div>
          )}
        </header>

        <div className="bg-[#1c1b1b] rounded-xl border border-[#424753]/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#2a2a2a]">
                <tr className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-wider">
                  <th className="px-6 py-4">Challenge</th>
                  <th className="px-6 py-4">Placement</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#424753]/15">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#8c909f] font-['JetBrains_Mono'] text-sm">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-[#8c909f] font-['JetBrains_Mono'] text-sm mb-2">No results yet</p>
                      <p className="text-[#8c909f] text-xs">
                        Enter a challenge to see your results here.{' '}
                        <Link href="/challenges" className="text-[#adc6ff] hover:underline">Browse challenges →</Link>
                      </p>
                    </td>
                  </tr>
                )}
                {results.map((res) => (
                  <tr key={res.id} className="hover:bg-[#201f1f] transition-colors">
                    <td className="px-6 py-5 font-bold text-[#e5e2e1] max-w-[240px] truncate">{res.challengeName}</td>
                    <td className="px-6 py-5 font-['JetBrains_Mono']">
                      {res.placement != null
                        ? <span className="text-[#7dffa2] font-bold">#{String(res.placement).padStart(2, '0')}</span>
                        : <span className="text-[#8c909f] text-xs">{res.status === 'workspace_open' ? 'In progress' : res.status === 'submitted' ? 'Judging' : '—'}</span>
                      }
                    </td>
                    <td className="px-6 py-5 font-['JetBrains_Mono']">
                      {res.score != null
                        ? <span className="text-[#e5e2e1]">{res.score.toFixed(1)}</span>
                        : <span className="text-[#8c909f]">—</span>
                      }
                    </td>
                    <td className="px-6 py-5 font-['JetBrains_Mono'] text-xs text-[#8c909f]">
                      {res.date
                        ? new Date(res.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'
                      }
                    </td>
                    <td className="px-6 py-5 text-right">
                      {['judged', 'scored', 'completed'].includes(res.status) ? (
                        <Link
                          href={`/replays/${res.id}`}
                          className="text-[#adc6ff] hover:underline font-bold text-xs uppercase font-['JetBrains_Mono']"
                        >
                          View Replay
                        </Link>
                      ) : (
                        <span className="text-[#424753] text-xs font-['JetBrains_Mono']">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
