#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli.ts
var import_commander = require("commander");
var import_chalk2 = __toESM(require("chalk"));
var import_ora = __toESM(require("ora"));
var import_readline = require("readline");
var import_fs = require("fs");
var import_sdk2 = __toESM(require("@bouts/sdk"));

// src/config.ts
var import_conf = __toESM(require("conf"));
var conf = new import_conf.default({ projectName: "bouts" });
function getConfig() {
  const env = process.env.BOUTS_ENV ?? conf.get("env") ?? "production";
  return {
    apiKey: process.env.BOUTS_API_KEY ?? conf.get("apiKey"),
    baseUrl: process.env.BOUTS_BASE_URL ?? conf.get("baseUrl"),
    env
  };
}
function setApiKey(key) {
  conf.set("apiKey", key);
}
function setEnv(env) {
  conf.set("env", env);
}
function clearConfig() {
  conf.clear();
}
function detectTokenEnvironment(apiKey) {
  return apiKey.startsWith("bouts_sk_test_") ? "sandbox" : "production";
}

// src/client.ts
var import_sdk = __toESM(require("@bouts/sdk"));
var import_chalk = __toESM(require("chalk"));
function getClient() {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) {
    console.error(import_chalk.default.red("Not authenticated. Run: bouts login"));
    process.exit(1);
  }
  return new import_sdk.default({ apiKey, baseUrl });
}

// src/cli.ts
var program = new import_commander.Command();
program.name("bouts").description("Official CLI for the Bouts platform").version("0.1.0");
function handleError(err) {
  if (err instanceof import_sdk2.BoutsAuthError) {
    console.error(import_chalk2.default.red("Authentication failed. Run: bouts login"));
  } else if (err instanceof import_sdk2.BoutsRateLimitError) {
    console.error(import_chalk2.default.yellow("Rate limit exceeded. Please wait and try again."));
  } else if (err instanceof import_sdk2.BoutsApiError) {
    console.error(import_chalk2.default.red(`API Error ${err.status} [${err.code}]: ${err.message}`));
    console.error(import_chalk2.default.dim(`Request ID: ${err.requestId}`));
  } else if (err instanceof Error) {
    console.error(import_chalk2.default.red(err.message));
  } else {
    console.error(import_chalk2.default.red("Unknown error"));
  }
  process.exit(1);
}
function prompt(question) {
  const rl = (0, import_readline.createInterface)({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
function maskKey(key) {
  const prefix = key.slice(0, 16);
  return `${prefix}${"*".repeat(Math.max(0, key.length - 16))}`;
}
function sandboxPrefix() {
  const { env, apiKey } = getConfig();
  const isSandbox = env === "sandbox" || (apiKey ? detectTokenEnvironment(apiKey) === "sandbox" : false);
  return isSandbox ? import_chalk2.default.cyan("[SANDBOX] ") : "";
}
function formatDate(dateStr) {
  if (!dateStr) return import_chalk2.default.dim("\u2014");
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function statusColor(status) {
  switch (status) {
    case "active":
      return import_chalk2.default.green(status);
    case "upcoming":
      return import_chalk2.default.yellow(status);
    case "completed":
      return import_chalk2.default.blue(status);
    case "cancelled":
      return import_chalk2.default.red(status);
    case "failed":
    case "rejected":
      return import_chalk2.default.red(status);
    case "open":
      return import_chalk2.default.green(status);
    case "judging":
      return import_chalk2.default.yellow(status);
    default:
      return import_chalk2.default.dim(status);
  }
}
program.command("login").description("Authenticate with your API token").option("--token <token>", "API token (skip interactive prompt)").option("--sandbox", "Mark this session as sandbox (sets BOUTS_ENV=sandbox in config)").action(async (opts) => {
  let token = opts.token;
  if (!token) {
    const prompt_text = opts.sandbox ? "Enter your sandbox API token (bouts_sk_test_...): " : "Enter your API token (bouts_sk_...): ";
    token = await prompt(prompt_text);
  }
  if (!token) {
    console.error(import_chalk2.default.red("No token provided"));
    process.exit(1);
  }
  const detectedEnv = detectTokenEnvironment(token);
  const env = opts.sandbox ? "sandbox" : detectedEnv;
  if (env === "sandbox" && !token.startsWith("bouts_sk_test_")) {
    console.warn(import_chalk2.default.yellow("Warning: --sandbox flag set but token does not have bouts_sk_test_ prefix."));
  }
  const spinner = (0, import_ora.default)("Validating token...").start();
  try {
    const client = new import_sdk2.default({ apiKey: token });
    await client.challenges.list({ limit: 1 });
    setApiKey(token);
    setEnv(env);
    spinner.succeed(import_chalk2.default.green("Authenticated successfully"));
    console.log(import_chalk2.default.dim(`Token saved: ${maskKey(token)}`));
    if (env === "sandbox") {
      console.log(import_chalk2.default.cyan("[SANDBOX] Sandbox mode active. Commands will operate in sandbox environment."));
    }
  } catch (err) {
    spinner.fail("Authentication failed");
    handleError(err);
  }
});
program.command("logout").description("Clear stored credentials").action(() => {
  clearConfig();
  console.log(import_chalk2.default.green("Logged out. Credentials cleared."));
});
var challenges = program.command("challenges").description("Challenge commands");
challenges.command("list").description("List challenges").option("--format <format>", "Filter by format: sprint, standard, marathon").option("--status <status>", "Filter by status: active, upcoming, completed").option("--json", "Output as JSON").action(async (opts) => {
  const client = getClient();
  const spinner = (0, import_ora.default)("Fetching challenges...").start();
  try {
    const { challenges: list, pagination } = await client.challenges.list({
      format: opts.format,
      status: opts.status,
      limit: 50
    });
    spinner.stop();
    if (opts.json) {
      console.log(JSON.stringify({ challenges: list, pagination }, null, 2));
      return;
    }
    if (list.length === 0) {
      console.log(import_chalk2.default.dim("No challenges found"));
      return;
    }
    const pfx = sandboxPrefix();
    if (pfx) console.log(pfx + import_chalk2.default.dim("Sandbox mode \u2014 showing sandbox challenges only"));
    console.log();
    console.log(
      import_chalk2.default.bold.dim("  ID".padEnd(14)),
      import_chalk2.default.bold.dim("Title".padEnd(40)),
      import_chalk2.default.bold.dim("Format".padEnd(12)),
      import_chalk2.default.bold.dim("Status".padEnd(12)),
      import_chalk2.default.bold.dim("Entry Fee".padEnd(12)),
      import_chalk2.default.bold.dim("Ends At")
    );
    console.log(import_chalk2.default.dim("  " + "\u2500".repeat(100)));
    for (const c of list) {
      const truncId = c.id.slice(0, 8) + "\u2026";
      const truncTitle = c.title.length > 38 ? c.title.slice(0, 37) + "\u2026" : c.title;
      const fee = c.entry_fee_cents === 0 ? import_chalk2.default.green("Free") : `$${(c.entry_fee_cents / 100).toFixed(2)}`;
      console.log(
        import_chalk2.default.dim("  " + truncId.padEnd(12)),
        truncTitle.padEnd(40),
        import_chalk2.default.cyan(c.format.padEnd(12)),
        statusColor(c.status).padEnd(20),
        fee.padEnd(12),
        formatDate(c.ends_at)
      );
    }
    console.log();
    console.log(import_chalk2.default.dim(`  Showing ${list.length} of ${pagination.total} challenges`));
    console.log();
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
});
challenges.command("show <id>").description("Show full challenge details").option("--json", "Output as JSON").action(async (id, opts) => {
  const client = getClient();
  const spinner = (0, import_ora.default)("Fetching challenge...").start();
  try {
    const challenge = await client.challenges.get(id);
    spinner.stop();
    if (opts.json) {
      console.log(JSON.stringify(challenge, null, 2));
      return;
    }
    console.log();
    console.log(import_chalk2.default.bold.white(challenge.title));
    console.log(import_chalk2.default.dim("\u2500".repeat(60)));
    console.log(import_chalk2.default.dim("ID:          "), challenge.id);
    console.log(import_chalk2.default.dim("Status:      "), statusColor(challenge.status));
    console.log(import_chalk2.default.dim("Format:      "), import_chalk2.default.cyan(challenge.format));
    console.log(import_chalk2.default.dim("Category:    "), challenge.category);
    console.log(import_chalk2.default.dim("Entry Fee:   "), challenge.entry_fee_cents === 0 ? import_chalk2.default.green("Free") : `$${(challenge.entry_fee_cents / 100).toFixed(2)}`);
    console.log(import_chalk2.default.dim("Prize Pool:  "), challenge.prize_pool > 0 ? import_chalk2.default.yellow(`$${challenge.prize_pool}`) : import_chalk2.default.dim("None"));
    console.log(import_chalk2.default.dim("Entries:     "), challenge.entry_count);
    console.log(import_chalk2.default.dim("Starts:      "), formatDate(challenge.starts_at));
    console.log(import_chalk2.default.dim("Ends:        "), formatDate(challenge.ends_at));
    console.log();
    console.log(import_chalk2.default.bold("Description"));
    console.log(challenge.description);
    if (challenge.difficulty_profile) {
      console.log();
      console.log(import_chalk2.default.bold("Difficulty Profile"));
      for (const [lane, score] of Object.entries(challenge.difficulty_profile)) {
        const bar = "\u2588".repeat(Math.round(score / 10));
        console.log(`  ${lane.padEnd(20)} ${import_chalk2.default.yellow(bar)} ${score}`);
      }
    }
    console.log();
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
});
var sessions = program.command("sessions").description("Session commands");
sessions.command("create <challenge-id>").description("Create a new submission session").option("--json", "Output as JSON").action(async (challengeId, opts) => {
  const client = getClient();
  const spinner = (0, import_ora.default)("Creating session...").start();
  try {
    const session = await client.challenges.createSession(challengeId);
    spinner.succeed(`${sandboxPrefix()}Session created`);
    if (opts.json) {
      console.log(JSON.stringify(session, null, 2));
      return;
    }
    console.log();
    console.log(import_chalk2.default.dim("Session ID:  "), import_chalk2.default.bold.white(session.id));
    console.log(import_chalk2.default.dim("Status:      "), statusColor(session.status));
    console.log(import_chalk2.default.dim("Expires:     "), formatDate(session.expires_at));
    console.log(import_chalk2.default.dim("Attempts:    "), session.attempt_count);
    console.log();
    console.log(import_chalk2.default.dim(`Use: bouts submit --session ${session.id} --file <path>`));
    console.log();
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
});
program.command("submit").description("Submit a solution file").requiredOption("--session <session-id>", "Session ID").requiredOption("--file <path>", "Path to solution file").option("--idempotency-key <key>", "Optional idempotency key (auto-generated if omitted)").option("--json", "Output as JSON").action(async (opts) => {
  const client = getClient();
  let content;
  try {
    content = (0, import_fs.readFileSync)(opts.file, "utf-8");
  } catch {
    console.error(import_chalk2.default.red(`Cannot read file: ${opts.file}`));
    process.exit(1);
  }
  const spinner = (0, import_ora.default)("Submitting...").start();
  try {
    const submission = await client.sessions.submit(
      opts.session,
      content,
      { idempotencyKey: opts.idempotencyKey }
    );
    spinner.succeed(`${sandboxPrefix()}Submission received`);
    if (opts.json) {
      console.log(JSON.stringify(submission, null, 2));
      return;
    }
    console.log();
    console.log(import_chalk2.default.dim("Submission ID: "), import_chalk2.default.bold.white(submission.id));
    console.log(import_chalk2.default.dim("Status:        "), statusColor(submission.submission_status));
    console.log(import_chalk2.default.dim("Submitted:     "), formatDate(submission.submitted_at));
    console.log();
    console.log(import_chalk2.default.dim(`Check status: bouts submissions status ${submission.id}`));
    console.log();
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
});
var subs = program.command("submissions").description("Submission commands");
subs.command("status <submission-id>").description("Show submission status and event log").option("--json", "Output as JSON").action(async (submissionId, opts) => {
  const client = getClient();
  const spinner = (0, import_ora.default)("Fetching submission...").start();
  try {
    const submission = await client.submissions.get(submissionId);
    spinner.stop();
    if (opts.json) {
      console.log(JSON.stringify(submission, null, 2));
      return;
    }
    console.log();
    console.log(import_chalk2.default.dim("Submission ID:  "), import_chalk2.default.bold.white(submission.id));
    console.log(import_chalk2.default.dim("Status:         "), statusColor(submission.submission_status));
    console.log(import_chalk2.default.dim("Challenge:      "), submission.challenge_id);
    console.log(import_chalk2.default.dim("Submitted:      "), formatDate(submission.submitted_at));
    console.log();
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
});
var results = program.command("results").description("Result commands");
results.command("show <submission-id>").description("Show final match result").option("--json", "Output as JSON").action(async (submissionId, opts) => {
  const client = getClient();
  const spinner = (0, import_ora.default)("Fetching result...").start();
  try {
    const result = await client.results.get(submissionId);
    spinner.stop();
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log();
    console.log(import_chalk2.default.bold.white(`Score: ${result.final_score}`));
    console.log(import_chalk2.default.dim("State:          "), statusColor(result.result_state));
    console.log(import_chalk2.default.dim("Confidence:     "), result.confidence_level ?? import_chalk2.default.dim("N/A"));
    console.log(import_chalk2.default.dim("Audit:          "), result.audit_triggered ? import_chalk2.default.yellow("Triggered") : import_chalk2.default.green("Clean"));
    console.log(import_chalk2.default.dim("Finalized:      "), formatDate(result.finalized_at));
    console.log();
    console.log(import_chalk2.default.dim(`Full breakdown: bouts breakdown show ${submissionId}`));
    console.log();
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
});
var breakdown = program.command("breakdown").description("Breakdown commands");
breakdown.command("show <submission-id>").description("Show full competitor breakdown").option("--json", "Output as JSON").action(async (submissionId, opts) => {
  const client = getClient();
  const spinner = (0, import_ora.default)("Fetching breakdown...").start();
  try {
    const bd = await client.submissions.breakdown(submissionId);
    spinner.stop();
    if (opts.json) {
      console.log(JSON.stringify(bd, null, 2));
      return;
    }
    console.log();
    console.log(import_chalk2.default.bold.white(`Final Score: ${bd.final_score}`));
    console.log(import_chalk2.default.dim("Result State:"), statusColor(bd.result_state));
    console.log();
    if (Object.keys(bd.lane_breakdown).length > 0) {
      console.log(import_chalk2.default.bold("Lane Breakdown"));
      console.log(import_chalk2.default.dim("\u2500".repeat(50)));
      for (const [lane, data] of Object.entries(bd.lane_breakdown)) {
        const d = data;
        console.log(`  ${import_chalk2.default.cyan(lane.padEnd(20))} ${import_chalk2.default.yellow(String(d.score).padEnd(8))} ${import_chalk2.default.dim(d.summary)}`);
      }
      console.log();
    }
    if (bd.strengths.length > 0) {
      console.log(import_chalk2.default.bold.green("Strengths"));
      bd.strengths.forEach((s) => console.log(`  ${import_chalk2.default.green("+")} ${s}`));
      console.log();
    }
    if (bd.weaknesses.length > 0) {
      console.log(import_chalk2.default.bold.red("Weaknesses"));
      bd.weaknesses.forEach((w) => console.log(`  ${import_chalk2.default.red("-")} ${w}`));
      console.log();
    }
    if (bd.improvement_priorities.length > 0) {
      console.log(import_chalk2.default.bold.yellow("Improvement Priorities"));
      bd.improvement_priorities.forEach((p, i) => console.log(`  ${import_chalk2.default.yellow(String(i + 1) + ".")} ${p}`));
      console.log();
    }
    if (bd.comparison_note) {
      console.log(import_chalk2.default.bold("Comparison Note"));
      console.log(`  ${import_chalk2.default.dim(bd.comparison_note)}`);
      console.log();
    }
    if (bd.confidence_note) {
      console.log(import_chalk2.default.bold("Confidence Note"));
      console.log(`  ${import_chalk2.default.dim(bd.confidence_note)}`);
      console.log();
    }
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
});
program.command("doctor").description("Check configuration and API connectivity").option("--json", "Output as JSON").action(async (opts) => {
  if (opts.json) {
    const { apiKey: apiKey2, baseUrl: baseUrl2, env: env2 } = getConfig();
    const tokenEnv2 = apiKey2 ? detectTokenEnvironment(apiKey2) : null;
    const result = {
      config_found: !!apiKey2,
      environment: tokenEnv2 ?? env2 ?? "production",
      base_url: baseUrl2 ?? null,
      token_preview: apiKey2 ? maskKey(apiKey2) : null
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }
  console.log();
  console.log(import_chalk2.default.bold("Bouts Doctor"));
  console.log(import_chalk2.default.dim("\u2500".repeat(40)));
  const { apiKey, baseUrl, env } = getConfig();
  if (apiKey) {
    console.log(`  ${import_chalk2.default.green("\u2705")} Config found`);
    console.log(`     API key: ${maskKey(apiKey)}`);
  } else {
    console.log(`  ${import_chalk2.default.red("\u274C")} No API key configured`);
    console.log(`     Run: ${import_chalk2.default.cyan("bouts login")} or ${import_chalk2.default.cyan("bouts login --sandbox")}`);
  }
  const tokenEnv = apiKey ? detectTokenEnvironment(apiKey) : null;
  const activeEnv = env ?? "production";
  if (tokenEnv === "sandbox" || activeEnv === "sandbox") {
    console.log(`  ${import_chalk2.default.cyan("\u{1F9EA}")} Environment: ${import_chalk2.default.cyan("SANDBOX")}`);
    console.log(`     ${import_chalk2.default.dim("Token prefix: bouts_sk_test_...")}`);
    console.log(`     ${import_chalk2.default.dim("Sandbox challenges only. Deterministic judging.")}`);
  } else {
    console.log(`  ${import_chalk2.default.green("\u{1F680}")} Environment: ${import_chalk2.default.green("PRODUCTION")}`);
    console.log(`     ${import_chalk2.default.dim("Token prefix: bouts_sk_...")}`);
  }
  if (apiKey && tokenEnv && tokenEnv !== activeEnv) {
    console.log(`  ${import_chalk2.default.yellow("\u26A0")} Token environment (${tokenEnv}) doesn't match config env (${activeEnv})`);
    console.log(`     ${import_chalk2.default.dim("Run: bouts login to re-authenticate")}`);
  }
  if (baseUrl) {
    console.log(`  ${import_chalk2.default.blue("\u2139")} Custom base URL: ${baseUrl}`);
  }
  if (!apiKey) {
    console.log();
    return;
  }
  const spinner = (0, import_ora.default)("  Checking API connectivity...").start();
  const start = Date.now();
  try {
    const client = new import_sdk2.default({ apiKey, baseUrl });
    await client.challenges.list({ limit: 1 });
    const latencyMs = Date.now() - start;
    spinner.stop();
    console.log(`  ${import_chalk2.default.green("\u2705")} API key valid`);
    console.log(`  ${import_chalk2.default.green("\u2705")} API reachable (${latencyMs}ms latency)`);
  } catch (err) {
    const latencyMs = Date.now() - start;
    spinner.stop();
    if (err instanceof import_sdk2.BoutsAuthError) {
      console.log(`  ${import_chalk2.default.red("\u274C")} API key invalid or expired`);
    } else {
      console.log(`  ${import_chalk2.default.red("\u274C")} API unreachable (${latencyMs}ms) \u2014 ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }
  console.log();
});
var config = program.command("config").description("Config commands");
config.command("show").description("Show current configuration").action(() => {
  const { apiKey, baseUrl } = getConfig();
  console.log();
  console.log(import_chalk2.default.bold("Current Configuration"));
  console.log(import_chalk2.default.dim("\u2500".repeat(40)));
  if (apiKey) {
    console.log(import_chalk2.default.dim("API Key:   "), maskKey(apiKey));
  } else {
    console.log(import_chalk2.default.dim("API Key:   "), import_chalk2.default.red("Not set"));
  }
  console.log(import_chalk2.default.dim("Base URL:  "), baseUrl ?? import_chalk2.default.dim("https://agent-arena-roan.vercel.app (default)"));
  console.log();
});
program.parse(process.argv);
