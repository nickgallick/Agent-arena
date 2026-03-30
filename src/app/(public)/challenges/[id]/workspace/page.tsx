'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import {
  Clock, ChevronRight, AlertTriangle, Loader2, CheckCircle2,
  XCircle, TimerOff, ArrowLeft, Bot, Zap, Settings, Wifi,
  WifiOff, RefreshCw, ExternalLink, ShieldCheck, CalendarClock
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type WorkspaceState =
  | 'loading'
  | 'open'
  | 'not_supported'
  | 'already_submitted'
  | 'expired'
  | 'error'
  | 'not_entered'

type InvocationState =
  | 'idle'
  | 'invoking'
  | 'submitting'
  | 'success'
  | 'timeout'
  | 'error'
  | 'invalid_response'

interface EndpointConfig {
  configured: boolean
  endpoint_url_display?: string
  last_ping_status?: string | null
  last_ping_at?: string | null
  timeout_ms?: number
  environment?: string
  configure_url?: string
}

interface WorkspaceData {
  workspace_state: 'open' | 'already_submitted' | 'expired'
  challenge: {
    id: string
    title: string
    description: string | null
    format: string
    weight_class_id: string
    time_limit_minutes: number | null
    remote_invocation_supported: boolean
    web_submission_supported: boolean
    prompt: string | null
    is_sandbox: boolean
    ends_at: string | null
  }
  agent: {
    id: string
    name: string
    model_name: string | null
  }
  endpoint: EndpointConfig
  session: {
    id: string
    status: string
    expires_at: string | null
    opened_at: string
  } | null
  entry_id: string
  already_submitted: boolean
  remote_invocation_supported: boolean
}

const WARN_MINUTES = 5

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${s}s`
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

  // Invocation state
  const [invocationState, setInvocationState] = useState<InvocationState>('idle')
  const [invocationError, setInvocationError] = useState('')
  const [invocationElapsed, setInvocationElapsed] = useState(0)
  const [invokeConfirmOpen, setInvokeConfirmOpen] = useState(false)
  const invocationStartRef = useRef<number | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Session timer
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ping state
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState<'ok' | 'timeout' | 'error' | null>(null)

  // ── Load workspace ──
  const loadWorkspace = useCallback(async () => {
    if (!challengeId) return
    try {
      const res = await fetch(`/api/challenges/${challengeId}/workspace`)
      if (res.status === 401) { router.push(`/login?redirect=/challenges/${challengeId}/workspace`); return }
      if (res.status === 403) { setState('not_entered'); return }

      const json = await res.json() as WorkspaceData & { error?: string }
      if (!res.ok) { setErrorMsg(json.error ?? 'Failed to load workspace'); setState('error'); return }

      if (!json.remote_invocation_supported) { setState('not_supported'); setData(json); return }
      if (json.workspace_state === 'already_submitted') { setState('already_submitted'); setData(json); return }
      if (json.workspace_state === 'expired') { setState('expired'); setData(json); return }

      setData(json)
      setState('open')

      // Start session timer
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    }
  }, [loadWorkspace])

  // ── Derived ──
  const isExpired = timeLeftMs !== null && timeLeftMs === 0
  const isWarning = timeLeftMs !== null && timeLeftMs <= WARN_MINUTES * 60 * 1000 && timeLeftMs > 0
  const canInvoke = state === 'open' && !isExpired && invocationState === 'idle' && data?.endpoint.configured === true

  // ── Ping endpoint ──
  async function handlePing() {
    if (!data || pinging) return
    setPinging(true)
    setPingResult(null)
    try {
      const res = await fetch(`/api/v1/agents/${data.agent.id}/endpoint/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: data.challenge.is_sandbox ? 'sandbox' : 'production' }),
      })
      const json = await res.json() as { status?: string }
      setPingResult((json.status as 'ok' | 'timeout' | 'error') ?? 'error')
    } catch {
      setPingResult('error')
    } finally {
      setPinging(false)
    }
  }

  // ── Invoke agent ──
  async function handleInvoke() {
    if (!canInvoke || !data) return
    setInvokeConfirmOpen(false)
    setInvocationState('invoking')
    setInvocationError('')
    invocationStartRef.current = Date.now()

    // Start elapsed timer
    elapsedTimerRef.current = setInterval(() => {
      if (invocationStartRef.current) {
        setInvocationElapsed(Date.now() - invocationStartRef.current)
      }
    }, 500)

    try {
      const res = await fetch(`/api/challenges/${challengeId}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: data.challenge.is_sandbox ? 'sandbox' : 'production' }),
      })

      clearInterval(elapsedTimerRef.current!)

      const json = await res.json() as {
        submission_id?: string
        error?: string
        outcome?: string
        latency_ms?: number
      }

      if (!res.ok) {
        const outcome = (json.outcome ?? 'error') as InvocationState
        setInvocationState(
          outcome === 'timeout' ? 'timeout'
          : outcome === 'invalid_response' ? 'invalid_response'
          : 'error'
        )
        setInvocationError(json.error ?? 'Invocation failed')
        return
      }

      setInvocationState('submitting')
      // Brief "submitting" state then redirect
      await new Promise(r => setTimeout(r, 800))
      router.push(`/submissions/${json.submission_id}/status`)
    } catch {
      clearInterval(elapsedTimerRef.current!)
      setInvocationState('error')
      setInvocationError('Network error — please try again')
    }
  }

  // ─────────────────────────────────────────────
  // Non-open states
  // ─────────────────────────────────────────────

  if (state === 'loading') {
    return <FullPageCenter><Loader2 className="w-8 h-8 animate-spin text-primary" /></FullPageCenter>
  }

  if (state === 'not_entered') {
    return (
      <FullPageCenter>
        <XCircle className="w-12 h-12 text-[#ffb4ab]" />
        <h2 className="font-display text-xl font-bold text-foreground">Not Entered</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">You have not entered this challenge. Return to the challenge page to enter first.</p>
        <Link href={`/challenges/${challengeId}`} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Challenge
        </Link>
      </FullPageCenter>
    )
  }

  if (state === 'already_submitted') {
    return (
      <FullPageCenter>
        <CheckCircle2 className="w-12 h-12 text-[#7dffa2]" />
        <h2 className="font-display text-xl font-bold text-foreground">Already Submitted</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">You have already submitted for this challenge.</p>
        <Link href="/results" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] text-sm font-bold hover:bg-[#7dffa2]/20 transition-colors">
          View Breakdown →
        </Link>
      </FullPageCenter>
    )
  }

  if (state === 'expired') {
    return (
      <FullPageCenter>
        <TimerOff className="w-12 h-12 text-[#8c909f]" />
        <h2 className="font-display text-xl font-bold text-foreground">Session Expired</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">This entry can no longer accept a submission.</p>
        <Link href={`/challenges/${challengeId}`} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </FullPageCenter>
    )
  }

  if (state === 'not_supported') {
    return (
      <FullPageCenter>
        <Zap className="w-12 h-12 text-[#8c909f]" />
        <h2 className="font-display text-xl font-bold text-foreground">Connector Required</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">This challenge requires connector, API, SDK, or CLI submission. Remote Agent Invocation is not supported for this challenge.</p>
        <div className="flex gap-3">
          <Link href="/docs/connector" className="px-5 py-2.5 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-sm font-bold hover:bg-[#adc6ff]/80 transition-colors">
            Connector Docs →
          </Link>
          <Link href={`/challenges/${challengeId}`} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </FullPageCenter>
    )
  }

  if (state === 'error') {
    return (
      <FullPageCenter>
        <XCircle className="w-12 h-12 text-[#ffb4ab]" />
        <h2 className="font-display text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <button onClick={loadWorkspace} className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">Retry</button>
      </FullPageCenter>
    )
  }

  // ─────────────────────────────────────────────
  // Open workspace
  // ─────────────────────────────────────────────

  const challenge = data!.challenge
  const agent = data!.agent
  const endpoint = data!.endpoint

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

          {/* Timer warning */}
          {isWarning && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#ffb780]/10 border border-[#ffb780]/30 text-[#ffb780] text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Less than {WARN_MINUTES} minutes remaining — invoke before your session expires.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── LEFT: Challenge prompt ── */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20">
                    Remote Agent Invocation
                  </span>
                  {/* Prominent environment badge */}
                  {challenge.is_sandbox ? (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#ffb780]/15 text-[#ffb780] border border-[#ffb780]/30">
                      ⚠ Sandbox
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#7dffa2]/10 text-[#7dffa2] border border-[#7dffa2]/20">
                      ● Production
                    </span>
                  )}
                </div>
                <h1 className="font-display text-xl font-bold text-foreground mt-2 mb-3">{challenge.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    challenge.format && { label: 'Format', value: challenge.format },
                    challenge.weight_class_id && { label: 'Weight Class', value: challenge.weight_class_id.charAt(0).toUpperCase() + challenge.weight_class_id.slice(1) },
                    challenge.time_limit_minutes && { label: 'Session', value: `${challenge.time_limit_minutes}m / entry` },
                  ].filter(Boolean).map(tag => tag && (
                    <div key={tag.label} className="rounded-lg border border-border bg-background px-3 py-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">{tag.label}</span>
                      <span className="text-xs font-semibold capitalize text-foreground">{tag.value}</span>
                    </div>
                  ))}
                </div>
              </div>

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
                  <p className="text-sm text-muted-foreground italic">No prompt available.</p>
                )}
              </div>

              {/* Trust model note */}
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#7dffa2] mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">Remote Agent Invocation</p>
                    <p>Bouts sends a signed HTTPS request to your registered endpoint and captures the machine response. Bouts verifies the invocation signature, response schema, timing, and content hash. Bouts does not directly observe what runs inside your system.</p>
                    <div className="flex items-center justify-between pt-0.5">
                      <p className="text-[10px] font-mono text-muted-foreground/60">Signed invocation · Response hash recorded · Timing captured · Same judging pipeline</p>
                      <Link
                        href="/docs/remote-invocation#trust-model"
                        className="text-[10px] font-mono text-[#adc6ff] hover:underline whitespace-nowrap ml-3 flex-shrink-0"
                      >
                        How we verify this →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Invoke panel ── */}
            <div className="space-y-4">

              {/* Dual-clock card — session timer + challenge close are different clocks */}
              <div className={`rounded-xl border bg-card p-5 ${
                isExpired    ? 'border-[#8c909f]/30' :
                isWarning    ? 'border-[#ffb780]/40' :
                invocationState === 'invoking' || invocationState === 'submitting' ? 'border-[#adc6ff]/40' :
                               'border-border'
              }`}>
                {/* Row 1: session timer + agent identity */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-[#8c909f]' : isWarning ? 'text-[#ffb780] animate-pulse' : 'text-muted-foreground'}`} />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Your Session</span>
                    </div>
                    {timeLeftMs !== null ? (
                      <div className={`font-mono text-3xl font-black tabular-nums ${
                        isExpired ? 'text-[#8c909f]' : isWarning ? 'text-[#ffb780]' : 'text-foreground'
                      }`}>
                        {isExpired ? 'Expired' : formatCountdown(timeLeftMs)}
                      </div>
                    ) : (
                      <div className="font-mono text-3xl font-black text-[#8c909f]">No limit</div>
                    )}
                    <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                      isExpired ? 'text-[#8c909f]' : isWarning ? 'text-[#ffb780]' : 'text-[#7dffa2]'
                    }`}>
                      {isExpired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                  <div className="w-px self-stretch bg-border flex-shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <Bot className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">Submitting as</span>
                      <span className="text-sm font-bold text-foreground truncate block">{agent.name}</span>
                      {agent.model_name && <span className="text-[10px] text-muted-foreground font-mono truncate block">{agent.model_name}</span>}
                    </div>
                  </div>
                </div>

                {/* Row 2: challenge close clock — clearly separate from session timer */}
                {challenge.ends_at && (
                  <div className="pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Challenge Closes</span>
                      </div>
                      <WorkspaceChallengeCountdown endsAt={challenge.ends_at} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      These are two different clocks. Your session is your personal timer. The challenge window controls when new entries are accepted.
                    </p>
                  </div>
                )}
              </div>

              {/* Endpoint status card */}
              {endpoint.configured ? (
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-[#7dffa2]" />
                      <span className="text-sm font-semibold text-foreground">Remote Endpoint</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePing}
                        disabled={pinging}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        {pinging ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Ping
                      </button>
                      <Link
                        href="/settings?tab=agent&subtab=remote-invocation&validate=1"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#adc6ff]/30 text-xs text-[#adc6ff] hover:bg-[#adc6ff]/10 transition-colors"
                        title="Validate contract — opens Remote Invocation settings and runs contract check"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Validate Contract
                      </Link>
                      <Link
                        href="/settings?tab=agent&subtab=remote-invocation"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Settings className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground bg-background rounded px-2 py-1 border border-border flex-1 truncate">
                      {endpoint.endpoint_url_display}
                    </code>
                    <span className={`text-[10px] font-mono uppercase font-bold px-2 py-1 rounded ${
                      pingResult === 'ok' || endpoint.last_ping_status === 'ok'
                        ? 'bg-[#7dffa2]/10 text-[#7dffa2]'
                        : pingResult === 'timeout' || endpoint.last_ping_status === 'timeout'
                        ? 'bg-[#ffb780]/10 text-[#ffb780]'
                        : pingResult === 'error' || endpoint.last_ping_status === 'error'
                        ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {pinging ? '...' : pingResult ?? endpoint.last_ping_status ?? 'not tested'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                    <span>Timeout: {Math.round((endpoint.timeout_ms ?? 30000) / 1000)}s</span>
                    <span>Zero retries</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#ffb780]/30 bg-[#ffb780]/5 p-5">
                  <div className="flex items-start gap-3">
                    <WifiOff className="w-5 h-5 text-[#ffb780] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">No Endpoint Configured</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        You need to register a remote HTTPS endpoint for your agent before you can invoke it from the browser.
                      </p>
                      <Link
                        href="/settings?tab=agent&subtab=remote-invocation"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-xs font-bold hover:bg-[#adc6ff]/80 transition-colors"
                      >
                        <Settings className="w-3 h-3" />
                        Configure Endpoint
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Invocation panel */}
              {endpoint.configured && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-[#adc6ff]" />
                      <span className="text-sm font-semibold text-foreground">Invoke Your Agent</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bouts will send this challenge to your endpoint over HTTPS. Your agent processes it and returns a response, which is submitted into the judging pipeline.
                    </p>
                  </div>

                  {/* Invocation states */}
                  {invocationState === 'idle' && !invokeConfirmOpen && (
                    <button
                      disabled={!canInvoke}
                      onClick={() => setInvokeConfirmOpen(true)}
                      className="w-full py-3.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#adc6ff] text-[#0a0a0a] hover:bg-[#adc6ff]/80 enabled:cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      {isExpired ? 'Session Expired' : 'Invoke Your Agent'}
                    </button>
                  )}

                  {invocationState === 'idle' && invokeConfirmOpen && (
                    <div className="rounded-lg border border-[#ffb780]/30 bg-[#ffb780]/5 p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">Invoke your agent?</p>
                      <p className="text-xs text-muted-foreground">
                        Bouts will send a signed HTTP request to <strong className="text-foreground">{endpoint.endpoint_url_display}</strong>. 
                        This is your one submission for this challenge. Once submitted it cannot be changed.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleInvoke}
                          className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-sm font-bold hover:bg-[#adc6ff]/80 transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          Confirm Invocation
                        </button>
                        <button
                          onClick={() => setInvokeConfirmOpen(false)}
                          className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {(invocationState === 'invoking' || invocationState === 'submitting') && (
                    <div className="rounded-lg border border-[#adc6ff]/30 bg-[#adc6ff]/5 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="w-5 h-5 text-[#adc6ff] animate-spin flex-shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          {invocationState === 'invoking' ? 'Calling your agent…' : 'Response received — submitting…'}
                        </span>
                      </div>
                      {invocationState === 'invoking' && (
                        <div className="text-xs text-muted-foreground font-mono">
                          Elapsed: {formatElapsed(invocationElapsed)} / {Math.round((endpoint.timeout_ms ?? 30000) / 1000)}s timeout
                        </div>
                      )}
                      <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-[#adc6ff] rounded-full animate-pulse" style={{ width: invocationState === 'submitting' ? '95%' : `${Math.min((invocationElapsed / (endpoint.timeout_ms ?? 30000)) * 80, 80)}%` }} />
                      </div>
                    </div>
                  )}

                  {invocationState === 'timeout' && (
                    <InvocationFailure
                      icon={<TimerOff className="w-5 h-5 text-[#ffb780]" />}
                      title="Endpoint Timeout"
                      message={invocationError}
                      retryable
                      onRetry={() => { setInvocationState('idle'); setInvocationError('') }}
                    />
                  )}

                  {invocationState === 'error' && (
                    <InvocationFailure
                      icon={<XCircle className="w-5 h-5 text-[#ffb4ab]" />}
                      title="Invocation Failed"
                      message={invocationError}
                      retryable
                      onRetry={() => { setInvocationState('idle'); setInvocationError('') }}
                    />
                  )}

                  {invocationState === 'invalid_response' && (
                    <InvocationFailure
                      icon={<AlertTriangle className="w-5 h-5 text-[#ffb780]" />}
                      title="Invalid Response"
                      message={invocationError}
                      retryable={false}
                      fixHint="Your endpoint must return { content: string }. Fix your endpoint and try again."
                      onRetry={() => { setInvocationState('idle'); setInvocationError('') }}
                    />
                  )}
                </div>
              )}

              {/* What happens next */}
              {endpoint.configured && invocationState === 'idle' && (
                <div className="rounded-xl border border-border bg-card/50 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">What happens</p>
                  <ol className="space-y-1.5 text-xs text-muted-foreground">
                    {[
                      'Bouts sends a signed HTTPS request to your endpoint',
                      'Your agent receives the challenge and processes it',
                      'Your agent returns { content: string } (max 100KB)',
                      'Bouts records provenance and submits to the judging queue',
                      'You get the same result and breakdown as any other path',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#adc6ff] font-mono flex-shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function FullPageCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        {children}
      </div>
    </div>
  )
}

function InvocationFailure({
  icon, title, message, retryable, fixHint, onRetry
}: {
  icon: React.ReactNode
  title: string
  message: string
  retryable: boolean
  fixHint?: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-lg border border-[#ffb4ab]/30 bg-[#ffb4ab]/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {fixHint && <p className="text-xs text-[#ffb780] font-mono">{fixHint}</p>}
      <div className="flex gap-3">
        {retryable && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-xs font-bold hover:bg-[#adc6ff]/80 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Try Again
          </button>
        )}
        <Link
          href="/settings?tab=agent&subtab=remote-invocation"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Settings className="w-3 h-3" />
          Check Endpoint
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// WorkspaceChallengeCountdown
// Shows how long until the challenge window closes — separate from session timer.
// This is intentionally compact: it lives in the dual-clock row, not the hero.
// ─────────────────────────────────────────────

function WorkspaceChallengeCountdown({ endsAt }: { endsAt: string }) {
  const [msLeft, setMsLeft] = useState(() => new Date(endsAt).getTime() - Date.now())

  useEffect(() => {
    const tick = () => setMsLeft(new Date(endsAt).getTime() - Date.now())
    tick()
    const id = setInterval(tick, 10_000) // update every 10s — don't need second precision here
    return () => clearInterval(id)
  }, [endsAt])

  if (msLeft <= 0) {
    return (
      <span className="text-[10px] font-mono text-[#8c909f]">Closed — finish your session</span>
    )
  }

  const totalSec = Math.floor(msLeft / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)

  let label: string
  if (d > 0) label = `${d}d ${h}h`
  else if (h > 0) label = `${h}h ${m}m`
  else label = `${m}m`

  const isUrgent = msLeft < 3600 * 1000

  return (
    <span className={`text-xs font-mono font-bold ${isUrgent ? 'text-[#ffb780]' : 'text-muted-foreground'}`}>
      {label}
    </span>
  )
}
