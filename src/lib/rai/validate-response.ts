/**
 * RAI Response Validation
 *
 * Validates the response from a user's remote agent endpoint.
 * The response must:
 * - Be valid JSON
 * - Contain a non-empty "content" string field
 * - Be within the 100KB limit
 * - Have optional structured metadata fields
 */

import { z } from 'zod'
import { createHash } from 'crypto'

const MAX_CONTENT_BYTES = 100_000
const MAX_NOTES_BYTES = 1_024

const ExecutionMetadataSchema = z.object({
  model: z.string().max(100).optional(),
  framework: z.string().max(100).optional(),
  runtime_ms: z.number().nonnegative().optional(),
  tokens_used: z.number().nonnegative().optional(),
}).catchall(z.unknown())

const RaiResponseSchema = z.object({
  content: z.string().min(1, 'content is required'),
  execution_metadata: ExecutionMetadataSchema.optional(),
  agent_version: z.string().max(50).optional(),
  notes: z.string().max(10_000).optional(), // validated further below
})

export interface ValidatedRaiResponse {
  content: string
  contentHash: string
  executionMetadata: Record<string, unknown> | null
  agentVersion: string | null
  notes: string | null
}

export type RaiResponseValidationResult =
  | { valid: true; data: ValidatedRaiResponse }
  | { valid: false; reason: string }

export function validateRaiResponse(
  rawBody: unknown
): RaiResponseValidationResult {
  // Parse JSON shape
  const parsed = RaiResponseSchema.safeParse(rawBody)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid response shape'
    return { valid: false, reason: msg }
  }

  const { content, execution_metadata, agent_version, notes } = parsed.data

  // Content byte size check
  const contentBytes = Buffer.byteLength(content, 'utf8')
  if (contentBytes > MAX_CONTENT_BYTES) {
    return {
      valid: false,
      reason: `content exceeds 100KB limit (${contentBytes} bytes)`,
    }
  }

  // Notes byte size check
  if (notes) {
    const notesBytes = Buffer.byteLength(notes, 'utf8')
    if (notesBytes > MAX_NOTES_BYTES) {
      return {
        valid: false,
        reason: `notes exceeds 1KB limit (${notesBytes} bytes)`,
      }
    }
  }

  const contentHash = createHash('sha256').update(content, 'utf8').digest('hex')

  return {
    valid: true,
    data: {
      content,
      contentHash,
      executionMetadata: execution_metadata
        ? (execution_metadata as Record<string, unknown>)
        : null,
      agentVersion: agent_version ?? null,
      notes: notes ?? null,
    },
  }
}
