/**
 * PATCH  /api/admin/tags/[id] — update queue entry (approve/reject/merge)
 * DELETE /api/admin/tags/[id] — remove from queue
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin, AdminProfile } from '@/lib/auth/require-admin'

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    description: z.string().max(500).optional(),
    aliases: z.array(z.string().max(50)).max(20).optional(),
  }),
  z.object({
    action: z.literal('reject'),
  }),
  z.object({
    action: z.literal('merge'),
    merge_into: z.string().min(1).max(50),
  }),
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  return withAdmin(async (admin: AdminProfile) => {
    const { id } = await params
    const body = (await request.json()) as unknown
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ error: issues[0], details: issues }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch the queue entry
    const { data: entry, error: fetchErr } = await supabase
      .from('tag_moderation_queue')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !entry) {
      return NextResponse.json({ error: 'Tag queue entry not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    if (parsed.data.action === 'approve') {
      // Create canonical tag and mark approved
      const { error: canonErr } = await supabase
        .from('canonical_tags')
        .upsert({
          tag: entry.tag,
          category: entry.category,
          status: 'active',
          description: parsed.data.description ?? null,
          aliases: parsed.data.aliases ?? [],
          created_by: admin.id,
          updated_at: now,
        }, { onConflict: 'tag' })

      if (canonErr) {
        console.error('[PATCH /api/admin/tags/[id]] Canonical insert error:', canonErr.message)
        return NextResponse.json({ error: 'Failed to create canonical tag' }, { status: 500 })
      }

      const { data: updated, error: updateErr } = await supabase
        .from('tag_moderation_queue')
        .update({
          status: 'approved',
          reviewed_by: admin.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to update queue entry' }, { status: 500 })
      }

      return NextResponse.json({ tag: updated })
    }

    if (parsed.data.action === 'reject') {
      const { data: updated, error: updateErr } = await supabase
        .from('tag_moderation_queue')
        .update({
          status: 'rejected',
          reviewed_by: admin.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to reject tag' }, { status: 500 })
      }

      return NextResponse.json({ tag: updated })
    }

    if (parsed.data.action === 'merge') {
      // Verify merge target exists
      const { data: target } = await supabase
        .from('canonical_tags')
        .select('tag')
        .eq('tag', parsed.data.merge_into)
        .eq('status', 'active')
        .maybeSingle()

      if (!target) {
        return NextResponse.json({ error: `Merge target "${parsed.data.merge_into}" not found in canonical tags` }, { status: 400 })
      }

      const { data: updated, error: updateErr } = await supabase
        .from('tag_moderation_queue')
        .update({
          status: 'merged',
          merged_into: parsed.data.merge_into,
          reviewed_by: admin.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to merge tag' }, { status: 500 })
      }

      return NextResponse.json({ tag: updated })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  return withAdmin(async () => {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('tag_moderation_queue')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DELETE /api/admin/tags/[id]] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })
}
