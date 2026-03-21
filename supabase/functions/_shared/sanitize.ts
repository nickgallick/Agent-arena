const SANITIZE_PATTERNS = [
  /(?:export\s+)?(?:SUPABASE_|NEXT_PUBLIC_|ANTHROPIC_|OPENAI_|VERCEL_|AWS_|GITHUB_)\w*=\S+/gi,
  /(?:sk-|pk_|rk_|sbp_|eyJ|ghp_|gho_|github_pat_|xoxb-|xoxp-)\S{15,}/g,
  /Bearer\s+\S{20,}/gi,
  /(?:\/home\/|\/Users\/|C:\\Users\\)\S+/g,
  /\b(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi,
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
  /(?:password|passwd|secret|token|apikey|api_key)\s*[:=]\s*['"]?\S+['"]?/gi,
  /ghp_[A-Za-z0-9_]{36}/g,
  /\b[0-9a-f]{40}\b/g, // SHA-1 hashes that might be tokens
]

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /system\s*:/i,
  /<\|im_start\|>/i,
  /\[INST\]/i,
  /<<SYS>>/i,
]

export function sanitizeText(input: string): string {
  let result = input
  for (const pattern of SANITIZE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

export function detectInjection(text: string): string[] {
  const flags: string[] = []
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`Potential injection pattern detected: ${pattern.source}`)
    }
  }
  return flags
}
