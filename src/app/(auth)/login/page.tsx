import Link from 'next/link'
import { Github, ShieldCheck, Zap, Swords } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && !url.includes('placeholder') && url.startsWith('https://'))
}

export const metadata = { title: 'Sign In — Bouts' }

export default function LoginPage() {
  const configured = isSupabaseConfigured()

  return (
    <div className="relative min-h-screen bg-surface text-on-surface font-body flex flex-col overflow-hidden selection:bg-primary/30">
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

      <Header />

      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo + Heading */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center shadow-lg shadow-primary/10 mb-6 group transition-transform hover:scale-105 duration-300">
              <Swords className="size-7 text-on-primary-container" />
            </div>
            <h1 className="font-headline font-extrabold text-3xl tracking-tighter text-on-surface mb-2">
              Sign in to Bouts
            </h1>
            <p className="font-label text-on-surface-variant text-sm tracking-wide uppercase opacity-70">
              Precision Tier Authentication
            </p>
          </div>

          {!configured ? (
            <div className="bg-surface-container-low rounded-xl p-8 text-center">
              <p className="text-on-surface-variant text-sm mb-4">
                Authentication is not configured for this environment.
              </p>
              <Link href="/" className="text-primary text-sm hover:text-primary-fixed transition-colors">
                ← Back to home
              </Link>
            </div>
          ) : (
            <div className="bg-surface-container-low p-8 rounded-xl shadow-2xl relative overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container opacity-50" />

              <div className="space-y-6">
                {/* GitHub OAuth — primary */}
                <a
                  href="/api/auth/github"
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-headline font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] group"
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  <span className="text-lg">Sign in with GitHub</span>
                </a>

                {/* Divider */}
                <div className="relative py-4">
                  <div aria-hidden="true" className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant/15" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-widest font-label">
                    <span className="bg-surface-container-low px-4 text-on-surface-variant">
                      System Gateway
                    </span>
                  </div>
                </div>

                {/* Email/Password form — submits to Supabase Auth */}
                <form action="/api/auth/qa-login" method="POST" className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 ml-1"
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
                      className="w-full bg-surface-container-lowest border-none focus:ring-0 focus:border-b-2 focus:border-primary text-on-surface placeholder:text-outline-variant/50 rounded-lg p-3 text-sm transition-all font-body"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 ml-1"
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
                      className="w-full bg-surface-container-lowest border-none focus:ring-0 focus:border-b-2 focus:border-primary text-on-surface placeholder:text-outline-variant/50 rounded-lg p-3 text-sm transition-all font-body"
                    />
                  </div>
                  <input type="hidden" name="redirect" value="/agents" />
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-headline font-bold rounded-lg transition-transform active:scale-95 shadow-lg shadow-primary/10"
                  >
                    Authorize Session
                  </button>
                </form>
              </div>

              {/* New to the Arena */}
              <div className="mt-8 pt-6 border-t border-outline-variant/15 flex flex-col items-center gap-2">
                <p className="text-xs text-on-surface-variant font-body">New to the Arena?</p>
                <Link
                  href="/challenges"
                  className="text-sm font-headline font-semibold text-primary hover:text-primary-fixed transition-colors"
                >
                  Request Access Protocol
                </Link>
              </div>
            </div>
          )}

          {/* Security badges */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low/40 p-3 rounded-lg flex items-center gap-3">
              <ShieldCheck className="size-4 text-secondary" />
              <span className="font-label text-[10px] uppercase tracking-tighter text-on-surface-variant">
                End-to-End Secure
              </span>
            </div>
            <div className="bg-surface-container-low/40 p-3 rounded-lg flex items-center gap-3">
              <Zap className="size-4 text-secondary" />
              <span className="font-label text-[10px] uppercase tracking-tighter text-on-surface-variant">
                Low Latency Auth
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Ambient orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[10%] right-[15%] w-64 h-64 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[10%] w-96 h-96 bg-secondary/5 rounded-full blur-[150px]" />
      </div>
    </div>
  )
}
