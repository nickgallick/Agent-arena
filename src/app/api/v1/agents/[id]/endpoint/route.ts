/**
 * GET/PUT/DELETE /api/v1/agents/[id]/endpoint
 *
 * Remote Agent Invocation endpoint registration.
 * - GET: returns current endpoint config (no secrets, hash only)
 * - PUT: configure/update endpoint URL and options
 * - DELETE: remove endpoint configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { createEndpointSecret } from '@/lib/rai/secret-manager'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { validateEndpointUrl } from '@/lib/rai/ip-guard'

const EndpointConfigSchema = z.object({
  endpoint_url: z
    .string()
    .url('Must be a valid URL')
    .max(512)
    .refine(url => url.startsWith('https://'), 'Endpoint URL must use HTTPS'),
  environment: z.enum(['production', 'sandbox']).default('production'),
  timeout_ms: z.number().int().min(10_000).max(120_000).default(30_000),
  // max_retries removed — invoke route hardcodes 0. Kept as optional no-op for backward compat.
  max_retries: z.number().int().min(0).max(0).default(0).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id: agentId } = await params

    const supabase = createAdminClient()

    // Verify ownership
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        id, user_id,
        remote_endpoint_url, remote_endpoint_secret_hash,
        remote_endpoint_timeout_ms, remote_endpoint_max_retries,
        remote_endpoint_last_ping_at, remote_endpoint_last_ping_status,
        remote_endpoint_configured_at,
        sandbox_endpoint_url, sandbox_endpoint_secret_hash,
        sandbox_endpoint_last_ping_at, sandbox_endpoint_last_ping_status
      `)
      .eq('id', agentId)
      .single()

    if (error || !agent) return v1Error('Agent not found', 'ERROR', 404)
    if (agent.user_id !== user.id) return v1Error('Forbidden', 'ERROR', 403)

    return v1Success({
      production: agent.remote_endpoint_url
        ? {
            endpoint_url: agent.remote_endpoint_url,
            secret_hash_prefix: agent.remote_endpoint_secret_hash?.slice(0, 8) ?? null,
            timeout_ms: agent.remote_endpoint_timeout_ms,
            max_retries: agent.remote_endpoint_max_retries,
            last_ping_at: agent.remote_endpoint_last_ping_at,
            last_ping_status: agent.remote_endpoint_last_ping_status,
            configured_at: agent.remote_endpoint_configured_at,
          }
        : null,
      sandbox: agent.sandbox_endpoint_url
        ? {
            endpoint_url: agent.sandbox_endpoint_url,
            secret_hash_prefix: agent.sandbox_endpoint_secret_hash?.slice(0, 8) ?? null,
            last_ping_at: agent.sandbox_endpoint_last_ping_at,
            last_ping_status: agent.sandbox_endpoint_last_ping_status,
          }
        : null,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 'ERROR', 401)
    return v1Error('Internal server error', 'ERROR', 500)
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id: agentId } = await params

    let rawBody: unknown
    try { rawBody = await req.json() } catch { return v1Error('Invalid request body', 'ERROR', 400) }

    const parsed = EndpointConfigSchema.safeParse(rawBody)
    if (!parsed.success) {
      return v1Error(parsed.error.issues[0]?.message ?? 'Validation error', 'VALIDATION_ERROR', 400)
    }

    const { endpoint_url, environment, timeout_ms, max_retries } = parsed.data

    // P1 FIX: SSRF protection — validate URL at registration time (synchronous, no DNS)
    const urlValidation = validateEndpointUrl(endpoint_url)
    if (!urlValidation.valid) {
      return v1Error(urlValidation.reason ?? 'Invalid endpoint URL', 'INVALID_URL', 400)
    }

    const supabase = createAdminClient()

    // Verify ownership
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, user_id, remote_endpoint_url, sandbox_endpoint_url')
      .eq('id', agentId)
      .single()

    if (error || !agent) return v1Error('Agent not found', 'ERROR', 404)
    if (agent.user_id !== user.id) return v1Error('Forbidden', 'ERROR', 403)

    // Detect if this is a new configuration (no existing URL) — if so, generate a secret
    const isNewConfig =
      environment === 'production'
        ? !agent.remote_endpoint_url
        : !agent.sandbox_endpoint_url

    // Update endpoint URL and options
    const urlColumn = environment === 'production' ? 'remote_endpoint_url' : 'sandbox_endpoint_url'
    const updatePayload: Record<string, unknown> = {
      [urlColumn]: endpoint_url,
    }

    if (environment === 'production') {
      updatePayload['remote_endpoint_timeout_ms'] = timeout_ms
      updatePayload['remote_endpoint_max_retries'] = 0 // always 0 — retries are disabled
      if (isNewConfig) {
        updatePayload['remote_endpoint_configured_at'] = new Date().toISOString()
      }
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update(updatePayload)
      .eq('id', agentId)

    if (updateError) return v1Error('Failed to update endpoint configuration', 'ERROR', 500)

    // Generate secret if new configuration
    let plaintextSecret: string | null = null
    if (isNewConfig) {
      const secretResult = await createEndpointSecret(supabase, agentId, environment)
      plaintextSecret = secretResult.plaintextSecret
    }

    return v1Success(
      {
        endpoint_url,
        environment,
        timeout_ms: environment === 'production' ? timeout_ms : undefined,
        max_retries: environment === 'production' ? max_retries : undefined,
        ...(plaintextSecret
          ? {
              secret: plaintextSecret,
              secret_notice:
                'This secret will only be shown once. Store it securely in your agent endpoint.',
            }
          : {}),
      },
      { status: isNewConfig ? 201 : 200 }
    )
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 'ERROR', 401)
    return v1Error('Internal server error', 'ERROR', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id: agentId } = await params

    const url = new URL(req.url)
    const environment = (url.searchParams.get('environment') ?? 'production') as
      | 'production'
      | 'sandbox'

    const supabase = createAdminClient()

    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', agentId)
      .single()

    if (error || !agent) return v1Error('Agent not found', 'ERROR', 404)
    if (agent.user_id !== user.id) return v1Error('Forbidden', 'ERROR', 403)

    const clearFields =
      environment === 'production'
        ? {
            remote_endpoint_url: null,
            remote_endpoint_secret_hash: null,
            remote_endpoint_timeout_ms: 30000,
            remote_endpoint_max_retries: 1,
            remote_endpoint_last_ping_at: null,
            remote_endpoint_last_ping_status: null,
            remote_endpoint_configured_at: null,
          }
        : {
            sandbox_endpoint_url: null,
            sandbox_endpoint_secret_hash: null,
            sandbox_endpoint_last_ping_at: null,
            sandbox_endpoint_last_ping_status: null,
          }

    await supabase.from('agents').update(clearFields).eq('id', agentId)

    // Clear secret from vault
    const vaultField =
      environment === 'production' ? 'production_secret' : 'sandbox_secret'
    await supabase
      .from('agent_rai_secrets')
      .update({ [vaultField]: null })
      .eq('agent_id', agentId)

    return v1Success({ removed: true, environment })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 'ERROR', 401)
    return v1Error('Internal server error', 'ERROR', 500)
  }
}
