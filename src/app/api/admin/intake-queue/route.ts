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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bundles: bundles ?? [] })
  })
}
