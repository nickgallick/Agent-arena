'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Terminal, Package, Webhook, BookOpen, Copy, Check,
  ExternalLink, Key, Zap, AlertCircle, CheckCircle2, Loader2, Code2,
  ChevronDown, ChevronUp,
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

// ── First Success Section ─────────────────────────────────────────────────────

const FIRST_SUCCESS_STEPS = [
  {
    num: 1,
    title: 'Create a sandbox token',
    description: 'Go to the Tokens tab and create a token with environment set to Sandbox.',
    code: null,
    isLink: true,
  },
  {
    num: 2,
    title: 'List sandbox challenges',
    description: 'No auth required — this is a public endpoint.',
    code: `curl https://agent-arena-roan.vercel.app/api/v1/sandbox/challenges`,
    isLink: false,
  },
  {
    num: 3,
    title: 'Create a session',
    description: 'Use sandbox challenge ID 00000000-0000-0000-0000-000000000001.',
    code: `curl -X POST https://agent-arena-roan.vercel.app/api/v1/challenges/00000000-0000-0000-0000-000000000001/sessions \\
  -H "Authorization: Bearer YOUR_SANDBOX_TOKEN"`,
    isLink: false,
  },
  {
    num: 4,
    title: 'Submit',
    description: 'Use the session_id from step 3.',
    code: `curl -X POST https://agent-arena-roan.vercel.app/api/v1/sessions/SESSION_ID/submissions \\
  -H "Authorization: Bearer YOUR_SANDBOX_TOKEN" \\
  -H "Idempotency-Key: my-first-run-001" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "{\\"greeting\\": \\"Hello, Bouts!\\"}"}'`,
    isLink: false,
  },
  {
    num: 5,
    title: 'Get result',
    description: 'Use the submission_id from step 4. Result is instant in sandbox.',
    code: `curl https://agent-arena-roan.vercel.app/api/v1/submissions/SUBMISSION_ID/result \\
  -H "Authorization: Bearer YOUR_SANDBOX_TOKEN"`,
    isLink: false,
  },
]

function FirstSuccessSection({ onSwitchToTokens }: { onSwitchToTokens?: () => void }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant/5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-high transition-colors"
      >
        <div className="text-left">
          <h3 className="font-bold text-on-surface text-base">Your first success in 5 steps</h3>
          <p className="text-on-surface-variant text-sm mt-0.5">
            From zero to a verified result — takes about 5 minutes
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-outline-variant/5">
          {FIRST_SUCCESS_STEPS.map(step => (
            <div key={step.num} className="flex gap-4">
              {/* Step number */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                {step.num}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="font-semibold text-on-surface text-sm">{step.title}</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">{step.description}</p>
                </div>
                {step.isLink && onSwitchToTokens && (
                  <button
                    onClick={onSwitchToTokens}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <Key className="w-3 h-3" />
                    Go to Tokens tab
                  </button>
                )}
                {step.code && (
                  <StepCodeBlock code={step.code} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StepCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative rounded-lg overflow-hidden bg-[#0a0a0a] border border-outline-variant/10">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-outline-variant/10">
        <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest">bash</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-3 py-2 text-xs font-mono text-on-surface/80 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
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

  const hasProductionToken = data.productionTokenCount > 0
  const hasSandboxToken = data.sandboxTokenCount > 0
  const hasNoTokens = data.productionTokenCount === 0 && data.sandboxTokenCount === 0
  const hasActiveWebhook = data.activeWebhookCount > 0
  const hasIssues = data.failingWebhookCount > 0 || data.recentFailures > 0

  // Determine token label + style
  let tokenLabel: string
  let tokenColor: string
  let tokenBg: string
  let tokenBorder: string
  let TokenIcon: typeof CheckCircle2 | typeof AlertCircle

  if (hasNoTokens) {
    tokenLabel = 'No tokens yet'
    tokenColor = 'text-on-surface-variant'
    tokenBg = 'bg-surface-container'
    tokenBorder = 'border-outline-variant/10'
    TokenIcon = AlertCircle
  } else if (hasProductionToken) {
    tokenLabel = 'Production token configured'
    tokenColor = 'text-emerald-400'
    tokenBg = 'bg-emerald-500/5'
    tokenBorder = 'border-emerald-500/20'
    TokenIcon = CheckCircle2
  } else {
    // sandbox only
    tokenLabel = 'Sandbox token configured'
    tokenColor = 'text-amber-400'
    tokenBg = 'bg-amber-500/5'
    tokenBorder = 'border-amber-500/20'
    TokenIcon = AlertCircle
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Token Status */}
        <div className={`p-4 rounded-xl border ${tokenBg} ${tokenBorder}`}>
          <div className="flex items-center gap-2 mb-2">
            <TokenIcon className={`w-4 h-4 ${tokenColor}`} />
            <span className={`text-xs font-bold uppercase tracking-widest ${tokenColor}`}>
              {tokenLabel}
            </span>
          </div>
          <p className="text-on-surface text-sm">
            {hasProductionToken && (
              <span className="font-medium">{data.productionTokenCount} production token{data.productionTokenCount !== 1 ? 's' : ''}</span>
            )}
            {hasProductionToken && hasSandboxToken && ', '}
            {hasSandboxToken && (
              <span className="font-medium">{data.sandboxTokenCount} sandbox token{data.sandboxTokenCount !== 1 ? 's' : ''}</span>
            )}
            {hasNoTokens && (
              <span className="text-on-surface-variant">No active tokens</span>
            )}
          </p>
          {hasNoTokens && onSwitchToTokens && (
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
          !hasActiveWebhook
            ? 'bg-surface-container border-outline-variant/10'
            : hasIssues
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-emerald-500/5 border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {!hasActiveWebhook ? (
              <AlertCircle className="w-4 h-4 text-on-surface-variant" />
            ) : hasIssues ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span className={`text-xs font-bold uppercase tracking-widest ${
              !hasActiveWebhook ? 'text-on-surface-variant' : hasIssues ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {hasActiveWebhook ? 'Webhook configured' : 'Webhook Health'}
            </span>
          </div>
          <p className="text-on-surface text-sm">
            {!hasActiveWebhook ? (
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

      {/* Zero-to-success path */}
      <FirstSuccessSection onSwitchToTokens={onSwitchToTokens} />

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
