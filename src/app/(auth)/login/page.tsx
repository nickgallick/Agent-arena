import Link from 'next/link'
import { Github } from 'lucide-react'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && !url.includes('placeholder') && url.startsWith('https://'))
}

export const metadata = { title: 'Sign In — Bouts' }

export default function LoginPage() {
  const configured = isSupabaseConfigured()

  return (
    <div className="relative min-h-screen bg-[#131313] technical-grid flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-[10%] right-[15%] w-64 h-64 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(173,198,255,0.05)' }} />
      <div className="fixed bottom-[20%] left-[10%] w-96 h-96 rounded-full blur-[150px] pointer-events-none" style={{ background: 'rgba(125,255,162,0.05)' }} />

      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-extrabold tracking-tighter text-[#e5e2e1] font-[family-name:var(--font-heading)] hover:text-[#adc6ff] transition-colors">
          Bouts
        </Link>
        <h1 className="font-[family-name:var(--font-heading)] font-extrabold text-3xl tracking-tighter text-[#e5e2e1] mt-4 mb-1">
          Sign in to Bouts
        </h1>
        <p className="font-[family-name:var(--font-mono)] text-[#c2c6d5] text-xs tracking-widest uppercase opacity-70">
          Precision Tier Authentication
        </p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm">
        <div className="bg-[#1c1b1b] rounded-xl shadow-2xl relative overflow-hidden p-8">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#adc6ff] to-[#4d8efe] opacity-60" />

          {!configured ? (
            <div className="text-center py-4">
              <p className="text-[#c2c6d5] text-sm mb-4">
                Authentication is not configured for this environment.
              </p>
              <Link href="/" className="text-[#adc6ff] text-sm hover:text-[#adc6ff]">
                ← Back to home
              </Link>
            </div>
          ) : (
            <>
              {/* GitHub OAuth — primary auth */}
              <a href="/api/auth/github" className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#353534] hover:bg-[#3a3939] text-[#e5e2e1] font-[family-name:var(--font-heading)] font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] group">
                <Github className="size-5 shrink-0" />
                <span className="text-base">Sign in with GitHub</span>
              </a>

              {/* Divider */}
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#424753]/15" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#1c1b1b] px-4 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#c2c6d5]">
                    System Gateway
                  </span>
                </div>
              </div>

              {/* Security badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#201f1f] p-3 rounded-lg flex items-center gap-2">
                  <div className="size-5 text-[#7dffa2] font-bold text-xs flex items-center justify-center">✓</div>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-tighter text-[#c2c6d5]">End-to-End Secure</span>
                </div>
                <div className="bg-[#201f1f] p-3 rounded-lg flex items-center gap-2">
                  <div className="size-5 text-[#7dffa2] font-bold text-xs flex items-center justify-center">⚡</div>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-tighter text-[#c2c6d5]">Low Latency Auth</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#424753]/15 text-center">
                <p className="text-xs text-[#c2c6d5] mb-2">New to the Arena?</p>
                <Link href="/challenges" className="text-sm font-[family-name:var(--font-heading)] font-semibold text-[#adc6ff] hover:text-[#d8e2ff] transition-colors">
                  Browse Challenges First →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest text-center">
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-[#adc6ff] transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-[#adc6ff] transition-colors">Privacy</Link>
          <Link href="/fair-play" className="hover:text-[#adc6ff] transition-colors">Fair Play</Link>
        </div>
      </div>
    </div>
  )
}
