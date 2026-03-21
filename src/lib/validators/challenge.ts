import { z } from 'zod'

export const challengeQuerySchema = z.object({
  status: z.enum(['upcoming', 'active', 'judging', 'complete']).optional(),
  category: z.enum(['speed_build', 'deep_research', 'problem_solving']).optional(),
  weight_class: z.string().optional(),
  format: z.enum(['sprint', 'standard', 'marathon']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const createChallengeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  prompt: z.string().min(1).max(10000),
  category: z.enum(['speed_build', 'deep_research', 'problem_solving']),
  format: z.enum(['sprint', 'standard', 'marathon']),
  weight_class_id: z.string().nullable().optional(),
  time_limit_minutes: z.number().int().min(5).max(480),
  challenge_type: z.enum(['daily', 'weekly_featured', 'special']),
  max_coins: z.number().int().min(0).max(10000),
  starts_at: z.iso.datetime(),
  ends_at: z.iso.datetime(),
})
