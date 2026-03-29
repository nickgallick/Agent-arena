/**
 * GET /api/admin/analytics/retention
 *
 * Retention / cohort analytics. Admin only.
 * Query param: days=30|60|90 (default 30)
 *
 * Returns:
 * - sandbox_to_production_conversion
 * - first_to_second_submission
 * - repeat_usage_by_access_mode
 * - webhook_subscription_retention
 * - token_churn
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export async function GET(request: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1), 90)
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const supabase = createAdminClient()

    // ── 1. Sandbox → Production Conversion ──
    const sandboxToProduction = await (async () => {
      // Get users with sandbox events in window
      const { data: sandboxEvents } = await supabase
        .from('platform_events')
        .select('user_id, created_at')
        .eq('environment', 'sandbox')
        .gte('created_at', since)
        .not('user_id', 'is', null)

      // Get users with production events in window
      const { data: prodEvents } = await supabase
        .from('platform_events')
        .select('user_id, created_at')
        .eq('environment', 'production')
        .gte('created_at', since)
        .not('user_id', 'is', null)

      const sandboxUsers = new Map<string, string>() // user_id → first sandbox event
      for (const e of sandboxEvents ?? []) {
        if (!sandboxUsers.has(e.user_id) || e.created_at < sandboxUsers.get(e.user_id)!) {
          sandboxUsers.set(e.user_id, e.created_at)
        }
      }

      const prodUsers = new Map<string, string>() // user_id → first prod event
      for (const e of prodEvents ?? []) {
        if (!prodUsers.has(e.user_id) || e.created_at < prodUsers.get(e.user_id)!) {
          prodUsers.set(e.user_id, e.created_at)
        }
      }

      // Users who had sandbox activity (may or may not have converted)
      let usersWithSandboxOnly = 0
      let usersConverted = 0
      const daysToConvert: number[] = []

      for (const [userId, firstSandbox] of sandboxUsers.entries()) {
        const firstProd = prodUsers.get(userId)
        if (firstProd) {
          usersConverted++
          const diffMs = new Date(firstProd).getTime() - new Date(firstSandbox).getTime()
          const diffDays = Math.max(0, diffMs / 86_400_000)
          daysToConvert.push(diffDays)
        } else {
          usersWithSandboxOnly++
        }
      }

      const total = usersWithSandboxOnly + usersConverted
      return {
        users_with_sandbox_only: usersWithSandboxOnly,
        users_converted_to_production: usersConverted,
        conversion_rate_pct: total > 0 ? Math.round((usersConverted / total) * 1000) / 10 : 0,
        median_days_to_convert: Math.round(median(daysToConvert) * 10) / 10,
      }
    })()

    // ── 2. First → Second Submission ──
    const firstToSecond = await (async () => {
      const { data: submissions } = await supabase
        .from('submissions')
        .select('agent_id, submitted_at')
        .gte('submitted_at', since)
        .not('agent_id', 'is', null)
        .order('submitted_at', { ascending: true })

      // Group by agent_id
      const agentSubmissions = new Map<string, string[]>()
      for (const s of submissions ?? []) {
        if (!agentSubmissions.has(s.agent_id)) {
          agentSubmissions.set(s.agent_id, [])
        }
        agentSubmissions.get(s.agent_id)!.push(s.submitted_at)
      }

      let agentsWithOne = 0
      let agentsWithTwoPlus = 0
      const daysToSecond: number[] = []

      for (const [, dates] of agentSubmissions.entries()) {
        if (dates.length === 1) {
          agentsWithOne++
        } else {
          agentsWithTwoPlus++
          // dates already sorted ascending
          const diffMs = new Date(dates[1]).getTime() - new Date(dates[0]).getTime()
          daysToSecond.push(Math.max(0, diffMs / 86_400_000))
        }
      }

      const total = agentsWithOne + agentsWithTwoPlus
      return {
        agents_with_one_submission: agentsWithOne,
        agents_with_two_plus: agentsWithTwoPlus,
        conversion_rate_pct: total > 0 ? Math.round((agentsWithTwoPlus / total) * 1000) / 10 : 0,
        median_days_to_second: Math.round(median(daysToSecond) * 10) / 10,
      }
    })()

    // ── 3. Repeat Usage by Access Mode ──
    const repeatUsageByMode = await (async () => {
      const { data: events } = await supabase
        .from('platform_events')
        .select('user_id, access_mode, created_at')
        .gte('created_at', since)
        .not('user_id', 'is', null)
        .not('access_mode', 'is', null)

      // Group by access_mode → user_id → dates
      const modeUserDates = new Map<string, Map<string, string[]>>()
      for (const e of events ?? []) {
        const mode = e.access_mode as string
        if (!modeUserDates.has(mode)) modeUserDates.set(mode, new Map())
        const userMap = modeUserDates.get(mode)!
        if (!userMap.has(e.user_id)) userMap.set(e.user_id, [])
        userMap.get(e.user_id)!.push(e.created_at)
      }

      const result: Record<string, { total_users: number; repeat_users: number; repeat_rate_pct: number }> = {}
      for (const [mode, userMap] of modeUserDates.entries()) {
        let repeatUsers = 0
        for (const dates of userMap.values()) {
          if (dates.length > 1) repeatUsers++
        }
        const totalUsers = userMap.size
        result[mode] = {
          total_users: totalUsers,
          repeat_users: repeatUsers,
          repeat_rate_pct: totalUsers > 0 ? Math.round((repeatUsers / totalUsers) * 1000) / 10 : 0,
        }
      }

      return result
    })()

    // ── 4. Webhook Subscription Retention ──
    const webhookRetention = await (async () => {
      const { data: webhooks } = await supabase
        .from('webhook_subscriptions')
        .select('created_at, active')
        .gte('created_at', since)

      const created = (webhooks ?? []).length
      const stillActive = (webhooks ?? []).filter(w => w.active === true).length

      return {
        created_30d: created,
        still_active: stillActive,
        retention_rate_pct: created > 0 ? Math.round((stillActive / created) * 1000) / 10 : 0,
      }
    })()

    // ── 5. Token Churn ──
    const tokenChurn = await (async () => {
      const { data: tokens } = await supabase
        .from('api_tokens')
        .select('created_at, revoked_at')
        .gte('created_at', since)

      const created = (tokens ?? []).length
      const revoked = (tokens ?? []).filter(t => t.revoked_at !== null).length

      return {
        created_30d: created,
        revoked_30d: revoked,
        churn_rate_pct: created > 0 ? Math.round((revoked / created) * 1000) / 10 : 0,
      }
    })()

    return NextResponse.json({
      period_days: days,
      sandbox_to_production_conversion: sandboxToProduction,
      first_to_second_submission: firstToSecond,
      repeat_usage_by_access_mode: repeatUsageByMode,
      webhook_subscription_retention: webhookRetention,
      token_churn: tokenChurn,
    })
  })
}
