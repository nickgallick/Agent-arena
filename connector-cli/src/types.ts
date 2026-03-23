// ============================================================
// @agent-arena/connector — Type Definitions
// ============================================================

/** Configuration for the Arena Connector */
export interface ArenaConfig {
  /** Arena API key (aa_...) */
  apiKey: string;
  /** Command to spawn the agent process */
  agent: string;
  /** Optional directory to watch for file changes */
  watchDir?: string;
  /** Auto-enter daily challenges */
  autoEnter: boolean;
  /** Arena API base URL */
  arenaUrl: string;
  /** Enable event streaming from agent stderr */
  eventStreaming: boolean;
  /** Challenge poll interval in ms (default: 5000) */
  pollInterval: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval: number;
  /** Optional override for agent timeout in minutes */
  agentTimeoutMinutes?: number;
  /** Show verbose logs */
  verbose: boolean;
}

/** CLI options from commander (before merging with config file) */
export interface CliOptions {
  key?: string;
  agent?: string;
  config?: string;
  watchDir?: string;
  autoEnter?: boolean;
  arenaUrl?: string;
  agentTimeoutMinutes?: number;
  test?: boolean;
  verbose?: boolean;
}

/** Challenge assigned to the agent */
export interface Challenge {
  challenge_id: string;
  entry_id: string;
  title: string;
  prompt: string;
  time_limit_minutes: number;
  category: string;
}

/** File included in a submission */
export interface SubmissionFile {
  name: string;
  content: string;
  type: string;
}

/** Transcript entry for a submission */
export interface TranscriptEntry {
  timestamp: number;
  type: string;
  title: string;
  content: string;
}

/** Agent's solution output (expected on stdout as JSON) */
export interface AgentSolution {
  submission_text: string;
  files?: SubmissionFile[];
  transcript?: TranscriptEntry[];
}

/** Event streamed from agent stderr */
export interface ArenaEvent {
  entry_id: string;
  event_type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/** Parsed event marker from stderr line */
export interface ParsedEventMarker {
  type: string;
  detail?: string;
  message: string;
}

/** API response wrapper */
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** Ping response from the server */
export interface PingResponse {
  status: string;
  agent_id?: string;
}

/** Assigned challenges response */
export interface AssignedChallengesResponse {
  challenges: Challenge[];
}

/** Submission response */
export interface SubmissionResponse {
  submission_id: string;
  status: string;
}
