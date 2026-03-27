// mint-sbt/index.ts — Phase 2: BoutsAgentSBT mint on first challenge entry
// Forge · 2026-03-27
//
// Called when an agent submits their FIRST challenge entry (not at registration).
// Integration order per Chain spec:
//   1. Agent enters challenge → POST /challenge_entries → queue mint-sbt job
//   2. This function: isMinted check → mint() → store tokenId in agents table
//
// Safe to call multiple times — isMinted() check prevents double-mint.

import { getSupabaseClient } from '../_shared/supabase-client.ts'
import { isMinted, mintSBT, getTokenId } from '../_shared/chain-client-phase2.ts'

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    const { agent_id, challenge_id, entry_id } = body

    if (!agent_id) return json({ error: 'agent_id required' }, 400)

    const supabase = getSupabaseClient()

    // ── Load agent ────────────────────────────────────────────
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('id, name, weight_class_id, sbt_token_id, sbt_minted_at, onchain_wallet_address')
      .eq('id', agent_id)
      .single()

    if (agentErr || !agent) {
      return json({ error: 'Agent not found' }, 404)
    }

    // Already minted in DB — return existing token
    if (agent.sbt_token_id) {
      return json({
        status: 'already_minted',
        agent_id,
        token_id: agent.sbt_token_id,
        minted_at: agent.sbt_minted_at,
      })
    }

    // ── Check on-chain (authoritative) ───────────────────────
    const alreadyMinted = await isMinted(agent_id)
    if (alreadyMinted) {
      // On-chain says minted but DB doesn't know — sync tokenId
      const tokenId = await getTokenId(agent_id)
      await supabase.from('agents').update({
        sbt_token_id:  Number(tokenId),
        sbt_minted_at: new Date().toISOString(),
      }).eq('id', agent_id)

      console.log(`[mint-sbt] synced existing token: agentId=${agent_id} tokenId=${tokenId}`)
      return json({ status: 'synced', agent_id, token_id: Number(tokenId) })
    }

    // ── Mint ──────────────────────────────────────────────────
    // Requires agent.onchain_wallet_address — if not set, use oracle wallet as owner
    // (agent can transfer later via transferFrom when they connect wallet)
    const ownerAddress = (agent.onchain_wallet_address as `0x${string}`) ?? (() => {
      const oracleKey = Deno.env.get('JUDGE_ORACLE_PRIVATE_KEY')
      if (!oracleKey) throw new Error('No wallet address for agent and JUDGE_ORACLE_PRIVATE_KEY not set')
      // Derive oracle address — used as custodial owner until agent claims
      // In production, use a dedicated custody address per agent
      return Deno.env.get('ORACLE_WALLET_ADDRESS') as `0x${string}` ?? '0x0000000000000000000000000000000000000001' as `0x${string}`
    })()

    const weightClass = agent.weight_class_id ?? 'rookie'

    const { txHash, tokenId } = await mintSBT({
      ownerAddress,
      agentId:     agent_id,
      weightClass,
    })

    // ── Persist to DB ─────────────────────────────────────────
    await supabase.from('agents').update({
      sbt_token_id:  Number(tokenId),
      sbt_minted_at: new Date().toISOString(),
      sbt_mint_tx:   txHash,
    }).eq('id', agent_id)

    // ── Log to challenge_entries if provided ─────────────────
    if (entry_id) {
      await supabase.from('challenge_entries').update({
        onchain_entry_id: txHash,
      }).eq('id', entry_id)
    }

    console.log(`[mint-sbt] minted: agentId=${agent_id} tokenId=${tokenId} tx=${txHash}`)

    return json({
      status:     'minted',
      agent_id,
      token_id:   Number(tokenId),
      tx_hash:    txHash,
      weight_class: weightClass,
    })

  } catch (err) {
    const msg = (err as Error).message
    // AgentAlreadyMinted revert — treat as success
    if (msg.includes('AgentAlreadyMinted')) {
      console.warn('[mint-sbt] contract reverted AgentAlreadyMinted — syncing token id')
      return json({ status: 'already_minted_on_chain', agent_id: (await req.json().catch(() => ({}))).agent_id })
    }
    console.error('[mint-sbt] error:', msg)
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
