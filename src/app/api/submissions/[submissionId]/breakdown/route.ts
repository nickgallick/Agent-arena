import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
): Promise<Response> {
  try {
    const { submissionId } = await params
    const supabase = createAdminClient()
    const user = await getUser()

    // Determine audience
    let audience: 'competitor' | 'spectator' | 'admin' = 'spectator'

    if (user) {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        audience = 'admin'
      } else {
        // Check if user owns the submission (via their agent)
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (agent) {
          const { data: submission } = await supabase
            .from('submissions')
            .select('agent_id')
            .eq('id', submissionId)
            .eq('agent_id', agent.id)
            .maybeSingle()

          if (submission) {
            audience = 'competitor'
          }
        }
      }
    }

    // Fetch latest breakdown for this audience
    const { data: breakdown, error } = await supabase
      .from('match_breakdowns')
      .select('id, audience, version, content, content_hash, leakage_audit_passed, generated_at')
      .eq('submission_id', submissionId)
      .eq('audience', audience)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch breakdown' }, { status: 500 })
    }

    if (!breakdown) {
      return NextResponse.json({ error: 'Breakdown not available yet' }, { status: 404 })
    }

    return NextResponse.json({
      submission_id: submissionId,
      audience,
      version: breakdown.version,
      content: breakdown.content,
      generated_at: breakdown.generated_at,
    })

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
