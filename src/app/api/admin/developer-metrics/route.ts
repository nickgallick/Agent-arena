/**
 * GET /api/admin/developer-metrics — developer integration metrics
 *
 * Admin auth required.
 * Returns: token creation rates, webhook health, sandbox vs production split.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

export async function GET(): Promise<Response> {
  return withAdmin(async () => {
    const supabase = createAdminClient()

    const [
      tokenMetricsRes,
      tokenEnvRes,
      webhookStatsRes,
      webhookFailureRes,
    ] = await Promise.all([
      // Token creation by day for last 30 days
      supabase
        .from('api_tokens')
        .select('created_at, environment')
        .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
        .is('revoked_at', null),

      // Total active tokens by environment
      supabase
        .from('api_tokens')
        .select('environment')
        .is('revoked_at', null),

      // Webhook subscription stats
      supabase
        .from('webhook_subscriptions')
        .select('active, failure_count, consecutive_failures'),

      // Recent webhook delivery failures (last 24h)
      supabase
        .from('webhook_deliveries')
        .select('status, created_at')
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
    ])

    // Build token creation by day
    const tokensByDay: Record<string, { production: number; sandbox: number }> = {}
    for (const token of tokenMetricsRes.data ?? []) {
      const day = token.created_at.slice(0, 10)
      if (!tokensByDay[day]) tokensByDay[day] = { production: 0, sandbox: 0 }
      const env = token.environment === 'sandbox' ? 'sandbox' : 'production'
      tokensByDay[day][env]++
    }

    const tokenCreationByDay = Object.entries(tokensByDay)
      .map(([day, counts]) => ({ day, ...counts, total: counts.production + counts.sandbox }))
      .sort((a, b) => a.day.localeCompare(b.day))

    // Token environment split (all active)
    const allActiveTokens = tokenEnvRes.data ?? []
    const tokenEnvSplit = {
      production: allActiveTokens.filter(t => t.environment !== 'sandbox').length,
      sandbox: allActiveTokens.filter(t => t.environment === 'sandbox').length,
      total: allActiveTokens.length,
    }

    // Webhook health stats
    const allWebhooks = webhookStatsRes.data ?? []
    const webhookStats = {
      total: allWebhooks.length,
      active: allWebhooks.filter(w => w.active).length,
      disabled: allWebhooks.filter(w => !w.active).length,
      failing: allWebhooks.filter(w => w.active && (w.failure_count >= 5 || w.consecutive_failures > 0)).length,
      failure_rate: allWebhooks.length > 0
        ? Math.round((allWebhooks.filter(w => w.failure_count > 0).length / allWebhooks.length) * 100)
        : 0,
    }

    // Recent failures count
    const recentFailures = (webhookFailureRes.data ?? []).length

    return NextResponse.json({
      token_creation_by_day: tokenCreationByDay,
      token_env_split: tokenEnvSplit,
      webhook_stats: webhookStats,
      recent_failures_24h: recentFailures,
    })
  })
}
