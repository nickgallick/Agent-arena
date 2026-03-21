#!/bin/bash
# Arena Connector Heartbeat — runs every 60 seconds
set -e

ARENA_DIR="$HOME/.openclaw/workspace/arena-connector"
API_KEY_FILE="$ARENA_DIR/api-key"
LOG_FILE="$ARENA_DIR/arena-connector.log"
ARENA_API="https://api.agentarena.com/v1"

# Check API key exists
if [ ! -f "$API_KEY_FILE" ]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ERROR: No API key found. Run setup first." >> "$LOG_FILE"
  exit 0
fi

API_KEY=$(cat "$API_KEY_FILE")

# Detect agent info
AGENT_NAME=$(grep -o '"name":\s*"[^"]*"' "$HOME/.openclaw/workspace/SOUL.md" 2>/dev/null | head -1 | cut -d'"' -f4 || echo "Unknown Agent")
MODEL_NAME=$(grep -o 'model[=:]\s*\S*' "$HOME/.openclaw/openclaw.json" 2>/dev/null | head -1 | cut -d'=' -f2 || echo "unknown")
SKILL_COUNT=$(ls "$HOME/.openclaw/skills/" 2>/dev/null | wc -l || echo "0")
SOUL_EXCERPT=$(head -c 1000 "$HOME/.openclaw/workspace/SOUL.md" 2>/dev/null || echo "")

# 1. Ping — update online status
curl -s -X POST "$ARENA_API/agents/ping" \
  -H "Content-Type: application/json" \
  -H "x-arena-api-key: $API_KEY" \
  -d "{
    \"agent_name\": \"$AGENT_NAME\",
    \"model_name\": \"$MODEL_NAME\",
    \"skill_count\": $SKILL_COUNT,
    \"soul_excerpt\": $(echo "$SOUL_EXCERPT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""'),
    \"version\": \"1.0.0\"
  }" > /dev/null 2>&1

# 2. Poll for assigned challenges
RESPONSE=$(curl -s "$ARENA_API/challenges/assigned" \
  -H "x-arena-api-key: $API_KEY")

# Check if there are challenges
CHALLENGE_COUNT=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('challenges',[])))" 2>/dev/null || echo "0")

if [ "$CHALLENGE_COUNT" -gt 0 ]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Challenge received" >> "$LOG_FILE"
  
  # Extract challenge details
  CHALLENGE_JSON=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['challenges'][0]))" 2>/dev/null)
  ENTRY_ID=$(echo "$CHALLENGE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['entry_id'])" 2>/dev/null)
  PROMPT=$(echo "$CHALLENGE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['prompt'])" 2>/dev/null)
  TIME_LIMIT=$(echo "$CHALLENGE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('time_limit_minutes', 30))" 2>/dev/null)
  TITLE=$(echo "$CHALLENGE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('title', 'Challenge'))" 2>/dev/null)
  
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Starting: $TITLE (${TIME_LIMIT}m limit)" >> "$LOG_FILE"
  
  # Spawn local session with timeout
  TIMEOUT_SECS=$((TIME_LIMIT * 60))
  SUBMISSION_FILE=$(mktemp)
  TRANSCRIPT_FILE=$(mktemp)
  
  timeout "$TIMEOUT_SECS" openclaw session run \
    --prompt "$PROMPT" \
    --output "$SUBMISSION_FILE" \
    --transcript "$TRANSCRIPT_FILE" \
    2>> "$LOG_FILE" || true
  
  # Sanitize transcript
  SANITIZED_TRANSCRIPT=$(node "$ARENA_DIR/../agent-arena-connector/lib/sanitize-transcript.js" "$TRANSCRIPT_FILE" 2>/dev/null || cat "$TRANSCRIPT_FILE")
  
  # Read submission
  SUBMISSION_TEXT=$(cat "$SUBMISSION_FILE" 2>/dev/null || echo "No output captured")
  
  # Upload submission
  curl -s -X POST "$ARENA_API/submissions" \
    -H "Content-Type: application/json" \
    -H "x-arena-api-key: $API_KEY" \
    -d "{
      \"entry_id\": \"$ENTRY_ID\",
      \"submission_text\": $(echo "$SUBMISSION_TEXT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""'),
      \"transcript\": $(echo "$SANITIZED_TRANSCRIPT" | python3 -c 'import json,sys; print(json.dumps([{"timestamp":0,"type":"result","title":"Output","content":sys.stdin.read()}]))' 2>/dev/null || echo '[]')
    }" > /dev/null 2>&1
  
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Submitted: $TITLE" >> "$LOG_FILE"
  
  # Cleanup
  rm -f "$SUBMISSION_FILE" "$TRANSCRIPT_FILE"
fi
