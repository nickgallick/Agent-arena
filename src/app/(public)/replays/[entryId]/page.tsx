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
  Terminal,
  Share2,
  Download,
  FileText,
  Settings2,
  Copy,
  Folder,
  Search,
  GitBranch,
  BadgeCheck,
  Clock,
  Code,
  ClipboardCheck,
  Play,
  Pause,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    quality_score: number
    creativity_score: number
    completeness_score: number
    practicality_score: number
    overall_score: number
    feedback: string
    red_flags: string[]
  }[]
  final_score: number | null
  placement: number | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const eventIcons = {
  tool_call: Wrench,
  model_response: Sparkles,
  file_op: FileCode,
  thinking: Brain,
  result: CheckCircle,
} as const

const eventColors = {
  tool_call: 'text-tertiary',
  model_response: 'text-purple-400',
  file_op: 'text-cyan-400',
  thinking: 'text-outline',
  result: 'text-secondary',
} as const

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

  const rawTranscript = replay?.transcript
  const events: ReplayEvent[] = Array.isArray(rawTranscript) ? rawTranscript : []
  const progress = events.length > 0 ? ((currentIndex + 1) / events.length) * 100 : 0
  const activeEvent = events[currentIndex] ?? null
  const ActiveIcon = activeEvent ? eventIcons[activeEvent.type] ?? Brain : Brain

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
          {/* ── Replay Header Section ── */}
          <header className="col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="size-3.5 text-primary" />
                <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                  Bouts // Replay System
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
                {replay.challenge?.title ?? `Entry ${entryId}`}
              </h1>
              <p className="font-label text-sm text-outline mt-1">
                ENTRY_ID: <span className="text-primary">#{entryId}</span>
                {replay.agent && (
                  <> &bull; AGENT_SIG: <span className="text-secondary">{replay.agent.name}</span></>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="bg-surface-container-high px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-surface-container-highest transition-colors">
                <Share2 className="size-4" /> EXPORT DATA
              </button>
              <button className="bg-surface-container-high px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-surface-container-highest transition-colors">
                <Download className="size-4" /> LOGS
              </button>
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
                    Visual Output Rendering
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
                          {ss.viewport === 'desktop' ? 'DESKTOP_V_1.2' : ss.viewport === 'mobile' ? 'MOBILE_V_1.2' : ss.viewport.toUpperCase()}
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
                        <ActiveIcon className={cn('h-4 w-4', eventColors[activeEvent.type] ?? 'text-outline')} />
                        <span className="font-semibold text-on-surface text-sm">{activeEvent.title}</span>
                        <span className="text-outline text-xs">
                          {formatTimestamp(activeEvent.timestamp)} &middot; Step {currentIndex + 1}/{events.length}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap text-on-surface-variant">{activeEvent.content}</pre>
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
            {/* Judge Scores Panel */}
            <section className="bg-surface-container-low p-6 rounded-xl border-l-4 border-primary">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-headline font-extrabold text-xl">Judge Evaluation</h3>
                  <p className="font-label text-[10px] uppercase text-outline tracking-tighter mt-1">
                    Validated by AI Oracle V4
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-primary leading-none">
                    {finalScore.toFixed(1)}<span className="text-lg text-outline">/10</span>
                  </div>
                  <span className="text-[10px] font-label text-secondary uppercase tracking-widest">
                    {getTierLabel(finalScore)}
                  </span>
                </div>
              </div>

              {/* Score bars */}
              <div className="space-y-4 mb-6">
                {scoreCategories.map((cat) => {
                  const val = avgScore(cat.key)
                  const pct = (val / 10) * 100
                  return (
                    <div key={cat.key}>
                      <div className="flex justify-between text-[11px] font-label mb-1">
                        <span className="text-on-surface-variant">{cat.label}</span>
                        <span>{val.toFixed(1)}</span>
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

            {/* Timeline / Replay Controls */}
            <section className="bg-surface-container-low p-6 rounded-xl">
              <h3 className="font-headline font-bold text-sm mb-6 flex items-center gap-2">
                <Clock className="size-[18px] text-primary" />
                Replay Timeline
              </h3>

              {events.length > 0 ? (
                <>
                  {/* Timeline steps */}
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/20">
                    {events.map((evt, idx) => {
                      const isActive = idx === currentIndex
                      const isFuture = idx > currentIndex
                      const EvtIcon = eventIcons[evt.type] ?? Brain
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
                            <EvtIcon className={cn('size-3.5', isActive ? 'text-primary' : 'text-outline')} />
                          </div>
                          <div>
                            <p className={cn('text-[11px] font-bold', isActive ? 'text-primary' : 'text-on-surface')}>
                              {evt.title}
                            </p>
                            <p className="text-[10px] text-outline font-label">
                              T+{(evt.timestamp / 1000).toFixed(2)}s &bull; {evt.type.replace('_', ' ')}
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
