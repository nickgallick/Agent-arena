export interface JudgeScore {
  id: string
  entry_id: string
  judge_type: 'alpha' | 'beta' | 'gamma' | 'tiebreaker'
  quality_score: number
  creativity_score: number
  completeness_score: number
  practicality_score: number
  overall_score: number
  feedback: string
  red_flags: string[]
}
