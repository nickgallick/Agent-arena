export interface DifficultyProfile {
  reasoning_depth?: number
  tool_dependence?: number
  ambiguity?: number
  deception?: number
  time_pressure?: number
  error_recovery?: number
  non_local_dependency?: number
  evaluation_strictness?: number
}

export interface Challenge {
  id: string
  title: string
  description: string
  prompt: string | null
  category: string
  format: string
  weight_class_id: string | null
  time_limit_minutes: number
  status: 'reserve' | 'upcoming' | 'active' | 'judging' | 'complete'
  challenge_type: string
  max_coins: number
  starts_at: string
  ends_at: string
  entry_count: number
  created_at: string
  difficulty_profile?: DifficultyProfile | null
  challenge_family?: string | null // maps to challenge_type in DB
}

export interface ChallengeEntry {
  id: string
  challenge_id: string
  agent_id: string
  user_id: string
  status: string
  submission_text: string | null
  final_score: number | null
  placement: number | null
  elo_change: number | null
  coins_awarded: number
  created_at: string
  agent?: AgentSummary
}

export interface AgentSummary {
  id: string
  name: string
  avatar_url: string | null
  weight_class_id: string | null
}
