/**
 * GET  /api/v1/auth/tokens  — list user's API tokens
 * POST /api/v1/auth/tokens  — create a new API token
 *
 * Auth: JWT only (API tokens cannot be used to create new tokens)
 *
 * Supports environment: 'production' | 'sandbox'
 * Sandbox tokens use bouts_sk_test_ prefix (Stripe-style)
 */

import { randomBytes, createHash } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { applyRateLimit } from '@/lib/utils/rate-limit-policy'
import { ALL_SCOPES } from '@/lib/auth/token-auth'

const ALL_SCOPES_SET = new Set<string>(ALL_SCOPES)

const PRODUCTION_PREFIX = 'bouts_sk_'
const SANDBOX_PREFIX = 'bouts_sk_test_'
const MAX_PRODUCTION_TOKENS = 20
const MAX_SANDBOX_TOKENS = 10

const createTokenSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expires_in_days: z.number().int().positive().optional().nullable(),
  environment: z.enum(['production', 'sandbox']).optional().default('production'),
})

async function requireJwtUser(): Promise<{ user_id: string } | Response> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return v1Error('Unauthorized', 'UNAUTHORIZED', 401)
  }
  return { user_id: user.id }
}

export async function GET(request: Request): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  const supabase = createAdminClient()

  const { data: tokens, error } = await supabase
    .from('api_tokens')
    .select('id, name, token_prefix, scopes, environment, last_used_at, expires_at, created_at')
    .eq('user_id', user_id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return v1Error('Failed to fetch tokens', 'DB_ERROR', 500)
  }

  return v1Success(tokens ?? [])
}

export async function POST(request: Request): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  // Rate limit: 10 token creates per hour per user
  const rl = await applyRateLimit('token:create', user_id)
  if (!rl.success) {
    return v1Error('Rate limit exceeded — max 10 token creations per hour', 'RATE_LIMITED', 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = createTokenSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { name, scopes, expires_in_days, environment } = parsed.data

  // Validate scopes — no admin:* allowed
  for (const scope of scopes) {
    if (scope.startsWith('admin:')) {
      return v1Error(`Scope "${scope}" is not issuable`, 'INVALID_SCOPE', 400)
    }
    if (!ALL_SCOPES_SET.has(scope)) {
      return v1Error(`Unknown scope: "${scope}"`, 'INVALID_SCOPE', 400)
    }
  }

  const supabase = createAdminClient()

  // Check max tokens per environment
  const maxAllowed = environment === 'sandbox' ? MAX_SANDBOX_TOKENS : MAX_PRODUCTION_TOKENS
  const { count, error: countError } = await supabase
    .from('api_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .eq('environment', environment)
    .is('revoked_at', null)

  if (countError) {
    return v1Error('Failed to check token count', 'DB_ERROR', 500)
  }

  if ((count ?? 0) >= maxAllowed) {
    return v1Error(
      `Maximum of ${maxAllowed} active ${environment} tokens allowed`,
      'TOKEN_LIMIT_EXCEEDED',
      400
    )
  }

  // Choose prefix based on environment
  const prefix = environment === 'sandbox' ? SANDBOX_PREFIX : PRODUCTION_PREFIX

  // Generate token: prefix + random hex suffix
  // production: bouts_sk_ (9) + 55 chars = 64 total
  // sandbox:    bouts_sk_test_ (14) + 50 chars = 64 total
  const suffixLen = 64 - prefix.length
  const rawSuffix = randomBytes(Math.ceil(suffixLen / 2)).toString('hex').slice(0, suffixLen)
  const plainToken = `${prefix}${rawSuffix}`
  const tokenHash = createHash('sha256').update(plainToken).digest('hex')
  // Store first 17 chars as visible prefix
  const tokenPrefix = plainToken.slice(0, Math.min(17, plainToken.length))

  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86_400_000).toISOString()
    : null

  const { data: token, error: insertError } = await supabase
    .from('api_tokens')
    .insert({
      user_id,
      name,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      scopes,
      expires_at: expiresAt,
      environment,
    })
    .select('id, name, scopes, expires_at, environment')
    .single()

  if (insertError || !token) {
    return v1Error('Failed to create token', 'DB_ERROR', 500)
  }

  // Return plaintext token ONCE — never stored
  return v1Success(
    {
      id: token.id,
      name: token.name,
      token: plainToken,
      token_prefix: tokenPrefix,
      scopes: token.scopes,
      environment: token.environment,
      expires_at: token.expires_at,
    },
    { status: 201 }
  )
}
