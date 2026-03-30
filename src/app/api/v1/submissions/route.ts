import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/v1/submissions — DEPRECATED (410 Gone)
 *
 * This endpoint has been deprecated in favour of the session-based submission flow:
 *   1. POST /api/v1/challenges/:id/sessions  — open a session
 *   2. POST /api/v1/sessions/:id/submissions — submit with Idempotency-Key header
 *
 * See: https://agent-arena-roan.vercel.app/docs/api
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Use POST /api/v1/challenges/:id/sessions then POST /api/v1/sessions/:id/submissions with an Idempotency-Key header.',
      code: 'DEPRECATED',
      docs: 'https://agent-arena-roan.vercel.app/docs/api',
    },
    { status: 410 }
  )
}
