/**
 * GET  /api/v1/agents/[agentId]/endpoint — load endpoint config (owner only)
 * PUT  /api/v1/agents/[agentId]/endpoint — upsert endpoint (returns secret once on creation)
 * DELETE /api/v1/agents/[agentId]/endpoint?environment=production|sandbox — remove endpoint
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { v1Error, v1Ok } from '@/lib/api/v1-helpers'

const upsertSchema = z.object({
  endpoint_url: z.string().url('Must be a valid URL').refine(
    url => url.startsWith('https://'),
    'Endpoint must use HTTPS'
  ).refine(
    url => !isPrivateHost(url),
    'Private/local IPs are not allowed (SSRF protection)'
  ).max(2048, 'URL too long'),
  environment: z.enum(['production', 'sandbox']).default('production'),
  timeout_ms: z.number().int().min(5000).max(120000).default(30000),
  max_retries: z.number().int().min(0).max(2).default(1),
})

/** Block private IPs and loopback to prevent SSRF */
function isPrivateHost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    // Block localhost, loopback, link-local, RFC-1918
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^::1$/.test(hostname) ||
      /^fc00:/i.test(hostname) ||
      /^fd/.test(hostname) ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) return true
    return false
  } catch {
    return true
  }
}

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

function generateSecret(): string {
  return `bouts_ep_${crypto.randomBytes(32).toString('hex')}`
}

async function verifyOwnership(supabase: ReturnType<typeof createAdminClient>, agentId: string, userId: string) {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const user = await requireUser()
    const { agentId } = await params

    if (!z.string().uuid().safeParse(agentId).success) return v1Error('Invalid agent ID', 400)

    const supabase = createAdminClient()
    if (!(await verifyOwnership(supabase, agentId, user.id))) return v1Error('Not found', 404)

    const { data: agent } = await supabase
      .from('agents')
      .select(`
        remote_endpoint_url, remote_endpoint_secret_hash,
        remote_endpoint_timeout_ms, remote_endpoint_max_retries,
        remote_endpoint_last_ping_at, remote_endpoint_last_ping_status,
        remote_endpoint_configured_at,
        sandbox_endpoint_url, sandbox_endpoint_secret_hash,
        sandbox_endpoint_last_ping_at, sandbox_endpoint_last_ping_status
      `)
      .eq('id', agentId)
      .single()

    if (!agent) return v1Error('Agent not found', 404)

    const a = agent as Record<string, unknown>

    return v1Ok({
      production: a.remote_endpoint_url ? {
        endpoint_url: a.remote_endpoint_url,
        secret_hash_prefix: (a.remote_endpoint_secret_hash as string | null)?.slice(0, 8) ?? null,
        timeout_ms: (a.remote_endpoint_timeout_ms as number) ?? 30000,
        max_retries: (a.remote_endpoint_max_retries as number) ?? 1,
        last_ping_at: a.remote_endpoint_last_ping_at ?? null,
        last_ping_status: a.remote_endpoint_last_ping_status ?? null,
        configured_at: a.remote_endpoint_configured_at ?? null,
      } : null,
      sandbox: a.sandbox_endpoint_url ? {
        endpoint_url: a.sandbox_endpoint_url,
        secret_hash_prefix: (a.sandbox_endpoint_secret_hash as string | null)?.slice(0, 8) ?? null,
        timeout_ms: null,
        max_retries: null,
        last_ping_at: a.sandbox_endpoint_last_ping_at ?? null,
        last_ping_status: a.sandbox_endpoint_last_ping_status ?? null,
        configured_at: null,
      } : null,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 401)
    return v1Error('Internal server error', 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const user = await requireUser()
    const { agentId } = await params

    if (!z.string().uuid().safeParse(agentId).success) return v1Error('Invalid agent ID', 400)

    const { success: rl } = await rateLimit(`endpoint:configure:${user.id}`, 10, 60_000)
    if (!rl) return v1Error('Rate limited', 429)

    const body = await req.json() as unknown
    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      const firstErr = parsed.error.flatten().fieldErrors
      const msg = Object.values(firstErr)[0]?.[0] ?? 'Invalid request'
      return v1Error(msg, 400)
    }

    const { endpoint_url, environment, timeout_ms, max_retries } = parsed.data

    const supabase = createAdminClient()
    if (!(await verifyOwnership(supabase, agentId, user.id))) return v1Error('Not found', 404)

    // Check if endpoint already exists (determine if this is create or update)
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('remote_endpoint_url, sandbox_endpoint_url')
      .eq('id', agentId)
      .single()

    const ea = existingAgent as Record<string, unknown> | null
    const existingUrl = environment === 'production' ? ea?.remote_endpoint_url : ea?.sandbox_endpoint_url
    const isCreate = !existingUrl

    // Generate new secret on create; keep existing on update (unless URL changed)
    const urlChanged = existingUrl !== endpoint_url
    const needsNewSecret = isCreate || urlChanged

    let secret: string | null = null
    let secretHash: string | null = null

    if (needsNewSecret) {
      secret = generateSecret()
      secretHash = hashSecret(secret)
    }

    // Build update patch
    const patch: Record<string, unknown> = environment === 'production' ? {
      remote_endpoint_url: endpoint_url,
      remote_endpoint_timeout_ms: timeout_ms,
      remote_endpoint_max_retries: max_retries,
      remote_endpoint_last_ping_at: null,
      remote_endpoint_last_ping_status: null,
      remote_endpoint_configured_at: new Date().toISOString(),
      ...(secretHash ? { remote_endpoint_secret_hash: secretHash } : {}),
    } : {
      sandbox_endpoint_url: endpoint_url,
      sandbox_endpoint_last_ping_at: null,
      sandbox_endpoint_last_ping_status: null,
      ...(secretHash ? { sandbox_endpoint_secret_hash: secretHash } : {}),
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update(patch)
      .eq('id', agentId)

    if (updateError) {
      // If columns don't exist yet (migration pending), return informative error
      if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        return v1Error('Migration 00038 has not been applied. Please run it in the Supabase SQL editor.', 503)
      }
      return v1Error('Failed to save endpoint config', 500)
    }

    return v1Ok({
      endpoint_url,
      environment,
      ...(secret ? { secret, secret_note: 'This secret is shown only once. Store it securely.' } : {}),
    }, secret ? 201 : 200)
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 401)
    return v1Error('Internal server error', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const user = await requireUser()
    const { agentId } = await params

    if (!z.string().uuid().safeParse(agentId).success) return v1Error('Invalid agent ID', 400)

    const environment = req.nextUrl.searchParams.get('environment') ?? 'production'
    if (!['production', 'sandbox'].includes(environment)) return v1Error('Invalid environment', 400)

    const supabase = createAdminClient()
    if (!(await verifyOwnership(supabase, agentId, user.id))) return v1Error('Not found', 404)

    const patch: Record<string, null> = environment === 'production' ? {
      remote_endpoint_url: null,
      remote_endpoint_secret_hash: null,
      remote_endpoint_last_ping_at: null,
      remote_endpoint_last_ping_status: null,
      remote_endpoint_configured_at: null,
    } : {
      sandbox_endpoint_url: null,
      sandbox_endpoint_secret_hash: null,
      sandbox_endpoint_last_ping_at: null,
      sandbox_endpoint_last_ping_status: null,
    }

    await supabase.from('agents').update(patch).eq('id', agentId)

    return v1Ok({ removed: true, environment })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 401)
    return v1Error('Internal server error', 500)
  }
}
