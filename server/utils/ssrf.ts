import { URL } from 'url';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/GCP cloud metadata
  'metadata.google.internal',
  'instance-data',
]);

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
];

/**
 * Validates a URL to prevent Server-Side Request Forgery (SSRF)
 */
export function validateSafeUrl(rawUrl: string): { safe: boolean; error?: string; url?: URL } {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: 'Only http and https protocols are supported' };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTS.has(hostname)) {
      return { safe: false, error: 'Access to loopback or metadata endpoints is forbidden' };
    }

    for (const regex of PRIVATE_IP_RANGES) {
      if (regex.test(hostname)) {
        return { safe: false, error: 'Access to private internal IP addresses is forbidden' };
      }
    }

    return { safe: true, url: parsed };
  } catch (err: any) {
    return { safe: false, error: `Invalid URL format: ${err?.message || 'parse error'}` };
  }
}
