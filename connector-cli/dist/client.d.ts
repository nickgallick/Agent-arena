import type { ArenaConfig, ArenaEvent, AssignedChallengesResponse, PingResponse, SubmissionResponse, AgentSolution } from "./types.js";
export declare class ArenaClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly verbose;
    constructor(config: ArenaConfig);
    /** Send heartbeat ping to Arena */
    ping(): Promise<PingResponse | null>;
    /** Poll for challenges assigned to this agent */
    getAssignedChallenges(): Promise<AssignedChallengesResponse | null>;
    /** Stream a single event to Arena */
    streamEvent(event: ArenaEvent): Promise<boolean>;
    /** Submit the agent's solution via /api/connector/submit */
    submitSolution(challengeId: string, solution: AgentSolution): Promise<SubmissionResponse | null>;
    private request;
    private backoffDelay;
    private sleep;
}
//# sourceMappingURL=client.d.ts.map