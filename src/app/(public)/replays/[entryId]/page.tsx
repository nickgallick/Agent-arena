'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ReplayTimeline } from '@/components/replay/replay-timeline'
import type { ReplayEvent } from '@/components/replay/timeline-node'
import { Wrench, Sparkles, FileCode, Brain, CheckCircle } from 'lucide-react'
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
  tool_call: 'text-[#ffb780]',
  model_response: 'text-purple-400',
  file_op: 'text-cyan-400',
  thinking: 'text-[#8c909f]',
  result: 'text-[#7dffa2]',
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
      <div className="flex min-h-screen flex-col bg-[#131313]">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4d8efe] border-t-transparent" />
        </main>
        <Footer />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error || !replay) {
    return (
      <div className="flex min-h-screen flex-col bg-[#131313]">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#c2c6d5]">{error ?? 'Replay not available'}</p>
            <a href="/challenges" className="mt-4 inline-block text-sm text-[#adc6ff] hover:text-[#adc6ff]">
              &larr; Browse challenges
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const submissionFiles = (Array.isArray(replay.submission_files) ? replay.submission_files : []).map((f) => ({
    name: f.name,
    url: f.url ?? '#',
    type: f.type ?? f.name.split('.').pop() ?? 'txt',
  }))

  // Formatted time for progress display
  const totalSteps = events.length || 1
  const currentTime = formatTimestamp(activeEvent?.timestamp ?? 0)
  const lastTime = formatTimestamp(events[events.length - 1]?.timestamp ?? 0)

  return (
    <div className="flex min-h-screen flex-col bg-[#131313] text-[#e5e2e1] font-['Manrope'] selection:bg-[#adc6ff]/30">
      <Header />

      <main className="mt-16 flex-grow p-6 lg:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-6">
        {/* ── Replay Header Section ── */}
        <header className="col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#c2c6d5]">
                Bouts Elite // Replay System
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#e5e2e1]">
              {replay.challenge?.title ?? `Entry ${entryId}`}
            </h1>
            <p className="font-['JetBrains_Mono'] text-sm text-[#8c909f] mt-1">
              ENTRY_ID: <span className="text-[#adc6ff]">#{entryId}</span>
              {replay.agent && (
                <> &bull; AGENT_SIG: <span className="text-[#7dffa2]">{replay.agent.name}</span></>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-[#2a2a2a] px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-[#353534] transition-colors text-[#e5e2e1]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              EXPORT DATA
            </button>
            <button className="bg-[#2a2a2a] px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-[#353534] transition-colors text-[#e5e2e1]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              LOGS
            </button>
          </div>
        </header>

        {/* ── Left Column: Visual Output & Code ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Visual Output Section */}
          {replay.screenshot_urls && Array.isArray(replay.screenshot_urls) && replay.screenshot_urls.length > 0 && (
            <section className="bg-[#1c1b1b] p-1 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-[#201f1f] flex items-center justify-between px-4 py-2 rounded-t-lg">
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#c2c6d5] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
                  Visual Output Rendering
                </span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#424753]/30" />
                  <div className="w-2 h-2 rounded-full bg-[#424753]/30" />
                  <div className="w-2 h-2 rounded-full bg-[#424753]/30" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-[#1c1b1b] h-[400px]">
                {(replay.screenshot_urls as Array<{ viewport: string; url: string }>).map((ss, i) => (
                  <div
                    key={ss.viewport}
                    className={cn(
                      'relative group overflow-hidden bg-[#0e0e0e]',
                      i === 0 && replay.screenshot_urls!.length > 1 ? 'md:col-span-2' : '',
                      i > 0 ? 'border-l border-[#424753]/10' : ''
                    )}
                  >
                    <img
                      src={ss.url}
                      alt={`${ss.viewport} screenshot`}
                      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131313]/80 to-transparent flex items-end p-4">
                      <span className="bg-[#353534]/60 backdrop-blur px-2 py-1 rounded text-[10px] font-['JetBrains_Mono'] uppercase">
                        {ss.viewport === 'desktop' ? 'DESKTOP_V_1.2' : ss.viewport === 'mobile' ? 'MOBILE_V_1.2' : ss.viewport.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Submission Panel / Code Editor */}
          <section className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col h-[500px]">
            <div className="flex items-center bg-[#201f1f] px-4 py-3 border-b border-[#424753]/10">
              <div className="flex items-center gap-6">
                {submissionFiles.length > 0 ? (
                  submissionFiles.map((f, i) => (
                    <div
                      key={f.name}
                      className={cn(
                        'flex items-center gap-2 pb-2 -mb-3',
                        i === 0
                          ? 'cursor-pointer border-b-2 border-[#adc6ff]'
                          : 'opacity-50 hover:opacity-100 transition-opacity'
                      )}
                    >
                      <FileCode className={cn('h-3.5 w-3.5', i === 0 ? 'text-[#adc6ff]' : 'text-[#c2c6d5]')} />
                      <span className="font-['JetBrains_Mono'] text-[11px] font-bold">{f.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer border-b-2 border-[#adc6ff] pb-2 -mb-3">
                    <FileCode className="h-3.5 w-3.5 text-[#adc6ff]" />
                    <span className="font-['JetBrains_Mono'] text-[11px] font-bold">submission</span>
                  </div>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f]">
                  {replay.challenge?.format?.toUpperCase() ?? 'TEXT'}
                </span>
              </div>
            </div>
            <div className="flex-grow flex overflow-hidden">
              {/* File list left rail */}
              <div className="w-12 bg-[#0e0e0e] flex flex-col items-center py-4 gap-4 border-r border-[#424753]/10 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#adc6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#424753" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#424753" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
              </div>
              {/* Code block */}
              <div className="flex-grow p-6 font-['JetBrains_Mono'] text-[13px] leading-relaxed overflow-y-auto bg-[#0e0e0e]">
                {events.length > 0 && activeEvent ? (
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <ActiveIcon className={cn('h-4 w-4', eventColors[activeEvent.type] ?? 'text-[#8c909f]')} />
                      <span className="font-semibold text-[#e5e2e1] text-sm">{activeEvent.title}</span>
                      <span className="text-[#8c909f] text-xs">
                        {formatTimestamp(activeEvent.timestamp)} &middot; Step {currentIndex + 1}/{events.length}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap text-[#c2c6d5]">{activeEvent.content}</pre>
                  </div>
                ) : replay.submission_text ? (
                  <pre className="whitespace-pre-wrap text-[#c2c6d5]">{replay.submission_text}</pre>
                ) : (
                  <p className="text-[#8c909f]">No submission data available.</p>
                )}
              </div>
            </div>
          </section>

          {/* Replay Timeline (inline, below code when on smaller screens or when events exist) */}
          {events.length > 0 && (
            <section className="bg-[#1c1b1b] rounded-xl p-4 max-h-[300px] overflow-y-auto lg:hidden">
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
          <section className="bg-[#1c1b1b] p-6 rounded-xl border-l-4 border-[#adc6ff]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-['Manrope'] font-extrabold text-xl text-[#e5e2e1]">Judge Evaluation</h3>
                <p className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#8c909f] tracking-tighter mt-1">
                  Validated by AI Oracle V4
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-extrabold text-[#adc6ff] leading-none">
                  {finalScore.toFixed(1)}<span className="text-lg text-[#8c909f]">/10</span>
                </div>
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#7dffa2] uppercase tracking-widest">
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
                    <div className="flex justify-between text-[11px] font-['JetBrains_Mono'] mb-1">
                      <span className="text-[#c2c6d5]">{cat.label}</span>
                      <span className="text-[#e5e2e1]">{val.toFixed(1)}</span>
                    </div>
                    <div className="h-1 bg-[#353534] rounded-full overflow-hidden">
                      <div className="h-full bg-[#adc6ff] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Feedback summary */}
            {feedbackSummary && (
              <div className="bg-[#0e0e0e] p-4 rounded-lg border border-[#424753]/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#7dffa2]" />
                  <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#e5e2e1]">FEEDBACK SUMMARY</span>
                </div>
                <p className="text-xs text-[#c2c6d5] leading-relaxed italic">
                  &ldquo;{feedbackSummary}&rdquo;
                </p>
              </div>
            )}

            {/* Red flags */}
            {judgeScores.some((s) => s.red_flags.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1">
                {judgeScores.flatMap((s) => s.red_flags).map((flag, i) => (
                  <span key={i} className="rounded bg-[#93000a]/20 px-2 py-0.5 text-xs text-[#ffb4ab]">
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Timeline / Replay Controls */}
          <section className="bg-[#1c1b1b] p-6 rounded-xl">
            <h3 className="font-['Manrope'] font-bold text-sm mb-6 flex items-center gap-2 text-[#e5e2e1]">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#adc6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><circle cx="12" cy="12" r="10"/></svg>
              Replay Timeline
            </h3>

            {events.length > 0 ? (
              <>
                {/* Timeline steps */}
                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-[#424753]/20">
                  {events.map((evt, idx) => {
                    const isActive = idx === currentIndex
                    const isPast = idx < currentIndex
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
                              ? 'bg-[#adc6ff]/20 border-[#adc6ff]/50'
                              : 'bg-[#201f1f] border-[#424753]/30'
                          )}
                        >
                          <EvtIcon className={cn('h-3.5 w-3.5', isActive ? 'text-[#adc6ff]' : 'text-[#8c909f]')} />
                        </div>
                        <div>
                          <p className={cn('text-[11px] font-bold', isActive ? 'text-[#adc6ff]' : 'text-[#e5e2e1]')}>
                            {evt.title}
                          </p>
                          <p className="text-[10px] text-[#8c909f] font-['JetBrains_Mono']">
                            T+{(evt.timestamp / 1000).toFixed(2)}s &bull; {evt.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Controls */}
                <div className="mt-8 pt-6 border-t border-[#424753]/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-4 items-center">
                      <button
                        className="text-[#e5e2e1] hover:text-[#adc6ff] transition-colors"
                        onClick={() => setIsPlaying((p) => !p)}
                        aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                      >
                        {isPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        )}
                      </button>
                      <div className="flex gap-2">
                        {speeds.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={cn(
                              'text-[10px] font-["JetBrains_Mono"] px-2 py-0.5 rounded transition-colors',
                              speed === s
                                ? 'text-[#adc6ff] bg-[#adc6ff]/10'
                                : 'text-[#8c909f] hover:text-[#e5e2e1]'
                            )}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f]">
                      {currentTime} / {lastTime}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    className="relative h-1 bg-[#353534] rounded-full overflow-hidden cursor-pointer group"
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
                    <div className="absolute inset-y-0 left-0 bg-[#adc6ff]" style={{ width: `${progress}%` }} />
                    <div
                      className="absolute h-3 w-3 bg-[#e5e2e1] rounded-full -top-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `${progress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[#8c909f] text-sm text-center py-4">No replay timeline available.</p>
            )}
          </section>

          {/* Back to Challenge link */}
          <a
            href={replay.challenge ? `/challenges/${replay.challenge.id}` : '/challenges'}
            className="block w-full text-center py-4 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-bold rounded-lg hover:opacity-90 transition-all text-sm uppercase tracking-wider"
          >
            Back to Challenge
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
