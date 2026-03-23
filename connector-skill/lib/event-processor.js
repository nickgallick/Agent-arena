#!/usr/bin/env node

/**
 * event-processor.js
 * Reads JSONL lines from stdin (piped from tail -f), classifies them into
 * AgentEvent types, sanitizes, debounces, and POSTs to the Arena API.
 *
 * Usage: tail -f <session.jsonl> | node event-processor.js
 *
 * Environment variables:
 *   ARENA_API_URL - Arena API base URL (default: https://agentarena.com)
 *   ARENA_API_KEY - API key for authentication
 *   ARENA_CHALLENGE_ID - Current challenge ID
 *   ARENA_AGENT_ID - Agent ID
 *   SPECTATOR_MODE - "true" (default) or "false"
 */

const http = require('https');
const readline = require('readline');

// ── Config ──
const API_URL = process.env.ARENA_API_URL || 'https://agentarena.com';
const API_KEY = process.env.ARENA_API_KEY || '';
const CHALLENGE_ID = process.env.ARENA_CHALLENGE_ID || '';
const AGENT_ID = process.env.ARENA_AGENT_ID || '';
const SPECTATOR_MODE = process.env.SPECTATOR_MODE !== 'false';
const DEBOUNCE_MS = 2000;
const MAX_SUMMARY_LEN = 500;
const MAX_CODE_LINES = 20;
const MAX_BUFFER_SIZE = 100;

if (!SPECTATOR_MODE) {
  process.exit(0);
}

// ── Sanitization patterns (12 patterns) ──
const SANITIZE_PATTERNS = [
  /(?:sk-|pk_|rk_|sbp_|eyJ|ghp_|gho_|github_pat_)\S{15,}/g,
  /(?:key_|apikey_|api_key_)\S{10,}/gi,
  /Bearer\s+\S{20,}/gi,
  /process\.env\.\w+/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g,
  /(?:postgres|mysql|mongodb|redis):\/\/\S+/gi,
  /(?:export\s+)?(?:SUPABASE_|NEXT_PUBLIC_|ANTHROPIC_|OPENAI_|VERCEL_|AWS_)\w*=\S+/gi,
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END/g,
  /(?:password|passwd|secret|token)\s*[:=]\s*['"]?\S+['"]?/gi,
  /(?:\/home\/|\/Users\/|C:\\Users\\)\S+/g,
  /\b[0-9a-f]{40}\b/g,
];

function sanitize(str) {
  if (!str) return str;
  let result = str;
  for (const pattern of SANITIZE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function truncateCode(str, maxLines) {
  if (!str) return str;
  const lines = str.split('\n');
  if (lines.length <= maxLines) return str;
  return lines.slice(0, maxLines).join('\n') + `\n// ... (${lines.length - maxLines} more lines)`;
}

function firstSentence(text) {
  if (!text) return '';
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return truncate(match ? match[0].trim() : text.slice(0, 120), MAX_SUMMARY_LEN);
}

// ── Classify JSONL line → AgentEvent ──
function classifyEvent(line) {
  try {
    const data = JSON.parse(line);
    const timestamp = new Date().toISOString();

    // Assistant text → thinking
    if (data.role === 'assistant' && data.content && typeof data.content === 'string') {
      // Check if referencing prior error → self_correct
      if (/error|fix|correct|retry|instead|wrong/i.test(data.content)) {
        return {
          type: 'self_correct',
          timestamp,
          summary: sanitize(firstSentence(data.content)),
        };
      }
      return {
        type: 'thinking',
        timestamp,
        summary: sanitize(firstSentence(data.content)),
      };
    }

    // Assistant with tool_use block → tool_call or code_write
    if (data.role === 'assistant' && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'tool_use') {
          const toolName = block.name || 'unknown';
          const input = block.input || {};

          // File write detection
          if (['write', 'Write', 'write_file', 'create_file'].includes(toolName)) {
            return {
              type: 'code_write',
              timestamp,
              filename: sanitize(truncate(input.path || input.file_path || 'unknown', 255)),
              language: guessLanguage(input.path || input.file_path || ''),
              snippet: sanitize(truncateCode(input.content || '', MAX_CODE_LINES)),
            };
          }

          // Command detection
          if (['exec', 'Exec', 'bash', 'shell', 'run_command'].includes(toolName)) {
            return {
              type: 'command_run',
              timestamp,
              command: sanitize(truncate(input.command || '', MAX_SUMMARY_LEN)),
              exit_code: 0,
              output_summary: '',
            };
          }

          return {
            type: 'tool_call',
            timestamp,
            tool: toolName,
            summary: sanitize(truncate(JSON.stringify(input).slice(0, 200), MAX_SUMMARY_LEN)),
          };
        }
      }
    }

    // Tool result with error → error_hit
    if (data.role === 'tool' || data.type === 'tool_result') {
      const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content || '');
      if (/error|traceback|exception|failed|ENOENT|EACCES/i.test(content)) {
        return {
          type: 'error_hit',
          timestamp,
          error_summary: sanitize(truncate(firstSentence(content), MAX_SUMMARY_LEN)),
        };
      }

      // Command result with exit code
      if (data.exit_code !== undefined) {
        return {
          type: 'command_run',
          timestamp,
          command: sanitize(truncate(data.command || '', MAX_SUMMARY_LEN)),
          exit_code: data.exit_code,
          output_summary: sanitize(truncate(firstSentence(content), MAX_SUMMARY_LEN)),
        };
      }
    }

    return null; // Unclassifiable
  } catch {
    return null; // Invalid JSON
  }
}

function guessLanguage(filepath) {
  const ext = (filepath || '').split('.').pop()?.toLowerCase();
  const map = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    sql: 'sql', sh: 'bash', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', css: 'css', html: 'html',
  };
  return map[ext] || ext || 'text';
}

// ── Local buffer for network disconnects ──
const localBuffer = [];
let lastSentAt = 0;

async function postEvent(event) {
  const body = JSON.stringify({
    challengeId: CHALLENGE_ID,
    agentId: AGENT_ID,
    event,
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/api/v1/events/stream`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-arena-api-key': API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(data);
        } else if (res.statusCode === 429) {
          // Rate limited — buffer locally
          console.error('[arena-connector] Rate limited, buffering event');
          localBuffer.push(event);
          resolve(null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[arena-connector] Network error, buffering:', err.message);
      if (localBuffer.length < MAX_BUFFER_SIZE) {
        localBuffer.push(event);
      }
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

async function flushBuffer() {
  while (localBuffer.length > 0) {
    const event = localBuffer.shift();
    try {
      await postEvent(event);
    } catch {
      localBuffer.unshift(event);
      break;
    }
  }
}

// ── Main: read lines from stdin ──
const rl = readline.createInterface({ input: process.stdin });

rl.on('line', async (line) => {
  if (!line.trim()) return;

  const event = classifyEvent(line);
  if (!event) return;

  // Debounce: skip if < 2 seconds since last send
  const now = Date.now();
  if (now - lastSentAt < DEBOUNCE_MS) return;
  lastSentAt = now;

  // Flush any buffered events first
  if (localBuffer.length > 0) {
    await flushBuffer();
  }

  try {
    await postEvent(event);
  } catch (err) {
    console.error('[arena-connector] Failed to post event:', err.message);
  }
});

rl.on('close', () => {
  process.exit(0);
});
