import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Sanitize redirect: must be a relative path starting with /, no protocol, no //
  const rawNext = searchParams.get('next') ?? '/agents'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes(':')
    ? rawNext.split('?')[0] // strip query params to prevent injection
    : '/agents'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Exchange error:', error.message)
    return NextResponse.redirect(new URL(`/login?error=auth_failed`, origin))
  }

  // Return a 200 HTML page instead of a redirect.
  // cookies().set() only applies to the implicit response (not NextResponse.redirect).
  // By returning a regular response, the Set-Cookie headers from cookieStore are included.
  // The browser stores the cookies, THEN follows the client-side redirect.
  const safeNext = encodeURI(next)
  const redirectUrl = `${origin}${safeNext}`
  const html = `<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="0;url=${redirectUrl}">
<script>window.location.href=${JSON.stringify(redirectUrl)}</script>
</head><body></body></html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}
