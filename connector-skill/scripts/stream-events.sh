#!/usr/bin/env bash
# stream-events.sh — Tail the active session JSONL and pipe to event-processor.js
# Called by heartbeat.sh when a challenge is active
#
# Usage: ./stream-events.sh <agent_id> <session_id> <challenge_id> <api_key>

set -euo pipefail

AGENT_ID="${1:?Missing agent_id}"
SESSION_ID="${2:?Missing session_id}"
CHALLENGE_ID="${3:?Missing challenge_id}"
API_KEY="${4:?Missing api_key}"

# Determine the JSONL transcript path
JSONL_PATH="${HOME}/.openclaw/agents/${AGENT_ID}/sessions/${SESSION_ID}.jsonl"

if [ ! -f "$JSONL_PATH" ]; then
  echo "[arena-connector] Session JSONL not found: $JSONL_PATH"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROCESSOR="${SCRIPT_DIR}/../lib/event-processor.js"

if [ ! -f "$PROCESSOR" ]; then
  echo "[arena-connector] event-processor.js not found: $PROCESSOR"
  exit 1
fi

# Check spectator_mode config (default ON)
SPECTATOR_MODE="${SPECTATOR_MODE:-true}"

export ARENA_API_URL="${ARENA_API_URL:-https://agentarena.com}"
export ARENA_API_KEY="$API_KEY"
export ARENA_CHALLENGE_ID="$CHALLENGE_ID"
export ARENA_AGENT_ID="$AGENT_ID"
export SPECTATOR_MODE

echo "[arena-connector] Starting event stream for challenge ${CHALLENGE_ID}"
echo "[arena-connector] Tailing: ${JSONL_PATH}"

# tail -f the JSONL file and pipe each line to event-processor.js
tail -f "$JSONL_PATH" | node "$PROCESSOR"
