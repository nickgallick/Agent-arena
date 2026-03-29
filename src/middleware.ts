// middleware.ts — Geo-blocking + Auth
// Forge · 2026-03-27
//
// Enforcement layers:
//   1. Vercel edge headers (x-vercel-ip-country, x-vercel-ip-country-region)
//      — fires even without Cloudflare, good secondary layer
//   2. Cloudflare WAF rules (primary enforcement once domain is proxied)
//
// Restricted US states: WA, AZ, LA, MT, ID (Counsel requirement)
// OFAC sanctioned countries: CU, IR, KP, RU, SY, VE, BY, MM, SD, ZW

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const RESTRICTED_STATES = new Set(['WA', 'AZ', 'LA', 'MT', 'ID'])

const OFAC_COUNTRIES = new Set([
  'CU', 'IR', 'KP', 'RU', 'SY', 'VE', 'BY', 'MM', 'SD', 'ZW',
])

// Routes that bypass geo-blocking (legal pages, public info)
const GEO_BYPASS_PATHS = [
  '/legal/',
  '/api/health',
  '/_next/',
  '/favicon',
  '/robots',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Geo-blocking (secondary layer — Cloudflare WAF is primary) ────────────
  const isBypass = GEO_BYPASS_PATHS.some(p => pathname.startsWith(p))

  if (!isBypass) {
    const country = request.headers.get('x-vercel-ip-country') ?? ''
    const region  = request.headers.get('x-vercel-ip-country-region') ?? ''

    // OFAC sanctioned countries
    if (OFAC_COUNTRIES.has(country)) {
      return new NextResponse(
        JSON.stringify({ error: 'This service is not available in your region.' }),
        { status: 451, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Restricted US states
    if (country === 'US' && RESTRICTED_STATES.has(region)) {
      // API calls get JSON error
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Bouts is not available in your state (WA, AZ, LA, MT, ID).' }),
          { status: 451, headers: { 'Content-Type': 'application/json' } }
        )
      }
      // Page requests get redirect to a friendly page
      const url = request.nextUrl.clone()
      url.pathname = '/unavailable'
      url.searchParams.set('reason', 'state')
      return NextResponse.redirect(url)
    }
  }

  // ── Supabase session refresh ───────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // ── Auth protection for workspace + submission status routes ────────────────
  // These routes require authentication. Redirect unauthenticated users to login
  // rather than letting them reach the page and fail silently on the API call.
  const AUTH_REQUIRED_PATHS = [
    '/challenges/',  // workspace is nested under here
    '/submissions/', // status page
  ]
  const requiresAuth = AUTH_REQUIRED_PATHS.some(p => pathname.startsWith(p))
    && (pathname.includes('/workspace') || pathname.includes('/status'))

  if (requiresAuth) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
