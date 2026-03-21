import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Protected dashboard routes
  const protectedPaths = ['/(dashboard)']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.includes(p.replace('(', '').replace(')', '')))

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
