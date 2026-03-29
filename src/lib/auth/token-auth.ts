/**
 * Unified auth resolver for /api/v1/ routes.
 *
 * Resolves auth from:
 *   1. Bearer bouts_sk_* / bouts_sk_test_* (API token)
 *   2. Bearer JWT (Supabase user session)
 *   3. Bearer aa_* (connector agent token)
 *
 * Returns AuthContext or null.
 */

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type TokenType = 'jwt' | 'api_token' | 'connector' | 'service'

export interface AuthContext {
  user_id: string
  agent_id?: string
  scopes: string[]
  token_type: TokenType
  is_admin: boolean
  environment: 'production' | 'sandbox'
  token_id?: string
}

export const ALL_SCOPES = [
  'challenge:read',
  'challenge:enter',
  'submission:create',
  'submission:read',
  'result:read',
  'leaderboard:read',
  'agent:write',
  'webhook:manage',
] as const

export type Scope = typeof ALL_SCOPES[number]

const ALL_SCOPES_SET = new Set<string>(ALL_SCOPES)

/**
 * Resolve auth from Authorization header.
 * Returns null if no valid auth found.
 */
export async function resolveAuth(request: Request): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7).trim()
  if (!token) return null

  // API token path — both production (bouts_sk_) and sandbox (bouts_sk_test_)
  if (token.startsWith('bouts_sk_')) {
    return resolveApiToken(token)
  }

  // Connector token path
  if (token.startsWith('aa_')) {
    return resolveConnectorToken(token)
  }

  // JWT path — use Supabase session cookie or Bearer JWT
  return resolveJwt()
}

async function resolveApiToken(token: string): Promise<AuthContext | null> {
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = createAdminClient()

  const { data: apiToken, error } = await supabase
    .from('api_tokens')
    .select('id, user_id, scopes, revoked_at, expires_at, environment')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !apiToken) return null

  // Check revoked
  if (apiToken.revoked_at) return null

  // Check expired
  if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) return null

  // Update last_used_at (fire-and-forget)
  void supabase
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiToken.id)

  const is_admin = await checkIsAdmin(apiToken.user_id, supabase)
  const environment = (apiToken.environment ?? 'production') as 'production' | 'sandbox'

  return {
    user_id: apiToken.user_id,
    scopes: is_admin ? [...ALL_SCOPES] : (apiToken.scopes as string[]),
    token_type: 'api_token',
    is_admin,
    environment,
    token_id: apiToken.id as string,
  }
}

async function resolveConnectorToken(token: string): Promise<AuthContext | null> {
  const keyHash = createHash('sha256').update(token).digest('hex')
  const supabase = createAdminClient()

  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, user_id')
    .eq('api_key_hash', keyHash)
    .maybeSingle()

  if (error || !agent) return null

  return {
    user_id: agent.user_id,
    agent_id: agent.id,
    scopes: ['challenge:read', 'submission:create', 'submission:read', 'result:read'],
    token_type: 'connector',
    is_admin: false,
    environment: 'production',
  }
}

async function resolveJwt(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const adminSupabase = createAdminClient()
    const is_admin = await checkIsAdmin(user.id, adminSupabase)

    return {
      user_id: user.id,
      scopes: is_admin ? [...ALL_SCOPES] : [...ALL_SCOPES],
      token_type: 'jwt',
      is_admin,
      environment: 'production',
    }
  } catch {
    return null
  }
}

async function checkIsAdmin(
  userId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return profile?.role === 'admin'
}

/**
 * Check if auth context has required scope.
 * Admin users implicitly have all scopes.
 */
export function hasScope(auth: AuthContext, scope: Scope): boolean {
  if (auth.is_admin) return true
  // JWT users (web sessions) have all non-admin scopes
  if (auth.token_type === 'jwt') return ALL_SCOPES_SET.has(scope)
  return auth.scopes.includes(scope)
}

/**
 * Require a specific scope. Throws HTTP-like error on failure.
 * Call at top of route handler.
 */
export async function requireScope(request: Request, scope: Scope): Promise<AuthContext> {
  const auth = await resolveAuth(request)

  if (!auth) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }

  if (!hasScope(auth, scope)) {
    throw Object.assign(new Error('Insufficient scope'), { status: 403 })
  }

  return auth
}

/**
 * Attempt to resolve auth without throwing — returns null if not authenticated.
 * Useful for public endpoints that behave differently when authenticated.
 */
export async function optionalAuth(request: Request): Promise<AuthContext | null> {
  try {
    return await resolveAuth(request)
  } catch {
    return null
  }
}

/**
 * Returns true if the auth context represents a sandbox environment.
 */
export function isSandbox(auth: AuthContext): boolean {
  return auth.environment === 'sandbox'
}

/**
 * Fire-and-forget update to last_used_access_mode and last_used_at on an API token.
 */
export function updateTokenAccessMode(tokenId: string, accessMode: string): void {
  const supabase = createAdminClient()
  void supabase
    .from('api_tokens')
    .update({
      last_used_access_mode: accessMode,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', tokenId)
}
