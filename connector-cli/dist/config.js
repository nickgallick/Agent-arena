// ============================================================
// @agent-arena/connector — Configuration Loader
// ============================================================
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { log } from "./log.js";
/** Default configuration values */
const DEFAULTS = {
    apiKey: "",
    agent: "",
    arenaUrl: "https://agent-arena-roan.vercel.app",
    autoEnter: false,
    eventStreaming: true,
    pollInterval: 5000,
    heartbeatInterval: 30000,
    verbose: false,
};
/** Load and validate config from arena.json + CLI args + env vars */
export async function loadConfig(cliOptions) {
    let fileConfig = {};
    // 1. Load config file (if it exists)
    const configPath = resolve(cliOptions.config ?? "./arena.json");
    try {
        const raw = await readFile(configPath, "utf-8");
        fileConfig = JSON.parse(raw);
        log.dim(`  Loaded config from ${configPath}`);
    }
    catch {
        if (cliOptions.config) {
            // User explicitly passed --config but file not found
            log.warn(`Config file not found: ${configPath}`);
        }
        // Otherwise silently skip — arena.json is optional
    }
    const envAgentTimeoutMinutes = process.env["ARENA_AGENT_TIMEOUT_MINUTES"];
    const parsedEnvAgentTimeoutMinutes = envAgentTimeoutMinutes
        ? Number(envAgentTimeoutMinutes)
        : undefined;
    // 2. Merge: defaults < file < env < CLI (rightmost wins)
    const config = {
        ...DEFAULTS,
        ...fileConfig,
        apiKey: cliOptions.key ??
            process.env["ARENA_API_KEY"] ??
            fileConfig.apiKey ??
            DEFAULTS.apiKey,
        agent: cliOptions.agent ?? fileConfig.agent ?? DEFAULTS.agent,
        arenaUrl: cliOptions.arenaUrl ??
            process.env["ARENA_URL"] ??
            fileConfig.arenaUrl ??
            DEFAULTS.arenaUrl,
        autoEnter: cliOptions.autoEnter ?? fileConfig.autoEnter ?? DEFAULTS.autoEnter,
        verbose: cliOptions.verbose ?? fileConfig.verbose ?? DEFAULTS.verbose,
        watchDir: cliOptions.watchDir ?? fileConfig.watchDir,
        agentTimeoutMinutes: cliOptions.agentTimeoutMinutes ??
            (Number.isFinite(parsedEnvAgentTimeoutMinutes)
                ? parsedEnvAgentTimeoutMinutes
                : fileConfig.agentTimeoutMinutes),
    };
    // 3. Validate required fields
    if (!config.agent) {
        throw new Error('Agent command is required. Provide via --agent or arena.json (e.g. --agent "python my_agent.py")');
    }
    if (!cliOptions.test && !config.apiKey) {
        throw new Error("API key is required. Provide via --key, ARENA_API_KEY env var, or arena.json");
    }
    if (config.agentTimeoutMinutes !== undefined &&
        (!Number.isFinite(config.agentTimeoutMinutes) || config.agentTimeoutMinutes <= 0)) {
        throw new Error("Agent timeout override must be a positive number of minutes");
    }
    // Strip trailing slash from URL
    config.arenaUrl = config.arenaUrl.replace(/\/+$/, "");
    return config;
}
//# sourceMappingURL=config.js.map