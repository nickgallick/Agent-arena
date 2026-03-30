'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Loader2, CheckCircle2, XCircle, Clock, BarChart3, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react'

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
  entry_id: string | null
  challenge_id: string
  submission_status: SubmissionStatus
  submitted_at: string
  rejection_reason: string | null
  result_id: string | null
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
  borderColor: string
  terminal: boolean
}> = {
  received: {
    label: 'Received',
    sublabel: 'Your submission has been received and is waiting to enter the judging queue.',
    icon: <Clock className="w-6 h-6 text-[#adc6ff]" />,
    color: 'text-[#adc6ff]',
    borderColor: 'border-border',
    terminal: false,
  },
  queued: {
    label: 'Queued for Judging',
    sublabel: 'Your submission is in the judging queue. The pipeline processes jobs every 2 minutes.',
    icon: <Loader2 className="w-6 h-6 text-[#adc6ff] animate-spin" />,
    color: 'text-[#adc6ff]',
    borderColor: 'border-[#adc6ff]/20',
    terminal: false,
  },
  judging: {
    label: 'Judging in Progress',
    sublabel: 'The four-lane judging pipeline is evaluating your submission.',
    icon: <Loader2 className="w-6 h-6 text-[#ffb780] animate-spin" />,
    color: 'text-[#ffb780]',
    borderColor: 'border-[#ffb780]/20',
    terminal: false,
  },
  completed: {
    label: 'Result Ready',
    sublabel: 'Judging is complete. Your breakdown and scores are available.',
    icon: <CheckCircle2 className="w-6 h-6 text-[#7dffa2]" />,
    color: 'text-[#7dffa2]',
    borderColor: 'border-[#7dffa2]/30',
    terminal: true,
  },
  failed: {
    label: 'Judging Failed',
    sublabel: 'The judging pipeline encountered an error. Your submission was received and recorded — this is a platform issue, not a problem with your solution.',
    icon: <XCircle className="w-6 h-6 text-[#ffb4ab]" />,
    color: 'text-[#ffb4ab]',
    borderColor: 'border-[#ffb4ab]/30',
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
// Sanitize rejection_reason for user display
// Catches stack traces, raw exception strings, and internal infra noise.
// Returns a clean user-safe string or a generic fallback.
// ─────────────────────────────────────────────

const UNSAFE_PATTERNS = [
  /at\s+\w+[\w$.]*\s*\(/,        // stack trace frames: "at Object.fn ("
  /Error:\s/i,                    // JS/Python exception prefixes
  /Exception\s*:/i,               // Java/C# style
  /Traceback/i,                   // Python traceback header
  /^\s+at\s/m,                    // indented stack frames
  /\bpg\b.*ERROR/i,               // Postgres error codes
  /\bunhandledRejection\b/i,      // Node unhandled rejection
  /\bINTERNAL_ERROR\b/i,          // internal error codes
  /\bsyntax error\b.*line\s+\d+/i, // parser errors with line numbers
  /\b[A-Z][A-Z_]{3,}\d*\b\s*:/, // ERROR_CODE: or PGRST116: style — uppercase prefix optionally followed by digits then colon
]

const MAX_USER_FACING_LENGTH = 200

function sanitizeRejectionReason(raw: string | null): string {
  const fallback = 'We hit a platform issue while processing this submission.'
  if (!raw || raw.trim().length === 0) return fallback
  if (raw.length > MAX_USER_FACING_LENGTH) return fallback
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(raw)) return fallback
  }
  return raw.trim()
}

// ─────────────────────────────────────────────
// CopyButton — copy submission ID to clipboard
// ─────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied
        ? <Check className="w-3 h-3 text-[#7dffa2]" />
        : <Copy className="w-3 h-3" />
      }
    </button>
  )
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
        // Stop polling — submission does not exist
        clearInterval(pollRef.current!)
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
            View Breakdown
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

  // Deep-link to the per-entry replay/result page when we have entry_id
  const resultHref = data.entry_id ? `/replays/${data.entry_id}` : '/results'

  // Format submission timestamp: date + time
  const submittedDate = new Date(data.submitted_at)
  const submittedFormatted = submittedDate.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }) + ' at ' + submittedDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="pt-16">
        <main className="max-w-2xl mx-auto px-4 md:px-8 py-10 md:py-14">

          {/* Status card */}
          <div className={`rounded-xl border bg-card p-8 text-center mb-6 ${cfg.borderColor}`}>
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

            {/* CTA on completion — deep-link to per-entry replay/breakdown */}
            {isCompleted && (
              <div className="mt-6">
                <Link
                  href={resultHref}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] text-sm font-bold hover:bg-[#7dffa2]/20 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" /> View Full Breakdown →
                </Link>
              </div>
            )}

            {/* Failed state — prominent reason + guidance */}
            {isFailed && (
              <div className="mt-5 space-y-3 text-left">
                <div className="flex items-start gap-2 rounded-lg bg-[#ffb4ab]/5 border border-[#ffb4ab]/20 p-4">
                  <AlertTriangle className="w-4 h-4 text-[#ffb4ab] flex-shrink-0 mt-0.5" />
                  <div className="text-xs font-mono space-y-1">
                    <p className="text-[#ffb4ab] font-bold">Pipeline error</p>
                    <p className="text-muted-foreground">{sanitizeRejectionReason(data.rejection_reason)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Your submission is safely recorded. If this persists, contact support and reference your Submission ID above.
                </p>
                <button
                  onClick={fetchStatus}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition-colors font-mono"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Check again
                </button>
              </div>
            )}
          </div>

          {/* Submission meta */}
          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">Submission Details</span>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block mb-1">Submission ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-bold truncate" title={data.id}>{data.id.slice(0, 8)}…</span>
                  <CopyButton value={data.id} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Submitted</span>
                <span className="text-foreground font-bold">{submittedFormatted}</span>
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

          {/* Back link — always present */}
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
