/**
 * POST /api/v1/agents/[id]/endpoint/ping
 *
 * Sends a test ping to the agent's registered endpoint.
 * Result recorded as last_ping_at + last_ping_status on the agent.
 *
 * Ping payload: { "type": "ping" } — signed with agent secret.
 * Any 2xx = success. Does NOT gate challenge invocation.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { signRequest } from '@/lib/rai/sign-request'
import { getEndpointSecret } from '@/lib/rai/secret-manager'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { randomUUID } from 'crypto'

const PING_TIMEOUT_MS = 10_000

const PingSchema = z.object({
  environment: z.enum(['production', 'sandbox']).default('production'),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id: agentId } = await params

    let rawBody: unknown
    try { rawBody = await req.json() } catch { rawBody = {} }

    const parsed = PingSchema.safeParse(rawBody)
    if (!parsed.success) return v1Error('Invalid request body', 'ERROR', 400)

    const { environment } = parsed.data
    const supabase = createAdminClient()

    // Verify ownership + get endpoint URL
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
      return v1Error(`No ${environment} endpoint configured`, 'NOT_CONFIGURED', 400)
    }

    // Fetch secret for signing
    const secret = await getEndpointSecret(supabase, agentId, environment)
    if (!secret) {
      return v1Error('Endpoint secret not found — reconfigure your endpoint', 'ERROR', 500)
    }

    // Build ping body
    const body = JSON.stringify({ type: 'ping', invocation_id: randomUUID() })

    const headers = signRequest({
      method: 'POST',
      url: endpointUrl,
      body,
      secret,
      environment,
      idempotencyKey: randomUUID(),
    })

    // Execute ping with short timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

    const start = Date.now()
    let pingStatus: 'ok' | 'timeout' | 'error' = 'error'
    let statusCode: number | null = null
    let latencyMs: number | null = null

    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })
      latencyMs = Date.now() - start
      statusCode = res.status
      pingStatus = res.ok ? 'ok' : 'error'
    } catch (err) {
      const e = err as Error
      latencyMs = Date.now() - start
      pingStatus = e.name === 'AbortError' ? 'timeout' : 'error'
    } finally {
      clearTimeout(timer)
    }

    // Record result on agent
    const pingAtColumn =
      environment === 'production'
        ? 'remote_endpoint_last_ping_at'
        : 'sandbox_endpoint_last_ping_at'
    const pingStatusColumn =
      environment === 'production'
        ? 'remote_endpoint_last_ping_status'
        : 'sandbox_endpoint_last_ping_status'

    await supabase
      .from('agents')
      .update({
        [pingAtColumn]: new Date().toISOString(),
        [pingStatusColumn]: pingStatus,
      })
      .eq('id', agentId)

    return v1Success({
      status: pingStatus,
      status_code: statusCode,
      latency_ms: latencyMs,
      endpoint_url: endpointUrl,
      environment,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 'ERROR', 401)
    return v1Error('Internal server error', 'ERROR', 500)
  }
}
