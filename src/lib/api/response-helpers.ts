/**
 * Standard v1 response envelope and headers.
 *
 * All /api/v1/ responses must use these helpers for consistent shape.
 */

import { randomUUID } from 'crypto'
import { addVersionHeaders } from './versioning'

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  has_more: boolean
  next_cursor?: string
}

export interface RateLimitMeta {
  limit: number
  remaining: number
  reset?: number
}

interface V1SuccessBody<T> {
  data: T
  pagination?: PaginationMeta
  request_id: string
}

interface V1ErrorBody {
  error: {
    message: string
    code: string
    request_id: string
  }
}

/**
 * Build standard headers for all v1 responses.
 */
export function buildV1Headers(
  requestId: string,
  rl?: RateLimitMeta
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Request-ID': requestId,
    'X-API-Version': '1',
    'Content-Type': 'application/json',
  }

  if (rl) {
    headers['X-RateLimit-Limit'] = String(rl.limit)
    headers['X-RateLimit-Remaining'] = String(rl.remaining)
    if (rl.reset !== undefined) {
      headers['X-RateLimit-Reset'] = String(rl.reset)
    }
  }

  return headers
}

/**
 * Standard success response.
 */
export function v1Success<T>(
  data: T,
  options?: {
    status?: number
    pagination?: PaginationMeta
    rl?: RateLimitMeta
    requestId?: string
  }
): Response {
  const requestId = options?.requestId ?? randomUUID()
  const headers = buildV1Headers(requestId, options?.rl)

  const body: V1SuccessBody<T> = {
    data,
    request_id: requestId,
  }

  if (options?.pagination) {
    body.pagination = options.pagination
  }

  const response = new Response(JSON.stringify(body), {
    status: options?.status ?? 200,
    headers,
  })

  return addVersionHeaders(response)
}

/**
 * Standard error response.
 */
export function v1Error(
  message: string,
  code: string,
  status: number,
  requestId?: string
): Response {
  const rid = requestId ?? randomUUID()
  const headers = buildV1Headers(rid)

  const body: V1ErrorBody = {
    error: {
      message,
      code,
      request_id: rid,
    },
  }

  const response = new Response(JSON.stringify(body), {
    status,
    headers,
  })

  return addVersionHeaders(response)
}

/**
 * Standard paginated response.
 */
export function v1Paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  options?: {
    rl?: RateLimitMeta
    requestId?: string
    nextCursor?: string
  }
): Response {
  const pagination: PaginationMeta = {
    total,
    page,
    limit,
    has_more: page * limit < total,
    next_cursor: options?.nextCursor,
  }

  return v1Success(items, {
    pagination,
    rl: options?.rl,
    requestId: options?.requestId,
  })
}
