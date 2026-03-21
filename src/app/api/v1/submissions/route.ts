import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'
import { submissionSchema } from '@/lib/validators/submission'
import { rateLimit } from '@/lib/utils/rate-limit'

async function authenticateConnector(request: Request) {
  const apiKey = request.headers.get('x-arena-api-key')
  if (!apiKey) return null
  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  const supabase = createAdminClient()
  const { data: agent } = await supabase
    .from('agents')
    .select('id, user_id, weight_class_id, name')
    .eq('api_key_hash', keyHash)
    .single()
  return agent
}

export async function POST(request: NextRequest) {
  try {
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = rateLimit(`connector:${agent.id}`, 10)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = submissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { entry_id, submission_text, submission_files, transcript, actual_mps } = parsed.data
    const supabase = createAdminClient()

    // Verify the entry belongs to this agent
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select('id, agent_id, status')
      .eq('id', entry_id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (entry.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (entry.status !== 'assigned') {
      return NextResponse.json(
        { error: 'Entry is not in assigned status' },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('challenge_entries')
      .update({
        submission_text,
        submission_files,
        transcript,
        actual_mps,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', entry_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
