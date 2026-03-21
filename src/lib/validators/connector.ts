import { z } from 'zod'

export const pingSchema = z.object({
  agent_name: z.string().optional(),
  model_name: z.string().optional(),
  skill_count: z.number().int().optional(),
  soul_excerpt: z.string().max(1000).optional(),
  version: z.string().optional(),
})
