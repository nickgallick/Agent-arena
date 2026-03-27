/**
 * chain-client.ts
 * Thin viem wrapper for BoutsJudgeCommit on Base.
 * Handles commit, reveal, and read operations for the on-chain judge integrity system.
 *
 * Env vars required (Supabase Edge Function secrets):
 *   JUDGE_CONTRACT_ADDRESS   — deployed BoutsJudgeCommit address
 *   JUDGE_ORACLE_PRIVATE_KEY — 0x-prefixed private key of oracle wallet
 *   BASE_RPC_URL             — Base mainnet RPC (Alchemy)
 *   BASE_SEPOLIA_RPC_URL     — Base Sepolia RPC (for testing)
 */

import { createPublicClient, createWalletClient, http, keccak256, encodePacked } from 'npm:viem@2'
import { privateKeyToAccount } from 'npm:viem@2/accounts'
import { base, baseSepolia } from 'npm:viem@2/chains'
import { generateSalt, encryptSalt, decryptSalt, uuidToBytes32 } from './salt-utils.ts'

// ─── ABI (minimal — only what we call) ────────────────────────────────────────

const ABI = [
  {
    type: 'function',
    name: 'commit',
    inputs: [
      { name: 'entryId',    type: 'bytes32' },
      { name: 'provider',   type: 'string'  },
      { name: 'commitment', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reveal',
    inputs: [
      { name: 'entryId',  type: 'bytes32' },
      { name: 'provider', type: 'string'  },
      { name: 'score',    type: 'uint8'   },
      { name: 'salt',     type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getReveals',
    inputs: [{ name: 'entryId', type: 'bytes32' }],
    outputs: [
      { name: 'claude',      type: 'uint8' },
      { name: 'gpt4o',       type: 'uint8' },
      { name: 'gemini',      type: 'uint8' },
      { name: 'allRevealed', type: 'bool'  },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'computeCommitment',
    inputs: [
      { name: 'entryId',  type: 'bytes32' },
      { name: 'provider', type: 'string'  },
      { name: 'score',    type: 'uint8'   },
      { name: 'salt',     type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
  },
] as const

// ─── Setup ────────────────────────────────────────────────────────────────────

function getConfig() {
  const contractAddress = Deno.env.get('JUDGE_CONTRACT_ADDRESS')
  const privateKey = Deno.env.get('JUDGE_ORACLE_PRIVATE_KEY')
  const rpcUrl = Deno.env.get('BASE_RPC_URL')
  const sepoliaRpcUrl = Deno.env.get('BASE_SEPOLIA_RPC_URL')
  const isTestnet = Deno.env.get('CHAIN_ENV') === 'sepolia'

  if (!contractAddress) throw new Error('JUDGE_CONTRACT_ADDRESS not set')
  if (!privateKey) throw new Error('JUDGE_ORACLE_PRIVATE_KEY not set')

  const rpc = isTestnet ? sepoliaRpcUrl : rpcUrl
  if (!rpc) throw new Error(`${isTestnet ? 'BASE_SEPOLIA_RPC_URL' : 'BASE_RPC_URL'} not set`)

  const chain = isTestnet ? baseSepolia : base
  const account = privateKeyToAccount(privateKey as `0x${string}`)

  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpc) })

  return {
    contractAddress: contractAddress as `0x${string}`,
    publicClient,
    walletClient,
    account,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a salt, compute commitment, submit to chain.
 * Returns: { txHash, saltEncrypted, commitment, scoreInt }
 * Store saltEncrypted + commitment + txHash in judge_scores row.
 */
export async function commitScore(
  entryId: string,   // UUID
  provider: string,  // 'claude' | 'gpt4o' | 'gemini'
  overall: number,   // 1.0–10.0 float from judge
): Promise<{ txHash: string; saltEncrypted: string; commitment: `0x${string}`; scoreInt: number }> {
  const { contractAddress, walletClient } = getConfig()

  const entryIdBytes32 = uuidToBytes32(entryId)
  const scoreInt = Math.round(overall * 10) // 10–100
  const salt = generateSalt() // 0x-prefixed 32-byte hex

  // Compute commitment: keccak256(abi.encodePacked(entryId, provider, score, salt))
  const commitment = keccak256(
    encodePacked(
      ['bytes32', 'string', 'uint8', 'bytes32'],
      [entryIdBytes32, provider, scoreInt, salt as `0x${string}`]
    )
  )

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'commit',
    args: [entryIdBytes32, provider, commitment],
  })

  // Encrypt salt before storing in DB
  const saltEncrypted = await encryptSalt(salt)

  return { txHash, saltEncrypted, commitment, scoreInt }
}

/**
 * Reveal a previously committed score on-chain.
 * Call this after all 3 providers have committed.
 * saltEncrypted comes from judge_scores row in DB.
 */
export async function revealScore(
  entryId: string,
  provider: string,
  scoreInt: number,
  saltEncrypted: string,
): Promise<string> {
  const { contractAddress, walletClient } = getConfig()

  const entryIdBytes32 = uuidToBytes32(entryId)
  const salt = await decryptSalt(saltEncrypted)

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'reveal',
    args: [entryIdBytes32, provider, scoreInt, salt as `0x${string}`],
  })

  return txHash
}

/**
 * Read all revealed scores for an entry from the contract.
 * Returns null if not all 3 have been revealed yet.
 */
export async function getAllReveals(
  entryId: string,
): Promise<{ claude: number; gpt4o: number; gemini: number } | null> {
  const { contractAddress, publicClient } = getConfig()

  const entryIdBytes32 = uuidToBytes32(entryId)

  const result = await publicClient.readContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'getReveals',
    args: [entryIdBytes32],
  }) as [number, number, number, boolean]

  const [claude, gpt4o, gemini, allRevealed] = result
  if (!allRevealed) return null

  return {
    claude: claude / 10,   // convert back to 1–10 scale
    gpt4o: gpt4o / 10,
    gemini: gemini / 10,
  }
}

export { generateSalt, uuidToBytes32 }
