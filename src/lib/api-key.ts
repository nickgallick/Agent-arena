/**
 * API key generation and verification.
 *
 * Keys use the format `aa_<base62-encoded-random-bytes>` and are stored
 * as SHA-256 hashes (consistent with authenticate-connector.ts).
 *
 * Uses only the Node.js built-in `crypto` module — no external deps.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/** Prefix for all Arena API keys. */
const KEY_PREFIX = 'aa_'

/** Number of random bytes used to generate the key body. */
const KEY_BYTES = 48

/** Base62 alphabet — alphanumeric, no confusing special chars. */
const BASE62_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Encode a Buffer as a base62 string.
 *
 * Treats the buffer as a big-endian unsigned integer and repeatedly
 * divides by 62, collecting remainders.
 */
function toBase62(buffer: Buffer): string {
  // Convert bytes to base62 by processing each byte and accumulating
  // the result character by character. Avoids BigInt for ES2017 compat.
  let result = ''
  const bytes = Array.from(buffer)

  // Use a simple approach: convert to hex first, then re-encode.
  // We process byte-by-byte using modular arithmetic on a number array.
  const digits: number[] = [0] // big number represented as base-62 digits

  for (const byte of bytes) {
    // Multiply existing digits by 256
    let carry = 0
    for (let i = digits.length - 1; i >= 0; i--) {
      const val = digits[i] * 256 + carry
      digits[i] = val % 62
      carry = Math.floor(val / 62)
    }
    while (carry > 0) {
      digits.unshift(carry % 62)
      carry = Math.floor(carry / 62)
    }

    // Add the new byte
    carry = byte
    for (let i = digits.length - 1; i >= 0 && carry > 0; i--) {
      const val = digits[i] + carry
      digits[i] = val % 62
      carry = Math.floor(val / 62)
    }
    while (carry > 0) {
      digits.unshift(carry % 62)
      carry = Math.floor(carry / 62)
    }
  }

  // Convert digit indices to characters
  for (const d of digits) {
    result += BASE62_CHARS[d]
  }

  return result || '0'
}

/**
 * Hash a raw API key using SHA-256.
 * Returns the hex-encoded digest.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Verify a raw API key against a stored SHA-256 hash.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const candidateHash = hashApiKey(rawKey)

  // Both are hex strings of SHA-256 digests — always 64 chars
  if (candidateHash.length !== storedHash.length) return false

  try {
    return timingSafeEqual(
      Buffer.from(candidateHash, 'utf8'),
      Buffer.from(storedHash, 'utf8'),
    )
  } catch {
    return false
  }
}

/**
 * Generate a new API key with its hash and display prefix.
 *
 * @returns Object containing:
 *   - `raw`:    Full key (e.g. `aa_7kX9m2...`) — show once, never store
 *   - `hash`:   SHA-256 hex digest — store in the database
 *   - `prefix`: First 8 characters (e.g. `aa_7kX9m`) — store for display
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(KEY_BYTES)
  const encoded = toBase62(bytes)
  const raw = `${KEY_PREFIX}${encoded}`

  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, 8),
  }
}
