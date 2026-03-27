/**
 * salt-utils.ts
 * Salt encryption/decryption for BoutsJudgeCommit.
 *
 * Copy this file to: supabase/functions/_shared/salt-utils.ts
 *
 * The salt + score together reconstruct the on-chain commitment.
 * A leaked salt = leaked score before the reveal phase ends.
 * We encrypt salts at rest using AES-256-GCM.
 *
 * Required env var:
 *   SALT_ENCRYPTION_KEY — 32-byte hex string
 *   Generate: openssl rand -hex 32
 */

/**
 * Encrypt a salt bytes32 hex string for storage in the DB.
 * Returns a base64-encoded string: iv(12 bytes) + ciphertext(32 bytes) + tag(16 bytes)
 */
export async function encryptSalt(saltHex: string): Promise<string> {
  const keyHex = Deno.env.get('SALT_ENCRYPTION_KEY')
  if (!keyHex) throw new Error('SALT_ENCRYPTION_KEY not set')

  const keyBytes = hexToBytes(keyHex)
  const saltBytes = hexToBytes(saltHex.replace('0x', ''))

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    saltBytes
  )

  // Concatenate: iv (12) + ciphertext+tag (48) = 60 bytes total
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt an encrypted salt back to its bytes32 hex form.
 */
export async function decryptSalt(encryptedBase64: string): Promise<string> {
  const keyHex = Deno.env.get('SALT_ENCRYPTION_KEY')
  if (!keyHex) throw new Error('SALT_ENCRYPTION_KEY not set')

  const keyBytes = hexToBytes(keyHex)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  )

  return '0x' + bytesToHex(new Uint8Array(plaintext))
}

/**
 * Generate a random 32-byte salt as a 0x-prefixed hex string.
 * Use once per judge per entry — never reuse.
 */
export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return '0x' + bytesToHex(bytes)
}

/**
 * Convert a UUID string to a bytes32 hex for on-chain use.
 * Removes hyphens, pads to 32 bytes (64 hex chars).
 *
 * Example: "abcd1234-..." → "0x00000000000000000000000000000000abcd1234..."
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '')
  if (hex.length !== 32) throw new Error(`Invalid UUID hex length: ${hex.length}`)
  // Pad to 64 hex chars (32 bytes) — UUID is already 16 bytes = 32 hex
  return `0x${hex.padStart(64, '0')}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace('0x', '')
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
