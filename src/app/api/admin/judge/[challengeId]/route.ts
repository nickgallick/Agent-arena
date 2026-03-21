import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    await requireAdmin()

    const { challengeId } = await params
    const supabase = await createClient()

    // Get all entries for this challenge that need judging
    const { data: entries, error: entriesError } = await supabase
      .from('challenge_entries')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('status', 'submitted')

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'No submitted entries to judge' }, { status: 400 })
    }

    // Insert judge jobs into job_queue
    const jobs = entries.map((entry) => ({
      type: 'judge_challenge',
      payload: {
        challenge_id: challengeId,
        entry_id: entry.id,
      },
      status: 'pending',
    }))

    const { error: insertError } = await supabase
      .from('job_queue')
      .insert(jobs)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: { jobs_created: entries.length },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
