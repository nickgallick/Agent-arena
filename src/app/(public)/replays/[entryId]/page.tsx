'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { ReplayTimeline } from '@/components/replay/replay-timeline'
import type { ReplayEvent } from '@/components/replay/timeline-node'
import {
  Wrench,
  Sparkles,
  FileCode,
  Brain,
  CheckCircle,
  FileText,
  Copy,
  Folder,
  Search,
  GitBranch,
  BadgeCheck,
  Clock,
  ClipboardCheck,
  Play,
  Pause,
  Bot,
  CalendarDays,
  Trophy,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostMatchBreakdown } from '@/components/replay/post-match-breakdown'
import { PerformanceBreakdown, PerformanceBreakdownLoading } from '@/components/feedback/performance-breakdown'
import type { FeedbackReport } from '@/lib/feedback/types'
import { safeEventIcon, safeEventColor } from '@/components/replay/timeline-node'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReplayData {
  entry_id: string
  agent: { id: string; name: string; avatar_url: string | null; weight_class_id: string } | null
  challenge: { id: string; title: string; category: string; status: string; format: string } | null
  transcript: ReplayEvent[] | null
  submission_text: string | null
  submission_files: { name: string; url: string; type: string }[] | null
  screenshot_urls: Array<{ viewport: string; url: string }> | null
  judge_scores: {
    id: string
    entry_id: string
    judge_type: string
    provider?: string
    quality_score: number
    creativity_score: number
    completeness_score: number
    practicality_score: number
    overall_score: number
    feedback: string
    red_flags: string[]
    reveal_tx?: string
  }[]
  final_score: number | null
  placement: number | null
  reveal_summary?: Record<string, { score: number; feedback: string }> | null
  all_revealed_at?: string | null
  // Phase 1+ lane scoring
  // B2/B3 FIX: Public-scoped fields only. model_id, latency_ms, is_fallback are infra
  // fields not intended for public consumers. short_rationale is owner/admin only.
  // The API already scopes columns by audience (JUDGE_OUTPUT_COLUMNS_PUBLIC vs _OWNER).
  // The type here reflects what public viewers actually receive.
  judge_outputs?: {
    id: string; lane: string; score: number; confidence: number
    dimension_scores: Record<string, number>; evidence_refs: string[]
    flags: string[]; integrity_outcome?: string; integrity_adjustment?: number
    positive_signal?: string | null; primary_weakness?: string | null
    // Owner/admin-only (may be present for owner viewers, undefined for public):
    model_id?: string; latency_ms?: number; is_fallback?: boolean; short_rationale?: string
  }[]
  composite_score?: number | null
  process_score?: number | null
  strategy_score?: number | null
  integrity_adjustment?: number
  efficiency_score?: number | null
  challenge_format?: string | null
  dispute_flagged?: boolean
  dispute_reason?: string | null
  dispute_flag?: {
    trigger_reason: string; max_judge_spread: number; status: string
    adjudicated_score?: number; adjudication_rationale?: string
  } | null
  run_metrics?: {
    total_events: number; tool_call_count: number; retry_count: number
    revert_count: number; pivot_count: number; error_count: number; test_run_count: number
    thrash_rate: number; revert_ratio: number; tool_discipline: number
    verification_density: number; wasted_action_ratio: number; total_duration_ms: number
    pct_explore: number; pct_plan: number; pct_implement: number; pct_verify: number; pct_recover: number
    telemetry_process_score: number; telemetry_recovery_score: number; telemetry_efficiency_score: number
  } | null
  // Feedback model (migration 00041)
  overall_verdict?: string | null
  // Placement context — populated by replay API
  total_entries?: number | null
  provisional_placement?: number | null
  challenge_ends_at?: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Icon/color lookups now delegate to safeEventIcon/safeEventColor from timeline-node.
// This ensures unknown/legacy event types never crash the replay tree.

const scoreCategories = [
  { key: 'quality_score' as const, label: 'QUALITY' },
  { key: 'creativity_score' as const, label: 'CREATIVITY' },
  { key: 'completeness_score' as const, label: 'COMPLETENESS' },
  { key: 'practicality_score' as const, label: 'PRACTICALITY' },
]

const speeds = [1, 2, 5]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ReplayPage() {
  const params = useParams()
  const entryId = params.entryId as string

  const [replay, setReplay] = useState<ReplayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Premium feedback report state
  const [feedbackReport, setFeedbackReport] = useState<FeedbackReport | null>(null)
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'loading' | 'generating' | 'ready' | 'not_available' | 'failed' | 'error'>('idle')
  // A4 FIX: Default to 'classic' tab so score data is ALWAYS immediately visible.
  // Premium tab auto-switches only after the report successfully loads.
  const [breakdownTab, setBreakdownTab] = useState<'premium' | 'classic'>('classic')
  const [premiumAutoOpened, setPremiumAutoOpened] = useState(false)

  // Derived: whether premium tab should be accessible at all
  const premiumAvailable = feedbackStatus === 'ready' && feedbackReport != null

  useEffect(() => {
    async function fetchReplay() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/replays/${entryId}`)
        if (res.status === 404) {
          setError('Replay not found')
          return
        }
        if (res.status === 403) {
          setError('Replay not available until challenge is complete')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to load replay')
        }
        const data = await res.json()
        const replayData = data.replay
        if (replayData?.judge_scores && Array.isArray(replayData.judge_scores)) {
          replayData.judge_scores = replayData.judge_scores.map((s: Record<string, unknown>) => ({
            ...s,
            entry_id: s.entry_id ?? entryId,
            red_flags: Array.isArray(s.red_flags) ? s.red_flags : [],
          }))
        }
        // Normalize transcript events — harden against legacy/partial shapes.
        // Unknown types, missing titles, missing content all handled safely.
        if (replayData?.transcript && Array.isArray(replayData.transcript)) {
          replayData.transcript = replayData.transcript
            .filter((e: unknown) => e !== null && typeof e === 'object')
            .map((e: Record<string, unknown>) => ({
              timestamp: typeof e.timestamp === 'number' ? e.timestamp : 0,
              type: typeof e.type === 'string' && e.type.length > 0 ? e.type : 'thinking',
              title: typeof e.title === 'string' ? e.title : (typeof e.type === 'string' ? e.type.replace(/_/g, ' ') : 'Event'),
              content: typeof e.content === 'string' ? e.content : (typeof e.output === 'string' ? e.output : ''),
              metadata: (typeof e.metadata === 'object' && e.metadata !== null) ? e.metadata as Record<string, unknown> : undefined,
            }))
        }
        // Normalize judge_outputs — harden against partial/missing optional fields.
        // B2/B3 FIX: model_id, latency_ms, is_fallback, short_rationale are owner/admin-only.
        // They may be present (owner) or absent (public) — both are valid. Never force-add them.
        if (replayData?.judge_outputs && Array.isArray(replayData.judge_outputs)) {
          replayData.judge_outputs = replayData.judge_outputs.map((o: Record<string, unknown>) => ({
            ...o,
            dimension_scores: (typeof o.dimension_scores === 'object' && o.dimension_scores !== null) ? o.dimension_scores : {},
            evidence_refs: Array.isArray(o.evidence_refs) ? o.evidence_refs : [],
            flags: Array.isArray(o.flags) ? o.flags : [],
            score: typeof o.score === 'number' ? o.score : 0,
            confidence: typeof o.confidence === 'number' ? o.confidence : 0,
            positive_signal: typeof o.positive_signal === 'string' ? o.positive_signal : null,
            primary_weakness: typeof o.primary_weakness === 'string' ? o.primary_weakness : null,
            // Owner/admin-only fields — kept only if present in API response, never injected
            ...(typeof o.short_rationale === 'string' ? { short_rationale: o.short_rationale } : {}),
            ...(typeof o.model_id === 'string' ? { model_id: o.model_id } : {}),
            ...(typeof o.latency_ms === 'number' ? { latency_ms: o.latency_ms } : {}),
            ...(o.is_fallback !== undefined ? { is_fallback: Boolean(o.is_fallback) } : {}),
          }))
        }
        setReplay(replayData ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load replay')
      } finally {
        setLoading(false)
      }
    }
    fetchReplay()
  }, [entryId])

  // A2/A3/A4 FIX: Fetch premium feedback (synchronous pipeline — no polling required).
  // The API now runs the pipeline synchronously and returns {report} or {status:'failed'}.
  // We show the classic tab immediately (default) and auto-switch to premium when ready.
  useEffect(() => {
    if (!replay) return
    async function fetchFeedback() {
      if (!replay) return
      setFeedbackStatus('loading')
      try {
        // A2 FIX: API now runs synchronously. Single fetch — no polling loop needed.
        // Timeout: 60s (pipeline takes ~15-45s for real LLM calls)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60_000)
        let res: Response
        try {
          res = await fetch(`/api/feedback/entry/${entryId}`, { signal: controller.signal })
        } finally {
          clearTimeout(timeout)
        }

        if (res.status === 404 || res.status === 403) {
          setFeedbackStatus('not_available')
          return
        }

        const data = await res.json() as { report?: FeedbackReport; status?: string; message?: string }

        // A3 FIX: All terminal states land here — no polling loop that can get stuck.
        if (data.report?.status === 'ready') {
          setFeedbackReport(data.report)
          setFeedbackStatus('ready')
          // A4 FIX: Auto-switch to premium tab once ready (only if user hasn't manually toggled)
          if (!premiumAutoOpened) {
            setBreakdownTab('premium')
            setPremiumAutoOpened(true)
          }
        } else if (data.status === 'not_available' || res.status === 404) {
          setFeedbackStatus('not_available')
        } else if (data.status === 'failed') {
          // A3 FIX: Pipeline failure → graceful degraded state (not stuck spinner)
          setFeedbackStatus('failed')
        } else if (!res.ok) {
          setFeedbackStatus('error')
        } else {
          // Unexpected state — degrade gracefully
          setFeedbackStatus('not_available')
        }
      } catch (err) {
        // A3 FIX: AbortError (timeout) or network error → graceful degraded state.
        // User stays on classic tab. Never stuck on spinner.
        if (err instanceof Error && err.name === 'AbortError') {
          setFeedbackStatus('failed')
        } else {
          setFeedbackStatus('error')
        }
      }
    }
    fetchFeedback()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay, entryId])

  const rawTranscript = replay?.transcript
  const events: ReplayEvent[] = Array.isArray(rawTranscript) ? rawTranscript : []
  const progress = events.length > 0 ? ((currentIndex + 1) / events.length) * 100 : 0
  const activeEvent = events[currentIndex] ?? null
  const ActiveIcon = activeEvent ? safeEventIcon(activeEvent.type) : Brain

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= events.length - 1) {
        setIsPlaying(false)
        return prev
      }
      return prev + 1
    })
  }, [events.length])

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(advance, 2000 / speed)
    return () => clearInterval(interval)
  }, [isPlaying, speed, advance])

  function handleSeek(pct: number) {
    if (events.length === 0) return
    const idx = Math.round((pct / 100) * (events.length - 1))
    setCurrentIndex(Math.max(0, Math.min(events.length - 1, idx)))
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    handleSeek(pct)
  }

  // Compute averaged scores for the Judge Evaluation panel
  const judgeScores = replay?.judge_scores ?? []
  const avgScore = (key: 'quality_score' | 'creativity_score' | 'completeness_score' | 'practicality_score') => {
    if (judgeScores.length === 0) return 0
    return judgeScores.reduce((sum, s) => sum + s[key], 0) / judgeScores.length
  }
  const finalScore = replay?.final_score ?? 0
  const feedbackSummary = judgeScores.find((s) => s.feedback)?.feedback ?? null

  // Determine tier label
  function getTierLabel(score: number) {
    if (score >= 9) return 'Elite Tier'
    if (score >= 7) return 'Pro Tier'
    if (score >= 5) return 'Standard Tier'
    return 'Entry Tier'
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <PageWithSidebar>
        <div className="flex min-h-screen flex-col bg-surface">
          <Header />
          <main className="flex-1 pt-20 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
          </main>
          <Footer />
        </div>
      </PageWithSidebar>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !replay) {
    return (
      <PageWithSidebar>
        <div className="flex min-h-screen flex-col bg-surface">
          <Header />
          <main className="flex-1 pt-20 flex items-center justify-center">
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 px-8 py-12 text-center">
              <p className="text-lg font-medium text-on-surface-variant">{error ?? 'Replay not available'}</p>
              <a href="/challenges" className="mt-4 inline-block text-sm text-primary hover:text-primary">
                &larr; Browse challenges
              </a>
            </div>
          </main>
          <Footer />
        </div>
      </PageWithSidebar>
    )
  }

  const submissionFiles = (Array.isArray(replay.submission_files) ? replay.submission_files : []).map((f) => ({
    name: f.name,
    url: f.url ?? '#',
    type: f.type ?? f.name.split('.').pop() ?? 'txt',
  }))

  // Formatted time for progress display
  const currentTime = formatTimestamp(activeEvent?.timestamp ?? 0)
  const lastTime = formatTimestamp(events[events.length - 1]?.timestamp ?? 0)

  return (
    <PageWithSidebar>
      <div className="flex min-h-screen flex-col bg-surface text-on-surface font-body selection:bg-primary/30">
        <Header />

        {/* Main Content Canvas */}
        <main className="mt-16 flex-grow p-6 lg:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-6">
          {/* ── Result Header ── */}
          <header className="col-span-12 mb-2">
            {/* Back nav */}
            <a
              href="/results"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors font-label mb-4"
            >
              <ChevronLeft className="size-3.5" /> Back to results
            </a>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                {/* Eyebrow */}
                <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2">
                  Submission Breakdown
                </p>
                {/* Challenge title */}
                <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-3">
                  {replay.challenge?.title ?? 'Submission Breakdown'}
                </h1>
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-on-surface-variant font-label">
                  {replay.agent && (
                    <span className="flex items-center gap-1.5">
                      <Bot className="size-3.5 text-secondary" />
                      {replay.agent.name}
                    </span>
                  )}
                  {replay.all_revealed_at && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      {new Date(replay.all_revealed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {(() => {
                    // Use stored placement for closed challenges; provisional_placement for open ones.
                    const displayPlacement = replay.placement ?? replay.provisional_placement
                    if (displayPlacement == null) return null
                    // P1 fix: challenge must be both 'active' AND ends_at in the future.
                    // Challenges manually closed early (status=complete, ends_at still future)
                    // must show final-only language.
                    const isProvisional =
                      replay.challenge?.status === 'active' &&
                      !!replay.challenge_ends_at &&
                      new Date(replay.challenge_ends_at).getTime() > Date.now()
                    const placementLabel =
                      displayPlacement === 1 ? '1st Place'
                      : displayPlacement === 2 ? '2nd Place'
                      : displayPlacement === 3 ? '3rd Place'
                      : `#${displayPlacement}`
                    return (
                      <span className="flex items-center gap-1.5">
                        <Trophy className="size-3.5 text-secondary" />
                        {placementLabel}
                        {isProvisional && (
                          <span
                            className="text-[10px] text-on-surface-variant font-label"
                            title="Official standings finalize when the challenge closes."
                          >· provisional</span>
                        )}
                      </span>
                    )
                  })()}
                  {replay.challenge?.format && (
                    <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-label capitalize">
                      {replay.challenge.format}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ── Left Column: Visual Output & Code ── */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Visual Output Section */}
            {replay.screenshot_urls && Array.isArray(replay.screenshot_urls) && replay.screenshot_urls.length > 0 && (
              <section className="bg-surface-container-low p-1 rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-surface-container flex items-center justify-between px-4 py-2 rounded-t-lg">
                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    Visual Output
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-outline-variant/30" />
                    <div className="w-2 h-2 rounded-full bg-outline-variant/30" />
                    <div className="w-2 h-2 rounded-full bg-outline-variant/30" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-surface-container-low h-[400px]">
                  {(replay.screenshot_urls as Array<{ viewport: string; url: string }>).map((ss, i) => (
                    <div
                      key={ss.viewport}
                      className={cn(
                        'relative group overflow-hidden bg-surface-container-lowest',
                        i === 0 && replay.screenshot_urls!.length > 1 ? 'md:col-span-2' : '',
                        i > 0 ? 'border-l border-outline-variant/10' : ''
                      )}
                    >
                      <img
                        src={ss.url}
                        alt={`${ss.viewport} screenshot`}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-dim/80 to-transparent flex items-end p-4">
                        <span className="bg-surface-container-highest/60 backdrop-blur px-2 py-1 rounded text-[10px] font-label uppercase">
                          {ss.viewport === 'desktop' ? 'Desktop' : ss.viewport === 'mobile' ? 'Mobile' : ss.viewport}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Submission Panel / Code Editor */}
            <section className="bg-surface-container-low rounded-xl overflow-hidden flex flex-col h-[500px]">
              <div className="flex items-center bg-surface-container px-4 py-3 border-b border-outline-variant/10">
                <div className="flex items-center gap-6">
                  {submissionFiles.length > 0 ? (
                    submissionFiles.map((f, i) => (
                      <div
                        key={f.name}
                        className={cn(
                          'flex items-center gap-2 pb-2 -mb-3',
                          i === 0
                            ? 'cursor-pointer border-b-2 border-primary'
                            : 'opacity-50 hover:opacity-100 transition-opacity'
                        )}
                      >
                        <FileText className={cn('size-3.5', i === 0 ? 'text-primary' : 'text-on-surface-variant')} />
                        <span className="font-label text-[11px] font-bold">{f.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 cursor-pointer border-b-2 border-primary pb-2 -mb-3">
                      <FileText className="size-3.5 text-primary" />
                      <span className="font-label text-[11px] font-bold">submission</span>
                    </div>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="font-label text-[10px] text-outline">
                    {replay.challenge?.format?.toUpperCase() ?? 'TEXT'}
                  </span>
                  <button className="text-on-surface-variant hover:text-on-surface">
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-grow flex overflow-hidden">
                {/* File list left rail */}
                <div className="w-12 bg-surface-container-lowest flex flex-col items-center py-4 gap-4 border-r border-outline-variant/10 shrink-0">
                  <Folder className="size-[18px] text-primary" />
                  <Search className="size-[18px] text-outline-variant" />
                  <GitBranch className="size-[18px] text-outline-variant" />
                </div>
                {/* Code block */}
                <div className="flex-grow p-6 font-mono text-[13px] leading-relaxed overflow-y-auto code-block bg-surface-container-lowest">
                  {events.length > 0 && activeEvent ? (
                    <div>
                      <div className="mb-4 flex items-center gap-3">
                        <ActiveIcon className={cn('h-4 w-4', safeEventColor(activeEvent.type))} />
                        <span className="font-semibold text-on-surface text-sm">{activeEvent.title ?? activeEvent.type.replace(/_/g, ' ')}</span>
                        <span className="text-outline text-xs">
                          {formatTimestamp(activeEvent.timestamp ?? 0)} &middot; Step {currentIndex + 1}/{events.length}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap text-on-surface-variant">{activeEvent.content ?? '(no content)'}</pre>
                    </div>
                  ) : replay.submission_text ? (
                    <pre className="whitespace-pre-wrap text-on-surface-variant">{replay.submission_text}</pre>
                  ) : (
                    <p className="text-outline">No submission data available.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Replay Timeline (inline, below code on smaller screens) */}
            {events.length > 0 && (
              <section className="bg-surface-container-low rounded-xl p-4 max-h-[300px] overflow-y-auto lg:hidden">
                <ReplayTimeline
                  events={events}
                  currentIndex={currentIndex}
                  onSelectEvent={setCurrentIndex}
                />
              </section>
            )}
          </div>

          {/* ── Right Column: Scores & Timeline ── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Performance Breakdown — tabbed: Premium vs Classic
                A4 FIX: Classic tab is default and ALWAYS available.
                Premium tab only appears when report is ready or while loading.
                No spinner dead-ends — every state has a visible fallback. */}
            {(replay.judge_outputs && replay.judge_outputs.length > 0) || replay.composite_score != null || replay.run_metrics ? (
              <section className="space-y-3">

                {/* Tab switcher — always show both tabs once replay loads */}
                <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                  <button
                    onClick={() => setBreakdownTab('premium')}
                    disabled={!premiumAvailable && feedbackStatus !== 'loading'}
                    className={cn(
                      'flex-1 text-xs font-mono py-1.5 px-3 rounded transition-colors relative',
                      breakdownTab === 'premium' && premiumAvailable
                        ? 'bg-[#adc6ff]/15 text-[#adc6ff] border border-[#adc6ff]/20'
                        : 'text-muted-foreground hover:text-foreground',
                      (!premiumAvailable && feedbackStatus !== 'loading') && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    Performance Breakdown
                    {/* C2 FIX: Loading indicator in tab button — not a full-page spinner */}
                    {feedbackStatus === 'loading' && (
                      <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-[#adc6ff] animate-pulse" />
                    )}
                  </button>
                  <button
                    onClick={() => setBreakdownTab('classic')}
                    className={cn(
                      'flex-1 text-xs font-mono py-1.5 px-3 rounded transition-colors',
                      breakdownTab === 'classic'
                        ? 'bg-white/5 text-foreground border border-white/10'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Score Breakdown
                  </button>
                </div>

                {/* C2 FIX: Status banner — honest, non-blocking, never a dead-end */}
                {breakdownTab === 'premium' && feedbackStatus === 'loading' && (
                  <div className="rounded-lg border border-[#adc6ff]/15 bg-[#adc6ff]/5 px-4 py-3 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full border-2 border-[#adc6ff] border-t-transparent animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-xs font-mono text-[#adc6ff]">Generating Performance Breakdown…</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Takes ~15–45s. Score Breakdown tab is available now.</p>
                    </div>
                    <button
                      onClick={() => setBreakdownTab('classic')}
                      className="ml-auto text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      View scores →
                    </button>
                  </div>
                )}

                {/* A3 FIX: Failed/error states show clear message + immediate classic switch */}
                {breakdownTab === 'premium' && (feedbackStatus === 'failed' || feedbackStatus === 'error') && (
                  <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low/50 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground font-mono">
                      {feedbackStatus === 'failed'
                        ? 'Performance Breakdown unavailable for this submission.'
                        : 'Could not load Performance Breakdown.'}
                    </p>
                    <button
                      onClick={() => setBreakdownTab('classic')}
                      className="text-[10px] font-mono text-[#adc6ff] hover:text-foreground transition-colors underline flex-shrink-0"
                    >
                      View Score Breakdown →
                    </button>
                  </div>
                )}

                {/* Premium view — only rendered when report is actually ready */}
                {breakdownTab === 'premium' && feedbackStatus === 'ready' && feedbackReport && (
                  <PerformanceBreakdown
                    report={feedbackReport}
                    compositeScore={replay.composite_score}
                    placement={replay.placement ?? replay.provisional_placement}
                    totalEntries={replay.total_entries}
                    isProvisional={
                      replay.challenge?.status === 'active' &&
                      !!replay.challenge_ends_at &&
                      new Date(replay.challenge_ends_at).getTime() > Date.now()
                    }
                  />
                )}

                {/* Classic view — A4: always rendered when on classic tab, or when premium unavailable */}
                {(breakdownTab === 'classic' ||
                  feedbackStatus === 'not_available' ||
                  feedbackStatus === 'idle' ||
                  (breakdownTab === 'premium' && !premiumAvailable && feedbackStatus !== 'loading' && feedbackStatus !== 'failed' && feedbackStatus !== 'error')
                ) && (
                  <PostMatchBreakdown
                    judgeOutputs={replay.judge_outputs ?? []}
                    compositeScore={replay.composite_score}
                    finalScore={replay.final_score}
                    processScore={replay.process_score}
                    strategyScore={replay.strategy_score}
                    integrityAdjustment={replay.integrity_adjustment ?? 0}
                    efficiencyScore={replay.efficiency_score}
                    runMetrics={replay.run_metrics}
                    disputeFlag={replay.dispute_flag}
                    challengeFormat={replay.challenge_format}
                    overallVerdict={replay.overall_verdict}
                    placement={replay.placement ?? replay.provisional_placement}
                    totalEntries={replay.total_entries}
                    isProvisional={
                      replay.challenge?.status === 'active' &&
                      !!replay.challenge_ends_at &&
                      new Date(replay.challenge_ends_at).getTime() > Date.now()
                    }
                    challengeStatus={replay.challenge?.status ?? null}
                  />
                )}
              </section>
            ) : null}

            {/* Legacy Judge Scores Panel (pre-Phase 1 entries)
                C1 FIX: Legacy panel uses /10 scale (old judge_scores system).
                Phase 1+ lane scoring uses /100 scale (composite_score / judge_outputs).
                Label clearly distinguishes which scale each number uses. */}
            <section className="bg-surface-container-low p-6 rounded-xl border-l-4 border-primary">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-headline font-extrabold text-xl">Judge Evaluation</h3>
                  <p className="font-label text-[10px] uppercase text-outline tracking-tighter mt-1">
                    {judgeScores.length > 0 ? 'Legacy scoring · /10 scale' : 'Bouts Judging System'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-primary leading-none">
                    {finalScore.toFixed(1)}<span className="text-lg text-outline">/10</span>
                  </div>
                  <span className="text-[10px] font-label text-secondary uppercase tracking-widest">
                    {getTierLabel(finalScore)}
                  </span>
                  {(() => {
                    const displayPlacement = replay.placement ?? replay.provisional_placement
                    if (displayPlacement == null) return null
                    // P1 fix: same status guard as the header badge.
                    const isProvisional =
                      replay.challenge?.status === 'active' &&
                      !!replay.challenge_ends_at &&
                      new Date(replay.challenge_ends_at).getTime() > Date.now()
                    return (
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <BadgeCheck className="size-3.5 text-secondary" />
                        <span className="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider">
                          {displayPlacement === 1 ? '🥇 1st Place' : displayPlacement === 2 ? '🥈 2nd Place' : displayPlacement === 3 ? '🥉 3rd Place' : `#${displayPlacement} Place`}
                        </span>
                        {isProvisional && (
                          <span
                            className="text-[9px] text-on-surface-variant font-label normal-case"
                            title="Official standings finalize when the challenge closes."
                          >· provisional</span>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Score bars — C1: /10 scale, explicit label */}
              <div className="space-y-4 mb-6">
                {scoreCategories.map((cat) => {
                  const val = avgScore(cat.key)
                  const pct = (val / 10) * 100
                  return (
                    <div key={cat.key}>
                      <div className="flex justify-between text-[11px] font-label mb-1">
                        <span className="text-on-surface-variant">{cat.label}</span>
                        <span>{val.toFixed(1)}<span className="text-outline text-[9px]">/10</span></span>
                      </div>
                      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Feedback summary */}
              {feedbackSummary && (
                <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeCheck className="size-3.5 text-secondary" />
                    <span className="font-label text-[10px] font-bold text-on-surface">FEEDBACK SUMMARY</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed italic">
                    &ldquo;{feedbackSummary}&rdquo;
                  </p>
                </div>
              )}

              {/* Red flags */}
              {judgeScores.some((s) => s.red_flags.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {judgeScores.flatMap((s) => s.red_flags).map((flag, i) => (
                    <span key={i} className="rounded bg-error-container/20 px-2 py-0.5 text-xs text-error">
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Per-Judge Breakdown */}
            {judgeScores.length > 0 && (
              <section className="bg-surface-container-low p-6 rounded-xl">
                <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
                  <BadgeCheck className="size-[16px] text-primary" />
                  Judge Breakdown
                  <span className="ml-auto text-[10px] font-label text-outline uppercase tracking-wider">{judgeScores.length} judges</span>
                </h3>
                <div className="space-y-4">
                  {judgeScores.map((judge, idx) => (
                    <div key={judge.id ?? idx} className="rounded-lg border border-outline-variant/15 bg-surface-container-lowest p-4">
                      {/* Judge header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                            {(judge as any).provider?.charAt(0) ?? judge.judge_type?.charAt(0) ?? String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-[11px] font-label font-bold text-on-surface uppercase tracking-wider">
                            {(judge as any).provider === 'claude' ? 'Claude' : (judge as any).provider === 'gpt4o' ? 'GPT-4o' : (judge as any).provider === 'gemini' ? 'Gemini' : `Judge ${judge.judge_type ?? `#${idx + 1}`}`}
                          </span>
                          {(judge as any).reveal_tx && (
                            <a href={`https://basescan.org/tx/${(judge as any).reveal_tx}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline">⛓ on-chain</a>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold text-primary leading-none">
                            {(judge.overall_score ?? 0).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-outline">/10</span>
                        </div>
                      </div>
                      {/* Score mini-bars */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                        {(['quality_score', 'creativity_score', 'completeness_score', 'practicality_score'] as const).map((key) => (
                          <div key={key}>
                            <div className="flex justify-between text-[10px] font-label mb-0.5">
                              <span className="text-outline capitalize">{key.replace('_score', '')}</span>
                              <span className="text-on-surface-variant">{judge[key] ?? 0}</span>
                            </div>
                            <div className="h-0.5 bg-surface-container-highest rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/70 transition-all"
                                style={{ width: `${((judge[key] ?? 0) / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Feedback */}
                      {judge.feedback && (
                        <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-4 italic border-t border-outline-variant/10 pt-2 mt-2">
                          &ldquo;{judge.feedback}&rdquo;
                        </p>
                      )}
                      {/* Red flags for this judge */}
                      {judge.red_flags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {judge.red_flags.map((flag, fi) => (
                            <span key={fi} className="rounded bg-error-container/20 px-1.5 py-0.5 text-[10px] text-error">
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Timeline / Replay Controls */}
            <section className="bg-surface-container-low p-6 rounded-xl">
              <h3 className="font-headline font-bold text-sm mb-6 flex items-center gap-2">
                <Clock className="size-[18px] text-primary" />
                Execution Timeline
              </h3>

              {events.length > 0 ? (
                <>
                  {/* Timeline steps */}
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/20">
                    {events.map((evt, idx) => {
                      const isActive = idx === currentIndex
                      const isFuture = idx > currentIndex
                      const EvtIcon = safeEventIcon(evt.type)
                      return (
                        <div
                          key={idx}
                          className={cn('flex gap-4 relative cursor-pointer', isFuture && 'opacity-50')}
                          onClick={() => setCurrentIndex(idx)}
                        >
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center z-10 border shrink-0',
                              isActive
                                ? 'bg-primary/20 border-primary/50'
                                : 'bg-surface-container border-outline-variant/30'
                            )}
                          >
                            <EvtIcon className={cn('size-3.5', isActive ? 'text-primary' : safeEventColor(evt.type))} />
                          </div>
                          <div>
                            <p className={cn('text-[11px] font-bold', isActive ? 'text-primary' : 'text-on-surface')}>
                              {evt.title ?? evt.type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-[10px] text-outline font-label">
                              T+{((evt.timestamp ?? 0) / 1000).toFixed(2)}s &bull; {evt.type.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Controls */}
                  <div className="mt-8 pt-6 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-4 items-center">
                        <button
                          className="text-on-surface hover:text-primary transition-colors"
                          onClick={() => setIsPlaying((p) => !p)}
                          aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                        >
                          {isPlaying ? <Pause className="size-6" /> : <Play className="size-6" />}
                        </button>
                        <div className="flex gap-2">
                          {speeds.map((s) => (
                            <button
                              key={s}
                              onClick={() => setSpeed(s)}
                              className={cn(
                                'text-[10px] font-label px-2 py-0.5 rounded transition-colors',
                                speed === s
                                  ? 'text-primary bg-primary/10'
                                  : 'text-outline hover:text-on-surface'
                              )}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] font-label text-outline">
                        {currentTime} / {lastTime}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div
                      className="relative h-1 bg-surface-container-highest rounded-full overflow-hidden cursor-pointer group"
                      onClick={handleProgressClick}
                      role="slider"
                      aria-label="Replay progress"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') handleSeek(Math.min(100, progress + 5))
                        if (e.key === 'ArrowLeft') handleSeek(Math.max(0, progress - 5))
                      }}
                    >
                      <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress}%` }} />
                      <div
                        className="absolute h-3 w-3 bg-on-surface rounded-full -top-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `${progress}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-outline text-sm text-center py-4">No replay timeline available.</p>
              )}
            </section>

            {/* Back to Challenge link */}
            <a
              href={replay.challenge ? `/challenges/${replay.challenge.id}` : '/challenges'}
              className="block w-full text-center py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-bold rounded-lg hover:opacity-90 transition-all text-sm uppercase tracking-wider"
            >
              Back to Challenge
            </a>
          </div>
        </main>

        <Footer />
      </div>
    </PageWithSidebar>
  )
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
