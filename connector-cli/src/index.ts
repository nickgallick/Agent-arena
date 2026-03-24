#!/usr/bin/env node
// ============================================================
// @agent-arena/connector — CLI Entry Point
// ============================================================

import { Command } from "commander";
import { loadConfig } from "./config.js";
import { ArenaClient } from "./client.js";
import { runAgent } from "./runner.js";
import { log } from "./log.js";
import type { ArenaConfig, Challenge, CliOptions } from "./types.js";

// ----------------------------------------------------------
// CLI Definition
// ----------------------------------------------------------

const program = new Command();

program
  .name("arena-connect")
  .description("Connect any AI agent to Bouts")
  .version("0.1.1")
  .option("-k, --key <key>", "API key (or set ARENA_API_KEY env var)")
  .option("-a, --agent <command>", 'Agent command (e.g. "python my_agent.py")')
  .option("-c, --config <path>", "Config file path (default: ./arena.json)")
  .option("--watch-dir <dir>", "Directory to watch for file changes")
  .option("--auto-enter", "Auto-enter daily challenges")
  .option("--arena-url <url>", "Arena API base URL")
  .option(
    "--agent-timeout-minutes <minutes>",
    "Override agent timeout in minutes (defaults to the challenge time limit)",
    (value: string) => Number(value)
  )
  .option("--test", "Run one local fake challenge without calling Arena or submitting")
  .option("--verbose", "Show detailed logs")
  .action(async (options: CliOptions) => {
    try {
      await run(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(msg);
      process.exit(1);
    }
  });

program.parse();

// ----------------------------------------------------------
// Main Loop
// ----------------------------------------------------------

async function run(options: CliOptions): Promise<void> {
  log.banner();

  // Load and validate config
  const config = await loadConfig(options);

  if (options.test) {
    await runTestMode(config);
    return;
  }

  const client = new ArenaClient(config);

  log.info(`Arena: ${config.arenaUrl}`);
  log.info(`Agent: ${config.agent}`);
  log.dim(`  Poll interval: ${config.pollInterval}ms`);
  log.dim(`  Heartbeat interval: ${config.heartbeatInterval}ms`);
  log.dim(`  Event streaming: ${config.eventStreaming ? "on" : "off"}`);
  log.dim(
    `  Agent timeout: ${config.agentTimeoutMinutes ?? "challenge time limit"}` +
      `${config.agentTimeoutMinutes ? " min" : ""}`
  );

  // Initial ping to verify connectivity + auth
  log.info("Connecting to Arena...");
  const pingResult = await client.ping();
  if (!pingResult) {
    throw new Error(
      "Failed to connect to Arena. Check your API key and network."
    );
  }
  log.success("Connected to Arena!");

  // Set up graceful shutdown
  let shuttingDown = false;
  let activeChallenge = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.warn(`Received ${signal} — shutting down gracefully...`);

    if (activeChallenge) {
      log.warn("Agent is working on a challenge — waiting for completion...");
      // Give the agent 10s to finish, then exit
      setTimeout(() => {
        log.error("Shutdown timeout — forcing exit");
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Start heartbeat loop
  const heartbeatTimer = startHeartbeat(client, config);

  // Start challenge poll loop
  log.info("Waiting for challenge assignments...");

  try {
    await pollLoop(client, config, () => shuttingDown, (v) => {
      activeChallenge = v;
    });
  } finally {
    clearInterval(heartbeatTimer);
  }
}

async function runTestMode(config: ArenaConfig): Promise<void> {
  const fakeChallenge: Challenge = {
    challenge_id: "test-challenge-local",
    entry_id: "test-entry-local",
    title: "Local connector smoke test",
    prompt:
      "Return a tiny valid submission that proves your agent can read stdin, optionally emit stderr events, and write a result to stdout.",
    time_limit_minutes: config.agentTimeoutMinutes ?? 1,
    category: "local_test",
  };

  log.info("Running local test mode");
  log.info(`Agent: ${config.agent}`);
  log.dim("  Arena API calls: disabled");
  log.dim("  Submission upload: disabled");
  log.dim(
    `  Event streaming: ${config.eventStreaming ? "parsed locally only" : "off"}`
  );

  const result = await runAgent(config, null, fakeChallenge);

  if (!result.success || !result.solution) {
    throw new Error(result.error ?? `Agent failed with exit code ${result.exitCode}`);
  }

  log.success("Local test completed successfully");
  console.log();
  console.log(JSON.stringify(result.solution, null, 2));
}

// ----------------------------------------------------------
// Heartbeat
// ----------------------------------------------------------

function startHeartbeat(
  client: ArenaClient,
  config: ArenaConfig
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    if (config.verbose) {
      log.heartbeat();
    }
    client.ping().catch(() => {
      log.warn("Heartbeat failed — will retry next interval");
    });
  }, config.heartbeatInterval);
}

// ----------------------------------------------------------
// Challenge Polling
// ----------------------------------------------------------

async function pollLoop(
  client: ArenaClient,
  config: ArenaConfig,
  isShuttingDown: () => boolean,
  setActiveChallenge: (v: boolean) => void
): Promise<void> {
  while (!isShuttingDown()) {
    try {
      const result = await client.getAssignedChallenges();

      if (result?.challenges && result.challenges.length > 0) {
        for (const challenge of result.challenges) {
          if (isShuttingDown()) break;

          await handleChallenge(
            client,
            config,
            challenge,
            setActiveChallenge
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      log.warn(`Poll error: ${msg}`);
    }

    // Wait before next poll
    await sleep(config.pollInterval);
  }
}

// ----------------------------------------------------------
// Challenge Handler
// ----------------------------------------------------------

async function handleChallenge(
  client: ArenaClient,
  config: ArenaConfig,
  challenge: Challenge,
  setActiveChallenge: (v: boolean) => void
): Promise<void> {
  log.challenge(
    `Challenge assigned: "${challenge.title}" [${challenge.category}]`
  );
  log.info(
    `Time limit: ${challenge.time_limit_minutes} min | Entry: ${challenge.entry_id}`
  );

  setActiveChallenge(true);

  try {
    // Run the agent
    const result = await runAgent(config, client, challenge);

    if (result.success && result.solution) {
      log.success("Agent completed — submitting solution...");

      const submission = await client.submitSolution(
        challenge.entry_id,
        result.solution
      );

      if (submission) {
        log.success(
          `Solution submitted! (${submission.submission_id})`
        );
      } else {
        log.error("Failed to submit solution to Arena");
      }
    } else {
      log.error(
        `Agent failed: ${result.error ?? `exit code ${result.exitCode}`}`
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    log.error(`Challenge handler error: ${msg}`);
  } finally {
    setActiveChallenge(false);
  }
}

// ----------------------------------------------------------
// Utility
// ----------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
