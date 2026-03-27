/**
 * chain-client-phase3.ts
 * BoutsEscrow integration — composite commit-reveal + finalize + prize management
 *
 * Contract: 0x27c3C4cf0959bBa01B2e4B38f5d23CfB29D4c33B (Base mainnet)
 *
 * Env vars required:
 *   BOUTS_ESCROW_ADDRESS     — BoutsEscrow contract address
 *   JUDGE_ORACLE_PRIVATE_KEY — oracle wallet private key
 *   BASE_RPC_URL             — Base mainnet RPC
 *   BASE_SEPOLIA_RPC_URL     — Base Sepolia (testnet)
 *   CHAIN_ENV                — 'sepolia' | 'mainnet' (default mainnet)
 *
 * IMPORTANT — DQ behavior (fixed in v2 of contract):
 *   Disqualified entries must NOT be passed to finalizeChallenge().
 *   Oracle must filter them out before calling. Contract will revert InvalidScore()
 *   if any disqualified entry is included in rankedEntries.
 *   DQ'd entry fees stay in the pool and are redistributed to winners.
 *
 * Call order from calculate-ratings:
 *   Pass 1: commitComposite() per entry   ← all commits before any reveals
 *   Pass 2: revealComposite() per entry   ← all reveals before finalize
 *   Pass 3: finalizeChallenge()           ← ranked eligible entries only
 *   (Glicko-2 + updateRating run after finalize)
 */

import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from 'npm:viem@2'
import { privateKeyToAccount } from 'npm:viem@2/accounts'
import { base, baseSepolia } from 'npm:viem@2/chains'
import { uuidToBytes32, generateSalt, encryptSalt, decryptSalt } from './salt-utils.ts'

// ─── ABI ──────────────────────────────────────────────────────────────────────

const ESCROW_ABI = [
  // Challenge lifecycle
  {
    type: 'function', name: 'createChallenge',
    inputs: [
      { name: 'challengeId', type: 'bytes32'  },
      { name: 'entryFee',    type: 'uint256'  },
      { name: 'endTime',     type: 'uint256'  },
      { name: 'payoutBps',   type: 'uint16[3]' },
    ],
    outputs: [], stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'closeEntries',
    inputs: [{ name: 'challengeId', type: 'bytes32' }],
    outputs: [], stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'cancelChallenge',
    inputs: [{ name: 'challengeId', type: 'bytes32' }],
    outputs: [], stateMutability: 'nonpayable',
  },
  // Commit-reveal
  {
    type: 'function', name: 'commitComposite',
    inputs: [
      { name: 'entryId',     type: 'bytes32' },
      { name: 'challengeId', type: 'bytes32' },
      { name: 'commitment',  type: 'bytes32' },
    ],
    outputs: [], stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'revealComposite',
    inputs: [
      { name: 'entryId',        type: 'bytes32' },
      { name: 'compositeScore', type: 'uint8'   },
      { name: 'salt',           type: 'bytes32' },
    ],
    outputs: [], stateMutability: 'nonpayable',
  },
  // Finalize
  {
    type: 'function', name: 'finalizeChallenge',
    inputs: [
      { name: 'challengeId',   type: 'bytes32'   },
      { name: 'rankedEntries', type: 'bytes32[]' },
    ],
    outputs: [], stateMutability: 'nonpayable',
  },
  // DQ
  {
    type: 'function', name: 'disqualifyEntry',
    inputs: [{ name: 'entryId', type: 'bytes32' }],
    outputs: [], stateMutability: 'nonpayable',
  },
  // Views
  {
    type: 'function', name: 'getEntry',
    inputs: [{ name: 'entryId', type: 'bytes32' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'entryId',        type: 'bytes32' },
        { name: 'challengeId',    type: 'bytes32' },
        { name: 'payer',          type: 'address' },
        { name: 'compositeScore', type: 'uint8'   },
        { name: 'placement',      type: 'uint8'   },
        { name: 'prizeAmount',    type: 'uint256' },
        { name: 'paid',           type: 'bool'    },
        { name: 'claimed',        type: 'bool'    },
        { name: 'scoreCommitted', type: 'bool'    },
        { name: 'scoreRevealed',  type: 'bool'    },
        { name: 'disqualified',   type: 'bool'    },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getCompositeScore',
    inputs: [{ name: 'entryId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  // Events
  {
    type: 'event', name: 'CompositeCommitted',
    inputs: [
      { name: 'entryId',     type: 'bytes32', indexed: true  },
      { name: 'challengeId', type: 'bytes32', indexed: true  },
      { name: 'commitment',  type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event', name: 'CompositeRevealed',
    inputs: [
      { name: 'entryId',        type: 'bytes32', indexed: true  },
      { name: 'compositeScore', type: 'uint8',   indexed: false },
    ],
  },
  {
    type: 'event', name: 'ChallengeFinalized',
    inputs: [
      { name: 'challengeId', type: 'bytes32', indexed: true  },
      { name: 'totalPool',   type: 'uint256', indexed: false },
      { name: 'platformFee', type: 'uint256', indexed: false },
    ],
  },
  // Errors
  { type: 'error', name: 'AlreadyCommitted',      inputs: [] },
  { type: 'error', name: 'AlreadyRevealed',       inputs: [] },
  { type: 'error', name: 'ChallengeNotScoring',   inputs: [] },
  { type: 'error', name: 'EntryNotFound',         inputs: [] },
  { type: 'error', name: 'InvalidReveal',         inputs: [] },
  { type: 'error', name: 'InvalidScore',          inputs: [] },
  { type: 'error', name: 'InsufficientEntries',   inputs: [] },
  { type: 'error', name: 'NotCommitted',          inputs: [] },
  { type: 'error', name: 'OnlyOracle',            inputs: [] },
] as const

// ─── Client factory ────────────────────────────────────────────────────────────

function getClients() {
  const escrowAddress  = Deno.env.get('BOUTS_ESCROW_ADDRESS')
  const privateKey     = Deno.env.get('JUDGE_ORACLE_PRIVATE_KEY')
  const rpcUrl         = Deno.env.get('BASE_RPC_URL')
  const sepoliaRpcUrl  = Deno.env.get('BASE_SEPOLIA_RPC_URL')
  const isTestnet      = Deno.env.get('CHAIN_ENV') === 'sepolia'

  if (!escrowAddress) throw new Error('BOUTS_ESCROW_ADDRESS not set')
  if (!privateKey)    throw new Error('JUDGE_ORACLE_PRIVATE_KEY not set')

  const rpc = isTestnet ? sepoliaRpcUrl : rpcUrl
  if (!rpc) throw new Error(`${isTestnet ? 'BASE_SEPOLIA_RPC_URL' : 'BASE_RPC_URL'} not set`)

  const chain   = isTestnet ? baseSepolia : base
  const account = privateKeyToAccount(privateKey as `0x${string}`)

  return {
    escrowAddress: escrowAddress as `0x${string}`,
    publicClient:  createPublicClient({ chain, transport: http(rpc) }),
    walletClient:  createWalletClient({ account, chain, transport: http(rpc) }),
    account,
  }
}

// ─── Commitment hash ───────────────────────────────────────────────────────────

/**
 * Build composite commitment hash.
 * Must match contract: keccak256(abi.encodePacked(entryId, compositeScore, salt))
 */
export function buildCompositeCommitment(params: {
  entryId:        string  // UUID — converted to bytes32
  compositeScore: number  // 0–100 integer
  salt:           string  // 0x-prefixed 32-byte hex
}): `0x${string}` {
  const entryIdBytes32 = uuidToBytes32(params.entryId)
  return keccak256(
    encodePacked(
      ['bytes32', 'uint8', 'bytes32'],
      [entryIdBytes32, params.compositeScore, params.salt as `0x${string}`]
    )
  )
}

// ─── Commit ────────────────────────────────────────────────────────────────────

/**
 * Commit a composite score hash on-chain.
 * Pass 1 of the two-pass flow — all entries committed before any reveals.
 *
 * Returns salt (plain) and saltEncrypted for storage.
 * Store saltEncrypted in challenge_entries.composite_salt_encrypted.
 */
export async function commitComposite(params: {
  entryId:        string
  challengeId:    string
  compositeScore: number   // Math.round(composite_score) — uint8
}): Promise<{
  txHash:        string
  commitment:    `0x${string}`
  salt:          string
  saltEncrypted: string
}> {
  const { escrowAddress, walletClient } = getClients()

  const compositeScore = Math.min(100, Math.max(0, Math.round(params.compositeScore)))
  const salt           = generateSalt()
  const saltEncrypted  = await encryptSalt(salt)
  const commitment     = buildCompositeCommitment({
    entryId:        params.entryId,
    compositeScore,
    salt,
  })

  const txHash = await walletClient.writeContract({
    address:      escrowAddress,
    abi:          ESCROW_ABI,
    functionName: 'commitComposite',
    args:         [uuidToBytes32(params.entryId), uuidToBytes32(params.challengeId), commitment],
  })

  console.log(`[chain-p3] committed: entry=${params.entryId} score=${compositeScore} tx=${txHash}`)
  return { txHash, commitment, salt, saltEncrypted }
}

// ─── Reveal ────────────────────────────────────────────────────────────────────

/**
 * Reveal a composite score on-chain, verifying against the commitment.
 * Pass 2 of the two-pass flow.
 * saltEncrypted comes from challenge_entries.composite_salt_encrypted.
 */
export async function revealComposite(params: {
  entryId:        string
  compositeScore: number
  saltEncrypted:  string   // from DB — decrypted internally
}): Promise<string> {
  const { escrowAddress, walletClient } = getClients()

  const compositeScore = Math.min(100, Math.max(0, Math.round(params.compositeScore)))
  const salt           = await decryptSalt(params.saltEncrypted)

  const txHash = await walletClient.writeContract({
    address:      escrowAddress,
    abi:          ESCROW_ABI,
    functionName: 'revealComposite',
    args:         [uuidToBytes32(params.entryId), compositeScore, salt as `0x${string}`],
  })

  console.log(`[chain-p3] revealed: entry=${params.entryId} score=${compositeScore} tx=${txHash}`)
  return txHash
}

// ─── Finalize ──────────────────────────────────────────────────────────────────

/**
 * Finalize a challenge on-chain: assigns placements and unlocks prize claims.
 *
 * IMPORTANT: rankedEntries must contain ONLY eligible (non-disqualified) entries,
 * ordered by composite score descending. Contract will revert if any DQ'd entry
 * is included. Oracle filters these out before calling.
 */
export async function finalizeChallenge(params: {
  challengeId:    string
  rankedEntries:  string[]  // UUIDs, sorted by composite_score DESC, DQ'd excluded
}): Promise<string> {
  const { escrowAddress, walletClient } = getClients()

  const rankedBytes32 = params.rankedEntries.map(id => uuidToBytes32(id))

  const txHash = await walletClient.writeContract({
    address:      escrowAddress,
    abi:          ESCROW_ABI,
    functionName: 'finalizeChallenge',
    args:         [uuidToBytes32(params.challengeId), rankedBytes32],
  })

  console.log(`[chain-p3] finalized: challenge=${params.challengeId} entries=${params.rankedEntries.length} tx=${txHash}`)
  return txHash
}

// ─── Disqualify ────────────────────────────────────────────────────────────────

/**
 * Mark an entry as disqualified on-chain (integrity violation).
 * Call BEFORE revealComposite / finalizeChallenge.
 * DQ'd entry fees stay in pool and redistribute to winners.
 */
export async function disqualifyEntry(entryId: string): Promise<string> {
  const { escrowAddress, walletClient } = getClients()
  const txHash = await walletClient.writeContract({
    address:      escrowAddress,
    abi:          ESCROW_ABI,
    functionName: 'disqualifyEntry',
    args:         [uuidToBytes32(entryId)],
  })
  console.log(`[chain-p3] disqualified: entry=${entryId} tx=${txHash}`)
  return txHash
}

// ─── Views ─────────────────────────────────────────────────────────────────────

export async function getOnchainCompositeScore(entryId: string): Promise<number> {
  const { escrowAddress, publicClient } = getClients()
  return publicClient.readContract({
    address:      escrowAddress,
    abi:          ESCROW_ABI,
    functionName: 'getCompositeScore',
    args:         [uuidToBytes32(entryId)],
  }) as Promise<number>
}

export { generateSalt, encryptSalt, decryptSalt, uuidToBytes32 }
