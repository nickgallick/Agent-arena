interface Challenge {
    id: string;
    title: string;
    description: string;
    category: string;
    format: 'sprint' | 'standard' | 'marathon';
    status: string;
    entry_fee_cents: number;
    prize_pool: number;
    entry_count: number;
    starts_at: string | null;
    ends_at: string | null;
    difficulty_profile: Record<string, number> | null;
    created_at: string;
}
interface Session {
    id: string;
    challenge_id: string;
    agent_id: string;
    status: 'open' | 'submitted' | 'judging' | 'completed' | 'expired' | 'cancelled';
    opened_at: string;
    expires_at: string | null;
    attempt_count: number;
}
interface Submission {
    id: string;
    session_id: string | null;
    challenge_id: string;
    agent_id: string;
    submission_status: 'received' | 'validated' | 'queued' | 'judging' | 'completed' | 'failed' | 'rejected';
    submitted_at: string;
}
interface SubmissionEvent {
    id: string;
    event_type: string;
    stage: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}
interface MatchResult {
    id: string;
    submission_id: string;
    final_score: number;
    result_state: string;
    confidence_level: string | null;
    audit_triggered: boolean;
    finalized_at: string;
}
interface Breakdown {
    final_score: number;
    result_state: string;
    lane_breakdown: Record<string, {
        score: number;
        summary: string;
    }>;
    strengths: string[];
    weaknesses: string[];
    improvement_priorities: string[];
    comparison_note: string | null;
    confidence_note: string | null;
}
interface ApiToken {
    id: string;
    name: string;
    token_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    expires_at: string | null;
    created_at: string;
}
interface WebhookSubscription {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    created_at: string;
}
interface Pagination {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}
interface ApiResponse<T> {
    data: T;
    request_id: string;
    pagination?: Pagination;
}
interface BoutsError {
    error: {
        message: string;
        code: string;
        request_id: string;
    };
}

interface BoutsClientConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
}
declare class BoutsHttpClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly maxRetries;
    constructor(config: BoutsClientConfig);
    request<T>(method: string, path: string, opts?: {
        body?: unknown;
        idempotencyKey?: string;
        query?: Record<string, string | number | undefined>;
    }): Promise<ApiResponse<T>>;
}

declare class ChallengesResource {
    private readonly http;
    constructor(http: BoutsHttpClient);
    list(opts?: {
        status?: string;
        format?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        challenges: Challenge[];
        pagination: Pagination;
    }>;
    get(challengeId: string): Promise<Challenge>;
    createSession(challengeId: string): Promise<Session>;
}

declare class SessionsResource {
    private readonly http;
    constructor(http: BoutsHttpClient);
    get(sessionId: string): Promise<Session>;
    submit(sessionId: string, content: string, opts?: {
        files?: Array<{
            path: string;
            content: string;
            language?: string;
        }>;
        idempotencyKey?: string;
    }): Promise<Submission>;
}

declare class SubmissionsResource {
    private readonly http;
    constructor(http: BoutsHttpClient);
    get(submissionId: string): Promise<Submission>;
    breakdown(submissionId: string): Promise<Breakdown>;
    waitForResult(submissionId: string, opts?: {
        intervalMs?: number;
        timeoutMs?: number;
    }): Promise<Submission>;
}

declare class ResultsResource {
    private readonly http;
    constructor(http: BoutsHttpClient);
    get(submissionId: string): Promise<MatchResult>;
}

declare class WebhooksResource {
    private readonly http;
    constructor(http: BoutsHttpClient);
    list(): Promise<WebhookSubscription[]>;
    create(opts: {
        url: string;
        events: string[];
        secret: string;
    }): Promise<WebhookSubscription>;
    delete(webhookId: string): Promise<void>;
    static verifySignature(opts: {
        payload: string;
        signature: string;
        secret: string;
    }): boolean;
}

declare class BoutsApiError extends Error {
    readonly message: string;
    readonly code: string;
    readonly status: number;
    readonly requestId: string;
    constructor(message: string, code: string, status: number, requestId: string);
}
declare class BoutsRateLimitError extends BoutsApiError {
    constructor(requestId: string);
}
declare class BoutsAuthError extends BoutsApiError {
    constructor(requestId: string);
}

declare class BoutsClient {
    readonly challenges: ChallengesResource;
    readonly sessions: SessionsResource;
    readonly submissions: SubmissionsResource;
    readonly results: ResultsResource;
    readonly webhooks: WebhooksResource;
    constructor(config: BoutsClientConfig);
}

export { type ApiResponse, type ApiToken, BoutsApiError, BoutsAuthError, BoutsClient, type BoutsClientConfig, type BoutsError, BoutsRateLimitError, type Breakdown, type Challenge, type MatchResult, type Pagination, type Session, type Submission, type SubmissionEvent, type WebhookSubscription, BoutsClient as default };
