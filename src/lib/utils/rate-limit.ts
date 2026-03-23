/**
 * Rate limiter — Supabase-backed sliding window
 *
 * Uses a Supabase table for persistence across Vercel serverless cold starts.
 * Falls back to allowing the request if Supabase is unavailable (fail-open,
 * since we'd rather serve the app than DoS ourselves on a DB hiccup).
 *
 * If UPSTASH_REDIS_REST_URL / TOKEN are configured, those take priority.
 *
 * Table required (migration 00005 adds it if not present):
 *   CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
 *     key TEXT NOT NULL,
 *     count INTEGER NOT NULL DEFAULT 1,
 *     window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     PRIMARY KEY (key)
 *   );
 */

import { createClient } from '@supabase/supabase-js'

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt?: number
}

// Upstash Redis rate limiting (preferred if configured)
async function rateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const windowSec = Math.ceil(windowMs / 1000)
    // INCR + EXPIRE in a pipeline
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSec, 'NX'],
      ]),
    })
    if (!res.ok) return null
    const results = await res.json() as [{ result: number }, { result: number }]
    const count = results[0].result
    const remaining = Math.max(0, limit - count)
    return { success: count <= limit, remaining }
  } catch {
    return null
  }
}

// Supabase-backed rate limiting (fallback)
async function rateLimitSupabase(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) return null

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const windowSecs = Math.ceil(windowMs / 1000)
    const windowStart = new Date(Date.now() - windowMs).toISOString()

    // Upsert: increment count within window, reset if window expired
    const { data, error } = await supabase.rpc('rate_limit_check', {
      p_key: key,
      p_limit: limit,
      p_window_secs: windowSecs,
    })

    if (error) return null

    const count = data as number
    const remaining = Math.max(0, limit - count)
    return { success: count <= limit, remaining }
  } catch {
    return null
  }
}

/**
 * Main rate limit function. Tries Upstash → Supabase → fail-open.
 *
 * @param key      Unique key (e.g. `ip:${ip}:route:/api/challenges`)
 * @param limit    Max requests allowed
 * @param windowMs Time window in milliseconds (default: 60 000 = 1 min)
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): Promise<RateLimitResult> {
  // Try Upstash Redis first (stateful, persists across instances)
  const upstashResult = await rateLimitUpstash(key, limit, windowMs)
  if (upstashResult !== null) return upstashResult

  // Try Supabase (slower but available without extra infra)
  const supabaseResult = await rateLimitSupabase(key, limit, windowMs)
  if (supabaseResult !== null) return supabaseResult

  // Fail-open: no backend available — allow the request
  // Log a warning so operators know rate limiting is disabled
  console.warn('[rate-limit] No backend configured — rate limiting disabled. Set UPSTASH_REDIS_REST_URL or SUPABASE_SERVICE_ROLE_KEY.')
  return { success: true, remaining: limit }
}

/**
 * Helper: extract client IP from Next.js request headers
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
