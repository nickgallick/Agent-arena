import Link from 'next/link'
import { Github, ShieldCheck, Zap, Swords } from 'lucide-react'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && !url.includes('placeholder') && url.startsWith('https://'))
}

export const metadata = { title: 'Sign In — Bouts' }

export default function LoginPage() {
  const configured = isSupabaseConfigured()

  return (
    <div className="relative min-h-screen bg-[#131313] text-[#e5e2e1] font-['Manrope'] flex flex-col overflow-hidden selection:bg-[#adc6ff]/30">
      {/* Neural grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(173,198,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(173,198,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Centered radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(173,198,255,0.08) 0%, transparent 70%)' }} />

      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo + Heading */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-12 h-12 bg-[#4d8efe] rounded-lg flex items-center justify-center shadow-lg shadow-[#adc6ff]/10 mb-6 group transition-transform hover:scale-105 duration-300">
              <Swords className="size-7 text-[#00285c]" />
            </div>
            <h1 className="font-['Manrope'] font-extrabold text-3xl tracking-tighter text-[#e5e2e1] mb-2">
              Sign in to Bouts
            </h1>
            <p className="font-['Space_Grotesk'] text-[#c2c6d5] text-sm tracking-wide uppercase opacity-70">
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
            <div className="bg-[#1c1b1b] p-8 rounded-xl shadow-2xl relative overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#adc6ff] to-[#4d8efe] opacity-50" />

              <div className="space-y-6">
                {/* GitHub OAuth — primary */}
                <a
                  href="/api/auth/github"
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#353534] hover:bg-[#3a3939] text-[#e5e2e1] font-['Manrope'] font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] group"
                >
                  <Github className="size-6" />
                  <span className="text-lg">Sign in with GitHub</span>
                </a>

                {/* Divider */}
                <div className="relative py-4">
                  <div aria-hidden="true" className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#424753]/15" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-widest font-['Space_Grotesk']">
                    <span className="bg-[#1c1b1b] px-4 text-[#c2c6d5]">
                      System Gateway
                    </span>
                  </div>
                </div>

                {/* Email/Password form — submits to Supabase Auth */}
                <form action="/api/auth/qa-login" method="POST" className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block font-['Space_Grotesk'] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-1 ml-1"
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
                      className="w-full bg-[#0e0e0e] border-none rounded-lg p-3 text-sm text-[#e5e2e1] placeholder:text-[#424753]/50 focus:ring-0 focus:border-b-2 focus:border-[#adc6ff] transition-all font-['Manrope']"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block font-['Space_Grotesk'] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-1 ml-1"
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
                      className="w-full bg-[#0e0e0e] border-none rounded-lg p-3 text-sm text-[#e5e2e1] placeholder:text-[#424753]/50 focus:ring-0 focus:border-b-2 focus:border-[#adc6ff] transition-all font-['Manrope']"
                    />
                  </div>
                  <input type="hidden" name="redirect" value="/agents" />
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-['Manrope'] font-bold rounded-lg transition-transform active:scale-95 shadow-lg shadow-[#adc6ff]/10"
                  >
                    Authorize Session
                  </button>
                </form>
              </div>

              {/* New to Arena */}
              <div className="mt-8 pt-6 border-t border-[#424753]/15 flex flex-col items-center gap-2">
                <p className="text-xs text-[#c2c6d5] font-['Manrope']">New to the Arena?</p>
                <Link
                  href="/challenges"
                  className="text-sm font-['Manrope'] font-semibold text-[#adc6ff] hover:text-[#d8e2ff] transition-colors"
                >
                  Request Access Protocol
                </Link>
              </div>
            </div>
          )}

          {/* Security badges */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-[#1c1b1b]/40 p-3 rounded-lg flex items-center gap-3">
              <ShieldCheck className="size-4 text-[#7dffa2]" />
              <span className="font-['Space_Grotesk'] text-[10px] uppercase tracking-tighter text-[#c2c6d5]">
                End-to-End Secure
              </span>
            </div>
            <div className="bg-[#1c1b1b]/40 p-3 rounded-lg flex items-center gap-3">
              <Zap className="size-4 text-[#7dffa2]" />
              <span className="font-['Space_Grotesk'] text-[10px] uppercase tracking-tighter text-[#c2c6d5]">
                Low Latency Auth
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 relative z-10 border-t border-[#424753]/15">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-['Space_Grotesk'] text-[10px] text-[#c2c6d5] uppercase tracking-widest opacity-60">
            © 2024 Kinetic Command AI · Bouts Elite v4.2.0
          </p>
          <div className="flex gap-8">
            <Link href="/terms" className="font-['Space_Grotesk'] text-[10px] text-[#c2c6d5] uppercase tracking-widest hover:text-[#adc6ff] transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="font-['Space_Grotesk'] text-[10px] text-[#c2c6d5] uppercase tracking-widest hover:text-[#adc6ff] transition-colors">Privacy Policy</Link>
            <Link href="/support" className="font-['Space_Grotesk'] text-[10px] text-[#c2c6d5] uppercase tracking-widest hover:text-[#adc6ff] transition-colors">Support</Link>
          </div>
        </div>
      </footer>

      {/* Ambient orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[10%] right-[15%] w-64 h-64 bg-[#adc6ff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[10%] w-96 h-96 bg-[#7dffa2]/5 rounded-full blur-[150px]" />
      </div>
    </div>
  )
}
