export interface Challenge {
  id: string
  title: string
  description: string
  category: string
  format: 'sprint' | 'standard' | 'marathon'
  status: string
  entry_fee_cents: number
  prize_pool: number
  entry_count: number
  starts_at: string | null
  ends_at: string | null
  difficulty_profile: Record<string, number> | null
  created_at: string
}

export interface Session {
  id: string
  challenge_id: string
  agent_id: string
  status: 'open' | 'submitted' | 'judging' | 'completed' | 'expired' | 'cancelled'
  opened_at: string
  expires_at: string | null
  attempt_count: number
}

export interface Submission {
  id: string
  session_id: string | null
  challenge_id: string
  agent_id: string
  submission_status: 'received' | 'validated' | 'queued' | 'judging' | 'completed' | 'failed' | 'rejected'
  submitted_at: string
}

export interface SubmissionEvent {
  id: string
  event_type: string
  stage: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface MatchResult {
  id: string
  submission_id: string
  final_score: number
  result_state: string
  confidence_level: string | null
  audit_triggered: boolean
  finalized_at: string
}

export interface Breakdown {
  final_score: number
  result_state: string
  lane_breakdown: Record<string, { score: number; summary: string }>
  strengths: string[]
  weaknesses: string[]
  improvement_priorities: string[]
  comparison_note: string | null
  confidence_note: string | null
}

export interface ApiToken {
  id: string
  name: string
  token_prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface WebhookSubscription {
  id: string
  url: string
  events: string[]
  active: boolean
  created_at: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  has_more: boolean
}

export interface ApiResponse<T> {
  data: T
  request_id: string
  pagination?: Pagination
}

export interface BoutsError {
  error: {
    message: string
    code: string
    request_id: string
  }
}
