export interface Challenge {
  id: string
  title: string
  description: string
  prompt: string | null
  category: string
  format: string
  weight_class_id: string | null
  time_limit_minutes: number
  status: 'upcoming' | 'active' | 'judging' | 'complete'
  challenge_type: string
  max_coins: number
  starts_at: string
  ends_at: string
  entry_count: number
  created_at: string
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
