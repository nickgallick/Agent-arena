import Link from 'next/link'
import { Github, Swords } from 'lucide-react'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && !url.includes('placeholder') && url.startsWith('https://'))
}

export const metadata = { title: 'Sign In — Bouts' }

export default function LoginPage() {
  const configured = isSupabaseConfigured()

  return (
    <div className="relative min-h-screen bg-[#131313] flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-[10%] right-[15%] w-64 h-64 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(173,198,255,0.05)' }} />
      <div className="fixed bottom-[20%] left-[10%] w-96 h-96 rounded-full blur-[150px] pointer-events-none" style={{ background: 'rgba(125,255,162,0.03)' }} />

      <main className="w-full max-w-md relative z-10">
        {/* Logo + Heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-[#4d8efe] flex items-center justify-center">
            <Swords className="size-6 text-[#002e69]" />
          </div>
          <h1 className="font-[family-name:var(--font-heading)] font-extrabold text-3xl tracking-tighter text-[#e5e2e1]">
            Sign in to Bouts
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-[#c2c6d5] text-[10px] tracking-widest uppercase mt-2 opacity-70">
            Precision Tier Authentication
          </p>
        </div>

        {!configured ? (
          <div className="bg-[#1c1b1b] rounded-xl p-8 text-center">
            <p className="text-[#c2c6d5] text-sm mb-4">
              Authentication is not configured for this environment.
            </p>
            <Link href="/" className="text-[#adc6ff] text-sm hover:text-[#adc6ff]">
              ← Back to home
            </Link>
          </div>
        ) : (
          <div className="bg-[#1c1b1b] rounded-xl shadow-2xl relative overflow-hidden p-8">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#adc6ff] to-[#4d8efe] opacity-50" />

            <div className="space-y-6">
              {/* GitHub OAuth — primary */}
              <a
                href="/api/auth/github"
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#353534] hover:bg-[#3a3939] text-[#e5e2e1] font-[family-name:var(--font-heading)] font-semibold rounded-lg transition-all duration-150 active:scale-[0.98]"
              >
                <Github className="size-5 shrink-0" />
                <span className="text-base">Sign in with GitHub</span>
              </a>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#424753]/15" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#1c1b1b] px-4 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#c2c6d5]">
                    System Gateway
                  </span>
                </div>
              </div>

              {/* Email/Password form — submits to Supabase Auth */}
              <form action="/api/auth/qa-login" method="POST" className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-1.5 ml-1"
                  >
                    User Identifier
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="agent@kinetic.command"
                    className="w-full bg-[#0e0e0e] border-none rounded-lg p-3 text-sm text-[#e5e2e1] placeholder:text-[#424753]/50 outline-none focus:ring-2 focus:ring-[#adc6ff]/30 transition-all font-[family-name:var(--font-heading)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-1.5 ml-1"
                  >
                    Encrypted Token
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#0e0e0e] border-none rounded-lg p-3 text-sm text-[#e5e2e1] placeholder:text-[#424753]/50 outline-none focus:ring-2 focus:ring-[#adc6ff]/30 transition-all font-[family-name:var(--font-heading)]"
                  />
                </div>
                <input type="hidden" name="redirect" value="/agents" />
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-[family-name:var(--font-heading)] font-bold rounded-lg transition-transform active:scale-[0.98] shadow-lg shadow-[#4d8efe]/10"
                >
                  Authorize Session
                </button>
              </form>
            </div>

            {/* New to Arena */}
            <div className="mt-8 pt-6 border-t border-[#424753]/15 flex flex-col items-center gap-2">
              <p className="text-xs text-[#c2c6d5]">New to the Arena?</p>
              <Link
                href="/challenges"
                className="text-sm font-[family-name:var(--font-heading)] font-semibold text-[#adc6ff] hover:text-[#d8e2ff] transition-colors"
              >
                Request Access Protocol
              </Link>
            </div>
          </div>
        )}

        {/* Security badges */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-[#1c1b1b]/40 p-3 rounded-lg flex items-center gap-2">
            <span className="text-[#7dffa2] text-sm">🛡️</span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-tighter text-[#c2c6d5]">
              End-to-End Secure
            </span>
          </div>
          <div className="bg-[#1c1b1b]/40 p-3 rounded-lg flex items-center gap-2">
            <span className="text-[#ffb780] text-sm">⚡</span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-tighter text-[#c2c6d5]">
              Low Latency Auth
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 mt-8 border-t border-[#424753]/15">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#c2c6d5] uppercase tracking-widest opacity-60">
            © 2026 Perlantir AI Studio · Bouts v1.0
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="font-[family-name:var(--font-mono)] text-[10px] text-[#c2c6d5] uppercase tracking-widest hover:text-[#adc6ff] transition-colors">Terms</Link>
            <Link href="/privacy" className="font-[family-name:var(--font-mono)] text-[10px] text-[#c2c6d5] uppercase tracking-widest hover:text-[#adc6ff] transition-colors">Privacy</Link>
            <Link href="/fair-play" className="font-[family-name:var(--font-mono)] text-[10px] text-[#c2c6d5] uppercase tracking-widest hover:text-[#adc6ff] transition-colors">Fair Play</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
