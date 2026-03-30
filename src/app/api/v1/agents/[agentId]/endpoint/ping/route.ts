/**
 * POST /api/v1/agents/[agentId]/endpoint/ping
 * Sends a lightweight HEAD request to the configured endpoint to verify reachability.
 * Updates last_ping_at / last_ping_status on the agent row.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { v1Error, v1Ok } from '@/lib/api/v1-helpers'

const PING_TIMEOUT_MS = 8000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const user = await requireUser()
    const { agentId } = await params

    if (!z.string().uuid().safeParse(agentId).success) return v1Error('Invalid agent ID', 400)

    const { success: rl } = await rateLimit(`endpoint:ping:${user.id}`, 10, 60_000)
    if (!rl) return v1Error('Rate limited — max 10 pings/min', 429)

    const body = await req.json().catch(() => ({})) as { environment?: string }
    const environment = body.environment === 'sandbox' ? 'sandbox' : 'production'

    const supabase = createAdminClient()

    // Verify ownership
    const { data: agentData } = await supabase
      .from('agents')
      .select('id, user_id, remote_endpoint_url, sandbox_endpoint_url')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single()

    if (!agentData) return v1Error('Not found', 404)

    const a = agentData as Record<string, unknown>
    const endpointUrl = environment === 'sandbox'
      ? ((a.sandbox_endpoint_url as string | null) ?? (a.remote_endpoint_url as string | null))
      : (a.remote_endpoint_url as string | null)

    if (!endpointUrl) return v1Error('No endpoint configured for this environment', 400)

    // Send HEAD request with timeout
    const start = Date.now()
    let status: 'ok' | 'timeout' | 'error' = 'error'
    let latency_ms: number | null = null
    let httpStatus: number | null = null

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

      const response = await fetch(endpointUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'X-Bouts-Ping': '1',
          'User-Agent': 'Bouts/1.0 (+https://agent-arena-roan.vercel.app)',
        },
      })

      clearTimeout(timeoutId)
      latency_ms = Date.now() - start
      httpStatus = response.status

      // Any 2xx or 4xx (including 404, 405 Method Not Allowed) counts as reachable
      // Only 5xx or network errors count as down
      status = response.status < 500 ? 'ok' : 'error'
    } catch (err) {
      const isTimeout = (err as Error).name === 'AbortError'
      status = isTimeout ? 'timeout' : 'error'
      latency_ms = Date.now() - start
    }

    // Update ping status on agent
    const pingPatch: Record<string, unknown> = environment === 'sandbox' ? {
      sandbox_endpoint_last_ping_at: new Date().toISOString(),
      sandbox_endpoint_last_ping_status: status,
    } : {
      remote_endpoint_last_ping_at: new Date().toISOString(),
      remote_endpoint_last_ping_status: status,
    }

    await supabase.from('agents').update(pingPatch).eq('id', agentId)

    return v1Ok({
      status,
      latency_ms,
      http_status: httpStatus,
      endpoint_host: (() => { try { return new URL(endpointUrl).hostname } catch { return 'unknown' } })(),
      environment,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 401)
    return v1Error('Internal server error', 500)
  }
}
