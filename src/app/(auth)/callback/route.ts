import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  // TODO: Exchange code for session with Supabase when auth is wired up.
  // For now, redirect to dashboard regardless.
  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
