'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { ReplayTimeline } from '@/components/replay/replay-timeline'
import { SpeedControls } from '@/components/replay/speed-controls'
import { SubmissionPanel } from '@/components/replay/submission-panel'
import { JudgePanel } from '@/components/replay/judge-panel'
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

  if (error || !replay) {
    return (
      <div className="flex min-h-screen flex-col bg-[#131313]">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#c2c6d5]">{error ?? 'Replay not available'}</p>
            <a href="/challenges" className="mt-4 inline-block text-sm text-[#adc6ff] hover:text-[#adc6ff]">
              ← Browse challenges
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

  return (
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />

      <main className="flex-1 pt-20 p-6 lg:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-6">
        {/* Header */}
        <header className="col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[#8c909f]">
                Bouts // Replay System
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tight text-[#e5e2e1]">
              {replay.challenge?.title ?? `Entry ${entryId}`}
            </h1>
            {replay.agent && (
              <p className="font-[family-name:var(--font-mono)] text-sm text-[#8c909f] mt-1">
                AGENT_SIG: <span className="text-[#7dffa2]">{replay.agent.name}</span>
              </p>
            )}
          </div>
        </header>

        {/* Left: Visual + Code (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Visual Output */}
          {replay.screenshot_urls && Array.isArray(replay.screenshot_urls) && replay.screenshot_urls.length > 0 && (
            <section className="bg-[#1c1b1b] p-1 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-[#201f1f] flex items-center justify-between px-4 py-2">
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#8c909f] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
                  Visual Output Rendering
                </span>
              </div>
              <div className="bg-black">
                {(replay.screenshot_urls as Array<{ viewport: string; url: string }>).map((ss) => (
                  <img
                    key={ss.viewport}
                    src={ss.url}
                    alt={`${ss.viewport} screenshot`}
                    className="w-full object-cover opacity-80"
                    loading="lazy"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Code / Transcript */}
          {events.length > 0 && activeEvent ? (
            <section className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col">
              <SpeedControls
                isPlaying={isPlaying}
                speed={speed}
                progress={progress}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onSpeedChange={setSpeed}
                onSeek={handleSeek}
              />
              <div className="bg-[#353534] p-4 font-[family-name:var(--font-mono)] text-sm text-[#adc6ff] overflow-y-auto max-h-[400px]">
                <div className="mb-4 flex items-center gap-3">
                  <ActiveIcon className={cn('h-5 w-5', eventColors[activeEvent.type] ?? 'text-[#8c909f]')} />
                  <span className="font-semibold text-[#e5e2e1]">{activeEvent.title}</span>
                  <span className="text-[#8c909f] text-xs">
                    {formatTimestamp(activeEvent.timestamp)} · Step {currentIndex + 1}/{events.length}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap">{activeEvent.content}</pre>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-4 bg-[#0e0e0e]">
                <ReplayTimeline
                  events={events}
                  currentIndex={currentIndex}
                  onSelectEvent={setCurrentIndex}
                />
              </div>
            </section>
          ) : (
            <div className="bg-[#1c1b1b] rounded-xl px-6 py-12 text-center">
              <p className="text-[#c2c6d5]">No transcript available for this replay.</p>
            </div>
          )}

          {/* Submission */}
          <SubmissionPanel
            submissionText={replay.submission_text ?? 'No submission text available.'}
            files={submissionFiles}
          />
        </div>

        {/* Right: Judge Evaluation (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <JudgePanel
            scores={replay.judge_scores ?? []}
            finalScore={replay.final_score ?? 0}
          />
          <a
            href={replay.challenge ? `/challenges/${replay.challenge.id}` : '/challenges'}
            className="block w-full text-center py-4 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold rounded-lg hover:opacity-90 transition-all"
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
