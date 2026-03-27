// calculate-ratings/index.ts
// Forge · 2026-03-27
//
// THREE-PASS EXECUTION (Phase 3 two-pass composite commit-reveal):
//
//   PASS 1 — Per entry: aggregateScores() + commitComposite()
//     Oracle commits weighted composite + salt on-chain before revealing.
//     All entries committed before any reveal fires.
//
//   PASS 2 — Per entry: revealComposite()
//     Oracle reveals. BoutsEscrow can now read getComposite(entryId).
//     All entries revealed before Glicko-2 runs.
//
//   PASS 3 — Per entry: Glicko-2 + updateRating() + coins
//
// Why two-pass? Atomicity across the challenge: escrow can't partially execute
// (top prize paid, others not revealed) if something fails mid-loop.
// No block delay needed — oracle is the sole committer, no anchoring risk.
//
// Phase 3 stubs (commitComposite / revealComposite) are clearly marked.
// Drop-in ready when BoutsEscrow interface lands from Chain.

import { getSupabaseClient } from '../_shared/supabase-client.ts'
import { calculateNewRating } from '../_shared/glicko2.ts'
import {
  aggregateScores,
  updateRating,
  AggregationResult,
} from '../_shared/chain-client-phase2.ts'
import { generateSalt, encryptSalt } from '../_shared/salt-utils.ts'

// ─── Phase 3 stubs ────────────────────────────────────────────────────────────
// Replace with real imports when BoutsEscrow + BoutsCompositeCommit are deployed.
// Interface per Chain spec:
//   commitComposite(entryId: bytes32, challengeId: bytes32, compositeScore: uint8, salt: bytes32)
//   revealComposite(entryId: bytes32, compositeScore: uint8, salt: bytes32)

async function commitComposite(_params: {
  entryId:        string
  challengeId:    string
  compositeScore: number   // 0–100 integer (Math.round before passing)
  salt:           string   // 0x-prefixed 32-byte hex
}): Promise<string> {
  // STUB — replace with:
  // return chainClientPhase3.commitComposite(params)
  console.log(`[calculate-ratings] STUB commitComposite: entry=${_params.entryId} score=${_params.compositeScore}`)
  return '0xSTUB_COMMIT_TX'
}

async function revealComposite(_params: {
  entryId:        string
  compositeScore: number
  salt:           string
}): Promise<string> {
  // STUB — replace with:
  // return chainClientPhase3.revealComposite(params)
  console.log(`[calculate-ratings] STUB revealComposite: entry=${_params.entryId} score=${_params.compositeScore}`)
  return '0xSTUB_REVEAL_TX'
}
// ─────────────────────────────────────────────────────────────────────────────

function chainEnabled(): boolean {
  return !!(
    Deno.env.get('BOUTS_SBT_ADDRESS') &&
    Deno.env.get('BOUTS_AGGREGATOR_ADDRESS') &&
    Deno.env.get('JUDGE_ORACLE_PRIVATE_KEY') &&
    Deno.env.get('BASE_RPC_URL')
  )
}

// Phase 3 composite commit-reveal is only active when escrow contract is live
function escrowEnabled(): boolean {
  return !!(chainEnabled() && Deno.env.get('BOUTS_ESCROW_ADDRESS'))
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

    if (!challenge) return res({ error: 'Challenge not found' }, 404)

    // ── Load judged entries ──────────────────────────────────
    const { data: entries } = await supabase
      .from('challenge_entries')
      .select('id, agent_id, user_id, composite_score, final_score, onchain_aggregated, composite_commitment')
      .eq('challenge_id', challenge_id)
      .eq('status', 'judged')
      .order('composite_score', { ascending: false })

    if (!entries || entries.length === 0) return res({ status: 'no_entries' })

    const weightClassId = challenge.weight_class_id || 'frontier'
    const getScore = (e: Record<string, unknown>) =>
      (e.composite_score as number) ?? (e.final_score as number) ?? 0

    // ════════════════════════════════════════════════════════
    // PASS 1: aggregateScores() + commitComposite() per entry
    // ════════════════════════════════════════════════════════

    const commitData: Record<string, { compositeScore: number; salt: string; saltEncrypted: string }> = {}

    for (const entry of entries) {
      // Phase 2: on-chain LLM score aggregation
      if (chainEnabled() && !entry.onchain_aggregated) {
        try {
          const agg = await aggregateScores({ entryId: entry.id, challengeId: challenge_id })
          await supabase.from('challenge_entries').update({
            onchain_aggregated:       true,
            onchain_aggregate_tx:     agg.txHash,
            onchain_aggregate_result: agg.result,
            onchain_final_score:      agg.finalScore,
            dispute_flagged:          agg.result === AggregationResult.Disputed,
          }).eq('id', entry.id)
          console.log(`[calculate-ratings] P1 aggregated: entry=${entry.id} result=${agg.resultLabel}`)
        } catch (err) {
          console.warn(`[calculate-ratings] aggregateScores failed entry=${entry.id}: ${(err as Error).message}`)
        }
      }

      // Phase 3: commitComposite — oracle commits weighted composite before reveal
      if (escrowEnabled() && !entry.composite_commitment) {
        try {
          const compositeScore = Math.round(getScore(entry))
          const salt = generateSalt()
          const saltEncrypted = await encryptSalt(salt)

          const commitTx = await commitComposite({
            entryId:        entry.id,
            challengeId:    challenge_id,
            compositeScore,
            salt,
          })

          await supabase.from('challenge_entries').update({
            composite_salt_encrypted: saltEncrypted,
            composite_commitment:     commitTx,  // store tx as commitment ref
            composite_commit_tx:      commitTx,
            composite_committed_at:   new Date().toISOString(),
          }).eq('id', entry.id)

          commitData[entry.id] = { compositeScore, salt, saltEncrypted }
          console.log(`[calculate-ratings] P1 committed: entry=${entry.id} score=${compositeScore}`)
        } catch (err) {
          console.warn(`[calculate-ratings] commitComposite failed entry=${entry.id}: ${(err as Error).message}`)
        }
      }
    }

    // ════════════════════════════════════════════════════════
    // PASS 2: revealComposite() per entry
    // All commits complete before any reveal fires.
    // ════════════════════════════════════════════════════════

    if (escrowEnabled() && Object.keys(commitData).length > 0) {
      for (const entry of entries) {
        const cd = commitData[entry.id]
        if (!cd) continue  // was already committed in a prior run

        try {
          const revealTx = await revealComposite({
            entryId:        entry.id,
            compositeScore: cd.compositeScore,
            salt:           cd.salt,
          })

          await supabase.from('challenge_entries').update({
            composite_reveal_tx:  revealTx,
            composite_revealed_at: new Date().toISOString(),
          }).eq('id', entry.id)

          console.log(`[calculate-ratings] P2 revealed: entry=${entry.id} tx=${revealTx}`)
        } catch (err) {
          console.warn(`[calculate-ratings] revealComposite failed entry=${entry.id}: ${(err as Error).message}`)
        }
      }
    }

    // ════════════════════════════════════════════════════════
    // PASS 3: Glicko-2 + updateRating() + coins
    // ════════════════════════════════════════════════════════

    const sortedEntries = entries.map((entry, index) => ({ ...entry, placement: index + 1 }))

    const { data: currentRatings } = await supabase
      .from('agent_ratings')
      .select('*')
      .in('agent_id', sortedEntries.map((e) => e.agent_id))
      .eq('weight_class_id', weightClassId)

    const ratingsMap = new Map(
      (currentRatings || []).map((r) => [r.agent_id, r])
    )

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      const cur = ratingsMap.get(entry.agent_id) || {
        rating: 1500, rating_deviation: 350, volatility: 0.06,
        wins: 0, losses: 0, played: 0,
      }

      const opponents = sortedEntries
        .filter((_, j) => j !== i)
        .map((opp) => {
          const oppR = ratingsMap.get(opp.agent_id) || { rating: 1500, rating_deviation: 350 }
          return {
            rating: oppR.rating,
            rd:     oppR.rating_deviation,
            score:  getScore(entry) > getScore(opp) ? 1 :
                    getScore(entry) < getScore(opp) ? 0 : 0.5,
          }
        })

      const newRating = calculateNewRating(
        { rating: cur.rating, rd: cur.rating_deviation, volatility: cur.volatility },
        opponents
      )
      const eloChange = newRating.rating - cur.rating
      const newWins   = (cur.wins   || 0) + (entry.placement === 1 ? 1 : 0)
      const newLosses = (cur.losses || 0) + (entry.placement > 1  ? 1 : 0)
      const newPlayed = (cur.played || 0) + 1

      // DB rating update
      await supabase.rpc('update_agent_elo', {
        p_agent_id:        entry.agent_id,
        p_weight_class_id: weightClassId,
        p_new_rating:      Math.round(newRating.rating    * 100) / 100,
        p_new_rd:          Math.round(newRating.rd        * 100) / 100,
        p_new_volatility:  Math.round(newRating.volatility * 1000000) / 1000000,
        p_placement:       entry.placement,
        p_total_entries:   sortedEntries.length,
      })

      await supabase.from('agent_ratings').update({
        wins: newWins, losses: newLosses, played: newPlayed,
      }).eq('agent_id', entry.agent_id).eq('weight_class_id', weightClassId)

      await supabase.from('challenge_entries').update({
        placement:  entry.placement,
        elo_change: Math.round(eloChange * 100) / 100,
      }).eq('id', entry.id)

      // Phase 2: updateRating on-chain
      if (chainEnabled()) {
        try {
          const { data: agentRow } = await supabase
            .from('agents').select('sbt_token_id').eq('id', entry.agent_id).single()
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
            await supabase.from('agent_ratings').update({
              last_elo_tx:              txHash,
              last_elo_commitment_hash: commitmentHash,
            }).eq('agent_id', entry.agent_id).eq('weight_class_id', weightClassId)
          }
        } catch (err) {
          console.warn(`[calculate-ratings] updateRating failed agent=${entry.agent_id}: ${(err as Error).message}`)
        }
      }

      // Coins
      let coins = 10
      if (entry.placement === 1)      coins = challenge.max_coins
      else if (entry.placement === 2) coins = Math.round(challenge.max_coins * 0.6)
      else if (entry.placement === 3) coins = Math.round(challenge.max_coins * 0.3)

      await supabase.rpc('credit_wallet', {
        p_user_id:      entry.user_id,
        p_amount:       coins,
        p_type:         'challenge_reward',
        p_reference_id: entry.id,
        p_description:  `#${entry.placement} in ${challenge_id.slice(0, 8)}`,
      })

      await supabase.from('challenge_entries').update({ coins_awarded: coins }).eq('id', entry.id)
    }

    // ── Close challenge ──────────────────────────────────────
    await supabase.from('challenges').update({
      status: 'complete',
      judging_completed_at: new Date().toISOString(),
    }).eq('id', challenge_id)

    for (const entry of sortedEntries.slice(0, 3)) {
      try {
        await supabase.from('job_queue').insert({
          type:    'generate_result_card',
          payload: { entry_id: entry.id, challenge_id },
        })
      } catch { /* non-critical */ }
    }

    return res({
      status:            'ratings_updated',
      entries_processed: sortedEntries.length,
      chain_enabled:     chainEnabled(),
      escrow_enabled:    escrowEnabled(),
      commits_fired:     Object.keys(commitData).length,
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
