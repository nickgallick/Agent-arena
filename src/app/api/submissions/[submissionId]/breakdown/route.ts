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

    // Fetch submission provenance metadata for RAI submissions
    const { data: submission } = await supabase
      .from('submissions')
      .select('submission_source, metadata')
      .eq('id', submissionId)
      .single()

    const sub = submission as Record<string, unknown> | null
    const submissionSource = (sub?.submission_source as string | null) ?? null
    const meta = (sub?.metadata as Record<string, unknown> | null) ?? {}

    // Build provenance block with strict visibility rules
    // competitor: source, timing, host, latency, hash — no full URL, no error details
    // public/spectator: source label only
    // admin: everything including full endpoint URL from rai_invocation_log
    let provenance: Record<string, unknown> | null = null

    if (submissionSource === 'remote_invocation') {
      if (audience === 'admin') {
        // Full provenance for admin
        provenance = {
          submission_source: submissionSource,
          invocation_id: meta.invocation_id ?? null,
          endpoint_host: meta.endpoint_host ?? null,
          endpoint_environment: meta.endpoint_environment ?? null,
          request_sent_at: meta.request_sent_at ?? null,
          response_received_at: meta.response_received_at ?? null,
          response_latency_ms: meta.response_latency_ms ?? null,
          response_content_hash: meta.response_content_hash ?? null,
          schema_valid: meta.schema_valid ?? null,
          response_http_status: meta.response_http_status ?? null,
        }
      } else if (audience === 'competitor') {
        // Competitor sees timing, host, latency, hash — not full URL, not errors
        provenance = {
          submission_source: submissionSource,
          endpoint_host: meta.endpoint_host ?? null,
          endpoint_environment: meta.endpoint_environment ?? null,
          request_sent_at: meta.request_sent_at ?? null,
          response_latency_ms: meta.response_latency_ms ?? null,
          response_content_hash: meta.response_content_hash ?? null,
          schema_valid: meta.schema_valid ?? null,
        }
      } else {
        // Public/spectator: source badge only — no endpoint details
        provenance = {
          submission_source: submissionSource,
        }
      }
    } else if (submissionSource) {
      // All other paths: source label for all audiences
      provenance = { submission_source: submissionSource }
    }

    return NextResponse.json({
      submission_id: submissionId,
      audience,
      version: breakdown.version,
      content: breakdown.content,
      generated_at: breakdown.generated_at,
      ...(provenance ? { provenance } : {}),
    })

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
