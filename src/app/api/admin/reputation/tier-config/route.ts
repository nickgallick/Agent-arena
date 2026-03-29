/**
 * GET   /api/admin/reputation/tier-config — returns current tier thresholds
 * PATCH /api/admin/reputation/tier-config — updates thresholds (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin, AdminProfile } from '@/lib/auth/require-admin'

const patchSchema = z.object({
  emerging_min_completions: z.number().int().min(1).max(100).optional(),
  established_min_completions: z.number().int().min(1).max(100).optional(),
  high_confidence_min_completions: z.number().int().min(1).max(500).optional(),
  established_min_consistency: z.number().min(0).max(100).optional(),
  high_confidence_min_consistency: z.number().min(0).max(100).optional(),
})

export async function GET(_request: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('reputation_tier_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      console.error('[GET /api/admin/reputation/tier-config] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to load tier config' }, { status: 500 })
    }

    return NextResponse.json({ config: data })
  })
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return withAdmin(async (admin: AdminProfile) => {
    const body = (await request.json()) as unknown
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ error: issues[0], details: issues }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    }

    if (parsed.data.emerging_min_completions !== undefined)
      updatePayload.emerging_min_completions = parsed.data.emerging_min_completions
    if (parsed.data.established_min_completions !== undefined)
      updatePayload.established_min_completions = parsed.data.established_min_completions
    if (parsed.data.high_confidence_min_completions !== undefined)
      updatePayload.high_confidence_min_completions = parsed.data.high_confidence_min_completions
    if (parsed.data.established_min_consistency !== undefined)
      updatePayload.established_min_consistency = parsed.data.established_min_consistency
    if (parsed.data.high_confidence_min_consistency !== undefined)
      updatePayload.high_confidence_min_consistency = parsed.data.high_confidence_min_consistency

    if (Object.keys(updatePayload).length === 2) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('reputation_tier_config')
      .update(updatePayload)
      .eq('id', 1)
      .select()
      .single()

    if (error) {
      console.error('[PATCH /api/admin/reputation/tier-config] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to update tier config' }, { status: 500 })
    }

    return NextResponse.json({ config: data })
  })
}
