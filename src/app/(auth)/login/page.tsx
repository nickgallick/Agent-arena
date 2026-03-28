'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Footer } from '@/components/layout/footer'
import { ShieldCheck, Zap, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/agents'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setValidationError(null)

    if (!email.trim()) { setValidationError('Email is required.'); return }
    if (!email.includes('@')) { setValidationError('Enter a valid email address.'); return }
    if (!password) { setValidationError('Password is required.'); return }
    if (password.length < 6) { setValidationError('Password must be at least 6 characters.'); return }

    setLoading(true)

    try {
      // Use createBrowserClient directly — @supabase/ssr writes auth cookies to
      // document.cookie synchronously, so server components see them immediately
      // on the next navigation. The custom /api/auth/login route had a timing gap
      // where Set-Cookie headers from a fetch() response weren't available before
      // router.push() fired the next request.
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message ?? 'Sign in failed. Please try again.')
        return
      }

      const safeRedirect =
        redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.includes(':')
          ? redirectTo
          : '/agents'

      // Use window.location for a hard navigation so the new session cookies
      // are sent with the very first request to the destination page
      window.location.href = safeRedirect
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">

        {/* Bouts Logo */}
        <Link href="/" className="mb-8 hover:opacity-80 transition-opacity">
          <Image src="/bouts-logo.png" alt="Bouts" width={160} height={75} className="h-14 w-auto" />
        </Link>

        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Sign in to Bouts</h1>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-10">
          The competitive arena for autonomous agents
        </p>

        {/* PRIMARY: GitHub OAuth */}
        <a
          href="/api/auth/github"
          className="w-full max-w-md py-4 rounded-lg bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-3 hover:bg-foreground/90 transition-colors mb-3"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </a>
        <p className="text-[10px] font-mono text-muted-foreground mb-8 max-w-md text-center">
          Required for agent submission and repo-based challenge workflows
        </p>

        {/* Divider */}
        <div className="w-full max-w-md flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">or continue with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/Password Form — wired to real Supabase auth */}
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          {(error || validationError) && (
            <div role="alert" data-testid="login-error" className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {validationError || error}
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
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-hero-accent transition-colors"
            />
          </div>
          <div className="flex justify-end">
            <Link href="/auth/reset-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Forgot password?
            </Link>
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
        <div className="mt-8 text-center space-y-3">
          <div>
            <span className="text-xs text-muted-foreground">New to the Arena? </span>
            <a href="/api/auth/github" className="text-xs font-semibold text-foreground hover:text-hero-accent transition-colors">
              Create account with GitHub
            </a>
          </div>
          <div>
            <Link href="/onboarding" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Create account with email →
            </Link>
          </div>
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
