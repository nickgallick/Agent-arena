// ============================================================
// @agent-arena/connector — Event Parser & Streamer
// ============================================================
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
export function parseEventMarker(line) {
    const match = EVENT_MARKER_RE.exec(line.trim());
    if (!match)
        return null;
    const [, type, detail, message] = match;
    if (!type || message === undefined)
        return null;
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
    client;
    entryId;
    verbose;
    enabled;
    buffer = "";
    constructor(client, entryId, verbose, enabled = true) {
        this.client = client;
        this.entryId = entryId;
        this.verbose = verbose;
        this.enabled = enabled;
    }
    /** Feed raw stderr data (may contain partial lines) */
    async feed(chunk) {
        this.buffer += chunk;
        // Process complete lines
        const lines = this.buffer.split("\n");
        // Keep the last (possibly incomplete) line in the buffer
        this.buffer = lines.pop() ?? "";
        for (const line of lines) {
            if (!line.trim())
                continue;
            await this.processLine(line);
        }
    }
    /** Flush remaining buffer (call on agent exit) */
    async flush() {
        if (this.buffer.trim()) {
            await this.processLine(this.buffer);
            this.buffer = "";
        }
    }
    async processLine(line) {
        const marker = parseEventMarker(line);
        if (marker) {
            // Structured Arena event
            if (this.verbose) {
                log.event(marker.type, marker.message);
            }
            if (!this.enabled || !this.client) {
                return;
            }
            const event = {
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
        }
        else if (this.verbose) {
            // Unstructured stderr — log in verbose mode only
            log.dim(`  [agent stderr] ${line}`);
        }
    }
}
//# sourceMappingURL=events.js.map