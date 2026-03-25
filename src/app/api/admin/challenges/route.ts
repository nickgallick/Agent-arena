import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createChallengeSchema } from '@/lib/validators/challenge'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

type ChallengeRow = {
  id: string
  title: string
  status: string
  category: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

type EntryCountRow = {
  challenge_id: string
  status: string
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}:challenges-read`, 30, 60_000)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '50')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50

    const supabase = createAdminClient()

    const { data: challenges, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, status, category, starts_at, ends_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (challengeError) {
      return NextResponse.json({ error: challengeError.message }, { status: 500 })
    }

    const challengeIds = (challenges ?? []).map((challenge) => challenge.id)

    let entryCounts = new Map<string, number>()
    let submittedCounts = new Map<string, number>()

    if (challengeIds.length > 0) {
      const { data: entries, error: entryError } = await supabase
        .from('challenge_entries')
        .select('challenge_id, status')
        .in('challenge_id', challengeIds)

      if (entryError) {
        return NextResponse.json({ error: entryError.message }, { status: 500 })
      }

      for (const entry of (entries ?? []) as EntryCountRow[]) {
        entryCounts.set(entry.challenge_id, (entryCounts.get(entry.challenge_id) ?? 0) + 1)
        if (entry.status === 'submitted') {
          submittedCounts.set(entry.challenge_id, (submittedCounts.get(entry.challenge_id) ?? 0) + 1)
        }
      }
    }

    const enriched = ((challenges ?? []) as ChallengeRow[]).map((challenge) => ({
      ...challenge,
      entry_count: entryCounts.get(challenge.id) ?? 0,
      submitted_entry_count: submittedCounts.get(challenge.id) ?? 0,
    }))

    return NextResponse.json({ challenges: enriched })
  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (e.message === 'Service unavailable') return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}:challenges-write`, 10, 60_000)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = createChallengeSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({
        error: issues[0],
        details: issues,
        required_fields: {
          title: 'string, 1-200 chars',
          description: 'string, 1-2000 chars',
          prompt: 'string, 1-10000 chars',
          category: 'speed_build | deep_research | problem_solving | algorithm | debug | design | optimization | testing | code_golf',
          format: 'sprint | standard | marathon | creative',
          challenge_type: 'daily | weekly_featured | special',
          starts_at: 'ISO datetime string, e.g. 2026-03-24T06:00:00Z',
          ends_at: 'ISO datetime string, e.g. 2026-03-25T06:00:00Z',
        },
        optional_fields: {
          weight_class_id: 'string or null (default: open to all)',
          time_limit_minutes: 'integer 5-480 (default: 60)',
          max_coins: 'integer 0-10000 (default: 500)',
        },
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert(parsed.data)
      .select()
      .single()

    if (error) {
      console.error('[admin] DB error:', error.message)
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
    }

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (e.message === 'Service unavailable') return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
