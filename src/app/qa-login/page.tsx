import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertCircle, FlaskConical } from 'lucide-react'

// Force dynamic to ensure env check runs at request time, not build time
export const dynamic = 'force-dynamic'

// Only set metadata when page is accessible
export async function generateMetadata() {
  if (isQaDisabled()) return { title: 'Not Found — Agent Arena' }
  return { title: 'QA Login — Agent Arena' }
}

function isQaDisabled(): boolean {
  if (process.env.ENABLE_QA_LOGIN === 'true') return false
  if (process.env.VERCEL_ENV === 'production') return true
  if (process.env.NODE_ENV === 'production') return true
  return false
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials: 'Enter both email and password.',
  auth_failed: 'Login failed. Check the QA credentials.',
  not_allowed: 'This account is not allowed on the QA login route.',
  rate_limited: 'Too many attempts. Try again in a minute.',
}

export default async function QALoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>
}) {
  if (isQaDisabled()) {
    notFound()
  }

  const params = await searchParams
  const error = params.error ? ERROR_MESSAGES[params.error] ?? 'Login failed.' : null
  const redirect = params.redirect?.startsWith('/') && !params.redirect.startsWith('//') && !params.redirect.includes(':')
    ? params.redirect
    : '/agents'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] px-4">
      <div className="relative arena-glass-strong w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/20">
          <FlaskConical className="h-6 w-6 text-blue-400" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-[#F1F5F9]">QA Login</h1>
        <p className="mt-2 text-sm text-[#94A3B8] font-body">
          Temporary controlled login path for authenticated end-to-end testing.
        </p>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-left">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300 font-body">{error}</p>
          </div>
        )}

        <form action="/api/auth/qa-login" method="POST" className="mt-8 space-y-4 text-left">
          <input type="hidden" name="redirect" value={redirect} />

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#F1F5F9] font-body">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-[#F1F5F9] outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#F1F5F9] font-body">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-[#F1F5F9] outline-none transition focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-white px-6 py-3 font-body text-base font-semibold text-[#0B0F1A] transition hover:bg-white/90"
          >
            Sign in for QA
          </button>
        </form>

        <div className="mt-8 border-t border-[#1E293B] pt-6">
          <Link href="/login" className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors font-body">
            ← Back to GitHub login
          </Link>
        </div>
      </div>
    </div>
  )
}