/**
 * Platform event logger — fire-and-forget.
 *
 * Instruments key platform actions for adoption analytics.
 * Never throws — failure to log must never break the actual request.
 *
 * Access mode is inferred from:
 * 1. x-bouts-client header (SDK/CLI/Action send this)
 * 2. AuthContext.token_type (connector = connector mode)
 * 3. Default: 'api' for API token, 'web' for JWT
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { AuthContext } from '@/lib/auth/token-auth'

export type EventType =
  | 'token_created'
  | 'token_revoked'
  | 'session_created'
  | 'submission_received'
  | 'submission_completed'
  | 'result_retrieved'
  | 'breakdown_retrieved'
  | 'webhook_created'
  | 'webhook_deleted'
  | 'webhook_delivery_success'
  | 'webhook_delivery_failed'
  | 'auth_failed'
  | 'scope_error'
  | 'submission_validation_failed'
  | 'challenge_listed'
  | 'dry_run_validated'
  | 'sandbox_session_created'
  | 'docs_page_viewed'
  | 'agent_registered'
  | 'org_created'
  | 'interest_signal_sent'
  | 'quickstart_started'
  | 'quickstart_completed'
  | 'install_snippet_copied'
  | 'sandbox_quickstart_clicked'
  | 'first_sandbox_flow_completed'
  | 'first_production_flow_completed'
  | 'first_webhook_delivery_success'
  | 'first_repeat_submission'

export interface LogEventOptions {
  event_type: EventType
  auth?: AuthContext | null
  request?: Request
  challenge_id?: string
  session_id?: string
  submission_id?: string
  success?: boolean
  error_code?: string
  metadata?: Record<string, unknown>
}

export function inferAccessMode(
  auth: AuthContext | null | undefined,
  request?: Request
): string {
  // Check x-bouts-client header first (SDK/CLI/Action set this)
  if (request) {
    const clientHeader = request.headers.get('x-bouts-client')
    if (clientHeader) {
      if (clientHeader.startsWith('sdk-typescript')) return 'sdk-typescript'
      if (clientHeader.startsWith('sdk-python')) return 'sdk-python'
      if (clientHeader.startsWith('cli')) return 'cli'
      if (clientHeader.startsWith('github-action')) return 'github-action'
      if (clientHeader.startsWith('mcp')) return 'mcp'
    }
  }

  if (!auth) return 'api' // anonymous API call
  if (auth.token_type === 'connector') return 'connector'
  if (auth.token_type === 'jwt') return 'web'
  if (auth.token_type === 'api_token') return 'api'
  return 'api'
}

/**
 * Log a platform event. Fire-and-forget — never throws.
 */
export function logEvent(options: LogEventOptions): void {
  try {
    const {
      event_type,
      auth,
      request,
      challenge_id,
      session_id,
      submission_id,
      success = true,
      error_code,
      metadata = {},
    } = options

    const supabase = createAdminClient()
    const access_mode = inferAccessMode(auth, request)
    const environment = auth?.environment ?? 'production'

    const insertPromise = supabase
      .from('platform_events')
      .insert({
        event_type,
        access_mode,
        environment,
        user_id: auth?.user_id ?? null,
        agent_id: auth?.agent_id ?? null,
        token_id: auth?.token_id ?? null,
        challenge_id: challenge_id ?? null,
        session_id: session_id ?? null,
        submission_id: submission_id ?? null,
        success,
        error_code: error_code ?? null,
        metadata,
      })
    void Promise.resolve(insertPromise).catch(() => {}) // truly fire-and-forget
  } catch {
    // never throw — analytics must never break requests
  }
}
