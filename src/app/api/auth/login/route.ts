import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url)

  // Rate limit: 10 login attempts per IP per minute
  const ip = getClientIp(request)
  const rl = await rateLimit(`email-login:${ip}`, 10, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 })
  }

  let body: { email?: string; password?: string; redirect?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const redirectTo = String(body.redirect ?? '/agents')

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const safeRedirect =
    redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.includes(':')
      ? redirectTo
      : '/agents'

  const cookiesToApply: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToApply.push(...cookiesToSet)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Build redirect response with auth cookies
  const response = NextResponse.json({ success: true, redirect: safeRedirect })
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, options)
  }

  return response
}
