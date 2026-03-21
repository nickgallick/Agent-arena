import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { jobQuerySchema } from '@/lib/validators/admin'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const parsed = jobQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { status, type, page = 1, limit = 20 } = parsed.data
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // Get filtered jobs
    let query = supabase
      .from('job_queue')
      .select('*', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get stats by status
    const { data: allJobs } = await supabase
      .from('job_queue')
      .select('status')

    const stats = (allJobs ?? []).reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
      stats,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
