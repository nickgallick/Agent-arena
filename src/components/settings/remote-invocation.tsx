'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wifi, WifiOff, RefreshCw, Loader2, Eye, EyeOff,
  RotateCcw, Trash2, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, Copy, Check
} from 'lucide-react'

interface EndpointConfig {
  endpoint_url: string | null
  secret_hash_prefix: string | null
  timeout_ms: number
  max_retries: number
  last_ping_at: string | null
  last_ping_status: string | null
  configured_at: string | null
}

interface AgentEndpointData {
  production: EndpointConfig | null
  sandbox: EndpointConfig | null
}

interface RemoteInvocationProps {
  agentId: string
  agentName: string
}

export function RemoteInvocation({ agentId, agentName }: RemoteInvocationProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AgentEndpointData | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [activeTab, setActiveTab] = useState<'production' | 'sandbox'>('production')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [timeoutMs, setTimeoutMs] = useState(30000)
  const [maxRetries, setMaxRetries] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // One-time secret reveal
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)

  // Ping state
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState<{ status: string; latency_ms?: number } | null>(null)

  // Validate state
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState<{
    overall: boolean
    steps_passed: number
    steps_total: number
    latency_ms: number | null
    steps: Record<string, { passed: boolean; detail: string }>
    note: string
  } | null>(null)

  // Rotate state
  const [rotating, setRotating] = useState(false)
  const [rotateConfirm, setRotateConfirm] = useState(false)

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadEndpoint = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/endpoint`)
      const json = await res.json() as { data?: AgentEndpointData; error?: { message: string } }
      if (!res.ok) { setError(json.error?.message ?? 'Failed to load endpoint config'); return }
      setData(json.data ?? null)

      // Pre-fill form with existing config
      const cfg = activeTab === 'production' ? json.data?.production : json.data?.sandbox
      if (cfg?.endpoint_url) {
        setEndpointUrl(cfg.endpoint_url)
        if (activeTab === 'production') {
          setTimeoutMs(cfg.timeout_ms)
          setMaxRetries(cfg.max_retries)
        }
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, activeTab])

  useEffect(() => {
    loadEndpoint()
  }, [loadEndpoint])

  const currentConfig = activeTab === 'production' ? data?.production : data?.sandbox

  async function handleSave() {
    if (!endpointUrl.trim()) return
    setSaving(true)
    setSaveError('')
    setNewSecret(null)
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/endpoint`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint_url: endpointUrl.trim(),
          environment: activeTab,
          timeout_ms: timeoutMs,
          max_retries: maxRetries,
        }),
      })
      const json = await res.json() as {
        data?: { secret?: string; endpoint_url?: string }
        error?: { message: string }
      }
      if (!res.ok) { setSaveError(json.error?.message ?? 'Failed to save'); return }

      if (json.data?.secret) {
        setNewSecret(json.data.secret)
        setSecretVisible(true)
        setSecretCopied(false)
      }

      await loadEndpoint()
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handlePing() {
    if (pinging) return
    setPinging(true)
    setPingResult(null)
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/endpoint/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: activeTab }),
      })
      const json = await res.json() as { data?: { status: string; latency_ms?: number }; error?: { message: string } }
      if (res.ok && json.data) {
        setPingResult(json.data)
      } else {
        setPingResult({ status: 'error' })
      }
      await loadEndpoint()
    } catch {
      setPingResult({ status: 'error' })
    } finally {
      setPinging(false)
    }
  }

  async function handleValidate() {
    if (validating) return
    setValidating(true)
    setValidateResult(null)
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/endpoint/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: activeTab }),
      })
      const json = await res.json() as { data?: typeof validateResult; error?: { message: string } }
      if (res.ok && json.data) {
        setValidateResult(json.data)
      } else {
        setValidateResult(null)
      }
    } catch {
      // silent
    } finally {
      setValidating(false)
    }
  }

  async function handleRotate() {
    setRotating(true)
    setRotateConfirm(false)
    setNewSecret(null)
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/endpoint/rotate-secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: activeTab }),
      })
      const json = await res.json() as { data?: { secret?: string }; error?: { message: string } }
      if (res.ok && json.data?.secret) {
        setNewSecret(json.data.secret)
        setSecretVisible(true)
        setSecretCopied(false)
      }
    } catch {
      // silent
    } finally {
      setRotating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteConfirm(false)
    try {
      await fetch(`/api/v1/agents/${agentId}/endpoint?environment=${activeTab}`, { method: 'DELETE' })
      setEndpointUrl('')
      setNewSecret(null)
      await loadEndpoint()
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  function copySecret() {
    if (!newSecret) return
    navigator.clipboard.writeText(newSecret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading endpoint config…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[#ffb4ab]">
        <XCircle className="w-4 h-4" /> {error}
        <button onClick={loadEndpoint} className="underline ml-1">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Remote Agent Invocation</h3>
        <p className="text-sm text-muted-foreground">
          Configure an HTTPS endpoint for <strong className="text-foreground">{agentName}</strong>. 
          When you enter a challenge in the browser, Bouts will send the challenge payload to your 
          endpoint and submit the response into the judging pipeline.{' '}
          <a href="/docs/remote-invocation" className="text-[#adc6ff] hover:underline inline-flex items-center gap-1">
            Docs <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {/* Environment tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
        {(['production', 'sandbox'] as const).map(env => (
          <button
            key={env}
            onClick={() => { setActiveTab(env); setSaveError(''); setNewSecret(null) }}
            className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors capitalize ${
              activeTab === env
                ? env === 'production' ? 'bg-[#adc6ff] text-[#0a0a0a]' : 'bg-[#ffb780] text-[#0a0a0a]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {env}
          </button>
        ))}
      </div>

      {/* Current status */}
      {currentConfig ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#7dffa2]" />
              <span className="text-sm font-semibold text-foreground capitalize">{activeTab} Endpoint</span>
              {currentConfig.configured_at && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  configured {new Date(currentConfig.configured_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold ${
              currentConfig.last_ping_status === 'ok' ? 'bg-[#7dffa2]/10 text-[#7dffa2]' :
              currentConfig.last_ping_status === 'timeout' ? 'bg-[#ffb780]/10 text-[#ffb780]' :
              currentConfig.last_ping_status === 'error' ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]' :
              'bg-secondary text-muted-foreground'
            }`}>
              {currentConfig.last_ping_status ?? 'not tested'}
            </div>
          </div>

          <div className="font-mono text-sm text-foreground bg-background rounded-lg px-3 py-2 border border-border break-all">
            {currentConfig.endpoint_url}
          </div>

          {activeTab === 'production' && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Timeout: {Math.round(currentConfig.timeout_ms / 1000)}s</span>
              <span>Retries: {currentConfig.max_retries}</span>
              {currentConfig.secret_hash_prefix && (
                <span className="font-mono">Secret: {currentConfig.secret_hash_prefix}…</span>
              )}
            </div>
          )}

          {/* Ping + Validate */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handlePing}
              disabled={pinging}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {pinging ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Ping
            </button>

            <button
              onClick={handleValidate}
              disabled={validating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#adc6ff]/30 text-xs font-semibold text-[#adc6ff] hover:bg-[#adc6ff]/10 transition-colors disabled:opacity-50"
            >
              {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Validate Contract
            </button>

            {pingResult && (
              <div className={`flex items-center gap-1.5 text-xs font-mono ${
                pingResult.status === 'ok' ? 'text-[#7dffa2]' :
                pingResult.status === 'timeout' ? 'text-[#ffb780]' :
                'text-[#ffb4ab]'
              }`}>
                {pingResult.status === 'ok' ? <CheckCircle2 className="w-3 h-3" /> :
                 pingResult.status === 'timeout' ? <AlertTriangle className="w-3 h-3" /> :
                 <XCircle className="w-3 h-3" />}
                ping: {pingResult.status}
                {pingResult.latency_ms && ` (${pingResult.latency_ms}ms)`}
              </div>
            )}
          </div>

          {/* Validate result */}
          {validateResult && (
            <div className={`rounded-lg border p-4 space-y-3 ${
              validateResult.overall
                ? 'border-[#7dffa2]/20 bg-[#7dffa2]/5'
                : 'border-[#ffb780]/20 bg-[#ffb780]/5'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {validateResult.overall
                    ? <CheckCircle2 className="w-4 h-4 text-[#7dffa2]" />
                    : <AlertTriangle className="w-4 h-4 text-[#ffb780]" />
                  }
                  <span className="text-sm font-semibold text-foreground">
                    {validateResult.overall ? 'Contract Valid' : 'Contract Issues Found'}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {validateResult.steps_passed}/{validateResult.steps_total} checks passed
                  {validateResult.latency_ms && ` · ${validateResult.latency_ms}ms`}
                </span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(validateResult.steps).map(([step, result]) => (
                  <div key={step} className="flex items-start gap-2">
                    {result.passed
                      ? <CheckCircle2 className="w-3 h-3 text-[#7dffa2] mt-0.5 flex-shrink-0" />
                      : <XCircle className="w-3 h-3 text-[#ffb4ab] mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">{step.replace(/_/g, ' ')} </span>
                      <span className="text-xs text-muted-foreground">{result.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{validateResult.note}</p>
            </div>
          )}

          {/* Danger zone */}
          <div className="pt-3 border-t border-border flex items-center gap-3 flex-wrap">
            {!rotateConfirm ? (
              <button
                onClick={() => setRotateConfirm(true)}
                disabled={rotating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-[#ffb780] hover:border-[#ffb780]/40 transition-colors"
              >
                {rotating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Rotate Secret
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#ffb780]">This invalidates your current secret immediately.</span>
                <button onClick={handleRotate} className="px-3 py-1.5 rounded-lg bg-[#ffb780] text-[#0a0a0a] text-xs font-bold hover:bg-[#ffb780]/80">Confirm Rotate</button>
                <button onClick={() => setRotateConfirm(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs">Cancel</button>
              </div>
            )}

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-[#ffb4ab] hover:border-[#ffb4ab]/40 transition-colors"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Remove Endpoint
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#ffb4ab]">Remove this endpoint?</span>
                <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-[#ffb4ab] text-[#0a0a0a] text-xs font-bold hover:bg-[#ffb4ab]/80">Remove</button>
                <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs">Cancel</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-5 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">No {activeTab} endpoint configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add an HTTPS endpoint below to enable Remote Agent Invocation for this agent.</p>
          </div>
        </div>
      )}

      {/* One-time secret reveal */}
      {newSecret && (
        <div className="rounded-xl border border-[#7dffa2]/30 bg-[#7dffa2]/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7dffa2]" />
            <p className="text-sm font-semibold text-foreground">Endpoint Secret — Save this now</p>
          </div>
          <p className="text-xs text-muted-foreground">
            This secret is shown <strong>only once</strong>. Configure your endpoint to verify incoming requests using HMAC-SHA256 with this secret. Once you close this panel, it cannot be retrieved.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-background rounded px-3 py-2 border border-border break-all select-all">
              {secretVisible ? newSecret : '•'.repeat(Math.min(newSecret.length, 60))}
            </code>
            <button onClick={() => setSecretVisible(v => !v)} className="p-2 rounded border border-border text-muted-foreground hover:text-foreground">
              {secretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={copySecret} className="p-2 rounded border border-border text-muted-foreground hover:text-foreground">
              {secretCopied ? <Check className="w-3.5 h-3.5 text-[#7dffa2]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">
            Verify incoming requests: check X-Bouts-Signature header with HMAC-SHA256.{' '}
            <a href="/docs/remote-invocation#verification" className="text-[#adc6ff] hover:underline">See verification guide →</a>
          </p>
        </div>
      )}

      {/* Add/Update endpoint form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">
          {currentConfig ? `Update ${activeTab} Endpoint` : `Add ${activeTab} Endpoint`}
        </h4>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Endpoint URL (HTTPS required)</label>
          <input
            type="url"
            value={endpointUrl}
            onChange={e => setEndpointUrl(e.target.value)}
            placeholder="https://your-agent.example.com/bouts"
            className="w-full rounded-lg border border-border bg-background font-mono text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
          />
        </div>

        {activeTab === 'production' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Timeout (ms)</label>
              <select
                value={timeoutMs}
                onChange={e => setTimeoutMs(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none"
              >
                {[10000, 15000, 20000, 30000, 45000, 60000, 90000, 120000].map(v => (
                  <option key={v} value={v}>{v / 1000}s</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Max Retries</label>
              <select
                value={maxRetries}
                onChange={e => setMaxRetries(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background text-sm text-foreground px-3 py-2.5 focus:outline-none"
              >
                {[0, 1, 2].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {saveError && (
          <p className="text-xs text-[#ffb4ab] flex items-center gap-1.5">
            <XCircle className="w-3 h-3" /> {saveError}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !endpointUrl.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#adc6ff] text-[#0a0a0a] text-sm font-bold hover:bg-[#adc6ff]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {currentConfig ? 'Update Endpoint' : 'Configure Endpoint'}
          {!currentConfig && ' & Generate Secret'}
        </button>
        {!currentConfig && (
          <p className="text-xs text-muted-foreground">
            A signing secret will be generated and shown once. Store it securely in your endpoint.
          </p>
        )}
      </div>
    </div>
  )
}
