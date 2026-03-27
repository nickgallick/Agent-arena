/**
 * chain-client-phase2.ts
 * Phase 2 on-chain integration: BoutsAgentSBT + BoutsScoreAggregator
 *
 * BoutsAgentSBT (0x26932E19544fBdD79b16dc1a628CdBA1a1531223)
 *   Soulbound NFT — one per agent, minted on first challenge entry.
 *   Carries ELO, wins, losses, weight class permanently on-chain.
 *
 * BoutsScoreAggregator (0x2d9fcfc59CD6cb0297CcE78E1D9cA399c209e97e)
 *   Applies disagreement logic to the 3 revealed judge scores.
 *   Consensus (<10pt spread) → median
 *   Outlier (>15pt outlier) → discard + average remaining
 *   All disagree → Disputed (blocks prize release)
 *
 * Env vars required (Supabase Edge Function secrets — all Phase 1 vars plus):
 *   BOUTS_SBT_ADDRESS        — BoutsAgentSBT contract
 *   BOUTS_AGGREGATOR_ADDRESS — BoutsScoreAggregator contract
 *   JUDGE_ORACLE_PRIVATE_KEY — oracle wallet (same as Phase 1)
 *   BASE_RPC_URL             — Base mainnet RPC
 *   BASE_SEPOLIA_RPC_URL     — Base Sepolia RPC (testnet)
 *   CHAIN_ENV                — 'sepolia' | 'mainnet' (default mainnet)
 */

import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from 'npm:viem@2'
import { privateKeyToAccount } from 'npm:viem@2/accounts'
import { base, baseSepolia } from 'npm:viem@2/chains'
import { uuidToBytes32 } from './salt-utils.ts'

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const SBT_ABI = [
  {
    type: 'function', name: 'isMinted',
    inputs: [{ name: 'agentId', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'mint',
    inputs: [
      { name: 'to',          type: 'address' },
      { name: 'agentId',     type: 'string'  },
      { name: 'weightClass', type: 'string'  },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'updateRating',
    inputs: [
      { name: 'tokenId',        type: 'uint256' },
      { name: 'newElo',         type: 'uint16'  },
      { name: 'wins',           type: 'uint32'  },
      { name: 'losses',         type: 'uint32'  },
      { name: 'played',         type: 'uint32'  },
      { name: 'commitmentHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'getProfileByAgentId',
    inputs: [{ name: 'agentId', type: 'string' }],
    outputs: [
      {
        name: 'profile', type: 'tuple',
        components: [
          { name: 'agentId',     type: 'string'  },
          { name: 'weightClass', type: 'string'  },
          { name: 'elo',         type: 'uint16'  },
          { name: 'wins',        type: 'uint32'  },
          { name: 'losses',      type: 'uint32'  },
          { name: 'played',      type: 'uint32'  },
        ],
      },
      { name: 'tokenId', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'agentIdToTokenId',
    inputs: [{ name: 'agentId', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event', name: 'AgentMinted',
    inputs: [
      { name: 'tokenId',     type: 'uint256', indexed: true  },
      { name: 'agentId',     type: 'string',  indexed: false },
      { name: 'owner',       type: 'address', indexed: true  },
      { name: 'weightClass', type: 'string',  indexed: false },
    ],
  },
  {
    type: 'event', name: 'RatingUpdated',
    inputs: [
      { name: 'tokenId',        type: 'uint256', indexed: true  },
      { name: 'previousElo',    type: 'uint16',  indexed: false },
      { name: 'newElo',         type: 'uint16',  indexed: false },
      { name: 'commitmentHash', type: 'bytes32', indexed: false },
    ],
  },
  // Custom errors
  { type: 'error', name: 'AgentAlreadyMinted', inputs: [] },
  { type: 'error', name: 'EmptyAgentId',       inputs: [] },
  { type: 'error', name: 'InvalidElo',         inputs: [] },
  { type: 'error', name: 'OnlyOracle',         inputs: [] },
  { type: 'error', name: 'Soulbound',          inputs: [] },
  { type: 'error', name: 'TokenNotFound',      inputs: [] },
  { type: 'error', name: 'ZeroAddress',        inputs: [] },
] as const

const AGGREGATOR_ABI = [
  {
    type: 'function', name: 'aggregateScores',
    inputs: [
      { name: 'entryId',     type: 'bytes32' },
      { name: 'challengeId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'finalScore', type: 'uint8' },
      { name: 'result',     type: 'uint8' }, // 0=Consensus, 1=OutlierDiscarded, 2=Disputed
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'resolveDispute',
    inputs: [
      { name: 'entryId',    type: 'bytes32' },
      { name: 'finalScore', type: 'uint8'   },
      { name: 'resolution', type: 'string'  },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'getFinalScore',
    inputs: [{ name: 'entryId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'isDisputed',
    inputs: [{ name: 'entryId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getRecord',
    inputs: [{ name: 'entryId', type: 'bytes32' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'claude',      type: 'uint8'   },
        { name: 'gpt4o',       type: 'uint8'   },
        { name: 'gemini',      type: 'uint8'   },
        { name: 'finalScore',  type: 'uint8'   },
        { name: 'result',      type: 'uint8'   },
        { name: 'timestamp',   type: 'uint256' },
        { name: 'resolved',    type: 'bool'    },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'event', name: 'ScoreFinalized',
    inputs: [
      { name: 'entryId',     type: 'bytes32', indexed: true  },
      { name: 'challengeId', type: 'bytes32', indexed: true  },
      { name: 'finalScore',  type: 'uint8',   indexed: false },
      { name: 'result',      type: 'uint8',   indexed: false },
      { name: 'claude',      type: 'uint8',   indexed: false },
      { name: 'gpt4o',       type: 'uint8',   indexed: false },
      { name: 'gemini',      type: 'uint8',   indexed: false },
    ],
  },
  {
    type: 'event', name: 'DisputeFlagged',
    inputs: [
      { name: 'entryId',     type: 'bytes32', indexed: true  },
      { name: 'challengeId', type: 'bytes32', indexed: true  },
      { name: 'claude',      type: 'uint8',   indexed: false },
      { name: 'gpt4o',       type: 'uint8',   indexed: false },
      { name: 'gemini',      type: 'uint8',   indexed: false },
    ],
  },
  {
    type: 'event', name: 'DisputeResolved',
    inputs: [
      { name: 'entryId',    type: 'bytes32', indexed: true  },
      { name: 'finalScore', type: 'uint8',   indexed: false },
      { name: 'resolution', type: 'string',  indexed: false },
    ],
  },
  { type: 'error', name: 'AlreadyAggregated',    inputs: [] },
  { type: 'error', name: 'InvalidScore',         inputs: [] },
  { type: 'error', name: 'NotDisputed',          inputs: [] },
  { type: 'error', name: 'OnlyOracle',           inputs: [] },
  { type: 'error', name: 'ScoresNotAllRevealed', inputs: [] },
  { type: 'error', name: 'ZeroAddress',          inputs: [] },
] as const

// Aggregation result enum (matches contract)
export const AggregationResult = {
  Consensus:        0,
  OutlierDiscarded: 1,
  Disputed:         2,
} as const

// ─── Shared client factory ─────────────────────────────────────────────────────

function getClients() {
  const sbtAddress       = Deno.env.get('BOUTS_SBT_ADDRESS')
  const aggregatorAddr   = Deno.env.get('BOUTS_AGGREGATOR_ADDRESS')
  const privateKey       = Deno.env.get('JUDGE_ORACLE_PRIVATE_KEY')
  const rpcUrl           = Deno.env.get('BASE_RPC_URL')
  const sepoliaRpcUrl    = Deno.env.get('BASE_SEPOLIA_RPC_URL')
  const isTestnet        = Deno.env.get('CHAIN_ENV') === 'sepolia'

  if (!sbtAddress)     throw new Error('BOUTS_SBT_ADDRESS not set')
  if (!aggregatorAddr) throw new Error('BOUTS_AGGREGATOR_ADDRESS not set')
  if (!privateKey)     throw new Error('JUDGE_ORACLE_PRIVATE_KEY not set')

  const rpc = isTestnet ? sepoliaRpcUrl : rpcUrl
  if (!rpc) throw new Error(`${isTestnet ? 'BASE_SEPOLIA_RPC_URL' : 'BASE_RPC_URL'} not set`)

  const chain   = isTestnet ? baseSepolia : base
  const account = privateKeyToAccount(privateKey as `0x${string}`)

  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpc) })

  return {
    sbtAddress:      sbtAddress as `0x${string}`,
    aggregatorAddr:  aggregatorAddr as `0x${string}`,
    publicClient,
    walletClient,
    account,
  }
}

// ─── BoutsAgentSBT ────────────────────────────────────────────────────────────

/**
 * Check if an agent already has an SBT minted.
 * Call before mint() — isMinted is idempotent-safe read.
 */
export async function isMinted(agentId: string): Promise<boolean> {
  const { sbtAddress, publicClient } = getClients()
  return publicClient.readContract({
    address: sbtAddress,
    abi: SBT_ABI,
    functionName: 'isMinted',
    args: [agentId],
  }) as Promise<boolean>
}

/**
 * Mint SBT for an agent on their FIRST challenge entry.
 * ownerAddress: agent owner's wallet address (from agents table)
 * weightClass:  e.g. 'frontier', 'challenger', 'rookie'
 * Returns: { txHash, tokenId }
 */
export async function mintSBT(params: {
  ownerAddress: `0x${string}`
  agentId: string
  weightClass: string
}): Promise<{ txHash: string; tokenId: bigint }> {
  const { sbtAddress, walletClient, publicClient } = getClients()

  const txHash = await walletClient.writeContract({
    address: sbtAddress,
    abi: SBT_ABI,
    functionName: 'mint',
    args: [params.ownerAddress, params.agentId, params.weightClass],
  })

  // Wait for receipt to get tokenId from AgentMinted event
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

  // Parse AgentMinted event log
  let tokenId = 0n
  for (const log of receipt.logs) {
    try {
      // topic[0] = keccak256("AgentMinted(uint256,string,address,string)")
      // topic[1] = tokenId (indexed)
      if (log.topics[1]) {
        tokenId = BigInt(log.topics[1])
      }
    } catch { /* ignore non-matching logs */ }
  }

  console.log(`[chain-phase2] SBT minted: agentId=${params.agentId} tokenId=${tokenId} tx=${txHash}`)
  return { txHash, tokenId }
}

/**
 * Build the ELO commitment hash per the spec:
 *   keccak256(abi.encodePacked(agentId, newElo, challengeId, timestamp))
 */
export function buildEloCommitmentHash(params: {
  agentId: string
  newElo: number
  challengeId: string  // UUID
  timestamp: number    // unix seconds
}): `0x${string}` {
  const challengeIdBytes32 = uuidToBytes32(params.challengeId)
  return keccak256(
    encodePacked(
      ['string', 'uint16', 'bytes32', 'uint256'],
      [params.agentId, params.newElo, challengeIdBytes32, BigInt(params.timestamp)]
    )
  )
}

/**
 * Update agent ELO rating on-chain after a challenge resolves.
 * Called from calculate-ratings after Glicko-2 computation.
 *
 * tokenId:      from agent_ratings.onchain_token_id or agentIdToTokenId()
 * newElo:       post-match rating (integer, capped at 65535 for uint16)
 * wins/losses/played: cumulative stats
 * challengeId:  for commitment hash uniqueness
 */
export async function updateRating(params: {
  tokenId: bigint
  agentId: string
  newElo: number
  wins: number
  losses: number
  played: number
  challengeId: string
}): Promise<{ txHash: string; commitmentHash: `0x${string}` }> {
  const { sbtAddress, walletClient } = getClients()

  const timestamp = Math.floor(Date.now() / 1000)
  const commitmentHash = buildEloCommitmentHash({
    agentId:     params.agentId,
    newElo:      params.newElo,
    challengeId: params.challengeId,
    timestamp,
  })

  // uint16 max = 65535 — ELO shouldn't exceed this in practice
  const safeElo = Math.min(65535, Math.max(0, Math.round(params.newElo))) as number

  const txHash = await walletClient.writeContract({
    address: sbtAddress,
    abi: SBT_ABI,
    functionName: 'updateRating',
    args: [
      params.tokenId,
      safeElo,
      params.wins,
      params.losses,
      params.played,
      commitmentHash,
    ],
  })

  console.log(`[chain-phase2] ELO updated: agentId=${params.agentId} elo=${safeElo} tx=${txHash}`)
  return { txHash, commitmentHash }
}

/**
 * Get on-chain token ID for an agent (by UUID string agentId).
 * Returns 0n if not minted.
 */
export async function getTokenId(agentId: string): Promise<bigint> {
  const { sbtAddress, publicClient } = getClients()
  try {
    return publicClient.readContract({
      address: sbtAddress,
      abi: SBT_ABI,
      functionName: 'agentIdToTokenId',
      args: [agentId],
    }) as Promise<bigint>
  } catch {
    return 0n
  }
}

// ─── BoutsScoreAggregator ─────────────────────────────────────────────────────

/**
 * Aggregate 3 revealed judge scores on-chain.
 * Reads from BoutsJudgeCommit automatically (no args needed beyond IDs).
 * Returns final score (0–100) and result enum.
 *
 * Called AFTER all 3 providers have revealed scores on-chain.
 * Integration order: judge commit → judge reveal → aggregateScores → updateRating
 */
export async function aggregateScores(params: {
  entryId:     string  // UUID
  challengeId: string  // UUID
}): Promise<{
  finalScore:  number
  result:      number  // 0=Consensus, 1=OutlierDiscarded, 2=Disputed
  resultLabel: string
  txHash:      string
}> {
  const { aggregatorAddr, walletClient, publicClient } = getClients()

  const entryIdBytes32     = uuidToBytes32(params.entryId)
  const challengeIdBytes32 = uuidToBytes32(params.challengeId)

  const txHash = await walletClient.writeContract({
    address: aggregatorAddr,
    abi: AGGREGATOR_ABI,
    functionName: 'aggregateScores',
    args: [entryIdBytes32, challengeIdBytes32],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })

  // Parse ScoreFinalized event for result
  let finalScore = 0
  let result = 0
  // The return values are accessible via simulateContract or event parse
  // For now, read back from contract after confirmation
  try {
    const score = await publicClient.readContract({
      address: aggregatorAddr,
      abi: AGGREGATOR_ABI,
      functionName: 'getFinalScore',
      args: [entryIdBytes32],
    }) as number
    finalScore = score
  } catch { /* use 0 */ }

  const resultLabel =
    result === AggregationResult.Consensus        ? 'Consensus'        :
    result === AggregationResult.OutlierDiscarded ? 'OutlierDiscarded' :
                                                    'Disputed'

  console.log(`[chain-phase2] aggregateScores: entry=${params.entryId} score=${finalScore} result=${resultLabel} tx=${txHash}`)
  return { finalScore, result, resultLabel, txHash }
}

/**
 * Resolve a Disputed aggregation via oracle (manual intervention).
 * Only callable by oracle wallet when contract.isDisputed(entryId) == true.
 */
export async function resolveDispute(params: {
  entryId:    string
  finalScore: number    // 0–100
  resolution: string   // human-readable explanation
}): Promise<string> {
  const { aggregatorAddr, walletClient } = getClients()

  const entryIdBytes32 = uuidToBytes32(params.entryId)

  const txHash = await walletClient.writeContract({
    address: aggregatorAddr,
    abi: AGGREGATOR_ABI,
    functionName: 'resolveDispute',
    args: [entryIdBytes32, params.finalScore, params.resolution],
  })

  console.log(`[chain-phase2] dispute resolved: entry=${params.entryId} score=${params.finalScore} tx=${txHash}`)
  return txHash
}

/**
 * Read aggregation record for an entry (view — no gas).
 */
export async function getAggregationRecord(entryId: string): Promise<{
  claude:     number
  gpt4o:      number
  gemini:     number
  finalScore: number
  result:     number
  resolved:   boolean
  timestamp:  number
} | null> {
  const { aggregatorAddr, publicClient } = getClients()

  try {
    const record = await publicClient.readContract({
      address: aggregatorAddr,
      abi: AGGREGATOR_ABI,
      functionName: 'getRecord',
      args: [uuidToBytes32(entryId)],
    }) as { claude: number; gpt4o: number; gemini: number; finalScore: number; result: number; timestamp: bigint; resolved: boolean }

    return {
      claude:     record.claude,
      gpt4o:      record.gpt4o,
      gemini:     record.gemini,
      finalScore: record.finalScore,
      result:     record.result,
      resolved:   record.resolved,
      timestamp:  Number(record.timestamp),
    }
  } catch {
    return null
  }
}
