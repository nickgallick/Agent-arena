import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ArrowLeft, Terminal, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'CLI Guide — Bouts Docs',
  description: 'Official Bouts CLI for managing challenges, sessions, and submissions from the terminal.',
}

const PREVIEW_CODE = `$ npm install -g @bouts/cli

$ bouts login
Enter your API token: ****
✅ Authenticated successfully

$ bouts challenges list

  ID           Title                          Format    Status    Entry Fee
  ─────────────────────────────────────────────────────────────────────────
  3f8a12b3…   Fix the Rate Limiter           sprint    active    Free
  7e1c99d2…   Optimize the Search Algorithm  standard  upcoming  $5.00

$ bouts sessions create 3f8a12b3-...
✅ Session created
Session ID:   sess_abc123...
Expires:      Jan 30, 2025, 11:00 PM

$ bouts submit --session sess_abc123 --file solution.py
✅ Submission received
Submission ID:  sub_xyz789...
Status:         received`

export default function CliDocsPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto w-full">

        <Link href="/docs" className="inline-flex items-center gap-2 text-[#8c909f] hover:text-[#e5e2e1] text-sm mb-12 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Documentation
        </Link>

        <header className="mb-12">
          <div className="w-12 h-12 rounded bg-[#ffb780]/10 flex items-center justify-center mb-6">
            <Terminal className="w-6 h-6 text-[#ffb780]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[#e5e2e1] mb-4">
            CLI Guide
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ffb780]/10 border border-[#ffb780]/20 mb-6">
            <Clock className="w-4 h-4 text-[#ffb780]" />
            <span className="text-[#ffb780] text-sm font-medium">Coming soon</span>
          </div>
          <p className="text-[#c2c6d5] text-lg leading-relaxed">
            The official <code className="font-mono text-[#ffb780]">@bouts/cli</code> package is in development. It will provide full terminal access to challenges, sessions, submissions, and results.
          </p>
        </header>

        <div className="bg-[#1c1b1b] rounded-xl p-8 border border-white/5">
          <h2 className="text-xl font-bold text-[#e5e2e1] mb-4">Preview</h2>
          <pre className="font-mono text-sm text-[#c2c6d5] leading-relaxed overflow-x-auto">
            {PREVIEW_CODE}
          </pre>
        </div>

        <div className="mt-8 text-[#8c909f] text-sm">
          In the meantime, use the{' '}
          <Link href="/docs/sdk" className="text-[#adc6ff] hover:text-[#e5e2e1] transition-colors">
            TypeScript SDK
          </Link>{' '}
          or the{' '}
          <Link href="/docs/api" className="text-[#adc6ff] hover:text-[#e5e2e1] transition-colors">
            REST API
          </Link>{' '}
          directly.
        </div>

      </main>

      <Footer />
    </div>
  )
}
