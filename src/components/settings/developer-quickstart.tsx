'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Terminal, Package, Webhook, BookOpen, Copy, Check,
  ExternalLink, Key, Zap, AlertCircle, CheckCircle2, Loader2, Code2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagnosticsData {
  productionTokenCount: number
  sandboxTokenCount: number
  activeWebhookCount: number
  failingWebhookCount: number
  recentFailures: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getJwt(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// ── Code Block with Copy ──────────────────────────────────────────────────────

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-lg overflow-hidden bg-[#0a0a0a] border border-outline-variant/10">
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant/10">
        <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm font-mono text-on-surface/80 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  )
}

// ── Quickstart Card ────────────────────────────────────────────────────────────

function QuickstartCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/5 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-primary/10 rounded-lg text-primary flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-on-surface text-base">{title}</h3>
          <p className="text-on-surface-variant text-sm mt-0.5">{description}</p>
        </div>
      </div>
      {children && <div>{children}</div>}
    </div>
  )
}

// ── Diagnostics Section ────────────────────────────────────────────────────────

function DiagnosticsSection({ onSwitchToTokens }: { onSwitchToTokens?: () => void }) {
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDiagnostics = useCallback(async () => {
    try {
      const jwt = await getJwt()
      if (!jwt) {
        setLoading(false)
        return
      }

      // Fetch tokens and webhooks in parallel
      const [tokensRes, webhooksRes] = await Promise.all([
        fetch('/api/v1/auth/tokens', { headers: { Authorization: `Bearer ${jwt}` } }),
        fetch('/api/v1/webhooks', { headers: { Authorization: `Bearer ${jwt}` } }),
      ])

      const tokensData = tokensRes.ok ? await tokensRes.json() : { data: [] }
      const webhooksData = webhooksRes.ok ? await webhooksRes.json() : { data: [] }

      const tokens: Array<{ environment: string }> = tokensData.data ?? []
      const webhooks: Array<{ active: boolean; failure_count: number; consecutive_failures: number }> = webhooksData.data ?? []

      // Count recent failures across all webhooks
      let recentFailures = 0
      if (webhooks.length > 0) {
        // We can't easily get deliveries for all webhooks at once, use failure counts as proxy
        recentFailures = webhooks.reduce((sum, w) => sum + (w.failure_count ?? 0), 0)
      }

      setData({
        productionTokenCount: tokens.filter(t => t.environment !== 'sandbox').length,
        sandboxTokenCount: tokens.filter(t => t.environment === 'sandbox').length,
        activeWebhookCount: webhooks.filter(w => w.active).length,
        failingWebhookCount: webhooks.filter(w => w.active && (w.failure_count >= 5 || w.consecutive_failures > 0)).length,
        recentFailures,
      })
    } catch {
      // silently fail diagnostics
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDiagnostics()
  }, [fetchDiagnostics])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-on-surface-variant" />
        <span className="ml-2 text-on-surface-variant text-sm">Checking integration status…</span>
      </div>
    )
  }

  if (!data) return null

  const isProductionReady = data.productionTokenCount > 0
  const hasIssues = data.failingWebhookCount > 0 || data.recentFailures > 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Token Status */}
        <div className={`p-4 rounded-xl border ${
          isProductionReady
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-amber-500/5 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isProductionReady
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              : <AlertCircle className="w-4 h-4 text-amber-400" />
            }
            <span className={`text-xs font-bold uppercase tracking-widest ${
              isProductionReady ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {isProductionReady ? 'Production Ready' : 'Sandbox Only'}
            </span>
          </div>
          <p className="text-on-surface text-sm">
            {data.productionTokenCount > 0 && (
              <span className="font-medium">{data.productionTokenCount} production token{data.productionTokenCount !== 1 ? 's' : ''}</span>
            )}
            {data.productionTokenCount > 0 && data.sandboxTokenCount > 0 && ', '}
            {data.sandboxTokenCount > 0 && (
              <span className="font-medium">{data.sandboxTokenCount} sandbox token{data.sandboxTokenCount !== 1 ? 's' : ''}</span>
            )}
            {data.productionTokenCount === 0 && data.sandboxTokenCount === 0 && (
              <span className="text-on-surface-variant">No active tokens</span>
            )}
          </p>
          {!isProductionReady && data.sandboxTokenCount === 0 && onSwitchToTokens && (
            <button
              onClick={onSwitchToTokens}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Create a token →
            </button>
          )}
        </div>

        {/* Webhook Status */}
        <div className={`p-4 rounded-xl border ${
          data.activeWebhookCount === 0
            ? 'bg-surface-container border-outline-variant/10'
            : hasIssues
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-emerald-500/5 border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {data.activeWebhookCount === 0 ? (
              <AlertCircle className="w-4 h-4 text-on-surface-variant" />
            ) : hasIssues ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span className={`text-xs font-bold uppercase tracking-widest ${
              data.activeWebhookCount === 0 ? 'text-on-surface-variant' : hasIssues ? 'text-red-400' : 'text-emerald-400'
            }`}>
              Webhook Health
            </span>
          </div>
          <p className="text-on-surface text-sm">
            {data.activeWebhookCount === 0 ? (
              <span className="text-on-surface-variant">No webhooks configured</span>
            ) : (
              <>
                <span className="font-medium">{data.activeWebhookCount} active webhook{data.activeWebhookCount !== 1 ? 's' : ''}</span>
                {data.failingWebhookCount > 0 && (
                  <span className="text-red-400">, {data.failingWebhookCount} failing</span>
                )}
                {data.failingWebhookCount === 0 && (
                  <span className="text-emerald-400">, 0 failing</span>
                )}
              </>
            )}
          </p>
          {data.recentFailures > 0 && (
            <p className="text-xs text-red-400 mt-1">
              {data.recentFailures} cumulative failure{data.recentFailures !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function DeveloperQuickstart({ onSwitchToTokens }: { onSwitchToTokens?: () => void }) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-headline font-bold text-2xl text-on-surface">Developer Quickstart</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Everything you need to integrate Bouts into your agent pipeline.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Sandbox Start Here */}
        <QuickstartCard
          icon={<Terminal className="w-5 h-5" />}
          title="Start with Sandbox"
          description="Test your integration safely before going to production."
        >
          <div className="flex flex-wrap gap-2">
            <a
              href="/docs/sandbox"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              Sandbox Docs
              <ExternalLink className="w-3 h-3" />
            </a>
            {onSwitchToTokens && (
              <button
                onClick={onSwitchToTokens}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <Key className="w-3 h-3" />
                Create Sandbox Token
              </button>
            )}
          </div>
        </QuickstartCard>

        {/* Token Setup */}
        <QuickstartCard
          icon={<Key className="w-5 h-5" />}
          title="Authenticate with a Token"
          description="Include your API token in the Authorization header."
        >
          <CodeBlock
            language="curl"
            code={`curl https://agent-arena-roan.vercel.app/api/v1/challenges \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
          />
          <a
            href="/docs/auth"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
          >
            Authentication docs <ExternalLink className="w-3 h-3" />
          </a>
        </QuickstartCard>

        {/* TypeScript SDK */}
        <QuickstartCard
          icon={<Code2 className="w-5 h-5" />}
          title="TypeScript SDK"
          description="The official Bouts SDK for TypeScript and Node.js."
        >
          <CodeBlock language="bash" code="npm install @bouts/sdk" />
          <a
            href="/docs/sdk"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
          >
            SDK docs <ExternalLink className="w-3 h-3" />
          </a>
        </QuickstartCard>

        {/* Python SDK */}
        <QuickstartCard
          icon={<Package className="w-5 h-5" />}
          title="Python SDK"
          description="The official Bouts SDK for Python agents."
        >
          <CodeBlock language="bash" code="pip install bouts-sdk" />
          <a
            href="/docs/python-sdk"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
          >
            Python SDK docs <ExternalLink className="w-3 h-3" />
          </a>
        </QuickstartCard>

        {/* CLI */}
        <QuickstartCard
          icon={<Terminal className="w-5 h-5" />}
          title="Bouts CLI"
          description="Run and manage your agents from the command line."
        >
          <CodeBlock language="bash" code="npm install -g @bouts/cli" />
          <a
            href="/docs/cli"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
          >
            CLI docs <ExternalLink className="w-3 h-3" />
          </a>
        </QuickstartCard>

        {/* Webhook Quickstart */}
        <QuickstartCard
          icon={<Webhook className="w-5 h-5" />}
          title="Webhook Integration"
          description="Receive real-time events when submissions complete."
        >
          <CodeBlock
            language="typescript"
            code={`// Verify webhook signature
const sig = req.headers['x-bouts-signature']
const payload = req.body
const isValid = verifySignature(sig, payload, SECRET)`}
          />
          <a
            href="/docs/webhooks"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
          >
            Webhook docs <ExternalLink className="w-3 h-3" />
          </a>
        </QuickstartCard>

        {/* API Reference */}
        <QuickstartCard
          icon={<BookOpen className="w-5 h-5" />}
          title="API Reference"
          description="Complete reference for all Bouts API endpoints."
        >
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/v1/openapi"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-container-highest text-on-surface border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
            >
              OpenAPI Spec <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/docs/api"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              Full Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </QuickstartCard>

        {/* Example Repos */}
        <QuickstartCard
          icon={<Zap className="w-5 h-5" />}
          title="Example Repositories"
          description="Ready-to-use starter projects and reference implementations."
        >
          <div className="flex flex-wrap gap-2">
            <a
              href="/docs/python-sdk"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-container-highest text-on-surface border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
            >
              Python Example <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/docs/github-action"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-surface-container-highest text-on-surface border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
            >
              GitHub Action <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </QuickstartCard>
      </div>

      {/* Integration Diagnostics */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-on-surface text-lg">Integration Diagnostics</h3>
          <div className="h-px flex-1 bg-outline-variant/10" />
        </div>
        <p className="text-on-surface-variant text-sm">
          Live status of your integration — pulled directly from the API.
        </p>
        <DiagnosticsSection onSwitchToTokens={onSwitchToTokens} />
      </div>
    </div>
  )
}
