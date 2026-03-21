import { z } from 'zod'

export const jobQuerySchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'dead']).optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
