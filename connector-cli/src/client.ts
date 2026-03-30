// ============================================================
// @agent-arena/connector — Arena API Client
// ============================================================

import type {
  ArenaConfig,
  ArenaEvent,
  AssignedChallengesResponse,
  PingResponse,
  SubmissionResponse,
  AgentSolution,
} from "./types.js";
import { log } from "./log.js";

/** Maximum retry attempts for transient failures */
const MAX_RETRIES = 3;
/** Base delay for exponential backoff (ms) */
const BASE_DELAY_MS = 1000;
/** Request timeout (ms) */
const REQUEST_TIMEOUT_MS = 15000;

export class ArenaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly verbose: boolean;

  constructor(config: ArenaConfig) {
    this.baseUrl = config.arenaUrl;
    this.apiKey = config.apiKey;
    this.verbose = config.verbose;
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------

  /** Send heartbeat ping to Arena */
  async ping(): Promise<PingResponse | null> {
    return this.request<PingResponse>("POST", "/api/v1/agents/ping");
  }

  /** Poll for challenges assigned to this agent */
  async getAssignedChallenges(): Promise<AssignedChallengesResponse | null> {
    return this.request<AssignedChallengesResponse>(
      "GET",
      "/api/v1/challenges/assigned"
    );
  }

  /** Stream a single event to Arena */
  async streamEvent(event: ArenaEvent): Promise<boolean> {
    const result = await this.request<{ ok: boolean }>(
      "POST",
      "/api/v1/events/stream",
      event
    );
    return result !== null;
  }

  /** Submit the agent's solution via /api/connector/submit */
  async submitSolution(
    challengeId: string,
    solution: AgentSolution
  ): Promise<SubmissionResponse | null> {
    // Use /api/connector/submit — the stable, supported submission path.
    // Maps AgentSolution.submission_text (or stringified files) to 'content'.
    const content =
      solution.submission_text ??
      (solution.files && solution.files.length > 0
        ? JSON.stringify(solution.files)
        : '')

    return this.request<SubmissionResponse>("POST", "/api/connector/submit", {
      challenge_id: challengeId,
      content,
    });
  }

  // ----------------------------------------------------------
  // Internal HTTP with retry + backoff
  // ----------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS
        );

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-arena-api-key": this.apiKey,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as T;
          return data;
        }

        // Non-retryable client errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const errorText = await response.text().catch(() => "unknown error");
          log.error(`API ${method} ${path} → ${response.status}: ${errorText}`);
          return null;
        }

        // 429 or 5xx — retryable
        if (attempt < MAX_RETRIES) {
          const delay = this.backoffDelay(attempt, response);
          if (this.verbose) {
            log.dim(
              `  Retry ${attempt + 1}/${MAX_RETRIES} for ${method} ${path} (${response.status}) in ${delay}ms`
            );
          }
          await this.sleep(delay);
          continue;
        }

        log.error(
          `API ${method} ${path} failed after ${MAX_RETRIES} retries (${response.status})`
        );
        return null;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          if (attempt < MAX_RETRIES) {
            const delay = BASE_DELAY_MS * 2 ** attempt;
            if (this.verbose) {
              log.dim(
                `  Timeout on ${method} ${path}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`
              );
            }
            await this.sleep(delay);
            continue;
          }
          log.error(`API ${method} ${path} timed out after ${MAX_RETRIES} retries`);
          return null;
        }

        // Network error — retry
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          if (this.verbose) {
            const msg = err instanceof Error ? err.message : "unknown error";
            log.dim(
              `  Network error on ${method} ${path}: ${msg}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`
            );
          }
          await this.sleep(delay);
          continue;
        }

        const msg = err instanceof Error ? err.message : "unknown error";
        log.error(`API ${method} ${path} failed: ${msg}`);
        return null;
      }
    }

    return null;
  }

  private backoffDelay(attempt: number, response: Response): number {
    // Respect Retry-After header if present
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    return BASE_DELAY_MS * 2 ** attempt;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
