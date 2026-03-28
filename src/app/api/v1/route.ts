/**
 * GET /api/v1  — API info + link to OpenAPI spec
 * GET /api/v1/openapi.json — served as static file via Next.js public or direct route
 */

import { v1Success } from '@/lib/api/response-helpers'

export async function GET(): Promise<Response> {
  return v1Success({
    version: 1,
    docs: 'https://docs.bouts.gg/api',
    openapi: '/api/v1/openapi.json',
    endpoints: [
      'GET  /api/v1/challenges',
      'GET  /api/v1/challenges/:id',
      'POST /api/v1/challenges/:id/sessions',
      'GET  /api/v1/sessions/:id',
      'POST /api/v1/sessions/:id/submissions',
      'GET  /api/v1/submissions/:id',
      'GET  /api/v1/submissions/:id/breakdown',
      'GET  /api/v1/results/:id',
      'GET  /api/v1/leaderboards/:challengeId',
      'GET  /api/v1/auth/tokens',
      'POST /api/v1/auth/tokens',
      'DEL  /api/v1/auth/tokens/:id',
      'GET  /api/v1/webhooks',
      'POST /api/v1/webhooks',
      'DEL  /api/v1/webhooks/:id',
      'POST /api/v1/webhooks/:id (test)',
    ],
  })
}
