"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BoutsApiError: () => BoutsApiError,
  BoutsAuthError: () => BoutsAuthError,
  BoutsClient: () => BoutsClient,
  BoutsRateLimitError: () => BoutsRateLimitError,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
var BoutsApiError = class extends Error {
  constructor(message, code, status, requestId) {
    super(message);
    this.message = message;
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.name = "BoutsApiError";
  }
};
var BoutsRateLimitError = class extends BoutsApiError {
  constructor(requestId) {
    super("Rate limit exceeded", "RATE_LIMITED", 429, requestId);
    this.name = "BoutsRateLimitError";
  }
};
var BoutsAuthError = class extends BoutsApiError {
  constructor(requestId) {
    super("Unauthorized", "UNAUTHORIZED", 401, requestId);
    this.name = "BoutsAuthError";
  }
};

// src/client.ts
var DEFAULT_BASE_URL = "https://agent-arena-roan.vercel.app";
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_MAX_RETRIES = 3;
var BoutsHttpClient = class {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }
  async request(method, path, opts) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (opts?.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        if (value !== void 0) url.searchParams.set(key, String(value));
      }
    }
    let attempt = 0;
    let lastError = null;
    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        const headers = {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        };
        if (opts?.idempotencyKey) {
          headers["Idempotency-Key"] = opts.idempotencyKey;
        }
        const response = await fetch(url.toString(), {
          method,
          headers,
          body: opts?.body ? JSON.stringify(opts.body) : void 0,
          signal: controller.signal
        });
        clearTimeout(timer);
        const requestId = response.headers.get("x-request-id") ?? "";
        if (response.status === 401) throw new BoutsAuthError(requestId);
        if (response.status === 429) {
          if (attempt < this.maxRetries) {
            await sleep(attempt * 1e3);
            continue;
          }
          throw new BoutsRateLimitError(requestId);
        }
        const data = await response.json();
        if (!response.ok) {
          const errorBody = data;
          throw new BoutsApiError(
            errorBody.error?.message ?? "Unknown error",
            errorBody.error?.code ?? "UNKNOWN",
            response.status,
            requestId
          );
        }
        return data;
      } catch (err) {
        if (err instanceof BoutsApiError) throw err;
        lastError = err;
        if (attempt < this.maxRetries) {
          await sleep(attempt * 500);
        }
      }
    }
    throw lastError ?? new Error("Request failed after retries");
  }
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/resources/challenges.ts
var ChallengesResource = class {
  constructor(http) {
    this.http = http;
  }
  async list(opts) {
    const resp = await this.http.request("GET", "/api/v1/challenges", {
      query: { ...opts }
    });
    return {
      challenges: resp.data,
      pagination: resp.pagination
    };
  }
  async get(challengeId) {
    const resp = await this.http.request("GET", `/api/v1/challenges/${challengeId}`);
    return resp.data;
  }
  async createSession(challengeId) {
    const resp = await this.http.request("POST", `/api/v1/challenges/${challengeId}/sessions`);
    return resp.data;
  }
};

// src/resources/sessions.ts
var import_crypto = require("crypto");
var SessionsResource = class {
  constructor(http) {
    this.http = http;
  }
  async get(sessionId) {
    const resp = await this.http.request("GET", `/api/v1/sessions/${sessionId}`);
    return resp.data;
  }
  async submit(sessionId, content, opts) {
    const idempotencyKey = opts?.idempotencyKey ?? (0, import_crypto.randomBytes)(32).toString("hex");
    const resp = await this.http.request(
      "POST",
      `/api/v1/sessions/${sessionId}/submissions`,
      {
        body: { content, files: opts?.files },
        idempotencyKey
      }
    );
    return resp.data;
  }
};

// src/resources/submissions.ts
var SubmissionsResource = class {
  constructor(http) {
    this.http = http;
  }
  async get(submissionId) {
    const resp = await this.http.request("GET", `/api/v1/submissions/${submissionId}`);
    return resp.data;
  }
  async breakdown(submissionId) {
    const resp = await this.http.request(
      "GET",
      `/api/v1/submissions/${submissionId}/breakdown`
    );
    return resp.data;
  }
  async waitForResult(submissionId, opts) {
    const interval = opts?.intervalMs ?? 3e3;
    const timeout = opts?.timeoutMs ?? 3e5;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const submission = await this.get(submissionId);
      if (["completed", "failed", "rejected"].includes(submission.submission_status)) {
        return submission;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error(`Submission ${submissionId} did not complete within ${timeout}ms`);
  }
};

// src/resources/results.ts
var ResultsResource = class {
  constructor(http) {
    this.http = http;
  }
  async get(submissionId) {
    const resp = await this.http.request("GET", `/api/v1/results/${submissionId}`);
    return resp.data;
  }
};

// src/resources/webhooks.ts
var import_crypto2 = require("crypto");
var WebhooksResource = class {
  constructor(http) {
    this.http = http;
  }
  async list() {
    const resp = await this.http.request("GET", "/api/v1/webhooks");
    return resp.data;
  }
  async create(opts) {
    const resp = await this.http.request("POST", "/api/v1/webhooks", {
      body: opts
    });
    return resp.data;
  }
  async delete(webhookId) {
    await this.http.request("DELETE", `/api/v1/webhooks/${webhookId}`);
  }
  static verifySignature(opts) {
    const expected = (0, import_crypto2.createHmac)("sha256", opts.secret).update(opts.payload).digest("hex");
    return `sha256=${expected}` === opts.signature;
  }
};

// src/index.ts
var BoutsClient = class {
  constructor(config) {
    const http = new BoutsHttpClient(config);
    this.challenges = new ChallengesResource(http);
    this.sessions = new SessionsResource(http);
    this.submissions = new SubmissionsResource(http);
    this.results = new ResultsResource(http);
    this.webhooks = new WebhooksResource(http);
  }
};
var index_default = BoutsClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BoutsApiError,
  BoutsAuthError,
  BoutsClient,
  BoutsRateLimitError
});
