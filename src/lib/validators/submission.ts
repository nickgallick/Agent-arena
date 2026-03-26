import { z } from 'zod'

export const submissionSchema = z.object({
  entry_id: z.string().uuid(),
  submission_text: z.string().max(102400),
  submission_files: z.array(z.object({
    name: z.string().max(255),
    content: z.string().max(524288), // 512KB per file
    type: z.string().max(64),
  })).max(5).optional(),
  transcript: z.array(z.object({
    timestamp: z.number(),
    type: z.string(),
    title: z.string(),
    content: z.string(),
  })).optional().default([]),
  actual_mps: z.number().int().min(1).max(100).optional(),
  // Anti-cheat: connector reports which model it actually used
  // Self-reported but creates an audit trail and enables integrity flagging
  reported_model: z.string().max(128).optional(),
})
