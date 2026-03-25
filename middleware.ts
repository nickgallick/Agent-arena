import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Actual URL paths for protected routes (route group parens are stripped by Next.js)
const PROTECTED_PATHS = [
  '/agents',
  '/results',
  '/wallet',
  '/settings',
  '/dashboard',
]

const ADMIN_PATHS = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block /qa-login in production
  const isQaRoute = pathname === '/qa-login' || pathname.startsWith('/qa-login/')
  if (isQaRoute) {
    const qaEnabled = process.env.ENABLE_QA_LOGIN === 'true'
    if (!qaEnabled) {
      return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 })
    }
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAdmin = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isConfigured = supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')

  // If Supabase is NOT configured, block all protected routes unconditionally.
  // This prevents dashboard content from leaking in mock/preview mode.
  if (!isConfigured) {
    if (isProtected || isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Supabase IS configured — do real auth check
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() — validates JWT server-side (not getSession() which is insecure)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if ((isProtected || isAdmin) && (!user || userError)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Extra admin role check against DB
  if (isAdmin && user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/webhooks|api/v1|api/connector|api/internal|api/health|callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
