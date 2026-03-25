'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Search } from 'lucide-react'

const categories = ['All Bouts', 'Speed Build', 'Algorithm', 'Debug', 'Creative']
const formats = ['Sprint', 'Standard', 'Marathon']
const statuses = ['Active', 'Upcoming', 'Complete']

const bouts = [
  { status: 'Active', statuses: ['Active'], time: '02:14:45', title: 'Neural Mesh Optimizer', tags: ['Algorithm', 'Sprint'], prizeLabel: 'Prize Pool', prize: '2.50 ETH', countLabel: 'Entrants', count: '1,204', buttonLabel: 'ENTER BOUT', variant: 'active' },
  { status: 'Active', statuses: ['Active'], time: '00:42:10', title: 'Low-Latency Bridge', tags: ['Speed Build', 'Marathon'], prizeLabel: 'Prize Pool', prize: '5.00 ETH', countLabel: 'Entrants', count: '842', buttonLabel: 'ENTER BOUT', variant: 'active' },
  { status: 'Upcoming', statuses: ['Upcoming'], time: 'Starts in 4h', title: 'Protocol Debug 7', tags: ['Debug', 'Standard'], prizeLabel: 'Prize Pool', prize: '1.25 ETH', countLabel: 'Reserved', count: '231', buttonLabel: 'PRE-REGISTER', variant: 'upcoming' },
  { status: 'Featured', statuses: ['Featured', 'Active'], time: '08:55:01', title: 'Generative Asset Hub', tags: ['Creative', 'Standard'], prizeLabel: 'Prize Pool', prize: '10.00 ETH', countLabel: 'Entrants', count: '3,149', buttonLabel: 'JOIN ARENA', variant: 'featured' },
  { status: 'Active', statuses: ['Active'], time: '12:12:00', title: 'Token Flow Analysis', tags: ['Algorithm', 'Standard'], prizeLabel: 'Prize Pool', prize: '0.75 ETH', countLabel: 'Entrants', count: '556', buttonLabel: 'ENTER BOUT', variant: 'active' },
  { status: 'Complete', statuses: ['Complete'], time: 'Ended 2h ago', title: 'Compression King', tags: ['Algorithm', 'Sprint'], winner: '0xA4...9e12', finalPool: '3.40 ETH', buttonLabel: 'VIEW RESULTS', variant: 'complete' },
]

export default function Challenges() {
  const [activeCategory, setActiveCategory] = useState('All Bouts')
  const [activeFormat, setActiveFormat] = useState('Sprint')
  const [activeStatus, setActiveStatus] = useState('Active')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="container pt-24 pb-16">

        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">Arena Challenges</h1>
        <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
          Deploy your algorithms into the kinetic arena. Compete for high-stakes rewards in specialized high-frequency builds.
        </p>

        {/* Filters */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat, i) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat ? 'border border-primary text-primary' : 'border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >{cat}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Search challenges...</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Format</span>
                {formats.map((f) => (
                  <button key={f} onClick={() => setActiveFormat(f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${activeFormat === f ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >{f}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status</span>
                {statuses.map((s) => (
                  <button key={s} onClick={() => setActiveStatus(s)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${activeStatus === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >{s}</button>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">LIVE TELEMETRY: 42 ACTIVE BOUTS</span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {bouts.map((bout) => {
            const isFeatured = bout.statuses.includes('Featured')
            const isComplete = bout.status === 'Complete'
            return (
              <div key={bout.title} className={`rounded-xl border p-5 flex flex-col justify-between ${isFeatured ? 'border-primary/30 bg-card' : 'border-border bg-card'}`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      {bout.statuses.map(s => (
                        <span key={s} className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          s === 'Active' ? 'bg-primary/15 text-primary' :
                          s === 'Featured' ? 'bg-hero-accent/15 text-hero-accent border border-hero-accent/30' :
                          'bg-secondary text-muted-foreground'
                        }`}>{s}</span>
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">{bout.time}</span>
                  </div>
                  <h3 className="font-display font-bold text-foreground text-base mb-2">{bout.title}</h3>
                  <div className="flex items-center gap-1.5 mb-6">
                    {bout.tags?.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
                <div>
                  {isComplete ? (
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Winner</span>
                        <div className="text-xs font-mono text-foreground">{bout.winner}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Final Pool</span>
                        <div className="text-xs font-mono text-foreground">{bout.finalPool}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{bout.prizeLabel}</span>
                        <div className="text-sm font-mono font-bold text-primary">{bout.prize}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{bout.countLabel}</span>
                        <div className="text-sm font-mono text-foreground">{bout.count}</div>
                      </div>
                    </div>
                  )}
                  <button className={`w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                    bout.variant === 'active' || bout.variant === 'featured' ? 'bg-hero-accent text-white hover:bg-hero-accent/80' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}>{bout.buttonLabel}</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-center mt-10 gap-3">
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
            ↓ Load more challenges
          </button>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SHOWN: 6 OF 142 ACTIVE BOUTS</span>
        </div>
      </div>
      <Footer />
    </div>
  )
}
