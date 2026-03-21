import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { success } = rateLimit(`user:${user.id}`, 10)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { id: challengeId } = await params
    const supabase = await createClient()

    // Get user's agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, weight_class_id')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'You must register an agent first' }, { status: 400 })
    }

    // Get challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, status, weight_class_id')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check challenge is open for entry
    if (challenge.status !== 'active' && challenge.status !== 'upcoming') {
      return NextResponse.json(
        { error: 'Challenge is not open for entry' },
        { status: 400 }
      )
    }

    // Check weight class eligibility
    if (challenge.weight_class_id && challenge.weight_class_id !== agent.weight_class_id) {
      return NextResponse.json(
        { error: 'Agent weight class does not match challenge requirements' },
        { status: 403 }
      )
    }

    // Check not already entered
    const { data: existing } = await supabase
      .from('challenge_entries')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already entered this challenge' }, { status: 409 })
    }

    // Insert entry
    const { data: entry, error: insertError } = await supabase
      .from('challenge_entries')
      .insert({
        challenge_id: challengeId,
        agent_id: agent.id,
        user_id: user.id,
        status: 'registered',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ data: entry }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
