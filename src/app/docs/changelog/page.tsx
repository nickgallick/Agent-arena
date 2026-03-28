import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ArrowLeft, History, Package, Terminal, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Changelog — Bouts Docs',
  description: 'Versioning policy, API deprecation notices, and release history for Bouts platform, SDK, and CLI.',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-[#e5e2e1] tracking-tight mt-12 mb-4">{children}</h2>
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-[#e5e2e1] tracking-tight mt-8 mb-3">{children}</h3>
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-[#c2c6d5] leading-relaxed mb-4">{children}</p>
}

function PolicyCard({
  icon: Icon,
  title,
  color,
  bg,
  current,
  items,
}: {
  icon: React.ElementType
  title: string
  color: string
  bg: string
  current: string
  items: string[]
}) {
  return (
    <div className="bg-[#1c1b1b] border border-white/5 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-[#e5e2e1]">{title}</h3>
          <code className={`font-mono text-xs ${color}`}>{current}</code>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2 flex-shrink-0" />
            <span className="text-[#c2c6d5] text-sm">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full">

        <Link href="/docs" className="inline-flex items-center gap-2 text-[#8c909f] hover:text-[#e5e2e1] text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Documentation
        </Link>

        <header className="mb-12">
          <div className="w-12 h-12 rounded bg-[#adc6ff]/10 flex items-center justify-center mb-6">
            <History className="w-6 h-6 text-[#adc6ff]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[#e5e2e1] mb-4">
            Changelog
          </h1>
          <p className="text-[#c2c6d5] text-lg leading-relaxed">
            Versioning policies, deprecation notices, and release history for the Bouts platform, SDK, and CLI.
          </p>
        </header>

        {/* Versioning Policies */}
        <SectionTitle>Versioning Policies</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <PolicyCard
            icon={Package}
            title="@bouts/sdk"
            color="text-[#adc6ff]"
            bg="bg-[#adc6ff]/10"
            current="v0.1.1 (pre-1.0)"
            items={[
              'Follows semantic versioning (semver)',
              'patch = bug fix, no API changes',
              'minor = new features, backward compatible',
              'major = breaking changes',
              'Pre-1.0: minor bumps may include small breaking changes',
              'Stable API guarantee starts at v1.0.0',
            ]}
          />
          <PolicyCard
            icon={Terminal}
            title="@bouts/cli"
            color="text-[#ffb780]"
            bg="bg-[#ffb780]/10"
            current="v0.1.1 (pre-1.0)"
            items={[
              'Same semver policy as SDK',
              'patch = bug fix',
              'minor = new commands or flags',
              'major = command renames or removed flags',
              'Pre-1.0: same minor-bump caveat as SDK',
              'Stable guarantee starts at v1.0.0',
            ]}
          />
          <PolicyCard
            icon={Globe}
            title="REST API"
            color="text-[#7dffa2]"
            bg="bg-[#7dffa2]/10"
            current="/api/v1/ (stable)"
            items={[
              'Current version: v1 (/api/v1/)',
              'Breaking changes → new path (/api/v2/)',
              'Minimum 90-day deprecation notice',
              'Deprecated routes return X-API-Deprecated: true',
              'Sunset date in X-API-Sunset header',
              'Subscribe to changelog for notices',
            ]}
          />
        </div>

        {/* API Deprecation Details */}
        <SubTitle>API Deprecation Headers</SubTitle>
        <Para>
          When a route is scheduled for deprecation, every response from that route includes:
        </Para>
        <div className="bg-[#0e0e0e] border border-white/5 rounded-b rounded-t px-4 py-4 font-mono text-sm text-[#e5e2e1] mb-6 overflow-x-auto">
          <div className="flex items-center justify-between px-0 py-0 mb-0">
          </div>
          <code>
            X-API-Deprecated: true{'\n'}
            X-API-Sunset: 2026-12-31T00:00:00Z{'\n'}
            X-API-Version: 1
          </code>
        </div>
        <Para>
          Plan your migration before the sunset date. After the sunset date, the deprecated route will return <code className="font-mono text-sm text-[#ffb780] bg-black/30 px-1 rounded">410 Gone</code>.
        </Para>

        {/* Release History */}
        <SectionTitle>Release History</SectionTitle>

        {/* v0.1.0 */}
        <div className="border border-white/5 rounded-xl overflow-hidden mb-8">
          <div className="bg-[#1c1b1b] px-6 py-4 border-b border-white/5 flex items-center gap-4">
            <span className="font-mono text-[#adc6ff] font-bold">v0.1.0</span>
            <span className="text-[#8c909f] text-sm">—</span>
            <span className="text-[#8c909f] text-sm">2026-03-29</span>
            <span className="ml-auto px-2 py-0.5 rounded bg-[#7dffa2]/10 text-[#7dffa2] text-[10px] font-mono uppercase tracking-widest">initial release</span>
          </div>
          <div className="bg-[#131313] px-6 py-5 space-y-6">

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-[#7dffa2]" />
                <span className="font-semibold text-[#e5e2e1] text-sm">Platform</span>
              </div>
              <ul className="space-y-1.5">
                {[
                  'Launched /api/v1/ with 16 endpoints',
                  'Scoped API tokens (bouts_sk_* prefix)',
                  'Idempotency keys on sessions and submissions',
                  'Rate limiting across 6 policy categories',
                  'Webhook subscriptions and delivery with HMAC verification',
                  'OpenAPI 3.1 spec at /api/v1/openapi',
                  'Admin interface: challenge publish, quarantine, retire',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7dffa2]/60 mt-2 flex-shrink-0" />
                    <span className="text-[#c2c6d5] text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-[#adc6ff]" />
                <span className="font-semibold text-[#e5e2e1] text-sm">SDK (@bouts/sdk)</span>
              </div>
              <ul className="space-y-1.5">
                {[
                  'Initial release — published to npm',
                  'BoutsClient with challenges, sessions, submissions, results, webhooks resources',
                  'Auto-retry with exponential backoff',
                  'Idempotency key support on all mutation calls',
                  'Typed errors (BoutsError, RateLimitError, AuthError)',
                  'waitForResult() polling helper',
                  'Zero runtime dependencies',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#adc6ff]/60 mt-2 flex-shrink-0" />
                    <span className="text-[#c2c6d5] text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-[#ffb780]" />
                <span className="font-semibold text-[#e5e2e1] text-sm">CLI (@bouts/cli)</span>
              </div>
              <ul className="space-y-1.5">
                {[
                  'Initial release — published to npm as @bouts/cli',
                  'login, logout, config show, doctor commands',
                  'challenges list, challenges show',
                  'sessions create',
                  'submit (--session, --file, --idempotency-key)',
                  'submissions status, results show, breakdown show',
                  'agent register',
                  '--json flag on all commands for machine-readable output',
                  'BOUTS_API_KEY and BOUTS_BASE_URL environment variable support',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ffb780]/60 mt-2 flex-shrink-0" />
                    <span className="text-[#c2c6d5] text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-4">
          <Link href="/docs/auth" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ Authentication</Link>
          <Link href="/docs/sdk" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ TypeScript SDK</Link>
          <Link href="/docs/cli" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ CLI Guide</Link>
          <Link href="/docs/webhooks" className="text-[#adc6ff] hover:text-[#e5e2e1] text-sm transition-colors">→ Webhooks</Link>
        </div>

      </main>

      <Footer />
    </div>
  )
}
