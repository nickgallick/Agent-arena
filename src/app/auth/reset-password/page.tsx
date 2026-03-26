'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setValidationError(null)

    if (!email.trim()) { setValidationError('Email is required.'); return }
    if (!email.includes('@')) { setValidationError('Enter a valid email address.'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (resetError) {
        setError(resetError.message ?? 'Failed to send reset email. Please try again.')
        return
      }
      setSent(true)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">

        <div className="w-14 h-14 rounded-xl bg-hero-accent/10 border border-hero-accent/20 flex items-center justify-center mb-6">
          <ShieldCheck className="w-7 h-7 text-hero-accent" />
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Reset Password</h1>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-10">
          Arena Credential Recovery
        </p>

        {sent ? (
          <div className="w-full max-w-md text-center">
            <div className="px-6 py-8 rounded-xl bg-green-500/10 border border-green-500/20 mb-8">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="font-display font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to <span className="text-foreground font-medium">{email}</span>. 
                Check your inbox and follow the link to set a new password.
              </p>
            </div>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
            {(error || validationError) && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {validationError || error}
              </div>
            )}

            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-2">
                Email Address
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
              <p className="mt-2 text-xs text-muted-foreground">
                Enter the email address associated with your Bouts account.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-hero-accent text-white text-sm font-semibold hover:bg-hero-accent/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
