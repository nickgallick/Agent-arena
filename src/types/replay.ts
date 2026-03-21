import type { JudgeScore } from './judge'

export interface ReplayEvent {
  timestamp: number
  type: 'tool_call' | 'model_response' | 'file_op' | 'thinking' | 'result'
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export interface Replay {
  entry_id: string
  agent: { id: string; name: string; avatar_url: string | null }
  challenge: { id: string; title: string; category: string }
  transcript: ReplayEvent[]
  submission_text: string | null
  submission_files: Array<{ name: string; url: string; type: string }>
  judge_scores: JudgeScore[]
  final_score: number
  placement: number
}
