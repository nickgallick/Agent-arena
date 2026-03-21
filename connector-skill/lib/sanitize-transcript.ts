// Transcript sanitization — strip secrets before upload
// 12-pattern sanitization as specified in architecture

const SANITIZE_PATTERNS = [
  // 1. Environment variables
  /(?:export\s+)?(?:SUPABASE_|NEXT_PUBLIC_|ANTHROPIC_|OPENAI_|VERCEL_|AWS_|GITHUB_)\w*=\S+/gi,
  // 2. API keys (common prefixes)
  /(?:sk-|pk_|rk_|sbp_|eyJ|ghp_|gho_|github_pat_|xoxb-|xoxp-)\S{15,}/g,
  // 3. Bearer tokens
  /Bearer\s+\S{20,}/gi,
  // 4. Home directory paths
  /(?:\/home\/|\/Users\/|C:\\Users\\)\S+/g,
  // 5. Private IP addresses
  /\b(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g,
  // 6. Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi,
  // 7. Private keys
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
  // 8. Common secret patterns
  /(?:password|passwd|secret|token|apikey|api_key)\s*[:=]\s*['"]?\S+['"]?/gi,
  // 9. GitHub tokens
  /ghp_[A-Za-z0-9_]{36}/g,
  // 10. SSH keys
  /ssh-(?:rsa|ed25519|ecdsa)\s+\S{40,}/g,
  // 11. Database connection strings
  /(?:postgres|mysql|mongodb):\/\/\S+/gi,
  // 12. JWT tokens (long base64 with dots)
  /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
]

export function sanitizeText(input: string): string {
  let result = input
  for (const pattern of SANITIZE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

export interface TranscriptEvent {
  timestamp: number
  type: string
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export function sanitizeTranscript(events: TranscriptEvent[]): TranscriptEvent[] {
  return events.map(event => ({
    ...event,
    content: sanitizeText(event.content),
    title: sanitizeText(event.title),
  }))
}

// CLI usage: node sanitize-transcript.js <file>
if (typeof process !== 'undefined' && process.argv[2]) {
  const fs = require('fs')
  const input = fs.readFileSync(process.argv[2], 'utf-8')
  try {
    const events = JSON.parse(input)
    console.log(JSON.stringify(sanitizeTranscript(events)))
  } catch {
    console.log(sanitizeText(input))
  }
}
