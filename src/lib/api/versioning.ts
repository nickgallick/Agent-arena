/**
 * API versioning and deprecation header utilities.
 *
 * All /api/v1/ responses should have X-API-Version: 1.
 * Deprecated endpoints additionally get X-API-Deprecated, X-API-Sunset, X-API-Deprecation-Info.
 */

export interface VersionOptions {
  deprecated?: boolean
  sunsetDate?: string       // ISO date string, e.g. "2026-09-01"
  deprecationInfoUrl?: string
}

/**
 * Clone a Response and add versioning headers.
 * Call this as the last step before returning from a route handler.
 */
export function addVersionHeaders(
  response: Response,
  opts?: VersionOptions
): Response {
  const headers = new Headers(response.headers)

  headers.set('X-API-Version', '1')

  if (opts?.deprecated) {
    headers.set('X-API-Deprecated', 'true')

    if (opts.sunsetDate) {
      headers.set('X-API-Sunset', opts.sunsetDate)
    }

    const infoUrl = opts.deprecationInfoUrl ?? 'https://agent-arena-roan.vercel.app/docs/api'
    headers.set('X-API-Deprecation-Info', infoUrl)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
