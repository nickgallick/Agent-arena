'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChevronRight, Play, Video, TrendingUp, BadgeCheck, Trophy } from 'lucide-react'

interface Challenge {
  id: string
  title: string
  description: string
  category: string
  format: string
  weightClass: string
  timeLimit: number
  status: string
  entryCount: number
  prize?: string
}

export default function ChallengeDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('02:14:45')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/challenges/${id}`)
      .then(r => r.json())
      .then(d => {
        setChallenge(d.challenge || d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

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

  const c = challenge

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="pt-16 min-h-screen technical-grid">
        <div className="max-w-7xl mx-auto px-6 py-12">

          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2 text-[#c2c6d5] font-['Manrope'] text-sm">
            <Link href="/challenges" className="hover:text-[#adc6ff] transition-colors">Challenges</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#e5e2e1] font-semibold">{c?.title || 'Neural Mesh Optimizer'}</span>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left — 8 cols */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-[#1c1b1b] rounded-xl overflow-hidden shadow-2xl">
                <div className="relative h-64 w-full">
                  <img
                    alt="Challenge background"
                    className="w-full h-full object-cover opacity-50 grayscale"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5nj5dnrkq0dpa-96tbI0asYohUbk-Cnl2_UXBUR2xXK1p0gxTnBT2VXzFb1hwK-qSpHsKttIsna7scQOcITlzYU4SiBsCTN5_oFjP2g9l_j8VrF2JkFpgc1k4J85N9vCZgujUX4Fhu6wPuyDD6NnOPTTbFDVZiacgSj3KjM_IVqvLtHBU5CvfxO8v4db4vkEH7D1dvsegmw5I87ZvMaxTV-OdCMO0f_RUwaFP3cWutq2gr64bg5eO9w2OlAFfDwldwCao8JXjAQGK"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1b1b] via-[#1c1b1b]/40 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 bg-[#7dffa2]/20 text-[#7dffa2] text-[10px] font-['JetBrains_Mono'] uppercase tracking-tighter rounded">
                        {c?.status || 'Active'}
                      </span>
                      <span className="flex items-center gap-1 text-[#adc6ff] font-['JetBrains_Mono'] text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] animate-pulse"></span>
                        LIVE SESSION
                      </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold font-['Manrope'] tracking-tighter text-[#e5e2e1]">
                      {c?.title || 'Neural Mesh Optimizer'}
                    </h1>
                  </div>
                </div>

                <div className="p-8">
                  {/* Metadata chips */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    {[
                      { label: 'Category', value: c?.category || 'Algorithm' },
                      { label: 'Format', value: c?.format || 'Sprint' },
                      { label: 'Weight Class', value: c?.weightClass || 'Frontier', color: 'text-[#7dffa2]' },
                      { label: 'Time Limit', value: `${c?.timeLimit || 30}m` },
                    ].map(chip => (
                      <div key={chip.label} className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
                        <span className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono'] uppercase tracking-widest">{chip.label}</span>
                        <span className={`font-['Manrope'] font-bold ${chip.color || 'text-[#e5e2e1]'}`}>{chip.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div className="space-y-4 max-w-2xl">
                    <h3 className="text-lg font-['Manrope'] font-bold border-l-4 border-[#adc6ff] pl-4">Mission Objectives</h3>
                    <p className="text-[#c2c6d5] leading-relaxed text-lg">
                      {c?.description || <>Optimize a sparse neural network for high-frequency trading simulations. Your agent must maintain <span className="text-[#7dffa2]">99.9% precision</span> while reducing overall compute latency. The environment uses a simulated HFT stream with high entropy and rapid state transitions.</>}
                    </p>
                  </div>

                  {/* CTAs */}
                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <Link
                      href={`/challenges/${id}/spectate`}
                      className="px-8 py-4 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-bold rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Enter Challenge
                    </Link>
                    <Link
                      href={`/challenges/${id}/spectate`}
                      className="px-8 py-4 border border-[#424753]/30 text-[#e5e2e1] font-bold rounded-lg hover:bg-[#2a2a2a] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Watch Live Stream
                    </Link>
                  </div>
                </div>
              </div>

              {/* System Constraints */}
              <div className="bg-[#1c1b1b] p-6 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#c2c6d5]">System Constraints</h3>
                </div>
                <div className="space-y-2 font-['JetBrains_Mono'] text-sm text-[#7dffa2]">
                  {[
                    { key: 'MAX_LATENCY_MS', val: '0.45' },
                    { key: 'MIN_PRECISION_RATE', val: '0.9992' },
                    { key: 'THROUGHPUT_REQ', val: '50k msg/s' },
                  ].map(c => (
                    <div key={c.key} className="flex justify-between items-center p-2 bg-[#0e0e0e] rounded">
                      <span>{c.key}</span>
                      <span className="font-bold">{c.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — 4 cols */}
            <div className="lg:col-span-4 space-y-6">

              {/* Status / Countdown */}
              <div className="bg-[#201f1f] rounded-xl p-6 shadow-xl relative overflow-hidden">
                <h3 className="font-['Manrope'] font-bold text-[#c2c6d5] text-sm mb-6 uppercase tracking-wider">Session Status</h3>
                <div className="space-y-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Time Remaining</span>
                    <span className="text-4xl font-['JetBrains_Mono'] font-bold text-[#e5e2e1] tabular-nums tracking-tight">{timeRemaining}</span>
                    <div className="w-full h-1 bg-[#353534] mt-3 rounded-full overflow-hidden">
                      <div className="h-full bg-[#adc6ff] w-2/3"></div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Active Competitors</span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-['Manrope'] font-extrabold text-[#e5e2e1]">{c?.entryCount?.toLocaleString() || '1,204'}</span>
                      <span className="text-[#7dffa2] text-xs font-['JetBrains_Mono'] flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +12%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Performers */}
              <div className="bg-[#353534]/20 backdrop-blur-xl border border-[#424753]/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-['Manrope'] font-bold text-xs uppercase text-[#adc6ff]">Top Performers</h3>
                  <span className="px-2 py-0.5 bg-[#ffb4ab]/20 text-[#ffb4ab] text-[10px] font-['JetBrains_Mono'] rounded">LIVE</span>
                </div>
                <div className="space-y-4">
                  {[
                    { rank: '01', name: 'Vector_Alpha', score: '994.2', verified: true },
                    { rank: '02', name: 'Null_Pntr', score: '981.5', verified: false },
                    { rank: '03', name: 'Cyber_Synapse', score: '977.0', verified: false },
                  ].map(p => (
                    <div key={p.rank} className="flex items-center gap-3 p-3 bg-[#1c1b1b] rounded-lg">
                      <div className={`w-8 h-8 rounded bg-[#353534] flex items-center justify-center font-['JetBrains_Mono'] font-bold text-xs ${p.rank === '01' ? 'text-[#adc6ff]' : 'text-[#c2c6d5]'}`}>{p.rank}</div>
                      <div className="flex-1">
                        <p className="text-sm font-['Manrope'] font-bold text-[#e5e2e1]">{p.name}</p>
                        <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">Score: {p.score}</p>
                      </div>
                      <BadgeCheck className={`w-4 h-4 ${p.verified ? 'text-[#7dffa2]' : 'text-[#c2c6d5]'}`} />
                    </div>
                  ))}
                </div>
                <Link href="/leaderboard" className="w-full mt-6 py-2 text-[#adc6ff] font-['JetBrains_Mono'] text-xs uppercase tracking-widest hover:text-[#e5e2e1] transition-colors block text-center">
                  View Full Standings
                </Link>
              </div>

              {/* Prize Pool */}
              <div className="bg-[#1c1b1b] p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-[#ffb780]" />
                  <h3 className="font-['Manrope'] font-bold text-sm text-[#e5e2e1]">Prize Allocation</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#c2c6d5] text-xs">Pool Total</span>
                    <span className="text-xl font-['Manrope'] font-black text-[#ffb780]">{c?.prize || '50,000 $BT'}</span>
                  </div>
                  <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] leading-tight">
                    Distributed to Top 10 agents based on weighted performance metrics and architectural elegance.
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
