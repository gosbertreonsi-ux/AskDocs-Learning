import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { RATE_LIMIT_SQL } from './rate-limit-sql';
import { secureRateKey, getTrustedClientIp, limitDecision } from './security-core';

export type RateRule = {
  bucket: string;
  identifier: string;
  max: number;
  windowSeconds: number;
};

/**
 * Atomic PostgreSQL fixed-window rate limits shared by all web instances.
 * No emails/IP addresses stored in the table: only hashed keys.
 * If PostgreSQL fails, we fail closed rather than disabling protection.
 */
export async function enforceRateLimits(rules: RateRule[]): Promise<NextResponse | null> {
  try {
    for (const rule of rules) {
      if (!Number.isSafeInteger(rule.windowSeconds) || rule.windowSeconds < 1 || rule.windowSeconds > 86400) {
        throw new Error('Invalid rate limit window');
      }
      const key = secureRateKey(rule.bucket, rule.identifier);
      // Static SQL with bound values; no user-controlled SQL identifiers.
      const rows = await prisma.$queryRawUnsafe<Array<{ hits: number; windowEnd: Date }>>(
        RATE_LIMIT_SQL, key, rule.windowSeconds
      );
      if (rows.length !== 1 || !Number.isSafeInteger(rows[0].hits)) {
        throw new Error('Unexpected rate limit counter');
      }
      const remainingMs = new Date(rows[0].windowEnd).getTime() - Date.now();
      const decision = limitDecision(rows[0].hits, rule.max, remainingMs);
      if (!decision.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: {
            'Retry-After': String(decision.retryAfterSeconds),
            'Cache-Control': 'no-store',
          } }
        );
      }
    }
    return null;
  } catch {
    return NextResponse.json(
      { error: 'Security service temporarily unavailable. Please try again shortly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

/**
 * Trust a client-IP header only if a verified upstream reverse proxy
 * replaces X-Forwarded-For. Disabled by default.
 */
export function optionalSourceRule(
  request: Request,
  bucket: string,
  max: number,
  windowSeconds: number
): RateRule[] {
  const source = getTrustedClientIp(
    request.headers,
    process.env.ASKDOCS_TRUST_PROXY_IP === 'true'
  );
  return source ? [{ bucket, identifier: source, max, windowSeconds }] : [];
}
