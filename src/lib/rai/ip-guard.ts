/**
 * SSRF Protection — IP Guard
 *
 * Blocks invocation to private/reserved IP ranges (SSRF prevention).
 * Called at registration time AND at invocation time (DNS rebinding protection).
 *
 * Blocked ranges:
 * - 127.0.0.0/8     (loopback)
 * - 10.0.0.0/8      (RFC1918 private)
 * - 172.16.0.0/12   (RFC1918 private)
 * - 192.168.0.0/16  (RFC1918 private)
 * - 169.254.0.0/16  (link-local / AWS metadata)
 * - 100.64.0.0/10   (CGNAT shared address)
 * - ::1             (IPv6 loopback)
 * - fc00::/7        (IPv6 unique local)
 */

import { Resolver } from 'dns/promises'

const resolver = new Resolver()

// IPv4 CIDR blocks to block
const BLOCKED_RANGES_V4: Array<{ network: number; mask: number }> = [
  { network: ipv4ToInt('127.0.0.0'),   mask: prefixToMask(8) },   // loopback
  { network: ipv4ToInt('10.0.0.0'),    mask: prefixToMask(8) },   // RFC1918
  { network: ipv4ToInt('172.16.0.0'),  mask: prefixToMask(12) },  // RFC1918
  { network: ipv4ToInt('192.168.0.0'), mask: prefixToMask(16) },  // RFC1918
  { network: ipv4ToInt('169.254.0.0'), mask: prefixToMask(16) },  // link-local
  { network: ipv4ToInt('100.64.0.0'),  mask: prefixToMask(10) },  // CGNAT
  { network: ipv4ToInt('0.0.0.0'),     mask: prefixToMask(8) },   // this-network
  { network: ipv4ToInt('192.0.2.0'),   mask: prefixToMask(24) },  // TEST-NET-1
  { network: ipv4ToInt('198.51.100.0'),mask: prefixToMask(24) },  // TEST-NET-2
  { network: ipv4ToInt('203.0.113.0'), mask: prefixToMask(24) },  // TEST-NET-3
  { network: ipv4ToInt('240.0.0.0'),   mask: prefixToMask(4) },   // reserved
]

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0
}

function prefixToMask(prefix: number): number {
  return (0xffffffff << (32 - prefix)) >>> 0
}

function isBlockedIPv4(ip: string): boolean {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false
  const ipInt = ipv4ToInt(ip)
  return BLOCKED_RANGES_V4.some(({ network, mask }) => (ipInt & mask) === network)
}

function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true
  // fc00::/7 — unique local (starts with fc or fd)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  // fe80::/10 — link-local
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb')) return true
  return false
}

/**
 * Returns true if the hostname resolves to a private/blocked IP.
 * Resolves the hostname via DNS and checks all returned addresses.
 * If DNS resolution fails, returns false (non-blocking — let the
 * invocation fail naturally; we don't want DNS errors to block valid hosts).
 */
export async function isPrivateIp(hostname: string): Promise<boolean> {
  // Check if hostname is already a raw IP
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return isBlockedIPv4(hostname)
  }
  if (hostname.includes(':')) {
    return isBlockedIPv6(hostname)
  }

  // Resolve hostname
  try {
    const [v4Addresses, v6Addresses] = await Promise.allSettled([
      resolver.resolve4(hostname),
      resolver.resolve6(hostname),
    ])

    if (v4Addresses.status === 'fulfilled') {
      for (const ip of v4Addresses.value) {
        if (isBlockedIPv4(ip)) return true
      }
    }

    if (v6Addresses.status === 'fulfilled') {
      for (const ip of v6Addresses.value) {
        if (isBlockedIPv6(ip)) return true
      }
    }

    return false
  } catch {
    // DNS failure — not blocking, let invocation handle it
    return false
  }
}

/**
 * Synchronous URL validation for registration time (format only, no DNS).
 */
export function validateEndpointUrl(url: string): { valid: boolean; reason?: string } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Endpoint URL must use HTTPS' }
  }

  if (url.length > 512) {
    return { valid: false, reason: 'URL too long (max 512 characters)' }
  }

  // Block obvious private hostnames at registration time (pre-DNS)
  const hostname = parsed.hostname
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname) ||
    hostname === '::1' ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd')
  ) {
    return { valid: false, reason: 'Private/localhost URLs are not allowed' }
  }

  return { valid: true }
}
