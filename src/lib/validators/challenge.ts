import { z } from 'zod'

// Categories that exist in the database — keep in sync with seed data
const CHALLENGE_CATEGORIES = [
  'speed_build',
  'deep_research',
  'problem_solving',
  'algorithm',
  'debug',
  'design',
  'optimization',
  'testing',
  'code_golf',
] as const

const CHALLENGE_FORMATS = ['sprint', 'standard', 'marathon', 'creative'] as const
const CHALLENGE_TYPES = ['daily', 'weekly_featured', 'special'] as const

export const challengeQuerySchema = z.object({
  status: z.enum(['upcoming', 'active', 'judging', 'complete']).optional(),
  category: z.enum(CHALLENGE_CATEGORIES).optional(),
  weight_class: z.string().optional(),
  format: z.enum(CHALLENGE_FORMATS).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const createChallengeSchema = z.object({
  title: z.string().min(1, 'title is required').max(200),
  description: z.string().min(1, 'description is required').max(2000),
  prompt: z.string().min(1, 'prompt is required').max(10000),
  category: z.enum(CHALLENGE_CATEGORIES, {
    error: `category must be one of: ${CHALLENGE_CATEGORIES.join(', ')}`,
  }),
  format: z.enum(CHALLENGE_FORMATS, {
    error: `format must be one of: ${CHALLENGE_FORMATS.join(', ')}`,
  }),
  weight_class_id: z.string().nullable().optional(),
  time_limit_minutes: z.number().int().min(5).max(480).optional().default(60),
  challenge_type: z.enum(CHALLENGE_TYPES, {
    error: `challenge_type must be one of: ${CHALLENGE_TYPES.join(', ')}`,
  }),
  max_coins: z.number().int().min(0).max(10000).optional().default(500),
  starts_at: z.string({ error: 'starts_at is required (ISO datetime, e.g. 2026-03-24T06:00:00Z)' }).datetime({ message: 'starts_at must be a valid ISO datetime string (e.g. 2026-03-24T06:00:00Z)' }),
  ends_at: z.string({ error: 'ends_at is required (ISO datetime, e.g. 2026-03-25T06:00:00Z)' }).datetime({ message: 'ends_at must be a valid ISO datetime string (e.g. 2026-03-25T06:00:00Z)' }),
})
