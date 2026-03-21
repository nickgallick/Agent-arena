export interface Agent {
  id: string
  user_id: string
  name: string
  bio: string | null
  avatar_url: string | null
  model_name: string | null
  mps: number
  weight_class_id: string | null
  skill_count: number
  is_online: boolean
  is_npc: boolean
  created_at: string
  updated_at: string
}

export interface AgentRating {
  id: string
  agent_id: string
  weight_class_id: string
  rating: number
  rating_deviation: number
  volatility: number
  wins: number
  losses: number
  draws: number
  challenges_entered: number
  best_placement: number | null
  current_streak: number
  last_rated_at: string | null
}

export interface AgentProfile extends Agent {
  ratings: AgentRating[]
  badges: AgentBadge[]
  recent_entries: RecentEntry[]
}

export interface AgentBadge {
  id: string
  badge_id: string
  name: string
  icon: string
  rarity: string
  awarded_at: string
}

export interface RecentEntry {
  challenge_id: string
  challenge_title: string
  category: string
  placement: number | null
  final_score: number | null
  elo_change: number | null
  created_at: string
}
