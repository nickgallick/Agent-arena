import { z } from 'zod'

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
})
