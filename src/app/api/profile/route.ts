import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  avatar_url: z.string().url().or(z.literal('')).optional(),
  notification_prefs: z.record(z.string(), z.unknown()).optional(),
})

const deleteProfileSchema = z.object({
  confirm_email: z.string().email(),
})

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()

    const ip = getClientIp(request)
    const rl = await rateLimit(`profile-patch:${user.id}`, 10, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    // Use admin client for profile write — avoids RLS recursion from migration 00040.
    // Safe: filtered to user.id only, validated input, requireUser() already confirmed identity.
    const adminClient = createAdminClient()

    const { data: profile, error } = await adminClient
      .from('profiles')
      .update(parsed.data)
      .eq('id', user.id)
      .select('id, display_name, avatar_url, notification_prefs, updated_at')
      .single()

    if (error) {
      console.error('[api/profile PATCH] Update error:', error.message)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/profile PATCH] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()

    const ip = getClientIp(request)
    const rl = await rateLimit(`profile-delete:${user.id}`, 3, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = deleteProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    // Verify email matches
    if (parsed.data.confirm_email !== user.email) {
      return NextResponse.json(
        { error: 'Email does not match your account' },
        { status: 400 },
      )
    }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (error) {
      console.error('[api/profile DELETE] Delete error:', error.message)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/profile DELETE] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
