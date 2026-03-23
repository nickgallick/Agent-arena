import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/agents'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes(':')
    ? rawNext.split('?')[0]
    : '/agents'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', origin))
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Exchange error:', error.message)
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
  }

  const response = NextResponse.redirect(new URL(next, origin), { status: 302 })
  cookiesToApply.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
