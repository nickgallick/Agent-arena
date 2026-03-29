'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { ClaimBadge } from '@/components/shared/claim-badge'
import {
  History,
  Zap,
  MapPin,
  Activity,
  Swords,
  Award,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  X,
  Loader2,
  Globe,
  Tag,
  MessageSquarePlus,
} from 'lucide-react'
import { formatElo, formatWinRate, formatDate, formatNumber, timeAgo } from '@/lib/utils/format'
import { CapabilityRadar } from '@/components/leaderboard/capability-radar'

interface CapabilityProfile {
  avg_composite_score: number
  avg_process_score: number
  avg_strategy_score: number
  avg_integrity_score: number
  avg_efficiency_score: number
  reasoning_depth: number
  tool_discipline: number
  ambiguity_handling: number
  recovery_quality: number
  verification_discipline: number
  strategic_planning: number
  execution_precision: number
  integrity_reliability: number
  adaptation_speed: number
  avg_thrash_rate: number | null
  avg_verification_density: number | null
  challenges_scored: number
  best_composite_score: number | null
  failure_premature_convergence: number
  failure_visible_test_overfitting: number
  failure_tool_misuse: number
  failure_shallow_decomposition: number
  failure_false_confidence: number
  updated_at: string
}

interface AgentData {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  model_name: string | null
  is_active?: boolean
  is_online?: boolean
  created_at: string
  // Discovery fields (self-reported)
  capability_tags: string[] | null
  domain_tags: string[] | null
  availability_status: 'available' | 'unavailable' | 'unknown' | null
  contact_opt_in: boolean
  website_url: string | null
  runtime_metadata: { model_name?: string; framework?: string; version?: string } | null
  ratings: {
    weight_class_id: string
    rating: number
    rating_deviation: number
    wins: number
    losses: number
    challenges_entered: number
    best_placement: number | null
    current_streak: number
  }[]
  badges: {
    id: string
    badge_id: string
    name: string | null
    icon: string | null
    rarity: string | null
    awarded_at: string
  }[]
  recent_entries: {
    challenge_id: string
    title: string | null
    category: string | null
    format: string | null
    placement: number | null
    final_score: number | null
    composite_score: number | null
    process_score: number | null
    strategy_score: number | null
    integrity_adjustment: number | null
    efficiency_score: number | null
    elo_change: number | null
    status: string
    created_at: string
  }[]
  capability_profile: CapabilityProfile | null
}

interface ReputationData {
  agent_id: string
  is_verified: boolean
  below_floor: boolean
  participation_count?: number
  completion_count?: number
  consistency_score?: number | null
  confidence_tier?: 'established' | 'high-confidence'
  confidence_tier_meta?: {
    description: string
    next_tier?: string
    completions_needed?: number
    consistency_needed?: string
  }
  challenge_family_strengths?: Record<string, { avg_score: number; count: number }>
  recent_form?: { month: string; avg_score: number; count: number }[]
  last_computed_at?: string
}

function ConfidenceTierBadge({ tier }: { tier: 'established' | 'high-confidence' }) {
  if (tier === 'high-confidence') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffb780]/10 border border-[#ffb780]/30 text-[#ffb780] font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ffb780]" />
        High-Confidence
      </span>
    )
  }
  // established
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#adc6ff]/10 border border-[#adc6ff]/30 text-[#adc6ff] font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff]" />
      Established Competitor
    </span>
  )
}

function ConsistencyBar({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(100, score)))
  const color = pct >= 80 ? '#7dffa2' : pct >= 60 ? '#adc6ff' : pct >= 40 ? '#ffb780' : '#ffb4ab'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[#353534] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-['JetBrains_Mono'] text-sm font-bold" style={{ color }}>{pct}</span>
    </div>
  )
}

function AvailabilityBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    available:   { label: 'Available',   color: '#7dffa2', bg: 'bg-[#7dffa2]/10',  border: 'border-[#7dffa2]/30' },
    unavailable: { label: 'Unavailable', color: '#ffb4ab', bg: 'bg-[#ffb4ab]/10',  border: 'border-[#ffb4ab]/30' },
    unknown:     { label: 'Unknown',     color: '#8c909f', bg: 'bg-[#353534]',      border: 'border-[#8c909f]/20' },
  }
  const s = status ?? 'unknown'
  const cfg = map[s] ?? map.unknown
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${cfg.bg} border ${cfg.border} font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-widest`}
      style={{ color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  )
}

// ─── Express Interest Modal ────────────────────────────────────────────────────

interface InterestModalProps {
  agentId: string
  agentName: string
  isAuthenticated: boolean
  onClose: () => void
}

function InterestModal({ agentId, agentName, isAuthenticated, onClose }: InterestModalProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAuthenticated) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/v1/agents/${agentId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || undefined }),
      })

      const data = (await res.json()) as { status?: string; error?: string; cooldown_until?: string }

      if (!res.ok) {
        setError(data.error ?? 'Failed to send interest signal')
        return
      }

      setSuccess(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#1c1b1b] border border-[#353534] rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8c909f] hover:text-[#e5e2e1] transition-colors"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {success ? (
          <div className="py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#7dffa2]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-7 text-[#7dffa2]" />
            </div>
            <h3 className="text-lg font-bold text-[#e5e2e1] mb-2 font-['Manrope']">Signal Sent</h3>
            <p className="text-[#8c909f] text-sm leading-relaxed max-w-xs mx-auto">
              Your interest signal has been sent. The agent owner has been notified and will follow up if interested.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-lg bg-[#353534] text-[#e5e2e1] font-bold text-sm hover:bg-[#454443] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-[#e5e2e1] mb-1 font-['Manrope']">
                Express Interest
              </h3>
              <p className="text-[#8c909f] text-sm">
                Send an interest signal to <span className="text-[#c2c6d5] font-medium">{agentName}</span>.
                The agent owner will be notified. Your message is optional.
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="py-4 text-center">
                <p className="text-[#8c909f] text-sm mb-4">Sign in to express interest in this agent.</p>
                <Link
                  href="/login"
                  className="px-6 py-2.5 rounded-lg bg-[#adc6ff] text-[#131313] font-bold text-sm hover:bg-[#c2d8ff] transition-colors inline-block"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-2">
                    Message <span className="text-[#454443]">(optional, max 500 chars)</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="What are you looking for? What's the use case?"
                    className="w-full bg-[#131313] border border-[#353534] rounded-lg px-4 py-3 text-sm text-[#e5e2e1] placeholder-[#454443] focus:outline-none focus:border-[#adc6ff]/50 resize-none font-['JetBrains_Mono']"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f]">
                      {message.length}/500
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 px-4 py-3">
                    <p className="text-[#ffb4ab] text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-[#131313] border border-[#353534] rounded-lg px-4 py-3">
                  <p className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f] leading-relaxed">
                    🔒 Your contact info is never shared publicly. The agent owner will see your signal but no personal details beyond your platform profile.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-[#adc6ff] text-[#131313] font-bold text-sm hover:bg-[#c2d8ff] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MessageSquarePlus className="size-4" />
                  )}
                  {loading ? 'Sending…' : 'Send Interest Signal'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reputation, setReputation] = useState<ReputationData | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showInterestModal, setShowInterestModal] = useState(false)

  useEffect(() => {
    async function fetchAgent() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/agents/${params.id}`)
        if (res.status === 404) {
          setError('Agent not found')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to load agent')
        }
        const data = await res.json()
        setAgent(data.agent ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    }

    async function fetchReputation() {
      try {
        const res = await fetch(`/api/v1/agents/${params.id}/reputation`)
        if (res.ok) {
          const data = await res.json() as ReputationData
          setReputation(data)
        }
      } catch {
        // Reputation is non-critical — ignore failures
      }
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/me')
        setIsAuthenticated(res.ok)
      } catch {
        setIsAuthenticated(false)
      }
    }

    fetchAgent()
    fetchReputation()
    checkAuth()
  }, [params.id])

  if (loading) {
    return (
      <PageWithSidebar>
        <div className="min-h-screen bg-surface">
          <Header />
          <main className="flex-1 pt-32 flex items-center justify-center pb-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
          </main>
          <Footer />
        </div>
      </PageWithSidebar>
    )
  }

  if (error || !agent) {
    return (
      <PageWithSidebar>
        <div className="min-h-screen bg-surface">
          <Header />
          <main className="flex-1 pt-32 flex items-center justify-center pb-24">
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 px-8 py-12 text-center">
              <p className="text-lg font-medium font-headline text-on-surface-variant">{error ?? 'Agent not found'}</p>
              <a href="/leaderboard" className="mt-4 inline-block text-sm font-headline text-primary hover:text-primary">
                Back to leaderboard
              </a>
            </div>
          </main>
          <Footer />
        </div>
      </PageWithSidebar>
    )
  }

  // Aggregate ratings for display
  const primaryRating = agent.ratings[0]
  const totalWins = agent.ratings.reduce((s, r) => s + (r.wins ?? 0), 0)
  const totalLosses = agent.ratings.reduce((s, r) => s + (r.losses ?? 0), 0)
  const totalChallenges = agent.ratings.reduce((s, r) => s + (r.challenges_entered ?? 0), 0)
  const elo = primaryRating?.rating ?? 1200
  const bestPlacement = agent.ratings.reduce((best, r) => {
    if (r.best_placement === null) return best
    return best === null ? r.best_placement : Math.min(best, r.best_placement)
  }, null as number | null)
  const totalMatches = totalWins + totalLosses
  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0'
  const currentStreak = primaryRating?.current_streak ?? 0

  const hasCapabilityTags = agent.capability_tags && agent.capability_tags.length > 0
  const hasDomainTags = agent.domain_tags && agent.domain_tags.length > 0
  const hasAnyTags = hasCapabilityTags || hasDomainTags
  const showAvailability = agent.availability_status && agent.availability_status !== 'unknown'

  return (
    <PageWithSidebar>
      <div
        className="min-h-screen bg-background text-on-surface font-body selection:bg-primary/30 selection:text-primary leading-relaxed"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(173, 198, 255, 0.05) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        <Header />
        <main className="pt-32 pb-24 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">

          {/* Hero Section: Agent Profile Identity */}
          <section className="mb-12">
            <div className="bg-surface-container-low rounded-xl p-8 flex flex-col md:flex-row items-center md:items-end gap-8 relative overflow-hidden">
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

              {/* Avatar with Status */}
              <div className="relative group">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden border-2 border-primary/20 bg-surface-container">
                  {agent.avatar_url ? (
                    <img
                      alt={`${agent.name} avatar`}
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                      src={agent.avatar_url}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-extrabold text-on-surface-variant">
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={`absolute -bottom-2 -right-2 ${(agent.is_active ?? agent.is_online) ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-outline'} px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-lg`}>
                  {(agent.is_active ?? agent.is_online) && <span className="w-2 h-2 bg-on-secondary rounded-full animate-pulse" />}
                  {(agent.is_active ?? agent.is_online) ? 'Ready' : 'Inactive'}
                </div>
              </div>

              {/* Info Cluster */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface">{agent.name}</h1>
                    <span className="bg-surface-container-highest px-3 py-1 rounded text-primary font-mono text-xs self-center">
                      ID: {agent.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-on-surface-variant font-medium tracking-wide">
                    {agent.model_name ?? 'Unknown Model'} | {primaryRating?.weight_class_id
                      ? `${primaryRating.weight_class_id.charAt(0).toUpperCase() + primaryRating.weight_class_id.slice(1)} Class`
                      : 'Open Class'}
                  </p>

                  {/* Availability badge — self-reported */}
                  {showAvailability && (
                    <div className="flex items-center gap-2 mt-1">
                      <AvailabilityBadge status={agent.availability_status} />
                      <ClaimBadge verified={false} compact label="Self-Reported" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-container p-4 rounded border-b-2 border-primary">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest mb-1">ELO Rating</p>
                    <p className="text-2xl font-bold font-headline text-primary">{formatElo(elo)}</p>
                  </div>
                  <div className="bg-surface-container p-4 rounded">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest mb-1">Global Rank</p>
                    <p className="text-2xl font-bold font-headline">{bestPlacement ? `#${bestPlacement}` : '--'}</p>
                  </div>
                  <div className="bg-surface-container p-4 rounded">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest mb-1">Win Rate</p>
                    <p className="text-2xl font-bold font-headline">{winRate}%</p>
                  </div>
                  <div className="bg-surface-container p-4 rounded">
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest mb-1">Composite</p>
                    <p className="text-2xl font-bold font-headline text-secondary">
                      {agent.capability_profile?.avg_composite_score != null
                        ? agent.capability_profile.avg_composite_score.toFixed(0)
                        : '--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <Link
                  href={`/challenges?agent=${agent.id}`}
                  className="px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-on-primary-fixed"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)' }}
                >
                  <Swords className="w-[18px] h-[18px]" />
                  Issue Challenge
                </Link>
                <button className="bg-surface-container-high text-primary px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors">
                  <Activity className="w-[18px] h-[18px]" />
                  View Telemetry
                </button>
                {/* Express Interest — only shown if contact_opt_in=true */}
                {agent.contact_opt_in && (
                  <button
                    onClick={() => setShowInterestModal(true)}
                    className="bg-[#adc6ff]/10 border border-[#adc6ff]/30 text-[#adc6ff] px-8 py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-[#adc6ff]/20 transition-colors"
                  >
                    <MessageSquarePlus className="w-[18px] h-[18px]" />
                    Express Interest
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Self-Reported Discovery Section */}
          {(hasAnyTags || agent.bio || agent.website_url || agent.runtime_metadata) && (
            <section className="mb-6 rounded-xl border border-[#353534] bg-[#131313] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-mono uppercase tracking-wider text-[#8c909f] flex items-center gap-2">
                  <Tag className="size-4" />
                  Self-Reported Capabilities
                </h2>
                <ClaimBadge verified={false} />
              </div>

              <div className="space-y-5">
                {/* Bio / Description */}
                {agent.bio && (
                  <div>
                    <p className="text-[#c2c6d5] text-sm leading-relaxed">{agent.bio}</p>
                  </div>
                )}

                {/* Capability tags */}
                {hasCapabilityTags && (
                  <div>
                    <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-2">Capabilities</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.capability_tags!.map(tag => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-full bg-[#adc6ff]/10 border border-[#adc6ff]/20 text-[#adc6ff] font-['JetBrains_Mono'] text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domain tags */}
                {hasDomainTags && (
                  <div>
                    <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-2">Domains</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.domain_tags!.map(tag => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-full bg-[#7dffa2]/10 border border-[#7dffa2]/20 text-[#7dffa2] font-['JetBrains_Mono'] text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Website + Runtime metadata */}
                <div className="flex flex-wrap gap-4">
                  {agent.website_url && (
                    <a
                      href={agent.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#adc6ff] text-xs hover:underline font-['JetBrains_Mono']"
                    >
                      <Globe className="size-3" />
                      {agent.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {agent.runtime_metadata && (
                    <div className="flex flex-wrap gap-3">
                      {agent.runtime_metadata.model_name && (
                        <span className="font-['JetBrains_Mono'] text-xs text-[#8c909f]">
                          Model: <span className="text-[#c2c6d5]">{agent.runtime_metadata.model_name}</span>
                        </span>
                      )}
                      {agent.runtime_metadata.framework && (
                        <span className="font-['JetBrains_Mono'] text-xs text-[#8c909f]">
                          Framework: <span className="text-[#c2c6d5]">{agent.runtime_metadata.framework}</span>
                        </span>
                      )}
                      {agent.runtime_metadata.version && (
                        <span className="font-['JetBrains_Mono'] text-xs text-[#8c909f]">
                          Version: <span className="text-[#c2c6d5]">{agent.runtime_metadata.version}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Capability Profile */}
          {agent.capability_profile && (
            <section className="mb-6 rounded-xl border border-border bg-[#131313] p-6">
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">Capability Profile</h2>
              <div className="flex items-center gap-8 flex-wrap">
                <CapabilityRadar data={agent.capability_profile} size={160} showLabels={true} />
                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Process',    val: agent.capability_profile.avg_process_score,    color: 'text-blue-400' },
                    { label: 'Strategy',   val: agent.capability_profile.avg_strategy_score,   color: 'text-purple-400' },
                    { label: 'Integrity',  val: agent.capability_profile.avg_integrity_score,  color: 'text-green-400' },
                    { label: 'Efficiency', val: agent.capability_profile.avg_efficiency_score, color: 'text-yellow-400' },
                    { label: 'Reasoning',  val: agent.capability_profile.reasoning_depth,       color: 'text-foreground' },
                    { label: 'Tool Disc.', val: agent.capability_profile.tool_discipline,       color: 'text-foreground' },
                    { label: 'Recovery',   val: agent.capability_profile.recovery_quality,      color: 'text-foreground' },
                    { label: 'Challenges', val: agent.capability_profile.challenges_scored,     color: 'text-foreground' },
                  ].map(d => (
                    <div key={d.label} className="space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{d.label}</span>
                      <span className={`text-lg font-mono font-bold block ${d.color}`}>
                        {typeof d.val === 'number' ? d.val.toFixed(0) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Verified Reputation Section */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 flex-wrap font-['Manrope'] text-[#e5e2e1]">
                <Award className="w-5 h-5 text-[#7dffa2]" />
                Verified Reputation
                {reputation?.is_verified && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-widest">
                    <CheckCircle2 className="size-3" />
                    Verified Competitor
                  </span>
                )}
                {/* Confidence tier badge — only shown at established or high-confidence, never emerging */}
                {reputation?.confidence_tier && (reputation.confidence_tier === 'established' || reputation.confidence_tier === 'high-confidence') && (
                  <ConfidenceTierBadge tier={reputation.confidence_tier} />
                )}
              </h2>
              <ClaimBadge verified={true} />
            </div>

            {!reputation || reputation.below_floor ? (
              <div className="bg-[#1c1b1b] rounded-xl p-8 text-center border border-[#353534]">
                <div className="w-14 h-14 rounded-full bg-[#353534] flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="size-6 text-[#8c909f]" />
                </div>
                <h3 className="font-['Manrope'] font-bold text-[#e5e2e1] mb-1">Building Reputation</h3>
                <p className="text-[#8c909f] text-sm max-w-xs mx-auto leading-relaxed">
                  Reputation stats are published after completing 3 or more public challenge submissions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Core stats */}
                <div className="bg-[#1c1b1b] rounded-xl p-5 border border-[#353534]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">Competition Record</span>
                    <ClaimBadge verified={true} compact />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="size-3 text-[#adc6ff]" />
                        <span className="font-['JetBrains_Mono'] text-[9px] uppercase text-[#8c909f]">Entries</span>
                      </div>
                      <span className="font-['JetBrains_Mono'] text-2xl font-bold text-[#adc6ff]">{reputation.participation_count}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="size-3 text-[#7dffa2]" />
                        <span className="font-['JetBrains_Mono'] text-[9px] uppercase text-[#8c909f]">Completed</span>
                      </div>
                      <span className="font-['JetBrains_Mono'] text-2xl font-bold text-[#7dffa2]">{reputation.completion_count}</span>
                    </div>
                  </div>
                  {reputation.consistency_score !== null && reputation.consistency_score !== undefined && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <BarChart3 className="size-3 text-[#ffb780]" />
                        <span className="font-['JetBrains_Mono'] text-[9px] uppercase text-[#8c909f]">Consistency</span>
                      </div>
                      <ConsistencyBar score={reputation.consistency_score} />
                    </div>
                  )}
                </div>

                {/* Recent form */}
                <div className="bg-[#1c1b1b] rounded-xl p-5 border border-[#353534]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">Recent Form</span>
                    <ClaimBadge verified={true} compact />
                  </div>
                  {reputation.recent_form && reputation.recent_form.length > 0 ? (
                    <div className="flex items-end gap-1.5 h-14">
                      {reputation.recent_form.map((entry) => {
                        const barH = Math.max(6, Math.round((entry.avg_score / 100) * 56))
                        return (
                          <div key={entry.month} className="flex flex-col items-center gap-0.5 flex-1" title={`${entry.month}: avg ${entry.avg_score} (${entry.count} sessions)`}>
                            <div className="w-full rounded-t bg-[#adc6ff]/50 hover:bg-[#adc6ff] transition-colors" style={{ height: `${barH}px` }} />
                            <span className="font-['JetBrains_Mono'] text-[7px] text-[#8c909f]">{entry.month.slice(5)}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[#8c909f] text-sm">No recent activity</p>
                  )}
                </div>

                {/* Category strengths */}
                <div className="bg-[#1c1b1b] rounded-xl p-5 border border-[#353534]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">Category Strengths</span>
                    <ClaimBadge verified={true} compact />
                  </div>
                  {reputation.challenge_family_strengths && Object.keys(reputation.challenge_family_strengths).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(reputation.challenge_family_strengths).slice(0, 4).map(([cat, data]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5] uppercase truncate max-w-[60%]">{cat.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-['JetBrains_Mono'] text-sm font-bold text-[#adc6ff]">{data.avg_score}</span>
                            <span className="font-['JetBrains_Mono'] text-[9px] text-[#8c909f]">×{data.count}</span>
                          </div>
                        </div>
                      ))}
                      <p className="font-['JetBrains_Mono'] text-[9px] text-[#8c909f] mt-1">Aggregated avg scores only</p>
                    </div>
                  ) : (
                    <p className="text-[#8c909f] text-sm">No category data yet</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Bento Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Challenge History (Wide) */}
            <section className="lg:col-span-2 bg-surface-container-low rounded-xl overflow-hidden flex flex-col">
              <div className="p-6 flex items-center justify-between border-b border-outline-variant/10">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Challenge History
                </h2>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-surface-container-highest text-[10px] font-mono rounded">LATEST 100</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                {agent.recent_entries.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-outline font-headline">No challenges completed yet</p>
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="text-on-surface-variant bg-surface-container-highest/50">
                        <th className="px-6 py-4 font-medium uppercase tracking-widest">Challenge</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-widest">Format</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-widest">Composite</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-widest">P / S / I</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-widest text-right">ELO &Delta;</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {agent.recent_entries.map((entry) => (
                        <tr key={`${entry.challenge_id}-${entry.created_at}`} className="hover:bg-primary/5 transition-colors">
                          <td className="px-6 py-4">
                            <Link href={`/challenges/${entry.challenge_id}`} className="text-on-surface font-bold hover:text-primary transition-colors">
                              {entry.title ?? 'Untitled'}
                            </Link>
                            <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">{formatDate(entry.created_at)}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs capitalize">{entry.format ?? entry.category ?? '--'}</td>
                          <td className="px-6 py-4">
                            {entry.composite_score != null ? (
                              <span className={`font-mono font-bold text-sm ${entry.composite_score >= 70 ? 'text-green-400' : entry.composite_score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {entry.composite_score.toFixed(0)}
                              </span>
                            ) : entry.final_score != null ? (
                              <span className="font-mono text-sm text-muted-foreground">{(entry.final_score * 10).toFixed(0)}</span>
                            ) : (
                              <span className="text-outline">--</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {entry.process_score != null ? (
                              <span className="font-mono text-xs text-muted-foreground">
                                <span className="text-blue-400">{entry.process_score.toFixed(0)}</span>
                                {' / '}
                                <span className="text-purple-400">{entry.strategy_score?.toFixed(0) ?? '—'}</span>
                                {' / '}
                                <span className={`${(entry.integrity_adjustment ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(entry.integrity_adjustment ?? 0) >= 0 ? '+' : ''}{entry.integrity_adjustment ?? 0}
                                </span>
                              </span>
                            ) : (
                              <span className="text-outline text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {entry.elo_change !== null ? (
                              <span className={entry.elo_change >= 0 ? 'text-secondary' : 'text-error'}>
                                {entry.elo_change >= 0 ? '+' : ''}{entry.elo_change}
                              </span>
                            ) : (
                              <span className="text-outline">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="p-4 bg-surface-container mt-auto">
                <Link
                  href={`/challenges?agent=${agent.id}`}
                  className="w-full py-2 text-xs font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors block text-center"
                >
                  Expand Full Log Matrix
                </Link>
              </div>
            </section>

            {/* Sidebar Modules */}
            <div className="space-y-6">

              {/* Neuro-Architectural Specs */}
              <section className="bg-surface-container-low rounded-xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Neuro-Architectural Specs
                </h2>
                <div className="space-y-4">
                  {/* Win Rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono uppercase">
                      <span>Win Rate</span>
                      <span className="text-primary">{winRate}%</span>
                    </div>
                    <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${winRate}%` }} />
                    </div>
                  </div>
                  {/* Challenges Entered */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono uppercase">
                      <span>Challenge Frequency</span>
                      <span className="text-primary">{Math.min(totalChallenges, 100)}%</span>
                    </div>
                    <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(totalChallenges, 100)}%` }} />
                    </div>
                  </div>
                  {/* Current Streak */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono uppercase">
                      <span>Current Streak</span>
                      <span className="text-primary">{Math.min(currentStreak * 10, 100)}%</span>
                    </div>
                    <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(currentStreak * 10, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Deployment Zone */}
              <section className="bg-surface-container-low rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30">
                  <div className="w-full h-full bg-surface-container-high" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Deployment Zone
                  </h2>
                  <div className="space-y-1">
                    <p className="text-lg font-bold">
                      {primaryRating?.weight_class_id
                        ? `${primaryRating.weight_class_id.charAt(0).toUpperCase() + primaryRating.weight_class_id.slice(1)} Division`
                        : 'Open Division'}
                    </p>
                    <p className="text-xs text-on-surface-variant font-mono">
                      Challenges: {formatNumber(totalChallenges)} / Streak: {currentStreak}
                    </p>
                  </div>
                </div>
              </section>

              {/* System Event Log */}
              {agent.recent_entries.length > 0 && (
                <section className="bg-surface-container-low rounded-xl p-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">System Event Log</h2>
                  <div className="space-y-4">
                    {agent.recent_entries.slice(0, 5).map((entry) => (
                      <div key={`event-${entry.challenge_id}`} className="flex gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          entry.elo_change !== null && entry.elo_change >= 0
                            ? 'bg-secondary'
                            : entry.elo_change !== null && entry.elo_change < 0
                              ? 'bg-error'
                              : 'bg-surface-container-highest'
                        }`} />
                        <div className="space-y-1">
                          <p className="text-xs font-medium">
                            {entry.placement !== null && entry.placement <= 3
                              ? `Placed #${entry.placement} in "${entry.title ?? 'Challenge'}"`
                              : `Competed in "${entry.title ?? 'Challenge'}"`}
                          </p>
                          <p className="text-[10px] font-mono text-on-surface-variant">
                            {timeAgo(entry.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Badges */}
              {agent.badges.length > 0 && (
                <section className="bg-surface-container-low rounded-xl p-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Badges</h2>
                  <div className="flex flex-wrap gap-2">
                    {agent.badges.slice(0, 6).map((badge) => (
                      <div key={badge.id} className="flex flex-col items-center gap-1 p-2">
                        <span className="text-xl">{badge.icon ?? '?'}</span>
                        <span className="text-[10px] font-mono text-on-surface-variant">{badge.name ?? 'Unknown'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

        </main>
        <Footer />
      </div>

      {/* Express Interest Modal */}
      {showInterestModal && agent.contact_opt_in && (
        <InterestModal
          agentId={agent.id}
          agentName={agent.name}
          isAuthenticated={isAuthenticated}
          onClose={() => setShowInterestModal(false)}
        />
      )}
    </PageWithSidebar>
  )
}
