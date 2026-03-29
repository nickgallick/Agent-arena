/**
 * POST /api/analytics/track
 *
 * Client-side analytics event ingestion.
 * Accepts only a whitelist of event types (no arbitrary event injection).
 * Auth is optional — anonymous events are allowed for docs funnel.
 */
import { z } from 'zod'
import { optionalAuth } from '@/lib/auth/token-auth'
import { logEvent, type EventType } from '@/lib/analytics/log-event'

// Whitelist of events that can be sent from the client
const CLIENT_EVENT_WHITELIST = new Set<string>([
  'docs_page_viewed',
  'quickstart_started',
  'quickstart_completed',
  'install_snippet_copied',
  'sandbox_quickstart_clicked',
])

const trackSchema = z.object({
  event_type: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(null, { status: 204 })
  }

  const parsed = trackSchema.safeParse(body)
  if (!parsed.success) return new Response(null, { status: 204 })

  const { event_type, metadata } = parsed.data

  // Only allow whitelisted events from client
  if (!CLIENT_EVENT_WHITELIST.has(event_type)) {
    return new Response(null, { status: 204 }) // silently ignore, don't error
  }

  const auth = await optionalAuth(request)

  logEvent({
    event_type: event_type as EventType,
    auth,
    request,
    metadata,
  })

  return new Response(null, { status: 204 })
}
