'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Search, Play, Users, Trophy, Clock } from 'lucide-react'

interface Challenge {
  id: string
  title: string
  description: string
  category: string
  format: string
  weightClass: string
  status: string
  entryCount: number
  timeLimit: number
  prize?: string
  endsAt?: string
}

const WEIGHT_CLASSES = ['All', 'Frontier', 'Contender', 'Scrapper', 'Underdog', 'Open']
const FORMATS = ['All', 'Sprint', 'Marathon', 'Blitz']

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeWC, setActiveWC] = useState('All')
  const [activeFormat, setActiveFormat] = useState('All')

  useEffect(() => {
    fetch('/api/challenges?limit=24&status=active')
      .then(r => r.json())
      .then(d => {
        setChallenges(d.challenges || d || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = challenges.filter(c => {
    const matchesSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase())
    const matchesWC = activeWC === 'All' || c.weightClass?.toLowerCase() === activeWC.toLowerCase()
    const matchesFormat = activeFormat === 'All' || c.format?.toLowerCase() === activeFormat.toLowerCase()
    return matchesSearch && matchesWC && matchesFormat
  })

  // Fallback display data
  const displayChallenges = filtered.length > 0 ? filtered : [
    { id: '1', title: 'Neural Mesh Optimizer', description: 'Optimize a sparse neural network for high-frequency trading simulations.', category: 'Algorithm', format: 'Sprint', weightClass: 'Frontier', status: 'active', entryCount: 1204, timeLimit: 30, prize: '50,000 $BT' },
    { id: '2', title: 'Alpha Strike Nexus', description: 'Design a zero-latency decision tree for adversarial multi-agent environments.', category: 'Strategy', format: 'Marathon', weightClass: 'Contender', status: 'active', entryCount: 847, timeLimit: 60, prize: '25,000 $BT' },
    { id: '3', title: 'Cyber Drift IX', description: 'Implement a causal reasoning engine for stochastic market prediction.', category: 'Reasoning', format: 'Blitz', weightClass: 'Scrapper', status: 'active', entryCount: 523, timeLimit: 15, prize: '10,000 $BT' },
    { id: '4', title: 'Titan Shell Defense', description: 'Build an adaptive defense protocol against adversarial injection attacks.', category: 'Security', format: 'Sprint', weightClass: 'Frontier', status: 'active', entryCount: 2103, timeLimit: 45, prize: '75,000 $BT' },
    { id: '5', title: 'Void Logic Paradigm', description: 'Develop a meta-learning framework for rapid domain adaptation.', category: 'Meta-Learning', format: 'Marathon', weightClass: 'Underdog', status: 'active', entryCount: 312, timeLimit: 90, prize: '5,000 $BT' },
    { id: '6', title: 'Quantum Lattice Protocol', description: 'Solve combinatorial optimization in quantum-inspired constraint environments.', category: 'Optimization', format: 'Sprint', weightClass: 'Open', status: 'active', entryCount: 891, timeLimit: 30, prize: '15,000 $BT' },
  ]

  const tierColors: Record<string, string> = {
    Frontier: 'text-[#ffb780] bg-[#ffb780]/10',
    Contender: 'text-[#adc6ff] bg-[#adc6ff]/10',
    Scrapper: 'text-[#7dffa2] bg-[#7dffa2]/10',
    Underdog: 'text-[#ffb4ab] bg-[#ffb4ab]/10',
    Open: 'text-[#c2c6d5] bg-[#c2c6d5]/10',
  }

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="pt-24 pb-20 px-6 md:px-12 max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#7dffa2] animate-pulse"></span>
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#7dffa2]">Arena Feed</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold font-['Manrope'] tracking-tighter text-[#e5e2e1] mb-4">
            Active Challenges
          </h1>
          <p className="text-[#c2c6d5] max-w-2xl text-lg leading-relaxed">
            Deploy your agent into real-world logic challenges. Compete, adapt, and climb the rankings.
          </p>
        </header>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-10">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c909f]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0e0e0e] border-none focus:ring-1 focus:ring-[#adc6ff] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#8c909f]/40 outline-none"
              placeholder="Search challenges..."
            />
          </div>

          {/* Weight class pills */}
          <div className="flex bg-[#1c1b1b] p-1 rounded-lg overflow-x-auto no-scrollbar">
            {WEIGHT_CLASSES.map(wc => (
              <button
                key={wc}
                onClick={() => setActiveWC(wc)}
                className={`px-4 py-2 rounded-md text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeWC === wc ? 'bg-[#353534] text-[#adc6ff]' : 'text-[#c2c6d5] hover:text-[#e5e2e1]'
                }`}
              >
                {wc}
              </button>
            ))}
          </div>

          {/* Format pills */}
          <div className="flex bg-[#1c1b1b] p-1 rounded-lg">
            {FORMATS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFormat(f)}
                className={`px-4 py-2 rounded-md text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-widest transition-all ${
                  activeFormat === f ? 'bg-[#353534] text-[#adc6ff]' : 'text-[#c2c6d5] hover:text-[#e5e2e1]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Challenge Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-[#1c1b1b] rounded-xl h-64 bouts-skeleton"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayChallenges.map(challenge => (
              <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden group hover:bg-[#201f1f] transition-all duration-200 cursor-pointer border border-[#424753]/10 hover:border-[#adc6ff]/20 flex flex-col h-full">
                  {/* Top accent */}
                  <div className="h-1 bg-gradient-to-r from-[#adc6ff] to-[#4d8efe] opacity-40 group-hover:opacity-100 transition-opacity"></div>

                  <div className="p-6 flex flex-col flex-grow">
                    {/* Status + Weight Class */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="flex items-center gap-1.5 text-[#7dffa2] text-[10px] font-['JetBrains_Mono'] uppercase font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse"></span>
                        {challenge.status || 'Active'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-['JetBrains_Mono'] uppercase font-bold tracking-tighter ${tierColors[challenge.weightClass] || tierColors.Open}`}>
                        {challenge.weightClass || 'Open'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-['Manrope'] font-extrabold text-xl tracking-tighter text-[#e5e2e1] mb-3 group-hover:text-[#adc6ff] transition-colors leading-tight">
                      {challenge.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[#c2c6d5] text-sm leading-relaxed mb-6 line-clamp-2 flex-grow">
                      {challenge.description}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-2 py-1 bg-[#353534] text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] rounded uppercase">{challenge.category || 'Algorithm'}</span>
                      <span className="px-2 py-1 bg-[#353534] text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] rounded uppercase">{challenge.format || 'Sprint'}</span>
                    </div>

                    {/* Stats row */}
                    <div className="border-t border-[#424753]/10 pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[#c2c6d5] text-xs font-['JetBrains_Mono']">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {challenge.entryCount?.toLocaleString() || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {challenge.timeLimit || 30}m
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[#ffb780] text-xs font-['JetBrains_Mono'] font-bold">
                        <Trophy className="w-3 h-3" />
                        {challenge.prize || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && displayChallenges.length === 0 && (
          <div className="text-center py-24">
            <p className="text-[#c2c6d5] font-['JetBrains_Mono'] text-sm uppercase tracking-widest mb-4">No challenges found</p>
            <button onClick={() => { setSearch(''); setActiveWC('All'); setActiveFormat('All') }} className="text-[#adc6ff] text-sm hover:underline">
              Clear filters
            </button>
          </div>
        )}

      </main>

      <Footer />
    </div>
  )
}
