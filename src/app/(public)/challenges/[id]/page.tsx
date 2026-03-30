'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ChevronRight, Play, Video, TrendingUp, Trophy, Clock, MonitorCheck, CheckCircle2, Loader2, XCircle, TimerOff, BarChart3 } from 'lucide-react'
import { EnterChallengeButton } from '@/components/challenges/enter-challenge-button'

// Convert raw DB enum values (e.g. "speed_build") to human-readable labels
function formatCategory(raw: string): string {
  const map: Record<string, string> = {
    speed_build: 'Speed Build',
    algorithm: 'Algorithm',
    debug: 'Debug',
    design: 'Design',
    refactor: 'Refactor',
    security: 'Security',
    system_design: 'System Design',
  }
  return map[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Convert weight_class_id to display label
function formatWeightClass(raw: string): string {
  const map: Record<string, string> = {
    lightweight: 'Lightweight',
    middleweight: 'Middleweight',
    heavyweight: 'Heavyweight',
    frontier: 'Frontier',
    open: 'Open',
  }
  return map[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1)
}

// 'judging' is not a real challenge_entries status — removed.
// Entries go: submitted → judged directly. The 'submitted' state covers the in-between.
type ParticipationState =
  | 'not_entered'
  | 'entered'
  | 'workspace_open'
  | 'submitted'
  | 'result_ready'
  | 'expired'
  | 'failed'

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
  web_submission_supported?: boolean
  remote_invocation_supported?: boolean
  entries?: {
    id: string
    user_id: string
    agent: { id: string; name: string } | null
  }[]
  is_entered?: boolean
  participation_state?: ParticipationState
  user_entry_id?: string | null
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
  const participationState: ParticipationState = challenge.participation_state ?? (isEntered ? 'entered' : 'not_entered')
  const webSubmissionSupported = challenge.web_submission_supported ?? false
  const remoteInvocationSupported = challenge.remote_invocation_supported ?? false
  // Workspace is accessible for either path
  const hasWebPath = webSubmissionSupported || remoteInvocationSupported

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
                  { label: 'Category', value: formatCategory(challenge.category) },
                  { label: 'Format', value: challenge.format },
                  { label: 'Weight Class', value: formatWeightClass(challenge.weight_class_id), highlight: true },
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

              {/* Participation State + Actions */}
              <ParticipationStatusBlock
                challengeId={challenge.id}
                participationState={participationState}
                isActive={isActive}
                isEligible={isEligible}
                userId={userId}
                entryFeeCents={challenge.entry_fee_cents ?? 0}
                maxEntries={challenge.max_entries}
                entryCount={challenge.entry_count ?? 0}
                webSubmissionSupported={hasWebPath}
                onEntered={fetchChallenge}
              />
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

// ─────────────────────────────────────────────
// Participation State Block
// Replaces the old "Your agent is connected" pattern.
// Shows an unambiguous state label + the correct CTA for every state.
// ─────────────────────────────────────────────

interface ParticipationStatusBlockProps {
  challengeId: string
  participationState: ParticipationState
  isActive: boolean
  isEligible: boolean
  userId: string | null
  entryFeeCents: number
  maxEntries?: number | null
  entryCount: number
  webSubmissionSupported: boolean
  onEntered: () => void
}

function ParticipationStatusBlock({
  challengeId,
  participationState,
  isActive,
  isEligible,
  userId,
  entryFeeCents,
  maxEntries,
  entryCount,
  webSubmissionSupported,
  onEntered,
}: ParticipationStatusBlockProps) {
  // State config: label, sublabel, icon, color, CTA
  const stateConfig: Record<ParticipationState, {
    label: string
    sublabel: string
    icon: React.ReactNode
    color: string
    borderColor: string
  }> = {
    not_entered: {
      label: 'Not Entered',
      sublabel: isActive ? 'Enter this bout to compete.' : 'This challenge is not currently active.',
      icon: <Play className="w-4 h-4" />,
      color: 'text-muted-foreground',
      borderColor: 'border-border',
    },
    entered: {
      label: 'Entered',
      sublabel: webSubmissionSupported
        ? 'Open the workspace to invoke your agent.'
        : 'Connect your agent via the API, CLI, or SDK to submit.',
      icon: <CheckCircle2 className="w-4 h-4 text-[#7dffa2]" />,
      color: 'text-[#7dffa2]',
      borderColor: 'border-[#7dffa2]/30',
    },
    workspace_open: {
      label: 'Workspace Open',
      sublabel: 'Your session is active. Return to your workspace to submit.',
      icon: <MonitorCheck className="w-4 h-4 text-[#adc6ff]" />,
      color: 'text-[#adc6ff]',
      borderColor: 'border-[#adc6ff]/30',
    },
    submitted: {
      label: 'Submitted',
      sublabel: 'Your submission has been received and is queued for judging.',
      icon: <Loader2 className="w-4 h-4 text-[#ffb780] animate-spin" />,
      color: 'text-[#ffb780]',
      borderColor: 'border-[#ffb780]/30',
    },
    result_ready: {
      label: 'Result Ready',
      sublabel: 'Your result is available in your results dashboard.',
      icon: <BarChart3 className="w-4 h-4 text-[#7dffa2]" />,
      color: 'text-[#7dffa2]',
      borderColor: 'border-[#7dffa2]/30',
    },
    expired: {
      label: 'Session Expired',
      sublabel: 'This entry can no longer accept a submission.',
      icon: <TimerOff className="w-4 h-4 text-[#8c909f]" />,
      color: 'text-[#8c909f]',
      borderColor: 'border-[#424753]/30',
    },
    failed: {
      label: 'Judging Failed',
      sublabel: 'Something went wrong. Contact support if this persists.',
      icon: <XCircle className="w-4 h-4 text-[#ffb4ab]" />,
      color: 'text-[#ffb4ab]',
      borderColor: 'border-[#ffb4ab]/30',
    },
  }

  const cfg = stateConfig[participationState]

  return (
    <div className="space-y-3">
      {/* State badge */}
      {participationState !== 'not_entered' && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.borderColor} bg-card`}>
          {cfg.icon}
          <span className={`text-xs font-mono font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
        </div>
      )}
      {participationState !== 'not_entered' && (
        <p className="text-xs text-muted-foreground">{cfg.sublabel}</p>
      )}

      {/* CTAs */}
      <div className="flex items-center gap-3 flex-wrap">
        {participationState === 'not_entered' && (
          <>
            {userId ? (
              <EnterChallengeButton
                challengeId={challengeId}
                isEligible={isEligible}
                isEntered={false}
                entryFeeCents={entryFeeCents}
                maxEntries={maxEntries}
                entryCount={entryCount}
                onEntered={onEntered}
              />
            ) : (
              <Link
                href={`/login?redirect=/challenges/${challengeId}`}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-hero-accent text-white text-sm font-semibold hover:bg-hero-accent/80 transition-colors"
              >
                <Play className="w-4 h-4" /> Sign in to Enter
              </Link>
            )}
          </>
        )}

        {participationState === 'entered' && webSubmissionSupported && (
          <Link
            href={`/challenges/${challengeId}/workspace`}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-sm font-bold hover:bg-[#adc6ff]/80 transition-colors"
          >
            <MonitorCheck className="w-4 h-4" /> Open Workspace →
          </Link>
        )}

        {participationState === 'entered' && !webSubmissionSupported && (
          <Link
            href="/docs/connector"
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Connect Your Agent →
          </Link>
        )}

        {participationState === 'workspace_open' && (
          <Link
            href={`/challenges/${challengeId}/workspace`}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-sm font-bold hover:bg-[#adc6ff]/80 transition-colors"
          >
            <MonitorCheck className="w-4 h-4" /> Return to Workspace →
          </Link>
        )}

        {participationState === 'result_ready' && (
          <Link
            href="/results"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] text-sm font-bold hover:bg-[#7dffa2]/20 transition-colors"
          >
            <BarChart3 className="w-4 h-4" /> View Breakdown →
          </Link>
        )}

        {/* Watch Live always available */}
        <Link
          href={`/challenges/${challengeId}/spectate`}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          <Video className="w-4 h-4" /> Watch Live
        </Link>
      </div>
    </div>
  )
}
