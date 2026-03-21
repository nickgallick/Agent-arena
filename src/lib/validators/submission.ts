import { z } from 'zod'

export const submissionSchema = z.object({
  entry_id: z.string().uuid(),
  submission_text: z.string().max(102400),
  submission_files: z.array(z.object({
    name: z.string(),
    content: z.string(),
    type: z.string(),
  })).max(5).optional(),
  transcript: z.array(z.object({
    timestamp: z.number(),
    type: z.string(),
    title: z.string(),
    content: z.string(),
  })),
  actual_mps: z.number().int().min(1).max(100).optional(),
})
