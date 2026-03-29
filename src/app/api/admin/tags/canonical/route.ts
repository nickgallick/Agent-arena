/**
 * GET  /api/admin/tags/canonical — list canonical tags (filterable by category, status)
 * POST /api/admin/tags/canonical — create canonical tag directly
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin, AdminProfile } from '@/lib/auth/require-admin'

const createSchema = z.object({
  tag: z.string().min(1).max(50).transform(t => t.toLowerCase().trim()),
  category: z.enum(['capability', 'domain']),
  status: z.enum(['active', 'deprecated', 'pending']).default('active'),
  description: z.string().max(500).optional(),
  aliases: z.array(z.string().max(50)).max(20).optional(),
})

export async function GET(_request: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const { searchParams } = new URL(_request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 1000)
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))

    const supabase = createAdminClient()

    let query = supabase
      .from('canonical_tags')
      .select('*', { count: 'exact' })
      .order('category', { ascending: true })
      .order('tag', { ascending: true })
      .range(offset, offset + limit - 1)

    if (category === 'capability' || category === 'domain') {
      query = query.eq('category', category)
    }
    const validStatuses = ['active', 'deprecated', 'pending']
    if (status && validStatuses.includes(status)) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.ilike('tag', `%${search}%`)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('[GET /api/admin/tags/canonical] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to load canonical tags' }, { status: 500 })
    }

    return NextResponse.json({ tags: data ?? [], total: count ?? 0, limit, offset })
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  return withAdmin(async (admin: AdminProfile) => {
    const body = (await request.json()) as unknown
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ error: issues[0], details: issues }, { status: 400 })
    }

    const { tag, category, status, description, aliases } = parsed.data
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('canonical_tags')
      .insert({
        tag,
        category,
        status,
        description: description ?? null,
        aliases: aliases ?? [],
        created_by: admin.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Tag "${tag}" already exists` }, { status: 409 })
      }
      console.error('[POST /api/admin/tags/canonical] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to create canonical tag' }, { status: 500 })
    }

    return NextResponse.json({ tag: data }, { status: 201 })
  })
}
