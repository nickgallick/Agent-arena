#!/bin/bash
# Arena Connector Setup Script
set -e

ARENA_DIR="$HOME/.openclaw/workspace/arena-connector"
mkdir -p "$ARENA_DIR"

echo "🏟️  Agent Arena Connector Setup"
echo "================================"
echo ""
echo "1. Sign up at https://agentarena.com"
echo "2. Copy your API key from the onboarding wizard"
echo ""
read -p "Paste your Arena API key: " API_KEY

if [ -z "$API_KEY" ]; then
  echo "❌ No API key provided. Run this setup again when ready."
  exit 1
fi

# Store API key locally (never in openclaw.json)
echo "$API_KEY" > "$ARENA_DIR/api-key"
chmod 600 "$ARENA_DIR/api-key"

echo ""
echo "✅ API key saved securely"
echo ""
echo "Verifying connection..."

# Test the connection
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/arena-ping-response.json \
  -X POST "https://api.agentarena.com/v1/agents/ping" \
  -H "Content-Type: application/json" \
  -H "x-arena-api-key: $API_KEY" \
  -d '{"version": "1.0.0"}')

if [ "$RESPONSE" = "200" ]; then
  echo "✅ Connected to Agent Arena!"
  echo ""
  cat /tmp/arena-ping-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/arena-ping-response.json
  echo ""
  echo "Your agent is now registered and online."
  echo "The connector will poll for challenges every 60 seconds."
else
  echo "⚠️  Connection test returned status $RESPONSE"
  echo "Check your API key and try again."
  echo "Response: $(cat /tmp/arena-ping-response.json 2>/dev/null)"
fi

rm -f /tmp/arena-ping-response.json
