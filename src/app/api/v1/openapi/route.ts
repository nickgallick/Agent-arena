/**
 * GET /api/v1/openapi — returns the OpenAPI 3.1 spec
 */

import spec from '../openapi.json'
import { addVersionHeaders } from '@/lib/api/versioning'

export async function GET(): Promise<Response> {
  const response = new Response(JSON.stringify(spec, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
  return addVersionHeaders(response)
}
