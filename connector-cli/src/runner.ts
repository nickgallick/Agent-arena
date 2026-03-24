// ============================================================
// @agent-arena/connector — Agent Process Runner
// ============================================================

import { spawn } from "node:child_process";
import type { ArenaClient } from "./client.js";
import type { ArenaConfig, Challenge, AgentSolution } from "./types.js";
import { EventStreamer } from "./events.js";
import { log } from "./log.js";

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
export async function runAgent(
  config: ArenaConfig,
  client: ArenaClient | null,
  challenge: Challenge
): Promise<RunResult> {
  return new Promise((resolve) => {
    // Parse the agent command into program + args
    const parts = parseCommand(config.agent);
    if (!parts) {
      resolve({
        success: false,
        solution: null,
        exitCode: null,
        error: `Failed to parse agent command: "${config.agent}"`,
      });
      return;
    }

    const [program, ...args] = parts;
    if (!program) {
      resolve({
        success: false,
        solution: null,
        exitCode: null,
        error: "Agent command is empty",
      });
      return;
    }

    const timeoutMs = resolveAgentTimeoutMs(config, challenge);
    log.info(`Spawning agent: ${config.agent}`);
    log.dim(`  Agent timeout: ${Math.ceil(timeoutMs / 1000)}s`);

    const child = spawn(program, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ARENA_CHALLENGE_ID: challenge.challenge_id,
        ARENA_ENTRY_ID: challenge.entry_id,
        ARENA_TIME_LIMIT: String(challenge.time_limit_minutes),
        ARENA_AGENT_TIMEOUT_MS: String(timeoutMs),
      },
    });

    let settled = false;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      log.error(
        `Agent exceeded timeout (${Math.ceil(timeoutMs / 1000)}s) — terminating`
      );
      child.kill("SIGTERM");

      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 5000).unref();
    }, timeoutMs);

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    // Set up event streamer for stderr
    const eventStreamer = new EventStreamer(
      client,
      challenge.entry_id,
      config.verbose,
      config.eventStreaming
    );

    // Collect stdout
    const stdoutChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      void eventStreamer.feed(chunk.toString("utf-8"));
    });

    // Pipe challenge JSON to stdin (handle EPIPE if agent exits before reading)
    const challengeJson = JSON.stringify(challenge);
    child.stdin.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EPIPE") {
        // Agent exited before reading stdin — not fatal, it may not need it
        if (config.verbose) {
          log.dim("  Agent closed stdin before reading (EPIPE — non-fatal)");
        }
      } else {
        log.warn(`stdin error: ${err.message}`);
      }
    });
    child.stdin.write(challengeJson);
    child.stdin.end();

    child.on("error", (err) => {
      log.error(`Failed to spawn agent: ${err.message}`);
      finish({
        success: false,
        solution: null,
        exitCode: null,
        error: err.message,
      });
    });

    child.on("close", (code, signal) => {
      // Flush remaining stderr
      void eventStreamer.flush().then(() => {
        const stdout = Buffer.concat(stdoutChunks).toString("utf-8").trim();

        if (timedOut) {
          finish({
            success: false,
            solution: null,
            exitCode: code,
            error: `Agent timed out after ${Math.ceil(timeoutMs / 1000)}s`,
          });
          return;
        }

        if (signal) {
          log.warn(`Agent exited due to signal ${signal}`);
        } else if (code !== 0) {
          log.warn(`Agent exited with code ${code ?? "unknown"}`);
        }

        if (!stdout) {
          log.error("Agent produced no output on stdout");
          finish({
            success: false,
            solution: null,
            exitCode: code,
            error: "No output from agent",
          });
          return;
        }

        // Parse stdout as JSON solution
        try {
          const solution = JSON.parse(stdout) as AgentSolution;

          // Validate minimum required field
          if (
            !solution.submission_text &&
            (!solution.files || solution.files.length === 0)
          ) {
            log.error(
              "Agent output is missing both submission_text and files"
            );
            finish({
              success: false,
              solution: null,
              exitCode: code,
              error:
                "Invalid solution: must include submission_text or files",
            });
            return;
          }

          finish({
            success: true,
            solution,
            exitCode: code,
          });
        } catch {
          // If stdout isn't valid JSON, wrap raw text as submission_text
          log.warn(
            "Agent stdout is not valid JSON — wrapping as raw submission"
          );
          finish({
            success: true,
            solution: { submission_text: stdout },
            exitCode: code,
          });
        }
      });
    });
  });
}

function resolveAgentTimeoutMs(
  config: ArenaConfig,
  challenge: Challenge
): number {
  const timeoutMinutes = config.agentTimeoutMinutes ?? challenge.time_limit_minutes;
  return Math.max(1, Math.ceil(timeoutMinutes * 60 * 1000));
}

/**
 * Parse a shell-like command string into an array.
 * Handles basic quoting (single and double quotes).
 */
function parseCommand(cmd: string): string[] | null {
  const parts: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]!;

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === " " && !inSingle && !inDouble) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }

  if (current) parts.push(current);

  if (inSingle || inDouble) {
    return null; // Unbalanced quotes
  }

  return parts.length > 0 ? parts : null;
}
