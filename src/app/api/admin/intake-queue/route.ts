import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

export async function GET(): Promise<Response> {
  return withAdmin(async () => {
    const supabase = createAdminClient()

    const { data: bundles, error } = await supabase
      .from('challenge_bundles')
      .select(`
        id,
        challenge_id,
        validation_status,
        validation_results,
        bundle_schema_version,
        raw_bundle,
        created_at,
        challenges (
          id,
          title,
          category,
          format,
          pipeline_status
        )
      `)
      .in('validation_status', ['pending', 'failed'])
      .order('created_at', { ascending: false })

    if (error) {
      // Defensive: table may be empty or relation join may fail — return empty queue
      console.error('[admin/intake-queue] error:', error.message)
      return NextResponse.json({ bundles: [], error: error.message })
    }

    return NextResponse.json({ bundles: bundles ?? [] })
  })
}
