// calculate-ratings/index.ts
// Forge · 2026-03-27 (updated: Phase 2 chain integration — aggregateScores + updateRating)
//
// Integration order (per Chain spec):
//   1. After all entries judged → aggregateScores() per entry (on-chain disagreement logic)
//   2. After Glicko-2 computed → updateRating() per agent (ELO committed on-chain)

import { getSupabaseClient } from '../_shared/supabase-client.ts'
import { calculateNewRating } from '../_shared/glicko2.ts'
import {
  aggregateScores,
  updateRating,
  AggregationResult,
} from '../_shared/chain-client-phase2.ts'

// Whether to run chain calls (off by default in testnet/dev; secrets must be present)
function chainEnabled(): boolean {
  return !!(
    Deno.env.get('BOUTS_SBT_ADDRESS') &&
    Deno.env.get('BOUTS_AGGREGATOR_ADDRESS') &&
    Deno.env.get('JUDGE_ORACLE_PRIVATE_KEY') &&
    Deno.env.get('BASE_RPC_URL')
  )
}

Deno.serve(async (req: Request) => {
  try {
    const { challenge_id } = await req.json()
    const supabase = getSupabaseClient()

    // ── Load challenge ───────────────────────────────────────
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, weight_class_id, max_coins')
      .eq('id', challenge_id)
      .single()

    if (!challenge) {
      return res({ error: 'Challenge not found' }, 404)
    }

    // ── Load judged entries (composite_score authoritative) ──
    const { data: entries } = await supabase
      .from('challenge_entries')
      .select('id, agent_id, user_id, composite_score, final_score, onchain_aggregated')
      .eq('challenge_id', challenge_id)
      .eq('status', 'judged')
      .order('composite_score', { ascending: false })

    if (!entries || entries.length === 0) {
      return res({ status: 'no_entries' })
    }

    // ── Phase 2 Step 1: aggregateScores per entry ────────────
    // Runs BEFORE Glicko-2 — Disputed entries may affect final ranking
    if (chainEnabled()) {
      for (const entry of entries) {
        if (entry.onchain_aggregated) continue  // idempotent skip

        try {
          const agg = await aggregateScores({
            entryId:     entry.id,
            challengeId: challenge_id,
          })

          await supabase.from('challenge_entries').update({
            onchain_aggregated:     true,
            onchain_aggregate_tx:   agg.txHash,
            onchain_aggregate_result: agg.result,
            onchain_final_score:    agg.finalScore,
            // If Disputed on-chain, reflect in dispute_flagged
            dispute_flagged: agg.result === AggregationResult.Disputed
              ? true
              : false,
          }).eq('id', entry.id)

          console.log(`[calculate-ratings] aggregated entry=${entry.id} result=${agg.resultLabel} score=${agg.finalScore}`)
        } catch (err) {
          // Non-fatal — chain aggregation failing doesn't block ratings
          console.warn(`[calculate-ratings] aggregateScores failed for entry=${entry.id}: ${(err as Error).message}`)
        }
      }
    }

    // ── Assign placements ────────────────────────────────────
    const sortedEntries = entries.map((entry: any, index: number) => ({
      ...entry,
      placement: index + 1,
    }))

    // ── Load current ratings ─────────────────────────────────
    const agentIds      = sortedEntries.map((e: any) => e.agent_id)
    const weightClassId = challenge.weight_class_id || 'frontier'

    const { data: currentRatings } = await supabase
      .from('agent_ratings')
      .select('*')
      .in('agent_id', agentIds)
      .eq('weight_class_id', weightClassId)

    const ratingsMap = new Map(
      (currentRatings || []).map((r: any) => [r.agent_id, r])
    )

    // ── Glicko-2 per agent ───────────────────────────────────
    const getScore = (e: any) => e.composite_score ?? e.final_score ?? 0

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      const currentRating = ratingsMap.get(entry.agent_id) || {
        rating:           1500,
        rating_deviation: 350,
        volatility:       0.06,
        wins:             0,
        losses:           0,
        played:           0,
      }

      const opponents = sortedEntries
        .filter((_: any, j: number) => j !== i)
        .map((opp: any) => {
          const oppRating = ratingsMap.get(opp.agent_id) || { rating: 1500, rating_deviation: 350 }
          return {
            rating: oppRating.rating,
            rd:     oppRating.rating_deviation,
            score:  getScore(entry) > getScore(opp) ? 1 :
                    getScore(entry) < getScore(opp) ? 0 : 0.5,
          }
        })

      const newRating  = calculateNewRating(
        { rating: currentRating.rating, rd: currentRating.rating_deviation, volatility: currentRating.volatility },
        opponents
      )
      const eloChange  = newRating.rating - currentRating.rating
      const isWin      = entry.placement === 1 || (sortedEntries.length > 1 && getScore(entry) > getScore(sortedEntries[1]))
      const newWins    = (currentRating.wins   || 0) + (entry.placement === 1 ? 1 : 0)
      const newLosses  = (currentRating.losses || 0) + (entry.placement > 1  ? 1 : 0)
      const newPlayed  = (currentRating.played || 0) + 1

      // Update DB rating
      await supabase.rpc('update_agent_elo', {
        p_agent_id:       entry.agent_id,
        p_weight_class_id: weightClassId,
        p_new_rating:     Math.round(newRating.rating    * 100) / 100,
        p_new_rd:         Math.round(newRating.rd        * 100) / 100,
        p_new_volatility: Math.round(newRating.volatility * 1000000) / 1000000,
        p_placement:      entry.placement,
        p_total_entries:  sortedEntries.length,
      })

      // Update wins/losses/played on agent_ratings
      await supabase.from('agent_ratings').update({
        wins:   newWins,
        losses: newLosses,
        played: newPlayed,
      }).eq('agent_id', entry.agent_id).eq('weight_class_id', weightClassId)

      await supabase.from('challenge_entries').update({
        placement:  entry.placement,
        elo_change: Math.round(eloChange * 100) / 100,
      }).eq('id', entry.id)

      // ── Phase 2 Step 2: updateRating on-chain ─────────────
      if (chainEnabled()) {
        try {
          // Get token ID from agent record
          const { data: agentRow } = await supabase
            .from('agents')
            .select('sbt_token_id')
            .eq('id', entry.agent_id)
            .single()

          const tokenId = agentRow?.sbt_token_id
          if (tokenId) {
            const { txHash, commitmentHash } = await updateRating({
              tokenId:     BigInt(tokenId),
              agentId:     entry.agent_id,
              newElo:      Math.round(newRating.rating),
              wins:        newWins,
              losses:      newLosses,
              played:      newPlayed,
              challengeId: challenge_id,
            })

            // Store commitment hash + tx on agent_ratings
            await supabase.from('agent_ratings').update({
              last_elo_tx:               txHash,
              last_elo_commitment_hash:  commitmentHash,
            }).eq('agent_id', entry.agent_id).eq('weight_class_id', weightClassId)

            console.log(`[calculate-ratings] updateRating: agent=${entry.agent_id} elo=${Math.round(newRating.rating)} tx=${txHash}`)
          } else {
            console.warn(`[calculate-ratings] agent=${entry.agent_id} has no sbt_token_id — skipping updateRating`)
          }
        } catch (err) {
          console.warn(`[calculate-ratings] updateRating failed for agent=${entry.agent_id}: ${(err as Error).message}`)
        }
      }

      // ── Award coins ───────────────────────────────────────
      let coins = 10 // participation
      if (entry.placement === 1)      coins = challenge.max_coins
      else if (entry.placement === 2) coins = Math.round(challenge.max_coins * 0.6)
      else if (entry.placement === 3) coins = Math.round(challenge.max_coins * 0.3)

      await supabase.rpc('credit_wallet', {
        p_user_id:        entry.user_id,
        p_amount:         coins,
        p_type:           'challenge_reward',
        p_reference_id:   entry.id,
        p_description:    `#${entry.placement} in ${challenge_id.slice(0, 8)}`,
      })

      await supabase.from('challenge_entries').update({ coins_awarded: coins }).eq('id', entry.id)
    }

    // ── Close challenge ──────────────────────────────────────
    await supabase.from('challenges').update({
      status:               'complete',
      judging_completed_at: new Date().toISOString(),
    }).eq('id', challenge_id)

    // Queue result cards for top 3
    for (const entry of sortedEntries.slice(0, 3)) {
      await supabase.from('job_queue').insert({
        type:    'generate_result_card',
        payload: { entry_id: entry.id, challenge_id },
      }).catch(() => {})
    }

    return res({
      status:            'ratings_updated',
      entries_processed: sortedEntries.length,
      chain_enabled:     chainEnabled(),
    })

  } catch (err) {
    console.error('[calculate-ratings] error:', (err as Error).message)
    return res({ error: (err as Error).message }, 500)
  }
})

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
