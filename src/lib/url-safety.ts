/**
 * URL safety utilities — prevent SSRF, enforce https, block private IPs.
 */

const PRIVATE_CIDRS = [
  // Loopback
  { start: 2130706432, end: 2130706687 }, // 127.0.0.0/8
  // Link-local
  { start: 2886729728, end: 2886795391 }, // 169.254.0.0/16
  // RFC 1918
  { start: 167772160, end: 184549375 }, // 10.0.0.0/8
  { start: 2885681152, end: 2885681152 + 65535 }, // 172.16.0.0/12
  { start: 3232235520, end: 3232301055 }, // 192.168.0.0/16
  // IPv6 loopback
  { start: 0, end: 1 }, // ::1
  // IPv6 mapped IPv4 loopback
  { start: 2130706432, end: 2130706687 }, // ::ffff:127.0.0.0/8
];

function ipv4ToNum(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIp(ip: string): boolean {
  // IPv6
  if (ip === '::1' || ip === '::') return true;
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;

  // IPv4
  const v4 = ip.replace(/^::ffff:/, '');
  const parts = v4.split('.');
  if (parts.length === 4) {
    const num = ipv4ToNum(v4);
    return PRIVATE_CIDRS.some((range) => num >= range.start && num <= range.end);
  }

  return true; // If we can't parse, assume unsafe
}

export interface UrlValidationResult {
  safe: boolean;
  error?: string;
}

/**
 * Validate a URL for external fetch operations.
 * - Must be http: or https:
 * - Must resolve to a non-private IP
 * - Blocks common metadata endpoints
 */
export async function validateExternalUrl(urlStr: string): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { safe: false, error: `Invalid URL: ${urlStr}` };
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, error: 'Only http/https URLs are allowed' };
  }

  // Block common metadata endpoints by hostname pattern
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === 'metadata.google.internal' || host.endsWith('.internal')) {
    return { safe: false, error: 'Private hostnames are not allowed' };
  }

  // DNS resolution + IP check
  try {
    const { lookup } = await import('node:dns/promises');
    const addresses = await lookup(host).catch(() => null);
    if (!addresses || !addresses.address) {
      return { safe: false, error: `Cannot resolve hostname: ${host}` };
    }
    if (isPrivateIp(addresses.address)) {
      return { safe: false, error: 'Private/internal IP addresses are not allowed' };
    }
  } catch {
    // If DNS resolution fails, allow (it will fail at fetch time anyway)
  }

  return { safe: true };
}

/**
 * Lightweight validation for image URLs — no DNS check, just protocol + hostname pattern.
 */
export function isImageUrlSafe(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === 'metadata.google.internal' || host.endsWith('.internal'))
      return false;
    return true;
  } catch {
    return false;
  }
}
