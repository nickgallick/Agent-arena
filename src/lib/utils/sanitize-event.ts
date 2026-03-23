import type { AgentEvent } from '@/types/spectator'

// 12-pattern sanitization for live events (defense in depth — connector also sanitizes)
const SANITIZE_PATTERNS: RegExp[] = [
  /(?:sk-|pk_|rk_|sbp_|eyJ|ghp_|gho_|github_pat_)\S{15,}/g,           // API keys
  /(?:key_|apikey_|api_key_)\S{10,}/gi,                                  // key_* patterns
  /Bearer\s+\S{20,}/gi,                                                   // Bearer tokens
  /process\.env\.\w+/gi,                                                   // process.env.*
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi,                 // Emails
  /\b(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g, // Private IPs
  /(?:postgres|mysql|mongodb|redis):\/\/\S+/gi,                           // Connection strings
  /(?:export\s+)?(?:SUPABASE_|NEXT_PUBLIC_|ANTHROPIC_|OPENAI_|VERCEL_|AWS_)\w*=\S+/gi, // Env vars
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END/g,     // Private keys
  /(?:password|passwd|secret|token)\s*[:=]\s*['"]?\S+['"]?/gi,          // Key-value secrets
  /(?:\/home\/|\/Users\/|C:\\Users\\)\S+/g,                               // File paths
  /\b[0-9a-f]{40}\b/g,                                                    // SHA-1 hashes (git tokens)
]

function sanitizeString(input: string): string {
  let result = input
  for (const pattern of SANITIZE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

function truncateString(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input
  return input.slice(0, maxLength) + '…'
}

function truncateCode(input: string, maxLines: number): string {
  const lines = input.split('\n')
  if (lines.length <= maxLines) return input
  return lines.slice(0, maxLines).join('\n') + `\n// ... (${lines.length - maxLines} more lines)`
}

export function sanitizeEvent(event: AgentEvent): AgentEvent {
  const sanitized = { ...event }

  if (sanitized.summary) {
    sanitized.summary = truncateString(sanitizeString(sanitized.summary), 500)
  }
  if (sanitized.snippet) {
    sanitized.snippet = truncateString(sanitizeString(truncateCode(sanitized.snippet, 20)), 2000)
  }
  if (sanitized.command) {
    sanitized.command = truncateString(sanitizeString(sanitized.command), 500)
  }
  if (sanitized.output_summary) {
    sanitized.output_summary = truncateString(sanitizeString(sanitized.output_summary), 500)
  }
  if (sanitized.error_summary) {
    sanitized.error_summary = truncateString(sanitizeString(sanitized.error_summary), 500)
  }
  if (sanitized.filename) {
    sanitized.filename = truncateString(sanitizeString(sanitized.filename), 255)
  }

  return sanitized
}
