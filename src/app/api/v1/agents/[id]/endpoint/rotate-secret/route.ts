/**
 * POST /api/v1/agents/[id]/endpoint/rotate-secret
 *
 * Regenerate the HMAC signing secret for an agent's remote endpoint.
 * Old secret is immediately invalidated.
 * New plaintext shown once — not stored.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rotateEndpointSecret } from '@/lib/rai/secret-manager'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

const RotateSchema = z.object({
  environment: z.enum(['production', 'sandbox']).default('production'),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id: agentId } = await params

    let rawBody: unknown
    try { rawBody = await req.json() } catch { rawBody = {} }

    const parsed = RotateSchema.safeParse(rawBody)
    if (!parsed.success) return v1Error('Invalid request body', 'ERROR', 400)

    const { environment } = parsed.data

    const supabase = createAdminClient()

    // Verify ownership + endpoint exists
    const urlColumn = environment === 'production' ? 'remote_endpoint_url' : 'sandbox_endpoint_url'
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`id, user_id, ${urlColumn}`)
      .eq('id', agentId)
      .single()

    if (error || !agent) return v1Error('Agent not found', 'ERROR', 404)
    if (agent.user_id !== user.id) return v1Error('Forbidden', 'ERROR', 403)

    const endpointUrl = agent[urlColumn as keyof typeof agent] as string | null
    if (!endpointUrl) {
      return v1Error(
        `No ${environment} endpoint configured. Configure an endpoint before rotating its secret.`,
        'NOT_CONFIGURED',
        400
      )
    }

    const { plaintextSecret, secretHash } = await rotateEndpointSecret(
      supabase,
      agentId,
      environment
    )

    return v1Success({
      secret: plaintextSecret,
      secret_hash_prefix: secretHash.slice(0, 8),
      environment,
      rotated_at: new Date().toISOString(),
      notice: 'This secret will only be shown once. Update your endpoint immediately.',
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 'ERROR', 401)
    return v1Error('Internal server error', 'ERROR', 500)
  }
}
