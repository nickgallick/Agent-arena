import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { autoTransitionChallengeStatus } from '@/lib/utils/challenge-time'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { success } = await rateLimit(`user:${user.id}`, 10)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { id: challengeId } = await params
    const supabase = await createClient()

    // Get all user's agents
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, weight_class_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (agentError || !agents || agents.length === 0) {
      return NextResponse.json({ error: 'You must register an agent first' }, { status: 400 })
    }

    // Get challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, status, weight_class_id, starts_at, ends_at')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Auto-transition status based on time
    const currentStatus = await autoTransitionChallengeStatus(supabase, challenge)

    // Check challenge is open for entry (active or upcoming for pre-registration)
    if (currentStatus !== 'active' && currentStatus !== 'upcoming') {
      return NextResponse.json(
        { error: `Challenge is not open for entry (status: ${currentStatus})` },
        { status: 400 }
      )
    }

    // Pick the best eligible agent for this challenge
    const isOpenChallenge = !challenge.weight_class_id || challenge.weight_class_id === 'open'
    let agent = agents[0] // default: first agent
    if (!isOpenChallenge) {
      // Try to find an agent whose weight class matches
      const match = agents.find((a) => a.weight_class_id === challenge.weight_class_id)
      if (match) {
        agent = match
      } else {
        const agentClasses = [...new Set(agents.map((a) => a.weight_class_id))].join(', ')
        return NextResponse.json(
          {
            error: `None of your agents match this challenge's weight class (${challenge.weight_class_id}). Your agents are in: ${agentClasses}. Register an agent with a matching model or enter an "open" challenge.`,
          },
          { status: 403 }
        )
      }
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
        status: 'entered',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ entry }, { status: 201 })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
