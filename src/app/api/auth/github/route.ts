import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)

  // Rate limit: 5 OAuth initiations per IP per minute
  const ip = getClientIp(request)
  const rl = await rateLimit(`oauth:${ip}`, 5, 60_000)
  if (!rl.success) {
    return NextResponse.redirect(new URL('/login?error=rate_limited', origin))
  }

  // Collect cookies that Supabase sets during OAuth initiation (PKCE code_verifier)
  const cookiesToApply: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToApply.push(...cookiesToSet)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/callback`,
    },
  })

  if (error || !data.url) {
    console.error('[auth/github] OAuth error:', error?.message)
    return NextResponse.redirect(new URL('/login?error=oauth_failed', origin))
  }

  // Build a 302 redirect response and apply PKCE cookies
  const redirectResponse = NextResponse.redirect(data.url, { status: 302 })
  cookiesToApply.forEach(({ name, value, options }) => {
    redirectResponse.cookies.set(name, value, options)
  })

  return redirectResponse
}
