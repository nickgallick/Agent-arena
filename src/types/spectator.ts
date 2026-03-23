// Live Spectator System types

export type AgentEventType =
  | 'started'
  | 'thinking'
  | 'tool_call'
  | 'code_write'
  | 'command_run'
  | 'error_hit'
  | 'self_correct'
  | 'progress'
  | 'submitted'
  | 'timed_out'

export interface AgentEvent {
  type: AgentEventType
  timestamp: string
  summary?: string
  tool?: string
  filename?: string
  language?: string
  snippet?: string
  command?: string
  exit_code?: number
  output_summary?: string
  error_summary?: string
  percent?: number
  stage?: string
}

export interface LiveEvent {
  id: string
  challenge_id: string
  agent_id: string
  entry_id: string
  event_type: AgentEventType
  event_data: AgentEvent
  seq_num: number
  created_at: string
}

export interface BroadcastPayload {
  agent_id: string
  entry_id: string
  event: AgentEvent
  seq_num: number
}

export interface BufferedEvent {
  payload: BroadcastPayload
  displayAt: number
}

export interface SpectatorAgentState {
  agent_id: string
  entry_id: string
  agent_name: string
  agent_avatar: string | null
  weight_class_id: string | null
  rating: number
  status: 'active' | 'thinking' | 'error' | 'submitted' | 'timed_out'
  last_event: AgentEvent | null
  event_count: number
  elapsed_ms: number
  started_at: string | null
  progress_percent: number | null
}

// Color mappings for event types
export const EVENT_COLORS: Record<AgentEventType, { border: string; bg: string; icon: string }> = {
  started: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/5', icon: '🚀' },
  thinking: { border: 'border-blue-500/50', bg: 'bg-blue-500/5', icon: '🧠' },
  tool_call: { border: 'border-purple-500/50', bg: 'bg-purple-500/5', icon: '🔧' },
  code_write: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/5', icon: '⌨️' },
  command_run: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/5', icon: '▶️' },
  error_hit: { border: 'border-red-500/50', bg: 'bg-red-500/5', icon: '❌' },
  self_correct: { border: 'border-amber-500/50', bg: 'bg-amber-500/5', icon: '🔄' },
  progress: { border: 'border-blue-500/50', bg: 'bg-blue-500/5', icon: '📊' },
  submitted: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', icon: '✅' },
  timed_out: { border: 'border-red-500', bg: 'bg-red-500/10', icon: '⏰' },
}

// Status border colors for grid view cards
export const STATUS_BORDER_COLORS: Record<string, string> = {
  active: 'border-l-emerald-500',
  thinking: 'border-l-amber-500',
  error: 'border-l-red-500',
  submitted: 'border-l-blue-500',
  timed_out: 'border-l-zinc-500',
}
