'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Loader2, CheckCircle2, XCircle, Clock, BarChart3 } from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type SubmissionStatus = 'received' | 'queued' | 'judging' | 'completed' | 'failed'

interface SubmissionEvent {
  id: string
  event_type: string
  stage: string | null
  metadata: Record<string, unknown> | null
  error: string | null
  created_at: string
}

interface StatusData {
  id: string
  challenge_id: string
  submission_status: SubmissionStatus
  submitted_at: string
  rejection_reason: string | null
  events: SubmissionEvent[]
}

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000
const MAX_POLLS = 120 // 10 minutes max polling

const STATUS_CONFIG: Record<SubmissionStatus, {
  label: string
  sublabel: string
  icon: React.ReactNode
  color: string
  terminal: boolean
}> = {
  received: {
    label: 'Received',
    sublabel: 'Your submission has been received. Waiting to enter the judging queue.',
    icon: <Clock className="w-6 h-6 text-[#adc6ff]" />,
    color: 'text-[#adc6ff]',
    terminal: false,
  },
  queued: {
    label: 'Queued for Judging',
    sublabel: 'Your submission is in the judging queue. The pipeline processes jobs every 2 minutes.',
    icon: <Loader2 className="w-6 h-6 text-[#adc6ff] animate-spin" />,
    color: 'text-[#adc6ff]',
    terminal: false,
  },
  judging: {
    label: 'Judging in Progress',
    sublabel: 'The four-lane judging pipeline is evaluating your submission.',
    icon: <Loader2 className="w-6 h-6 text-[#ffb780] animate-spin" />,
    color: 'text-[#ffb780]',
    terminal: false,
  },
  completed: {
    label: 'Result Ready',
    sublabel: 'Judging complete. Your breakdown is available.',
    icon: <CheckCircle2 className="w-6 h-6 text-[#7dffa2]" />,
    color: 'text-[#7dffa2]',
    terminal: true,
  },
  failed: {
    label: 'Judging Failed',
    sublabel: 'Something went wrong in the judging pipeline. Your submission was received and recorded.',
    icon: <XCircle className="w-6 h-6 text-[#ffb4ab]" />,
    color: 'text-[#ffb4ab]',
    terminal: true,
  },
}

// Stage labels for event log display
const STAGE_LABELS: Record<string, string> = {
  submission_received:       'Submission received',
  submission_prevalidation:  'Pre-validation',
  objective_evaluation:      'Objective evaluation',
  evidence_package_assembly: 'Evidence assembly',
  lane_judging:              'Lane judging',
  audit_trigger_check:       'Audit check',
  audit_lane_judging:        'Audit lane',
  aggregation:               'Aggregation',
  result_persistence:        'Result recorded',
  breakdown_generation:      'Breakdown generated',
  finalization:              'Finalized',
  queued:                    'Queued',
  failed:                    'Failed',
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function SubmissionStatusPage() {
  const params = useParams()
  const submissionId = params?.id as string

  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!submissionId) return
    try {
      const res = await fetch(`/api/challenge-submissions/${submissionId}`)
      if (res.status === 404) {
        setError('Submission not found.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        // Non-fatal — keep polling
        return
      }
      const json = await res.json() as StatusData
      setData(json)
      setLoading(false)

      // Stop polling when terminal state reached
      const cfg = STATUS_CONFIG[json.submission_status]
      if (cfg?.terminal) {
        clearInterval(pollRef.current!)
      }
    } catch {
      // Network error — keep polling silently
    }
  }, [submissionId])

  useEffect(() => {
    fetchStatus()

    pollRef.current = setInterval(() => {
      setPollCount(c => {
        if (c >= MAX_POLLS) {
          clearInterval(pollRef.current!)
          setTimedOut(true)
          return c
        }
        fetchStatus()
        return c + 1
      })
    }, POLL_INTERVAL_MS)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchStatus])

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <XCircle className="w-12 h-12 text-[#ffb4ab]" />
          <h2 className="font-display text-xl font-bold text-foreground">Submission Not Found</h2>
          <p className="text-sm text-muted-foreground">{error || 'This submission could not be loaded.'}</p>
          <Link href="/results" className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
            View Your Results
          </Link>
        </div>
      </div>
    )
  }

  const status = data.submission_status
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.received
  const isTerminal = cfg.terminal
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="pt-16">
        <main className="max-w-2xl mx-auto px-4 md:px-8 py-10 md:py-14">

          {/* Status card */}
          <div className={`rounded-xl border bg-card p-8 text-center mb-6 ${
            isCompleted ? 'border-[#7dffa2]/30' :
            isFailed    ? 'border-[#ffb4ab]/30' :
            'border-border'
          }`}>
            <div className="flex justify-center mb-4">{cfg.icon}</div>
            <h1 className={`font-display text-2xl font-black mb-2 ${cfg.color}`}>{cfg.label}</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{cfg.sublabel}</p>

            {/* Polling indicator */}
            {!isTerminal && !timedOut && (
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Checking for updates every 5 seconds…
              </div>
            )}

            {timedOut && !isTerminal && (
              <div className="mt-4 text-xs text-[#ffb780] font-mono">
                Still waiting — judging can take several minutes.{' '}
                <button onClick={fetchStatus} className="underline hover:no-underline">Check now</button>
              </div>
            )}

            {/* CTA on completion */}
            {isCompleted && (
              <div className="mt-6">
                <Link
                  href="/results"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] text-sm font-bold hover:bg-[#7dffa2]/20 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" /> View Your Results →
                </Link>
              </div>
            )}

            {/* Failed state */}
            {isFailed && data.rejection_reason && (
              <p className="mt-4 text-xs text-[#ffb4ab] font-mono bg-[#ffb4ab]/5 rounded-lg p-3">
                {data.rejection_reason}
              </p>
            )}
          </div>

          {/* Submission meta */}
          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">Submission Details</span>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block">Submission ID</span>
                <span className="text-foreground font-bold truncate block" title={data.id}>{data.id.slice(0, 8)}…</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Submitted</span>
                <span className="text-foreground font-bold">{new Date(data.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Event log */}
          {data.events && data.events.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">Pipeline Events</span>
              <div className="space-y-2">
                {data.events.map((ev, i) => (
                  <div key={ev.id} className="flex items-start gap-3 text-xs font-mono">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      ev.error ? 'bg-[#ffb4ab]' : i === data.events.length - 1 ? 'bg-[#7dffa2] animate-pulse' : 'bg-[#424753]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground">{STAGE_LABELS[ev.event_type] ?? ev.event_type}</span>
                      {ev.stage && <span className="text-muted-foreground ml-2">· {ev.stage}</span>}
                      {ev.error && <span className="text-[#ffb4ab] ml-2">— {ev.error}</span>}
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">
                      {new Date(ev.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back link — always present, no dead end */}
          <div className="mt-6 text-center">
            <Link href="/results" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
              ← Back to your results
            </Link>
          </div>

        </main>
      </div>
    </div>
  )
}
