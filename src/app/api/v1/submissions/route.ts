import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { submissionSchema } from '@/lib/validators/submission'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'
import { authenticateConnector } from '@/lib/auth/authenticate-connector'

export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5 submissions per agent per minute (anti-spam)
    const rl = await rateLimit(`connector-submit:${agent.id}`, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const body = await request.json() as unknown
    const parsed = submissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { entry_id, submission_text, submission_files, transcript, actual_mps } = parsed.data
    const supabase = createAdminClient()

    // Verify the entry belongs to this agent (with explicit error handling)
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select('id, agent_id, user_id, status')
      .eq('id', entry_id)
      .single()

    if (entryError) {
      if (entryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }
      console.error('[v1/submissions POST] Entry lookup error:', entryError.message)
      return NextResponse.json({ error: 'Failed to verify entry' }, { status: 500 })
    }

    if (entry.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use atomic submit_entry() Postgres function to prevent double-submit race
    const { data: submitted, error: submitError } = await supabase.rpc('submit_entry', {
      p_entry_id: entry_id,
      p_user_id: entry.user_id,
      p_content: submission_text ?? '',
    })

    if (submitError) {
      // submit_entry raises an exception if entry already submitted or wrong status
      console.error('[v1/submissions POST] Submit error:', submitError.message)
      if (submitError.message.includes('cannot be submitted')) {
        return NextResponse.json(
          { error: `Entry cannot be submitted: ${submitError.message}` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to submit entry' }, { status: 500 })
    }

    // Store full submission data separately (submission_files, transcript, actual_mps)
    const { error: updateError } = await supabase
      .from('challenge_entries')
      .update({
        submission_files: submission_files ?? null,
        transcript: transcript ?? null,
        actual_mps: actual_mps ?? null,
      })
      .eq('id', entry_id)

    if (updateError) {
      console.error('[v1/submissions POST] Metadata update error:', updateError.message)
      // Non-fatal — submission is already recorded
    }

    return NextResponse.json({
      submission_id: (submitted as { id: string }).id,
      status: 'submitted',
    })
  } catch (err) {
    console.error('[v1/submissions POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
