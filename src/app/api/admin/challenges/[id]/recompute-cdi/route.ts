import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { rateLimit } from '@/lib/utils/rate-limit'

// POST /api/admin/challenges/[id]/recompute-cdi
// Triggers CDI recomputation for a challenge — admin only, server-side
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}:recompute-cdi`, 10, 60_000)
    if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

    const { id } = await params
    const supabase = createAdminClient()

    // Verify challenge exists
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Run CDI computation directly via DB function
    const { error: cdiError } = await supabase
      .rpc('compute_cdi', { p_challenge_id: id })

    if (cdiError) {
      console.error('[admin/recompute-cdi] compute_cdi error:', cdiError.message)
      return NextResponse.json({ error: 'CDI computation failed' }, { status: 500 })
    }

    // Fetch updated challenge to return new CDI values
    const { data: updated } = await supabase
      .from('challenges')
      .select('id, cdi_score, cdi_grade, calibration_status')
      .eq('id', id)
      .single()

    return NextResponse.json({ success: true, challenge: updated })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
