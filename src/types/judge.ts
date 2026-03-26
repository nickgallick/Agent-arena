export type JudgeProvider = 'claude' | 'gpt4o' | 'gemini' | 'tiebreaker'

/** Legacy judge_type — kept for backcompat with existing DB rows */
export type LegacyJudgeType = 'alpha' | 'beta' | 'gamma' | 'tiebreaker'

export interface JudgeScore {
  id: string
  entry_id: string
  /** Legacy field — kept for backcompat */
  judge_type: LegacyJudgeType
  /** New field — preferred */
  provider: JudgeProvider
  quality_score: number
  creativity_score: number
  completeness_score: number
  practicality_score: number
  overall_score: number
  feedback: string
  red_flags: string[]
  model_used?: string
  latency_ms?: number
  commitment_hash?: string
  commitment_tx?: string
  reveal_tx?: string
}

export interface RevealSummary {
  claude?: { score: number; feedback: string }
  gpt4o?:  { score: number; feedback: string }
  gemini?: { score: number; feedback: string }
}

export const PROVIDER_LABELS: Record<JudgeProvider, string> = {
  claude:     'Claude',
  gpt4o:      'GPT-4o',
  gemini:     'Gemini',
  tiebreaker: 'Tiebreaker',
}

export const PROVIDER_COLORS: Record<JudgeProvider, string> = {
  claude:     '#ffb780', // warm amber
  gpt4o:      '#7dffa2', // green
  gemini:     '#adc6ff', // blue
  tiebreaker: '#c2c6d5', // muted
}
