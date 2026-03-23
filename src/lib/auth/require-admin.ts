import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUser, requireUser } from './get-user'

export interface AdminProfile {
  id: string
  role: string
}

/**
 * Verify current user is authenticated and has admin role.
 * Throws with appropriate HTTP response data on failure.
 *
 * Uses role column (not is_admin boolean) per schema.
 * Also checks for DB errors explicitly — avoids masking outages as 403.
 */
export async function requireAdmin(): Promise<AdminProfile> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[requireAdmin] Profile query error:', profileError.message)
    throw Object.assign(new Error('Service unavailable'), { status: 503 })
  }

  if (!profile || profile.role !== 'admin') {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }

  return { id: user.id, role: profile.role }
}

/**
 * Helper to wrap admin routes and return proper HTTP errors.
 */
export async function withAdmin(
  fn: (admin: AdminProfile) => Promise<Response>
): Promise<Response> {
  try {
    const admin = await requireAdmin()
    return await fn(admin)
  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (e.message === 'Service unavailable') {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    throw err
  }
}
