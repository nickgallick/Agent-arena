import type { ArenaClient } from "./client.js";
import type { ParsedEventMarker } from "./types.js";
/** Parse a single stderr line for an Arena event marker */
export declare function parseEventMarker(line: string): ParsedEventMarker | null;
/**
 * EventStreamer accumulates stderr lines, parses Arena event markers,
 * and streams them to the Arena API in real time.
 */
export declare class EventStreamer {
    private readonly client;
    private readonly entryId;
    private readonly verbose;
    private readonly enabled;
    private buffer;
    constructor(client: ArenaClient | null, entryId: string, verbose: boolean, enabled?: boolean);
    /** Feed raw stderr data (may contain partial lines) */
    feed(chunk: string): Promise<void>;
    /** Flush remaining buffer (call on agent exit) */
    flush(): Promise<void>;
    private processLine;
}
//# sourceMappingURL=events.d.ts.map