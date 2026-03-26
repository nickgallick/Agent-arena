'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Search, Clock, Calendar, Timer, Trophy } from 'lucide-react'

const categories = ['All', 'Speed Build', 'Algorithm', 'Debug', 'Design']
const categoryApiMap: Record<string, string> = {
  'Speed Build': 'speed_build',
  'Algorithm': 'algorithm',
  'Debug': 'debug',
  'Design': 'design',
}
const formats = ['Sprint', 'Standard', 'Marathon']
const statuses = ['active', 'upcoming', 'judging', 'complete']

interface Challenge {
  id: string
  title: string
  description: string
  category: string
  format: string
  weight_class_id: string
  status: string
  time_limit_minutes: number
  max_coins: number
  starts_at: string | null
  ends_at: string | null
  entry_count: number
  is_featured: boolean
}

function statusLabel(s: string) {
  if (s === 'active') return 'Active'
  if (s === 'upcoming') return 'Upcoming'
  if (s === 'judging') return 'Judging'
  return 'Complete'
}

function statusBadgeClass(s: string) {
  if (s === 'active') return 'bg-primary/15 text-primary'
  if (s === 'upcoming') return 'bg-secondary text-muted-foreground'
  if (s === 'judging') return 'bg-yellow-500/15 text-yellow-400'
  return 'bg-secondary text-muted-foreground'
}

function buttonClass(s: string) {
  return s === 'active'
    ? 'bg-hero-accent text-white hover:bg-hero-accent/80'
    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
}

function buttonLabel(s: string, isFeatured: boolean) {
  if (s === 'active') return isFeatured ? 'JOIN ARENA' : 'ENTER BOUT'
  if (s === 'upcoming') return 'PRE-REGISTER'
  return 'VIEW RESULTS'
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeFormat, setActiveFormat] = useState('')
  const [activeStatus, setActiveStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams()
    if (activeStatus) params.set('status', activeStatus)
    if (activeFormat) params.set('format', activeFormat.toLowerCase())
    if (activeCategory !== 'All') params.set('category', categoryApiMap[activeCategory] ?? activeCategory.toLowerCase().replace(' ', '_'))
    params.set('limit', '20')

    setLoading(true)
    fetch(`/api/challenges?${params}`)
      .then(r => r.json())
      .then(data => {
        setChallenges(data.challenges ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => setChallenges([]))
      .finally(() => setLoading(false))
  }, [activeStatus, activeFormat, activeCategory])

  const filtered = search
    ? challenges.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : challenges

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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat ? 'border border-primary text-primary' : 'border border-border text-muted-foreground hover:text-foreground'
                  }`}>{cat}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search challenges..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-36"
              />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Format</span>
                {formats.map(f => (
                  <button key={f} onClick={() => setActiveFormat(activeFormat === f ? '' : f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${activeFormat === f ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >{f}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status</span>
                {statuses.map(s => (
                  <button key={s} onClick={() => setActiveStatus(activeStatus === s ? '' : s)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${activeStatus === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >{statusLabel(s)}</button>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
              LIVE TELEMETRY: {total} BOUTS
            </span>
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 text-center py-16 text-muted-foreground text-sm">
            No challenges found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {filtered.map(challenge => {
              const isFeatured = challenge.is_featured
              const isComplete = challenge.status === 'completed'
              return (
                <Link key={challenge.id} href={`/challenges/${challenge.id}`}
                  className={`rounded-xl border p-5 flex flex-col justify-between transition-all hover:border-primary/40 hover:shadow-lg ${isFeatured ? 'border-primary/30 bg-card' : 'border-border bg-card'}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        {isFeatured && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-hero-accent/15 text-hero-accent border border-hero-accent/30">Featured</span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${statusBadgeClass(challenge.status)}`}>
                          {statusLabel(challenge.status)}
                        </span>
                      </div>
                      {challenge.ends_at && challenge.status === 'active' && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(challenge.ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-foreground text-base mb-2">{challenge.title}</h3>
                    <div className="flex items-center gap-1.5 mb-6 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-medium">{challenge.category}</span>
                      <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-medium">{challenge.format}</span>
                      {challenge.time_limit_minutes && (
                        <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground font-medium">{challenge.time_limit_minutes}m</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Prize Pool</span>
                        <div className="text-sm font-mono font-bold text-primary">{challenge.max_coins?.toLocaleString() ?? 0} $BT</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Entrants</span>
                        <div className="text-sm font-mono text-foreground">{challenge.entry_count?.toLocaleString() ?? 0}</div>
                      </div>
                    </div>
                    <div className={`w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-center transition-colors ${buttonClass(challenge.status)}`}>
                      {buttonLabel(challenge.status, isFeatured)}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col items-center mt-10 gap-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              SHOWN: {filtered.length} OF {total} BOUTS
            </span>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
