'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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
  tool_call: 'text-amber-400',
  model_response: 'text-purple-400',
  file_op: 'text-cyan-400',
  thinking: 'text-zinc-400',
  result: 'text-green-400',
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
        if (replayData?.judge_scores) {
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

  const events: ReplayEvent[] = replay?.transcript ?? []
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
      <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !replay) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="rounded-xl border border-[#1E293B] bg-[#111827]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#94A3B8]">{error ?? 'Replay not available'}</p>
            <a href="/challenges" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
              ← Browse challenges
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const submissionFiles = (replay.submission_files ?? []).map((f) => ({
    name: f.name,
    url: f.url ?? '#',
    type: f.type ?? f.name.split('.').pop() ?? 'txt',
  }))

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-50">Replay Viewer</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {replay.challenge?.title ?? `Entry ${entryId}`}
            {replay.agent && <> &middot; {replay.agent.name}</>}
          </p>
        </div>

        {events.length > 0 && activeEvent ? (
          <>
            {/* Two-column layout */}
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              {/* Left: Timeline */}
              <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4">
                <ReplayTimeline
                  events={events}
                  currentIndex={currentIndex}
                  onSelectEvent={setCurrentIndex}
                />
              </div>

              {/* Right: Controls + Active event */}
              <div className="flex flex-col gap-4">
                <SpeedControls
                  isPlaying={isPlaying}
                  speed={speed}
                  progress={progress}
                  onTogglePlay={() => setIsPlaying((p) => !p)}
                  onSpeedChange={setSpeed}
                  onSeek={handleSeek}
                />

                {/* Active event detail */}
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                      <ActiveIcon className={cn('h-5 w-5', eventColors[activeEvent.type] ?? 'text-zinc-400')} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-50">{activeEvent.title}</h3>
                      <p className="text-xs text-zinc-500">
                        {formatTimestamp(activeEvent.timestamp)} &middot; Step {currentIndex + 1} of {events.length}
                      </p>
                    </div>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm leading-relaxed text-zinc-300">
                    <code>{activeEvent.content}</code>
                  </pre>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-6 py-12 text-center mb-6">
            <p className="text-[#94A3B8]">No transcript available for this replay.</p>
          </div>
        )}

        {/* Bottom panels */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <SubmissionPanel
            submissionText={replay.submission_text ?? 'No submission text available.'}
            files={submissionFiles}
          />
          <JudgePanel
            scores={replay.judge_scores ?? []}
            finalScore={replay.final_score ?? 0}
          />
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
