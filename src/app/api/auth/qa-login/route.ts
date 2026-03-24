import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const ALLOWED_QA_EMAILS = new Set([
  'qa-forge@perlantir.com',
  'qa-admin@perlantir.com',
  'nick@perlantir.com',
])

export async function POST(request: NextRequest) {
  // H1 FIX: Disable QA login in production unless explicitly enabled
  if (process.env.ENABLE_QA_LOGIN !== 'true') {
    if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const { origin } = new URL(request.url)

  const ip = getClientIp(request)
  const rl = await rateLimit(`qa-login:${ip}`, 10, 60_000)
  if (!rl.success) {
    return NextResponse.redirect(new URL('/qa-login?error=rate_limited', origin))
  }

  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('redirect') ?? '/agents')

  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.includes(':')
    ? redirectTo
    : '/agents'

  if (!email || !password) {
    return NextResponse.redirect(new URL('/qa-login?error=missing_credentials', origin))
  }

  if (!ALLOWED_QA_EMAILS.has(email)) {
    // L5 FIX: Use same error as auth_failed to prevent email enumeration
    return NextResponse.redirect(new URL('/qa-login?error=auth_failed', origin))
  }

  const cookiesToApply: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(nextCookies) {
          cookiesToApply.push(...nextCookies)
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[auth/qa-login] Sign-in error:', error.message)
    return NextResponse.redirect(new URL('/qa-login?error=auth_failed', origin))
  }

  const response = NextResponse.redirect(new URL(safeRedirect, origin), { status: 302 })
  cookiesToApply.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
