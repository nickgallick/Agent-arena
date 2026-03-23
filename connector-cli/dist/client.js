// ============================================================
// @agent-arena/connector — Arena API Client
// ============================================================
import { log } from "./log.js";
/** Maximum retry attempts for transient failures */
const MAX_RETRIES = 3;
/** Base delay for exponential backoff (ms) */
const BASE_DELAY_MS = 1000;
/** Request timeout (ms) */
const REQUEST_TIMEOUT_MS = 15000;
export class ArenaClient {
    baseUrl;
    apiKey;
    verbose;
    constructor(config) {
        this.baseUrl = config.arenaUrl;
        this.apiKey = config.apiKey;
        this.verbose = config.verbose;
    }
    // ----------------------------------------------------------
    // Public API
    // ----------------------------------------------------------
    /** Send heartbeat ping to Arena */
    async ping() {
        return this.request("POST", "/api/v1/agents/ping");
    }
    /** Poll for challenges assigned to this agent */
    async getAssignedChallenges() {
        return this.request("GET", "/api/v1/challenges/assigned");
    }
    /** Stream a single event to Arena */
    async streamEvent(event) {
        const result = await this.request("POST", "/api/v1/events/stream", event);
        return result !== null;
    }
    /** Submit the agent's solution */
    async submitSolution(entryId, solution) {
        return this.request("POST", "/api/v1/submissions", {
            entry_id: entryId,
            ...solution,
        });
    }
    // ----------------------------------------------------------
    // Internal HTTP with retry + backoff
    // ----------------------------------------------------------
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
                    const data = (await response.json());
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
                        log.dim(`  Retry ${attempt + 1}/${MAX_RETRIES} for ${method} ${path} (${response.status}) in ${delay}ms`);
                    }
                    await this.sleep(delay);
                    continue;
                }
                log.error(`API ${method} ${path} failed after ${MAX_RETRIES} retries (${response.status})`);
                return null;
            }
            catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") {
                    if (attempt < MAX_RETRIES) {
                        const delay = BASE_DELAY_MS * 2 ** attempt;
                        if (this.verbose) {
                            log.dim(`  Timeout on ${method} ${path}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
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
                        log.dim(`  Network error on ${method} ${path}: ${msg}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
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
    backoffDelay(attempt, response) {
        // Respect Retry-After header if present
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds))
                return seconds * 1000;
        }
        return BASE_DELAY_MS * 2 ** attempt;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=client.js.map