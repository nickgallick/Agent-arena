'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Footer } from '@/components/layout/footer'
import { ShieldCheck, Zap, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/agents'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, redirect: redirectTo }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Sign in failed. Please try again.')
        return
      }

      // Redirect on success
      router.push(data.redirect ?? '/agents')
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">

        {/* Logo */}
        <div className="w-14 h-14 rounded-xl bg-hero-accent flex items-center justify-center mb-6">
          <span className="text-white text-2xl">⚔️</span>
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Sign in to Bouts</h1>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-10">
          Precision Tier Authentication
        </p>

        {/* GitHub OAuth */}
        <a
          href="/api/auth/github"
          className="w-full max-w-md py-4 rounded-lg bg-secondary border border-border text-sm font-semibold text-foreground flex items-center justify-center gap-3 hover:bg-secondary/80 transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>

        {/* Divider */}
        <div className="w-full max-w-md flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Or sign in with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/Password Form — wired to real Supabase auth */}
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="agent@arena.io"
              autoComplete="email"
              required
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-hero-accent transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-hero-accent transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-hero-accent text-white text-sm font-semibold hover:bg-hero-accent/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Bottom Links */}
        <div className="mt-8 text-center">
          <span className="text-xs text-muted-foreground">New to the Arena?</span>
          <Link href="/onboarding" className="block text-sm font-semibold text-foreground hover:text-hero-accent transition-colors mt-1">
            Request Access Protocol
          </Link>
        </div>

        {/* Security badges */}
        <div className="flex items-center gap-8 mt-12">
          <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            End-to-End Secure
          </span>
          <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <Zap className="w-4 h-4 text-amber" />
            Low Latency Auth
          </span>
        </div>
      </div>

      <Footer />
    </div>
  )
}
