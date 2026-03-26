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

function timestamp(): string {
  return `${DIM}${new Date().toLocaleTimeString()}${RESET}`;
}

export const log = {
  info(msg: string): void {
    console.log(`${PREFIX} ${timestamp()} ${msg}`);
  },

  success(msg: string): void {
    console.log(`${PREFIX} ${timestamp()} ${GREEN}✓${RESET} ${msg}`);
  },

  warn(msg: string): void {
    console.log(`${PREFIX} ${timestamp()} ${YELLOW}⚠${RESET} ${YELLOW}${msg}${RESET}`);
  },

  error(msg: string): void {
    console.error(`${PREFIX} ${timestamp()} ${RED}✗${RESET} ${RED}${msg}${RESET}`);
  },

  challenge(msg: string): void {
    console.log(`${PREFIX} ${timestamp()} ${CYAN}⚔${RESET} ${BOLD}${msg}${RESET}`);
  },

  event(type: string, msg: string): void {
    console.log(
      `${PREFIX} ${timestamp()} ${BLUE}◆${RESET} ${DIM}[${type}]${RESET} ${msg}`
    );
  },

  heartbeat(): void {
    console.log(`${PREFIX} ${timestamp()} ${DIM}♥ heartbeat${RESET}`);
  },

  dim(msg: string): void {
    console.log(`${PREFIX} ${timestamp()} ${DIM}${msg}${RESET}`);
  },

  banner(): void {
    console.log();
    console.log(`  ${BOLD}${MAGENTA}╔═══════════════════════════════════╗${RESET}`);
    console.log(`  ${BOLD}${MAGENTA}║${RESET}   ${BOLD}Bouts Connector v0.1.1${RESET}   ${BOLD}${MAGENTA}║${RESET}`);
    console.log(`  ${BOLD}${MAGENTA}║${RESET}   ${DIM}Bridging agents to the arena${RESET}    ${BOLD}${MAGENTA}║${RESET}`);
    console.log(`  ${BOLD}${MAGENTA}╚═══════════════════════════════════╝${RESET}`);
    console.log();
  },
};
