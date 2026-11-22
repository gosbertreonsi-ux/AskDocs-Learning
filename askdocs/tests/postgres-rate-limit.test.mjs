import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { RATE_LIMIT_SQL } from '../lib/server/security/rate-limit-sql.ts';

test('PostgreSQL limiter atomically counts concurrent requests and resets after expiry', {
  skip: process.env.ASKDOCS_RUN_DB_TESTS !== '1' ? 'Requires dedicated integration test database' : false,
}, async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
  const key = 'askdocs:integration:' + randomUUID();
  const increment = (windowSeconds) => pool.query(RATE_LIMIT_SQL, [key, windowSeconds]);
  try {
    const results = await Promise.all(Array.from({ length: 12 }, () => increment(60)));
    const hits = results.map(result => result.rows[0].hits).sort((a,b)=>a-b);
    assert.deepEqual(hits, Array.from({ length: 12 }, (_,i)=>i+1));

    await pool.query('UPDATE "RateLimitCounter" SET "windowEnd" = NOW() - INTERVAL \'1 second\' WHERE "key" = $1', [key]);
    const restarted = await increment(60);
    assert.equal(restarted.rows[0].hits, 1);
    assert.ok(new Date(restarted.rows[0].windowEnd).getTime() > Date.now());
  } finally {
    await pool.query('DELETE FROM "RateLimitCounter" WHERE "key" = $1', [key]).catch(() => undefined);
    await pool.end();
  }
});
