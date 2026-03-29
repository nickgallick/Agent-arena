'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Webhook, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertTriangle,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Zap, Clock, XCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebhookSubscription {
  id: string
  url: string
  events: string[]
  secret_prefix: string
  active: boolean
  failure_count: number
  consecutive_failures: number
  last_delivery_at: string | null
  last_failure_at: string | null
  created_at: string
}

interface WebhookDelivery {
  id: string
  delivery_id: string
  event_type: string
  status: string
  attempt_count: number
  response_status: number | null
  last_attempted_at: string | null
  delivered_at: string | null
  error_message: string | null
  created_at: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_EVENTS = [
  'result.finalized',
  'submission.completed',
  'submission.received',
  'submission.queued',
  'submission.failed',
  'challenge.started',
  'challenge.ended',
]

// ── Helper ─────────────────────────────────────────────────────────────────────

async function getJwt(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function truncateUrl(url: string, max = 50): string {
  if (url.length <= max) return url
  return url.slice(0, max) + '…'
}

// ── Health Indicator ─────────────────────────────────────────────────────────

function HealthIndicator({ webhook }: { webhook: WebhookSubscription }) {
  if (!webhook.active || webhook.failure_count >= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
        {webhook.active ? 'Failing' : 'Disabled'}
      </span>
    )
  }
  if (webhook.failure_count >= 1 || webhook.consecutive_failures > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      Healthy
    </span>
  )
}

// ── Delivery Status Badge ──────────────────────────────────────────────────────

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    pending: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  }
  const cls = map[status] ?? 'bg-surface-container text-on-surface-variant border-outline-variant/20'
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cls}`}>
      {status}
    </span>
  )
}

// ── Rotate Secret Modal ─────────────────────────────────────────────────────────

function RotateSecretModal({
  webhookId,
  onClose,
}: {
  webhookId: string
  onClose: () => void
}) {
  const [rotating, setRotating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleRotate = async () => {
    setRotating(true)
    try {
      const jwt = await getJwt()
      if (!jwt) return

      const res = await fetch(`/api/v1/webhooks/${webhookId}/rotate-secret`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to rotate secret')
        onClose()
        return
      }

      setNewSecret(data.data.secret)
    } catch {
      toast.error('Network error rotating secret')
      onClose()
    } finally {
      setRotating(false)
    }
  }

  const handleCopy = async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (newSecret) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          className="bg-surface-container-low border border-outline-variant/10 max-w-lg"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-on-surface font-headline text-xl">New Signing Secret</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300 text-sm font-medium">
                This secret will <strong>never be shown again</strong>. Update your webhook handler immediately.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-on-surface-variant text-xs uppercase tracking-widest">New Secret</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-black/30 border border-outline-variant/20 rounded px-3 py-2 text-on-surface break-all">
                  {newSecret}
                </code>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors w-full justify-center ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Secret'}
              </button>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                I have updated my webhook handler with this new secret.
              </span>
            </label>

            <Button
              onClick={onClose}
              disabled={!confirmed}
              className="w-full bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-surface-container-low border border-outline-variant/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-on-surface font-headline text-xl">Rotate Signing Secret</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">
              Rotating the secret will <strong>invalidate</strong> your current secret immediately.
              Make sure you&apos;re ready to update your webhook handler.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRotate}
              disabled={rotating}
              className="flex-1 bg-primary text-on-primary hover:bg-primary/90"
            >
              {rotating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Rotate Secret
            </Button>
            <Button variant="outline" onClick={onClose} className="border-outline-variant/20 text-on-surface-variant">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Add Webhook Modal ──────────────────────────────────────────────────────────

function AddWebhookModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (webhook: WebhookSubscription) => void
}) {
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event)
      else next.add(event)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || selectedEvents.size === 0 || secret.length < 8) return

    setSubmitting(true)
    try {
      const jwt = await getJwt()
      if (!jwt) {
        toast.error('Not authenticated')
        return
      }

      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          url,
          events: [...selectedEvents],
          secret,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create webhook')
        return
      }

      onCreated({ ...data.data, failure_count: 0, consecutive_failures: 0 })
      toast.success('Webhook created')
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-surface-container-low border border-outline-variant/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-on-surface font-headline text-xl">Add Webhook</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          <div className="space-y-2">
            <Label className="text-on-surface-variant text-xs uppercase tracking-widest">Endpoint URL *</Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/bouts"
              type="url"
              required
              className="bg-black/20 border-outline-variant/20 text-on-surface"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-on-surface-variant text-xs uppercase tracking-widest">
              Events * ({selectedEvents.size} selected)
            </Label>
            <div className="space-y-1.5">
              {VALID_EVENTS.map(event => (
                <label
                  key={event}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(event)}
                    onChange={() => toggleEvent(event)}
                    className="accent-primary"
                  />
                  <span className="font-mono text-sm text-on-surface">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-on-surface-variant text-xs uppercase tracking-widest">
              Signing Secret * (min 8 chars)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={secret}
                onChange={e => setSecret(e.target.value)}
                type={showSecret ? 'text' : 'password'}
                placeholder="Your webhook signing secret"
                minLength={8}
                required
                className="bg-black/20 border-outline-variant/20 text-on-surface flex-1"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="p-2 rounded hover:bg-surface-container text-on-surface-variant transition-colors"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-on-surface-variant text-xs">
              Used to verify webhook payloads. Keep it secure.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={submitting || !url || selectedEvents.size === 0 || secret.length < 8}
              className="flex-1 bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Webhook
            </Button>
            <Button variant="outline" onClick={onClose} className="border-outline-variant/20 text-on-surface-variant">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Deliveries Panel ──────────────────────────────────────────────────────────

function DeliveriesPanel({ webhookId }: { webhookId: string }) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const jwt = await getJwt()
        if (!jwt) return

        const res = await fetch(`/api/v1/webhooks/${webhookId}/deliveries`, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
        if (!res.ok) return
        const data = await res.json()
        setDeliveries(data.data ?? [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchDeliveries()
  }, [webhookId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-on-surface-variant" />
      </div>
    )
  }

  if (deliveries.length === 0) {
    return (
      <div className="py-8 text-center text-on-surface-variant text-sm">
        No deliveries yet
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-3">
      {deliveries.map(d => (
        <div
          key={d.id}
          className={`p-3 rounded-lg text-xs space-y-1.5 border ${
            d.status === 'failed'
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-black/20 border-outline-variant/10'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <DeliveryStatusBadge status={d.status} />
              <span className="font-mono text-on-surface font-medium">{d.event_type}</span>
            </div>
            <span className="text-on-surface-variant font-mono">{d.delivery_id.slice(0, 8)}…</span>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            {d.response_status != null && (
              <span className={d.response_status >= 200 && d.response_status < 300 ? 'text-emerald-400' : 'text-red-400'}>
                HTTP {d.response_status}
              </span>
            )}
            <span>Attempts: {d.attempt_count}</span>
            {d.last_attempted_at && <span>{formatDate(d.last_attempted_at)}</span>}
          </div>
          {d.error_message && (
            <div className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{d.error_message}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function WebhookManagement() {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set())
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)

  const fetchWebhooks = useCallback(async () => {
    try {
      const jwt = await getJwt()
      if (!jwt) return

      const res = await fetch('/api/v1/webhooks', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (!res.ok) {
        toast.error('Failed to load webhooks')
        return
      }
      const data = await res.json()
      setWebhooks(data.data ?? [])
    } catch {
      toast.error('Network error loading webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const jwt = await getJwt()
      if (!jwt) return

      const res = await fetch(`/api/v1/webhooks/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Test failed')
        return
      }

      const result = data.data
      if (result.status === 'delivered') {
        toast.success(`Test delivered — HTTP ${result.response_status}`)
      } else {
        toast.error(`Test failed — HTTP ${result.response_status ?? 'no response'}`)
      }
    } catch {
      toast.error('Network error sending test')
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (id: string, url: string) => {
    if (!confirm(`Delete webhook for ${truncateUrl(url, 40)}? This will disable it permanently.`)) return

    setDeletingId(id)
    try {
      const jwt = await getJwt()
      if (!jwt) return

      const res = await fetch(`/api/v1/webhooks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to delete webhook')
        return
      }

      setWebhooks(prev => prev.filter(w => w.id !== id))
      toast.success('Webhook deleted')
    } catch {
      toast.error('Network error')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleDeliveries = (id: string) => {
    setExpandedDeliveries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline font-bold text-2xl text-on-surface">Webhooks</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Receive real-time events from Bouts via webhooks.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-primary text-on-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Webhook List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-surface-container rounded-xl border border-outline-variant/5">
          <Webhook className="w-12 h-12 text-on-surface-variant/30" />
          <div className="text-center">
            <p className="text-on-surface font-medium">No webhooks yet</p>
            <p className="text-on-surface-variant text-sm mt-1">
              Add a webhook to receive event notifications from Bouts.
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-primary text-on-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add your first webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <div
              key={webhook.id}
              className="bg-surface-container rounded-xl border border-outline-variant/5 overflow-hidden"
            >
              {/* Main row */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className="font-mono text-sm text-on-surface font-medium truncate max-w-xs"
                        title={webhook.url}
                      >
                        {truncateUrl(webhook.url)}
                      </span>
                      <HealthIndicator webhook={webhook} />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map(event => (
                        <span
                          key={event}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {event}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-on-surface-variant flex-wrap">
                      <span className="font-mono">Secret: {webhook.secret_prefix}••••••••</span>
                      {webhook.failure_count > 0 && (
                        <span className="text-red-400">
                          {webhook.failure_count} failure{webhook.failure_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {webhook.last_delivery_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last delivery {formatDate(webhook.last_delivery_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => handleTest(webhook.id)}
                      disabled={testingId === webhook.id || !webhook.active}
                      title={!webhook.active ? 'Webhook is disabled' : 'Send test event'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-40"
                    >
                      {testingId === webhook.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Test
                    </button>

                    <button
                      onClick={() => toggleDeliveries(webhook.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-container-highest text-on-surface-variant border border-outline-variant/20 hover:text-on-surface transition-all"
                    >
                      {expandedDeliveries.has(webhook.id) ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      Deliveries
                    </button>

                    <button
                      onClick={() => setRotatingId(webhook.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Rotate
                    </button>

                    <button
                      onClick={() => handleDelete(webhook.id, webhook.url)}
                      disabled={deletingId === webhook.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    >
                      {deletingId === webhook.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Deliveries Panel (expanded) */}
              {expandedDeliveries.has(webhook.id) && (
                <div className="border-t border-outline-variant/10 px-5 pb-5">
                  <p className="text-on-surface-variant text-xs uppercase tracking-widest mt-4 mb-2 font-medium">
                    Recent Deliveries
                  </p>
                  <DeliveriesPanel webhookId={webhook.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddWebhookModal
          onClose={() => setShowAdd(false)}
          onCreated={webhook => {
            setWebhooks(prev => [webhook, ...prev])
            setShowAdd(false)
          }}
        />
      )}

      {rotatingId && (
        <RotateSecretModal
          webhookId={rotatingId}
          onClose={() => {
            setRotatingId(null)
            fetchWebhooks()
          }}
        />
      )}
    </div>
  )
}
