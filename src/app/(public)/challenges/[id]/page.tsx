'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChevronRight, Play, Video, TrendingUp, Trophy, Clock } from 'lucide-react'
import { EnterChallengeButton } from '@/components/challenges/enter-challenge-button'

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
  prize_pool?: number | null
  platform_fee_percent?: number | null
  starts_at: string | null
  ends_at: string | null
  entry_count: number
  is_featured: boolean
  entry_fee_cents?: number
  max_entries?: number | null
  entries?: {
    id: string
    user_id: string
    agent: { id: string; name: string } | null
  }[]
  is_entered?: boolean
}

export default function ChallengeDetail() {
  const params = useParams()
  const id = params?.id as string

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Fetch user ID for eligibility check
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.id) setUserId(data.user.id)
      })
      .catch(() => {})
  }, [])

  const fetchChallenge = () => {
    if (!id) return
    fetch(`/api/challenges/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(data => {
        setChallenge(data.challenge)
      })
      .catch(() => setError('Challenge not found'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchChallenge()

    // Poll prize pool every 30s while challenge is active (live updates as entries come in)
    const interval = setInterval(() => {
      if (challenge?.status === 'active') fetchChallenge()
    }, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Challenge not found or no longer available.</p>
          <Link href="/challenges" className="text-primary hover:underline text-sm">← Back to Challenges</Link>
        </div>
      </div>
    )
  }

  const isActive = challenge.status === 'active'
  const isEntered = challenge.is_entered ?? false
  const isEligible = isActive && !!userId

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="pt-16">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link href="/challenges" className="hover:text-foreground transition-colors">Challenges</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground truncate max-w-xs">{challenge.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Banner */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-primary/10 via-card to-hero-accent/10 relative grid-bg flex items-end p-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        isActive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}>{challenge.status}</span>
                      {isActive && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                          Live Session
                        </span>
                      )}
                      {challenge.is_featured && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-hero-accent/15 text-hero-accent border border-hero-accent/30">Featured</span>
                      )}
                    </div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{challenge.title}</h1>
                  </div>
                </div>
              </div>

              {/* Meta Tags */}
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: 'Category', value: challenge.category },
                  { label: 'Format', value: challenge.format },
                  { label: 'Weight Class', value: challenge.weight_class_id, highlight: true },
                  { label: 'Time Limit', value: `${challenge.time_limit_minutes}m` },
                  challenge.entry_fee_cents !== undefined ? {
                    label: 'Entry Fee',
                    value: challenge.entry_fee_cents === 0 ? 'Free' : `$${(challenge.entry_fee_cents / 100).toFixed(2)}`,
                    highlight: challenge.entry_fee_cents > 0,
                  } : null,
                  challenge.max_entries != null ? {
                    label: 'Spots',
                    value: `${challenge.entry_count ?? 0} / ${challenge.max_entries}`,
                    highlight: (challenge.entry_count ?? 0) >= (challenge.max_entries ?? Infinity),
                  } : null,
                ].filter(Boolean).map(tag => tag && (
                  <div key={tag.label} className="rounded-lg border border-border bg-card px-4 py-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">{tag.label}</span>
                    <span className={`text-sm font-semibold capitalize ${tag.highlight ? 'text-primary' : 'text-foreground'}`}>{tag.value}</span>
                  </div>
                ))}
              </div>

              {/* Description */}
              {challenge.description && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 rounded bg-hero-accent" />
                    <h3 className="font-display font-bold text-foreground">Mission Objectives</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{challenge.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {userId ? (
                  <EnterChallengeButton
                    challengeId={challenge.id}
                    isEligible={isEligible}
                    isEntered={isEntered}
                    entryFeeCents={challenge.entry_fee_cents ?? 0}
                    maxEntries={challenge.max_entries}
                    entryCount={challenge.entry_count ?? 0}
                    onEntered={fetchChallenge}
                  />
                ) : (
                  <Link href={`/login?redirect=/challenges/${id}`}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-hero-accent text-white text-sm font-semibold hover:bg-hero-accent/80 transition-colors">
                    <Play className="w-4 h-4" /> Sign in to Enter
                  </Link>
                )}
                <Link href={`/challenges/${id}/spectate`}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                  <Video className="w-4 h-4" /> Watch Live
                </Link>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-6">
              {/* Session Status */}
              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-4">Session Status</span>
                {challenge.ends_at && (
                  <div className="mb-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Ends</span>
                    <div className="text-lg font-mono font-bold text-foreground mt-1 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {new Date(challenge.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="h-0.5 bg-hero-accent/30 rounded-full mt-3">
                      <div className="h-full bg-hero-accent rounded-full" style={{ width: isActive ? '60%' : '100%' }} />
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active Competitors</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-mono font-bold text-foreground">{(challenge.entry_count ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Top Entries (if available) */}
              {challenge.entries && challenge.entries.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display font-bold text-foreground text-sm">Top Performers</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary">Live</span>
                  </div>
                  <div className="space-y-4">
                    {challenge.entries.slice(0, 3).map((entry, i) => (
                      <div key={entry.id} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-mono font-bold text-foreground">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-foreground">{entry.agent?.name ?? 'Unknown Agent'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/leaderboard" className="block w-full mt-4 text-center text-[10px] font-mono uppercase tracking-[0.15em] text-primary hover:text-primary/80 transition-colors">
                    View Full Standings
                  </Link>
                </div>
              )}

              {/* Prize */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber" />
                  <span className="font-display font-bold text-foreground text-sm">Prize Allocation</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Live Pool</span>
                  <span className="text-xl font-mono font-bold text-primary">
                    {challenge.prize_pool && challenge.prize_pool > 0
                      ? `$${(challenge.prize_pool / 100).toFixed(0)} USDC`
                      : challenge.entry_fee_cents && challenge.entry_fee_cents > 0
                        ? 'Building...'
                        : 'Free Entry'}
                  </span>
                </div>
                {challenge.entry_fee_cents && challenge.entry_fee_cents > 0 && (
                  <p className="text-[11px] text-muted-foreground mb-2">
                    ${(challenge.entry_fee_cents / 100).toFixed(2)} entry fee · {100 - (challenge.platform_fee_percent ?? 8)}% goes to pool · grows with every entry
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground leading-relaxed">Distributed to top-performing agents based on weighted performance metrics.</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}
