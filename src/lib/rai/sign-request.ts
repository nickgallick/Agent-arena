/**
 * RAI Request Signing
 *
 * Builds and verifies HMAC-SHA256 signatures for Remote Agent Invocation requests.
 * Every request Bouts sends to a user's endpoint is signed so the endpoint can
 * verify the request is genuine and not replayed.
 *
 * Signature payload:
 *   method + "\n" + url + "\n" + timestamp_ms + "\n" + nonce + "\n" + body_sha256
 *
 * Headers set:
 *   X-Bouts-Signature: sha256={hex}
 *   X-Bouts-Timestamp: {unix_ms}
 *   X-Bouts-Nonce: {16_byte_hex}
 *   X-Bouts-Environment: production | sandbox
 */

import { createHmac, createHash, randomBytes } from 'crypto'

export interface SignedHeaders {
  'X-Bouts-Signature': string
  'X-Bouts-Timestamp': string
  'X-Bouts-Nonce': string
  'X-Bouts-Environment': string
  'Content-Type': string
  'Idempotency-Key': string
  [key: string]: string
}

export interface SignRequestParams {
  method: string
  url: string
  body: string
  secret: string
  environment: 'production' | 'sandbox'
  idempotencyKey: string
}

export function buildSignaturePayload(
  method: string,
  url: string,
  timestampMs: string,
  nonce: string,
  bodySha256: string
): string {
  return [method.toUpperCase(), url, timestampMs, nonce, bodySha256].join('\n')
}

export function signRequest(params: SignRequestParams): SignedHeaders {
  const { method, url, body, secret, environment, idempotencyKey } = params

  const timestampMs = Date.now().toString()
  const nonce = randomBytes(16).toString('hex')
  const bodySha256 = createHash('sha256').update(body, 'utf8').digest('hex')

  const payload = buildSignaturePayload(method, url, timestampMs, nonce, bodySha256)
  const signature = createHmac('sha256', secret).update(payload).digest('hex')

  return {
    'X-Bouts-Signature': `sha256=${signature}`,
    'X-Bouts-Timestamp': timestampMs,
    'X-Bouts-Nonce': nonce,
    'X-Bouts-Environment': environment,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  }
}

/**
 * Verify a signed request (for use in user endpoint implementation examples and tests).
 * Timestamp tolerance: ±5 minutes.
 */
export function verifySignature(params: {
  method: string
  url: string
  body: string
  secret: string
  headers: {
    'x-bouts-signature': string
    'x-bouts-timestamp': string
    'x-bouts-nonce': string
  }
}): { valid: boolean; reason?: string } {
  const { method, url, body, secret, headers } = params

  const sigHeader = headers['x-bouts-signature']
  const timestampMs = headers['x-bouts-timestamp']
  const nonce = headers['x-bouts-nonce']

  if (!sigHeader || !timestampMs || !nonce) {
    return { valid: false, reason: 'Missing required Bouts signature headers' }
  }

  // Timestamp window: ±5 minutes
  const ts = parseInt(timestampMs, 10)
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return { valid: false, reason: 'Timestamp out of tolerance window (±5 minutes)' }
  }

  const bodySha256 = createHash('sha256').update(body, 'utf8').digest('hex')
  const payload = buildSignaturePayload(method.toUpperCase(), url, timestampMs, nonce, bodySha256)
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(sigHeader, expected)) {
    return { valid: false, reason: 'Signature mismatch' }
  }

  return { valid: true }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function hashSecret(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function generateSecret(): string {
  return 'rai_' + randomBytes(32).toString('hex')
}
