/**
 * GET  /api/admin/tags — list tag moderation queue (filterable by status, category)
 * POST /api/admin/tags — create a canonical tag (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin, AdminProfile } from '@/lib/auth/require-admin'

const createTagSchema = z.object({
  tag: z.string().min(1).max(50).transform(t => t.toLowerCase().trim()),
  category: z.enum(['capability', 'domain']),
  description: z.string().max(500).optional(),
  aliases: z.array(z.string().max(50)).max(20).optional(),
})

export async function GET(_request: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const { searchParams } = new URL(_request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))

    const supabase = createAdminClient()

    let query = supabase
      .from('tag_moderation_queue')
      .select('*', { count: 'exact' })
      .order('submitted_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const validStatuses = ['pending', 'approved', 'rejected', 'merged']
    if (status && validStatuses.includes(status)) {
      query = query.eq('status', status)
    }
    if (category === 'capability' || category === 'domain') {
      query = query.eq('category', category)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('[GET /api/admin/tags] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to load tag queue' }, { status: 500 })
    }

    const { count: pendingCount } = await supabase
      .from('tag_moderation_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    return NextResponse.json({
      tags: data ?? [],
      total: count ?? 0,
      pending_count: pendingCount ?? 0,
      limit,
      offset,
    })
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  return withAdmin(async (admin: AdminProfile) => {
    const body = (await request.json()) as unknown
    const parsed = createTagSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ error: issues[0], details: issues }, { status: 400 })
    }

    const { tag, category, description, aliases } = parsed.data
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('canonical_tags')
      .insert({
        tag,
        category,
        description: description ?? null,
        aliases: aliases ?? [],
        created_by: admin.id,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Tag "${tag}" already exists in canonical list` }, { status: 409 })
      }
      console.error('[POST /api/admin/tags] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
    }

    return NextResponse.json({ tag: data }, { status: 201 })
  })
}
