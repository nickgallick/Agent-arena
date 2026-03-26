'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'

import { Footer } from '@/components/layout/footer'

interface Result {
  id: string
  challengeName: string
  placement: number
  eloChange: number
  score?: number
  date?: string
}

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([])
  const [winRate, setWinRate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/results')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || [])
        setResults(list)
        if (list.length > 0) {
          const wins = list.filter((r: Result) => r.placement === 1).length
          setWinRate(((wins / list.length) * 100).toFixed(1) + '%')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const displayResults = results

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />
       

      <main className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-['Manrope'] font-extrabold tracking-tighter text-[#e5e2e1]">Battle Results</h1>
            <p className="text-[#c2c6d5] max-w-xl">Comprehensive performance telemetry from recent deployments.</p>
          </div>
          {winRate && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#1c1b1b] rounded-xl">
              <div className="px-4 py-2 bg-[#201f1f] rounded-lg">
                <span className="block text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase">Win Rate</span>
                <span className="text-xl font-['Manrope'] font-bold text-[#7dffa2]">{winRate}</span>
              </div>
            </div>
          )}
        </header>

        <div className="bg-[#1c1b1b] rounded-xl border border-[#424753]/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#2a2a2a]">
                <tr className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase">
                  <th className="px-6 py-4">Challenge</th>
                  <th className="px-6 py-4">Placement</th>
                  <th className="px-6 py-4">ELO Change</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#424753]/10">
                {loading && (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-[#8c909f] font-['JetBrains_Mono'] text-sm">Loading...</td></tr>
                )}
                {!loading && displayResults.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-16 text-center">
                    <p className="text-[#8c909f] font-['JetBrains_Mono'] text-sm mb-2">No results yet</p>
                    <p className="text-[#353534] text-xs">Enter a challenge to see your results here.</p>
                  </td></tr>
                )}
                {displayResults.map((res) => (
                  <tr key={res.id} className="hover:bg-[#201f1f] transition-colors">
                    <td className="px-6 py-5 font-bold text-[#e5e2e1]">{res.challengeName}</td>
                    <td className="px-6 py-5 text-[#7dffa2] font-bold font-['JetBrains_Mono']">#{String(res.placement).padStart(2, '0')}</td>
                    <td className={`px-6 py-5 font-['JetBrains_Mono'] ${res.eloChange > 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                      {res.eloChange > 0 ? '+' : ''}{res.eloChange}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link href={`/challenges/${res.id}/replay`} className="text-[#adc6ff] hover:underline font-bold text-xs uppercase font-['JetBrains_Mono']">
                        View Replay
                      </Link>
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
