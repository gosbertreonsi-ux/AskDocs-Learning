import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import {
  secureRateKey,
  getTrustedClientIp,
  limitDecision,
} from './security-core';

export type RateRule = {
  bucket: string;
  identifier: string;
  max: number;
  windowSeconds: number;
};

/** Atomic fixed-window count and expiry (no competing INCR/EXPIRE race). */
const SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('PTTL', KEYS[1])}
`;

const singleton = globalThis as typeof globalThis & {
  askdocsSecurityRedis?: Redis;
  askdocsSecurityRedisConnecting?: Promise<Redis>;
};

async function connection(): Promise<Redis> {
  if (singleton.askdocsSecurityRedis?.status === 'ready') {
    return singleton.askdocsSecurityRedis;
  }
  if (singleton.askdocsSecurityRedisConnecting) {
    return singleton.askdocsSecurityRedisConnecting;
  }
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6381', {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy: () => null,
  });
  redis.on('error', () => undefined); // avoid dumping connection credentials
  singleton.askdocsSecurityRedis = redis;
  const connecting = redis.connect()
    .then(() => redis)
    .catch((error: unknown) => {
      redis.disconnect();
      if (singleton.askdocsSecurityRedis === redis) {
        singleton.askdocsSecurityRedis = undefined;
      }
      throw error;
    })
    .finally(() => {
      singleton.askdocsSecurityRedisConnecting = undefined;
    });
  singleton.askdocsSecurityRedisConnecting = connecting;
  return connecting;
}

/**
 * Return an HTTP response if blocked or Redis unavailable, otherwise null.
 * Fail closed on a Redis outage for authentication and expensive AI operations.
 */
export async function enforceRateLimits(rules: RateRule[]): Promise<NextResponse | null> {
  try {
    const redis = await connection();
    for (const rule of rules) {
      if (!Number.isSafeInteger(rule.windowSeconds) || rule.windowSeconds < 1) {
        throw new Error('Invalid rate limit window');
      }
      const reply = (await redis.eval(
        SCRIPT,
        1,
        secureRateKey(rule.bucket, rule.identifier),
        String(rule.windowSeconds * 1000)
      )) as [number, number];
      const decision = limitDecision(Number(reply[0]), rule.max, Number(reply[1]));
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
 * For production only: enable ASKDOCS_TRUST_PROXY_IP=true after configuring
 * a trusted reverse proxy to REPLACE X-Forwarded-For from clients.
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
