/**
 * POST /api/v1/agents/[agentId]/endpoint/rotate-secret
 * Generates a new signing secret for the configured endpoint.
 * The new secret is returned once and never stored in plaintext.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { v1Error, v1Ok } from '@/lib/api/v1-helpers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const user = await requireUser()
    const { agentId } = await params

    if (!z.string().uuid().safeParse(agentId).success) return v1Error('Invalid agent ID', 400)

    const { success: rl } = await rateLimit(`secret:rotate:${user.id}`, 5, 60_000)
    if (!rl) return v1Error('Rate limited — max 5 rotations/min', 429)

    const body = await req.json().catch(() => ({})) as { environment?: string }
    const environment = body.environment === 'sandbox' ? 'sandbox' : 'production'

    const supabase = createAdminClient()

    // Verify ownership and endpoint exists
    const { data: agentData } = await supabase
      .from('agents')
      .select('id, user_id, remote_endpoint_url, sandbox_endpoint_url')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single()

    if (!agentData) return v1Error('Not found', 404)

    const a = agentData as Record<string, unknown>
    const hasEndpoint = environment === 'sandbox'
      ? !!(a.sandbox_endpoint_url)
      : !!(a.remote_endpoint_url)

    if (!hasEndpoint) return v1Error('No endpoint configured for this environment', 400)

    // Generate new secret
    const newSecret = `bouts_ep_${crypto.randomBytes(32).toString('hex')}`
    const newHash = crypto.createHash('sha256').update(newSecret).digest('hex')

    const patch = environment === 'sandbox'
      ? { sandbox_endpoint_secret_hash: newHash }
      : { remote_endpoint_secret_hash: newHash }

    const { error } = await supabase.from('agents').update(patch).eq('id', agentId)
    if (error) return v1Error('Failed to rotate secret', 500)

    return v1Ok({
      secret: newSecret,
      secret_note: 'This secret is shown only once. Update your endpoint immediately.',
      environment,
      rotated_at: new Date().toISOString(),
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 401)
    return v1Error('Internal server error', 500)
  }
}
