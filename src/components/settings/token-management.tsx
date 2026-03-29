'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Key, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertTriangle, Loader2,
  Shield, Clock, Calendar,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiToken {
  id: string
  name: string
  token_prefix: string
  scopes: string[]
  environment: 'production' | 'sandbox'
  last_used_at: string | null
  last_used_access_mode?: string | null
  expires_at: string | null
  created_at: string
}

interface CreatedToken extends ApiToken {
  token: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'challenge:read': 'List and view challenges',
  'challenge:enter': 'Create challenge sessions',
  'submission:create': 'Submit agent solutions',
  'submission:read': 'View submission status',
  'result:read': 'View judging results',
  'leaderboard:read': 'Read leaderboards',
  'agent:write': 'Register and update agents',
  'webhook:manage': 'Manage webhook subscriptions',
}

const ALL_SCOPES = Object.keys(SCOPE_DESCRIPTIONS)

const EXPIRY_OPTIONS = [
  { label: 'Never expires', value: null },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
]

// ── Helper ─────────────────────────────────────────────────────────────────────

async function getJwt(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EnvironmentBadge({ env }: { env: 'production' | 'sandbox' }) {
  if (env === 'sandbox') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
        SANDBOX
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20">
      PRODUCTION
    </span>
  )
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
      } ${className ?? ''}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Token Reveal Modal ─────────────────────────────────────────────────────────

function TokenRevealModal({
  token,
  onConfirm,
}: {
  token: CreatedToken
  onConfirm: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [visible, setVisible] = useState(false)

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="bg-surface-container-low border border-outline-variant/10 max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-on-surface font-headline text-xl">
            Token Created
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-sm font-medium">
              This token will <strong>never be shown again</strong>. Copy it now and store it securely.
            </p>
          </div>

          {/* Token Display */}
          <div className="space-y-2">
            <Label className="text-on-surface-variant text-xs uppercase tracking-widest font-medium">
              Your API Token
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm bg-black/30 border border-outline-variant/20 rounded px-3 py-2 text-on-surface overflow-x-auto">
                {visible ? token.token : '•'.repeat(Math.min(token.token.length, 40))}
              </div>
              <button
                onClick={() => setVisible(!visible)}
                className="p-2 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <CopyButton text={token.token} className="w-full justify-center" />
          </div>

          {/* Token Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="text-on-surface-variant uppercase tracking-widest text-[10px]">Environment</p>
              <EnvironmentBadge env={token.environment} />
            </div>
            <div className="space-y-0.5">
              <p className="text-on-surface-variant uppercase tracking-widest text-[10px]">Expires</p>
              <p className="text-on-surface font-medium">{formatDate(token.expires_at)}</p>
            </div>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
              I have saved this token in a secure location. I understand it cannot be recovered.
            </span>
          </label>

          <Button
            onClick={onConfirm}
            disabled={!confirmed}
            className="w-full bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40"
          >
            I&apos;ve saved this token
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Create Token Modal ──────────────────────────────────────────────────────────

function CreateTokenModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (token: CreatedToken) => void
}) {
  const [name, setName] = useState('')
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('production')
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set())
  const [expiryDays, setExpiryDays] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })
  }

  const broadScopeCount = [...selectedScopes].filter(s =>
    ['agent:write', 'submission:create', 'webhook:manage'].includes(s)
  ).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || selectedScopes.size === 0) return

    setSubmitting(true)
    try {
      const jwt = await getJwt()
      if (!jwt) {
        toast.error('Not authenticated')
        return
      }

      const res = await fetch('/api/v1/auth/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          environment,
          scopes: [...selectedScopes],
          expires_in_days: expiryDays,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create token')
        return
      }

      onCreated(data.data)
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-surface-container-low border border-outline-variant/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-on-surface font-headline text-xl">
            Create API Token
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-on-surface-variant text-xs uppercase tracking-widest">
              Token Name *
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Agent CI Token"
              required
              maxLength={100}
              className="bg-black/20 border-outline-variant/20 text-on-surface"
            />
          </div>

          {/* Environment */}
          <div className="space-y-2">
            <Label className="text-on-surface-variant text-xs uppercase tracking-widest">
              Environment *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {(['production', 'sandbox'] as const).map(env => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    environment === env
                      ? env === 'sandbox'
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : 'border-blue-500/60 bg-blue-500/10'
                      : 'border-outline-variant/20 hover:border-outline-variant/40'
                  }`}
                >
                  <EnvironmentBadge env={env} />
                  <p className="text-on-surface-variant text-xs mt-2">
                    {env === 'sandbox'
                      ? 'For testing — uses sandbox endpoints'
                      : 'For live agent submissions and real data'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Scopes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-on-surface-variant text-xs uppercase tracking-widest">
                Scopes * ({selectedScopes.size} selected)
              </Label>
              {broadScopeCount >= 2 && (
                <span className="flex items-center gap-1 text-amber-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Broad permissions selected
                </span>
              )}
            </div>
            <div className="space-y-2">
              {ALL_SCOPES.map(scope => (
                <label
                  key={scope}
                  className="flex items-start gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.has(scope)}
                    onChange={() => toggleScope(scope)}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface text-sm font-mono font-medium">{scope}</p>
                    <p className="text-on-surface-variant text-xs mt-0.5">{SCOPE_DESCRIPTIONS[scope]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label className="text-on-surface-variant text-xs uppercase tracking-widest">
              Expiry
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPIRY_OPTIONS.map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setExpiryDays(opt.value)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all border ${
                    expiryDays === opt.value
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={submitting || !name.trim() || selectedScopes.size === 0}
              className="flex-1 bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Token
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-outline-variant/20 text-on-surface-variant"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function TokenManagement() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [envFilter, setEnvFilter] = useState<'all' | 'production' | 'sandbox'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    try {
      const jwt = await getJwt()
      if (!jwt) return

      const res = await fetch('/api/v1/auth/tokens', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (!res.ok) {
        toast.error('Failed to load tokens')
        return
      }
      const data = await res.json()
      setTokens(data.data ?? [])
    } catch {
      toast.error('Network error loading tokens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke token "${name}"? This cannot be undone.`)) return

    setRevokingId(id)
    try {
      const jwt = await getJwt()
      if (!jwt) return

      const res = await fetch(`/api/v1/auth/tokens/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to revoke token')
        return
      }

      setTokens(prev => prev.filter(t => t.id !== id))
      toast.success(`Token "${name}" revoked`)
    } catch {
      toast.error('Network error revoking token')
    } finally {
      setRevokingId(null)
    }
  }

  const handleCreated = (token: CreatedToken) => {
    setShowCreate(false)
    setCreatedToken(token)
  }

  const handleRevealConfirm = () => {
    if (createdToken) {
      setTokens(prev => [createdToken, ...prev])
      setCreatedToken(null)
      toast.success('Token created successfully')
    }
  }

  const filteredTokens = tokens.filter(t => {
    if (envFilter === 'all') return true
    return t.environment === envFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline font-bold text-2xl text-on-surface">API Tokens</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage API tokens for programmatic access to Bouts.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-on-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Token
        </Button>
      </div>

      {/* Environment Filter */}
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
        {(['all', 'production', 'sandbox'] as const).map(f => (
          <button
            key={f}
            onClick={() => setEnvFilter(f)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all capitalize ${
              envFilter === f
                ? 'bg-surface-container-highest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Token List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-surface-container rounded-xl border border-outline-variant/5">
          <Key className="w-12 h-12 text-on-surface-variant/30" />
          <div className="text-center">
            <p className="text-on-surface font-medium">No tokens yet</p>
            <p className="text-on-surface-variant text-sm mt-1">
              Create an API token to start using the Bouts API.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-on-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Create your first token
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTokens.map(token => (
            <div
              key={token.id}
              className="bg-surface-container p-5 rounded-xl border border-outline-variant/5 hover:border-outline-variant/10 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-on-surface">{token.name}</span>
                    <EnvironmentBadge env={token.environment} />
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant bg-black/20 px-2 py-1 rounded w-fit">
                    <Key className="w-3 h-3" />
                    {token.token_prefix}••••••••
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {token.scopes.map(scope => (
                      <span
                        key={scope}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created {formatDate(token.created_at)}
                    </span>
                    {token.last_used_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last used {formatDate(token.last_used_at)}
                        {token.last_used_access_mode && (
                          <span className="text-on-surface-variant/60">({token.last_used_access_mode})</span>
                        )}
                      </span>
                    )}
                    {token.expires_at && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Shield className="w-3 h-3" />
                        Expires {formatDate(token.expires_at)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRevoke(token.id, token.name)}
                  disabled={revokingId === token.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-50"
                >
                  {revokingId === token.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateTokenModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {createdToken && (
        <TokenRevealModal token={createdToken} onConfirm={handleRevealConfirm} />
      )}
    </div>
  )
}
