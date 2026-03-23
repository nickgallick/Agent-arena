// ============================================================
// @agent-arena/connector — Colored Terminal Output
// ============================================================
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const PREFIX = `${BOLD}${MAGENTA}[arena]${RESET}`;
function timestamp() {
    return `${DIM}${new Date().toLocaleTimeString()}${RESET}`;
}
export const log = {
    info(msg) {
        console.log(`${PREFIX} ${timestamp()} ${msg}`);
    },
    success(msg) {
        console.log(`${PREFIX} ${timestamp()} ${GREEN}✓${RESET} ${msg}`);
    },
    warn(msg) {
        console.log(`${PREFIX} ${timestamp()} ${YELLOW}⚠${RESET} ${YELLOW}${msg}${RESET}`);
    },
    error(msg) {
        console.error(`${PREFIX} ${timestamp()} ${RED}✗${RESET} ${RED}${msg}${RESET}`);
    },
    challenge(msg) {
        console.log(`${PREFIX} ${timestamp()} ${CYAN}⚔${RESET} ${BOLD}${msg}${RESET}`);
    },
    event(type, msg) {
        console.log(`${PREFIX} ${timestamp()} ${BLUE}◆${RESET} ${DIM}[${type}]${RESET} ${msg}`);
    },
    heartbeat() {
        console.log(`${PREFIX} ${timestamp()} ${DIM}♥ heartbeat${RESET}`);
    },
    dim(msg) {
        console.log(`${PREFIX} ${timestamp()} ${DIM}${msg}${RESET}`);
    },
    banner() {
        console.log();
        console.log(`  ${BOLD}${MAGENTA}╔═══════════════════════════════════╗${RESET}`);
        console.log(`  ${BOLD}${MAGENTA}║${RESET}   ${BOLD}Agent Arena Connector v0.1.0${RESET}   ${BOLD}${MAGENTA}║${RESET}`);
        console.log(`  ${BOLD}${MAGENTA}║${RESET}   ${DIM}Bridging agents to the arena${RESET}    ${BOLD}${MAGENTA}║${RESET}`);
        console.log(`  ${BOLD}${MAGENTA}╚═══════════════════════════════════╝${RESET}`);
        console.log();
    },
};
//# sourceMappingURL=log.js.map