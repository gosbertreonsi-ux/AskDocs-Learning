import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail, secureRateKey, getTrustedClientIp, limitDecision,
} from '../lib/server/security/security-core.ts';
import { readJsonWithinLimit } from '../lib/server/security/read-json.ts';

test('account identity normalized but never silently truncated', () => {
  assert.equal(normalizeEmail('  USER@Example.COM  '), 'user@example.com');
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail('x'.repeat(270)).length, 270);
});

test('Redis keys hide account identifiers and isolate buckets', () => {
  const a = secureRateKey('auth:login:account', 'User@Example.com');
  const b = secureRateKey('auth:login:account', 'user@example.com');
  assert.equal(a, b);
  assert.ok(!a.includes('@') && !a.includes('example'));
  assert.notEqual(a, secureRateKey('auth:register:account', 'user@example.com'));
  assert.throws(() => secureRateKey('invalid bucket!', 'x'));
});

test('limit threshold and Retry-After math', () => {
  assert.deepEqual(limitDecision(3, 4, 1501), {
    allowed: true, remaining: 1, retryAfterSeconds: 2,
  });
  assert.equal(limitDecision(5, 4, 0).allowed, false);
  assert.equal(limitDecision(5, 4, 0).retryAfterSeconds, 1);
});

test('do not trust X-Forwarded-For unless explicitly enabled', () => {
  const h = new Headers({ 'x-forwarded-for': '198.51.100.20, 10.0.0.1' });
  assert.equal(getTrustedClientIp(h, false), null);
  assert.equal(getTrustedClientIp(h, true), '198.51.100.20');
  assert.equal(getTrustedClientIp(new Headers({ 'x-forwarded-for': 'nonsense' }), true), null);
});

test('request reader accepts small JSON', async () => {
  const request = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@test.local', password: 'not-a-real-password' }),
  });
  const result = await readJsonWithinLimit(request, 200);
  assert.equal(result.ok, true);
  assert.equal(result.data?.email, 'a@test.local');
});

test('request reader blocks invalid JSON / type', async () => {
  const invalid = new Request('http://localhost/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad',
  });
  assert.equal((await readJsonWithinLimit(invalid, 200)).status, 400);
  const type = new Request('http://localhost/test', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}',
  });
  assert.equal((await readJsonWithinLimit(type, 200)).status, 415);
});

test('actual body exceeds cap even without Content-Length', async () => {
  const request = new Request('http://localhost/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{"text":"' + 'x'.repeat(400) + '"}',
  });
  request.headers.delete('content-length');
  const result = await readJsonWithinLimit(request, 50);
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});
