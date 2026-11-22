import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

/** Keep private identifiers out of Redis key names and logs. */
export function secureRateKey(bucket: string, identifier: string): string {
  if (!/^[a-z0-9:-]{1,60}$/.test(bucket)) {
    throw new Error('Invalid rate limit bucket');
  }
  const digest = createHash('sha256')
    .update(identifier.trim().toLowerCase())
    .digest('hex');
  return `askdocs:limit:v1:${bucket}:${digest}`;
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** This header is trustworthy ONLY behind a proxy that strips user-supplied versions. */
export function getTrustedClientIp(
  headers: Pick<Headers, 'get'>,
  trustProxy: boolean
): string | null {
  if (!trustProxy) return null;
  const raw = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  return isIP(raw) ? raw : null;
}

export function limitDecision(count: number, max: number, ttlMs: number): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  if (!Number.isSafeInteger(max) || max < 1) throw new Error('Invalid limit');
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfterSeconds: Math.max(1, Math.ceil(Math.max(1, ttlMs) / 1000)),
  };
}
