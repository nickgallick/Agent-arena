// calculate-ratings/index.ts
// Forge · 2026-03-27 (updated: uses composite_score as authoritative score; final_score kept in sync via trigger)

import { getSupabaseClient } from '../_shared/supabase-client.ts'
import { calculateNewRating } from '../_shared/glicko2.ts'

Deno.serve(async (req: Request) => {
  try {
    const { challenge_id } = await req.json()
    const supabase = getSupabaseClient()

    // Get challenge info
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, weight_class_id, max_coins')
      .eq('id', challenge_id)
      .single()

    if (!challenge) {
      return new Response(JSON.stringify({ error: 'Challenge not found' }), { status: 404 })
    }

    // Get all judged entries — use composite_score as authoritative score
    // final_score is kept in sync via trigger trg_sync_composite_to_final
    const { data: entries } = await supabase
      .from('challenge_entries')
      .select('id, agent_id, user_id, composite_score, final_score')
      .eq('challenge_id', challenge_id)
      .eq('status', 'judged')
      .order('composite_score', { ascending: false })

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ status: 'no_entries' }), { status: 200 })
    }

    // Assign placements
    const sortedEntries = entries.map((entry: any, index: number) => ({
      ...entry,
      placement: index + 1,
    }))

    // Get current ratings for all agents
    const agentIds = sortedEntries.map((e: any) => e.agent_id)
    const weightClassId = challenge.weight_class_id || 'frontier'

    const { data: currentRatings } = await supabase
      .from('agent_ratings')
      .select('*')
      .in('agent_id', agentIds)
      .eq('weight_class_id', weightClassId)

    const ratingsMap = new Map(
      (currentRatings || []).map((r: any) => [r.agent_id, r])
    )

    // Calculate new ratings using Glicko-2
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      const currentRating = ratingsMap.get(entry.agent_id) || {
        rating: 1500,
        rating_deviation: 350,
        volatility: 0.06,
      }

      // Build opponent list from other entries
      // Use composite_score for head-to-head Glicko-2 comparison
      // Fall back to final_score if composite_score is null (legacy entries)
      const getScore = (e: any) => e.composite_score ?? e.final_score ?? 0

      const opponents = sortedEntries
        .filter((_: any, j: number) => j !== i)
        .map((opp: any) => {
          const oppRating = ratingsMap.get(opp.agent_id) || {
            rating: 1500,
            rating_deviation: 350,
          }
          return {
            rating: oppRating.rating,
            rd: oppRating.rating_deviation,
            score: getScore(entry) > getScore(opp) ? 1 :
                   getScore(entry) < getScore(opp) ? 0 : 0.5,
          }
        })

      const newRating = calculateNewRating(
        {
          rating: currentRating.rating,
          rd: currentRating.rating_deviation,
          volatility: currentRating.volatility,
        },
        opponents
      )

      const eloChange = newRating.rating - currentRating.rating

      // Update rating via advisory-locked function
      await supabase.rpc('update_agent_elo', {
        p_agent_id: entry.agent_id,
        p_weight_class_id: weightClassId,
        p_new_rating: Math.round(newRating.rating * 100) / 100,
        p_new_rd: Math.round(newRating.rd * 100) / 100,
        p_new_volatility: Math.round(newRating.volatility * 1000000) / 1000000,
        p_placement: entry.placement,
        p_total_entries: sortedEntries.length,
      })

      // Update entry with placement and ELO change
      await supabase
        .from('challenge_entries')
        .update({
          placement: entry.placement,
          elo_change: Math.round(eloChange * 100) / 100,
        })
        .eq('id', entry.id)

      // Award coins
      let coins = 10 // participation
      if (entry.placement === 1) coins = challenge.max_coins
      else if (entry.placement === 2) coins = Math.round(challenge.max_coins * 0.6)
      else if (entry.placement === 3) coins = Math.round(challenge.max_coins * 0.3)

      await supabase.rpc('credit_wallet', {
        p_user_id: entry.user_id,
        p_amount: coins,
        p_type: 'challenge_reward',
        p_reference_id: entry.id,
        p_description: `#${entry.placement} in ${challenge_id.slice(0, 8)}`,
      })

      await supabase
        .from('challenge_entries')
        .update({ coins_awarded: coins })
        .eq('id', entry.id)
    }

    // Mark challenge as complete
    await supabase
      .from('challenges')
      .update({ status: 'complete', judging_completed_at: new Date().toISOString() })
      .eq('id', challenge_id)

    // Generate result cards for top 3
    for (const entry of sortedEntries.slice(0, 3)) {
      await supabase.from('job_queue').insert({
        type: 'generate_result_card',
        priority: 5,
        payload: { entry_id: entry.id, challenge_id },
      })
    }

    return new Response(JSON.stringify({
      status: 'ratings_updated',
      entries_processed: sortedEntries.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
