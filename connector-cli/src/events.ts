// ============================================================
// @agent-arena/connector — Event Parser & Streamer
// ============================================================

import type { ArenaClient } from "./client.js";
import type { ArenaEvent, ParsedEventMarker } from "./types.js";
import { log } from "./log.js";

/**
 * Matches stderr lines in the format:
 *   [ARENA:type] message
 *   [ARENA:type:detail] message
 *
 * Examples:
 *   [ARENA:thinking] Analyzing the requirements...
 *   [ARENA:progress:45] Implementation phase
 *   [ARENA:code_write:src/index.ts] Writing main entry
 */
const EVENT_MARKER_RE = /^\[ARENA:(\w+)(?::([^\]]*))?\]\s*(.*)$/;

/** Parse a single stderr line for an Arena event marker */
export function parseEventMarker(line: string): ParsedEventMarker | null {
  const match = EVENT_MARKER_RE.exec(line.trim());
  if (!match) return null;

  const [, type, detail, message] = match;
  if (!type || message === undefined) return null;

  return {
    type,
    detail: detail || undefined,
    message,
  };
}

/**
 * EventStreamer accumulates stderr lines, parses Arena event markers,
 * and streams them to the Arena API in real time.
 */
export class EventStreamer {
  private readonly client: ArenaClient | null;
  private readonly entryId: string;
  private readonly verbose: boolean;
  private readonly enabled: boolean;
  private buffer = "";

  constructor(
    client: ArenaClient | null,
    entryId: string,
    verbose: boolean,
    enabled = true
  ) {
    this.client = client;
    this.entryId = entryId;
    this.verbose = verbose;
    this.enabled = enabled;
  }

  /** Feed raw stderr data (may contain partial lines) */
  async feed(chunk: string): Promise<void> {
    this.buffer += chunk;

    // Process complete lines
    const lines = this.buffer.split("\n");
    // Keep the last (possibly incomplete) line in the buffer
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      await this.processLine(line);
    }
  }

  /** Flush remaining buffer (call on agent exit) */
  async flush(): Promise<void> {
    if (this.buffer.trim()) {
      await this.processLine(this.buffer);
      this.buffer = "";
    }
  }

  private async processLine(line: string): Promise<void> {
    const marker = parseEventMarker(line);

    if (marker) {
      // Structured Arena event
      if (this.verbose) {
        log.event(marker.type, marker.message);
      }

      if (!this.enabled || !this.client) {
        return;
      }

      const event: ArenaEvent = {
        entry_id: this.entryId,
        event_type: marker.type,
        data: {
          message: marker.message,
          ...(marker.detail !== undefined ? { detail: marker.detail } : {}),
        },
        timestamp: new Date().toISOString(),
      };

      // Fire and forget — don't block agent on event streaming failures
      this.client.streamEvent(event).catch(() => {
        // Silently drop failed events — agent work is more important
      });
    } else if (this.verbose) {
      // Unstructured stderr — log in verbose mode only
      log.dim(`  [agent stderr] ${line}`);
    }
  }
}
