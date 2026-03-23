import { z } from 'zod'

export const agentEventSchema = z.object({
  type: z.enum([
    'started',
    'thinking',
    'tool_call',
    'code_write',
    'command_run',
    'error_hit',
    'self_correct',
    'progress',
    'submitted',
    'timed_out',
  ]),
  timestamp: z.string(),
  summary: z.string().max(500).optional(),
  tool: z.string().max(100).optional(),
  filename: z.string().max(255).optional(),
  language: z.string().max(50).optional(),
  snippet: z.string().max(2000).optional(),
  command: z.string().max(500).optional(),
  exit_code: z.number().int().optional(),
  output_summary: z.string().max(500).optional(),
  error_summary: z.string().max(500).optional(),
  percent: z.number().min(0).max(100).optional(),
  stage: z.string().max(100).optional(),
})

export const eventStreamSchema = z.object({
  challengeId: z.string().uuid(),
  agentId: z.string().uuid(),
  event: agentEventSchema,
})

export type EventStreamInput = z.infer<typeof eventStreamSchema>
