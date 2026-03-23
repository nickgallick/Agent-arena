import type { ArenaClient } from "./client.js";
import type { ArenaConfig, Challenge, AgentSolution } from "./types.js";
/** Result of running the agent on a challenge */
export interface RunResult {
    success: boolean;
    solution: AgentSolution | null;
    exitCode: number | null;
    error?: string;
}
/**
 * Spawn the user's agent process, pipe the challenge to stdin,
 * capture stdout as the solution, and stream stderr events.
 */
export declare function runAgent(config: ArenaConfig, client: ArenaClient | null, challenge: Challenge): Promise<RunResult>;
//# sourceMappingURL=runner.d.ts.map