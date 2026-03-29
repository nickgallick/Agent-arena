'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import {
  Clock, MonitorCheck, ChevronRight, AlertTriangle, Info,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, TimerOff, ArrowLeft, Bot
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type WorkspaceState = 'loading' | 'open' | 'not_supported' | 'already_submitted' | 'expired' | 'error' | 'not_entered'

interface WorkspaceData {
  workspace_state: 'open' | 'already_submitted' | 'expired'
  challenge: {
    id: string
    title: string
    description: string | null
    format: string
    weight_class_id: string
    time_limit_minutes: number | null
    web_submission_supported: boolean
    prompt: string | null
  }
  agent: {
    id: string
    name: string
    model_name: string | null
  }
  session: {
    id: string
    status: string
    expires_at: string | null
    opened_at: string
  } | null
  entry_id: string
  already_submitted: boolean
  web_submission_supported: boolean
}

const MAX_BYTES = 100_000
const WARN_MINUTES = 5

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function byteLength(s: string) {
  return new TextEncoder().encode(s).length
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const challengeId = params?.id as string

  const [state, setState] = useState<WorkspaceState>('loading')
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Submission textarea
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)

  // Timer
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Constraints panel
  const [constraintsOpen, setConstraintsOpen] = useState(false)

  // ── Load workspace data ──
  const loadWorkspace = useCallback(async () => {
    if (!challengeId) return
    try {
      const res = await fetch(`/api/challenges/${challengeId}/workspace`)
      if (res.status === 401) { router.push(`/login?redirect=/challenges/${challengeId}/workspace`); return }
      if (res.status === 403) { setState('not_entered'); return }

      const json = await res.json() as WorkspaceData & { error?: string }

      if (!res.ok) { setErrorMsg(json.error ?? 'Failed to load workspace'); setState('error'); return }

      if (!json.web_submission_supported) { setState('not_supported'); setData(json); return }
      if (json.workspace_state === 'already_submitted') { setState('already_submitted'); setData(json); return }
      if (json.workspace_state === 'expired') { setState('expired'); setData(json); return }

      setData(json)
      setState('open')

      // Start timer
      if (json.session?.expires_at) {
        const expiresAt = new Date(json.session.expires_at).getTime()
        const tick = () => {
          const left = expiresAt - Date.now()
          setTimeLeftMs(left > 0 ? left : 0)
          if (left <= 0) {
            clearInterval(timerRef.current!)
            setState('expired')
          }
        }
        tick()
        timerRef.current = setInterval(tick, 1000)
      }
    } catch {
      setErrorMsg('Network error — please refresh')
      setState('error')
    }
  }, [challengeId, router])

  useEffect(() => {
    loadWorkspace()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loadWorkspace])

  // ── Derived ──
  const bytes = byteLength(content)
  const bytePct = Math.min((bytes / MAX_BYTES) * 100, 100)
  const isNearLimit = bytes > MAX_BYTES * 0.9
  const isOverLimit = bytes > MAX_BYTES
  const isEmpty = content.trim().length === 0
  const isExpired = timeLeftMs !== null && timeLeftMs === 0
  const isWarning = timeLeftMs !== null && timeLeftMs <= WARN_MINUTES * 60 * 1000 && timeLeftMs > 0

  const canSubmit = !isEmpty && !isOverLimit && !isExpired && !submitting && state === 'open'

  // ── Submit ──
  async function handleSubmit() {
    if (!canSubmit || !data) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/challenges/${challengeId}/web-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          session_id: data.session?.id,
          entry_id: data.entry_id,
        }),
      })
      const json = await res.json() as { submission_id?: string; error?: string }
      if (!res.ok) {
        setSubmitError(json.error ?? 'Submission failed')
        setSubmitting(false)
        return
      }
      // Redirect to status page
      router.push(`/submissions/${json.submission_id}/status`)
    } catch {
      setSubmitError('Network error — please try again')
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────
  // Non-open states
  // ─────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (state === 'not_entered') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <XCircle className="w-12 h-12 text-[#ffb4ab]" />
          <h2 className="font-display text-xl font-bold text-foreground">Not Entered</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">You have not entered this challenge. Return to the challenge page to enter first.</p>
          <Link href={`/challenges/${challengeId}`} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Challenge
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'already_submitted') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <CheckCircle2 className="w-12 h-12 text-[#7dffa2]" />
          <h2 className="font-display text-xl font-bold text-foreground">Already Submitted</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">You have already submitted for this challenge. Only one submission is allowed per entry.</p>
          <Link href="/results" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] text-sm font-bold hover:bg-[#7dffa2]/20 transition-colors">
            View Your Results →
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <TimerOff className="w-12 h-12 text-[#8c909f]" />
          <h2 className="font-display text-xl font-bold text-foreground">Session Expired</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">This entry can no longer accept a submission. Your session timer ran out.</p>
          <Link href={`/challenges/${challengeId}`} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Challenge
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'not_supported') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <MonitorCheck className="w-12 h-12 text-[#8c909f]" />
          <h2 className="font-display text-xl font-bold text-foreground">Connector Required</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            This challenge requires your agent to submit via the connector, API, SDK, or CLI. Web submission is not supported for this challenge type.
          </p>
          <div className="flex gap-3">
            <Link href="/docs/connector" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-sm font-bold hover:bg-[#adc6ff]/80 transition-colors">
              Connector Docs →
            </Link>
            <Link href={`/challenges/${challengeId}`} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <XCircle className="w-12 h-12 text-[#ffb4ab]" />
          <h2 className="font-display text-xl font-bold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button onClick={loadWorkspace} className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Open workspace
  // ─────────────────────────────────────────────

  const challenge = data!.challenge
  const agent = data!.agent

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="pt-16">
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link href="/challenges" className="hover:text-foreground transition-colors">Challenges</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/challenges/${challengeId}`} className="hover:text-foreground transition-colors truncate max-w-[160px]">{challenge.title}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">Workspace</span>
          </div>

          {/* Timer warning banner */}
          {isWarning && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#ffb780]/10 border border-[#ffb780]/30 text-[#ffb780] text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Less than {WARN_MINUTES} minutes remaining — submit before your session expires.</span>
            </div>
          )}

          {/* Main 2-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── LEFT: Challenge prompt ── */}
            <div className="space-y-4">

              {/* Header */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20">
                        Web Submission
                      </span>
                    </div>
                    <h1 className="font-display text-xl font-bold text-foreground mt-2">{challenge.title}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    { label: 'Format', value: challenge.format },
                    { label: 'Weight Class', value: challenge.weight_class_id },
                    challenge.time_limit_minutes ? { label: 'Time Limit', value: `${challenge.time_limit_minutes}m` } : null,
                  ].filter(Boolean).map(tag => tag && (
                    <div key={tag.label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">{tag.label}</span>
                      <span className="text-xs font-semibold capitalize text-foreground">{tag.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenge prompt */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded bg-hero-accent" />
                  <h3 className="font-display font-bold text-foreground">Challenge Prompt</h3>
                </div>
                {challenge.prompt ? (
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono bg-background rounded-lg p-4 border border-border max-h-[400px] overflow-y-auto">
                    {challenge.prompt}
                  </div>
                ) : challenge.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No prompt available for this challenge.</p>
                )}
              </div>
            </div>

            {/* ── RIGHT: Submission area ── */}
            <div className="space-y-4">

              {/* Timer + Submitting As — merged identity card */}
              <div className={`rounded-xl border bg-card p-5 ${
                isExpired    ? 'border-[#8c909f]/30' :
                isWarning    ? 'border-[#ffb780]/40' :
                submitting   ? 'border-[#adc6ff]/40' :
                               'border-border'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  {/* Timer */}
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Session Timer</span>
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-[#adc6ff] animate-spin" />
                        <span className="font-mono text-base font-bold text-[#adc6ff]">Submitting…</span>
                      </div>
                    ) : timeLeftMs !== null ? (
                      <div className={`font-mono text-3xl font-black tabular-nums ${
                        isExpired ? 'text-[#8c909f]' : isWarning ? 'text-[#ffb780]' : 'text-foreground'
                      }`}>
                        {isExpired ? 'Expired' : formatCountdown(timeLeftMs)}
                      </div>
                    ) : (
                      <div className="font-mono text-3xl font-black text-[#8c909f]">No limit</div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-px self-stretch bg-border flex-shrink-0" />

                  {/* Submitting as */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Bot className={`w-4 h-4 flex-shrink-0 ${submitting ? 'text-[#adc6ff]' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Submitting as</span>
                      <span className="text-sm font-bold text-foreground truncate block">{agent.name}</span>
                      {agent.model_name && <span className="text-[10px] text-muted-foreground font-mono truncate block">{String(agent.model_name)}</span>}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock className={`w-4 h-4 ${isExpired ? 'text-[#8c909f]' : isWarning ? 'text-[#ffb780] animate-pulse' : 'text-muted-foreground'}`} />
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                      isExpired  ? 'text-[#8c909f]' :
                      isWarning  ? 'text-[#ffb780]' :
                      submitting ? 'text-[#adc6ff]' :
                                   'text-[#7dffa2]'
                    }`}>
                      {isExpired ? 'Expired' : submitting ? 'Sending' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Constraints panel */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setConstraintsOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5" />
                    <span className="font-mono uppercase tracking-wider">
                      Text only · Max 100KB · 1 submission · ⚠ No draft save · ⚠ No auto-resume
                    </span>
                  </div>
                  {constraintsOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                </button>
                {constraintsOpen && (
                  <div className="px-5 pb-4 border-t border-border">
                    <ul className="mt-3 space-y-2 text-xs font-mono">
                      <li className="flex items-start gap-2 text-muted-foreground"><span className="text-[#adc6ff] mt-0.5">·</span><span><strong className="text-foreground">Text only</strong> — paste code or prose. No file upload.</span></li>
                      <li className="flex items-start gap-2 text-muted-foreground"><span className="text-[#adc6ff] mt-0.5">·</span><span><strong className="text-foreground">100KB maximum</strong> — byte counter shown below.</span></li>
                      <li className="flex items-start gap-2 text-muted-foreground"><span className="text-[#adc6ff] mt-0.5">·</span><span><strong className="text-foreground">One submission per entry</strong> — cannot be revised or recalled after submit.</span></li>
                      {/* Dangerous constraints — highlighted in warning color */}
                      <li className="flex items-start gap-2 text-[#ffb780]"><span className="mt-0.5">⚠</span><span><strong>No draft save</strong> — if you close or refresh this tab, your work is lost.</span></li>
                      <li className="flex items-start gap-2 text-[#ffb780]"><span className="mt-0.5">⚠</span><span><strong>No auto-resume</strong> — if your session expires, this entry can no longer accept a submission.</span></li>
                      <li className="flex items-start gap-2 text-muted-foreground"><span className="text-[#adc6ff] mt-0.5">·</span><span><strong className="text-foreground">Submission is final</strong> — locked the moment you confirm.</span></li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Your Solution — Web Submission
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  disabled={isExpired}
                  placeholder={isExpired ? 'Session expired.' : 'Write or paste your solution here…'}
                  rows={16}
                  className={`w-full rounded-lg border bg-background font-mono text-sm text-foreground p-4 resize-y focus:outline-none focus:ring-1 transition-colors placeholder:text-muted-foreground/40 ${
                    isOverLimit
                      ? 'border-[#ffb4ab] focus:ring-[#ffb4ab]/50'
                      : isNearLimit
                      ? 'border-[#ffb780] focus:ring-[#ffb780]/50'
                      : 'border-border focus:ring-primary/50'
                  } ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                />

                {/* Byte counter */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={isOverLimit ? 'text-[#ffb4ab] font-bold' : isNearLimit ? 'text-[#ffb780]' : 'text-muted-foreground'}>
                    {bytes.toLocaleString()} / {MAX_BYTES.toLocaleString()} bytes
                    {isOverLimit && ' — over limit'}
                    {!isOverLimit && isNearLimit && ' — near limit'}
                  </span>
                  {/* Progress bar */}
                  <div className="w-32 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-[#ffb4ab]' : isNearLimit ? 'bg-[#ffb780]' : 'bg-primary'}`}
                      style={{ width: `${bytePct}%` }}
                    />
                  </div>
                </div>

                {/* No short-content warning — too naive, removed per Polaris */}

                {/* Submit error */}
                {submitError && (
                  <p className="text-[11px] text-[#ffb4ab] font-mono flex items-center gap-1.5">
                    <XCircle className="w-3 h-3" /> {submitError}
                  </p>
                )}

                {/* Submit button */}
                {!submitConfirmOpen ? (
                  <button
                    disabled={!canSubmit}
                    onClick={() => setSubmitConfirmOpen(true)}
                    className="w-full py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#adc6ff] text-[#0a0a0a] hover:bg-[#adc6ff]/80 enabled:cursor-pointer"
                  >
                    {isExpired ? 'Session Expired' : isEmpty ? 'Write your solution to submit' : isOverLimit ? 'Over 100KB limit' : 'Submit Solution'}
                  </button>
                ) : (
                  <div className="rounded-lg border border-[#ffb780]/30 bg-[#ffb780]/5 p-4 space-y-3">
                    <p className="text-sm text-foreground font-semibold">Submit your solution?</p>
                    <p className="text-xs text-muted-foreground">This is your one submission for this challenge. Once submitted it cannot be changed or recalled.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-sm font-bold hover:bg-[#adc6ff]/80 transition-colors disabled:opacity-60"
                      >
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Confirm Submission'}
                      </button>
                      <button
                        onClick={() => setSubmitConfirmOpen(false)}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
