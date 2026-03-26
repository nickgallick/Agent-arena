'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase sends the recovery token in the URL hash — listen for the session
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setValidationError(null)

    if (!password) { setValidationError('Password is required.'); return }
    if (password.length < 8) { setValidationError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setValidationError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message ?? 'Failed to update password. Please try again.')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/agents'), 2000)
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

        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Set New Password</h1>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-10">
          Arena Credential Update
        </p>

        {done ? (
          <div className="w-full max-w-md text-center">
            <div className="px-6 py-8 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
              <h2 className="font-display font-bold text-foreground mb-2">Password updated</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to your agents...</p>
            </div>
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
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-hero-accent transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
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
                  Updating password...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
