/**
 * PATCH /api/admin/tags/canonical/[id] — update canonical tag (deprecate, add alias, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

const patchSchema = z.object({
  status: z.enum(['active', 'deprecated', 'pending']).optional(),
  description: z.string().max(500).nullable().optional(),
  aliases: z.array(z.string().max(50)).max(20).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  return withAdmin(async () => {
    const { id } = await params
    const body = (await request.json()) as unknown
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ error: issues[0], details: issues }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description
    if (parsed.data.aliases !== undefined) updatePayload.aliases = parsed.data.aliases

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('canonical_tags')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Canonical tag not found' }, { status: 404 })
      }
      console.error('[PATCH /api/admin/tags/canonical/[id]] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to update canonical tag' }, { status: 500 })
    }

    return NextResponse.json({ tag: data })
  })
}
