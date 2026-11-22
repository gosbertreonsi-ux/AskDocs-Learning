/**
 * Parameterized, atomic PostgreSQL rate limiter.
 * Call ONLY with bound parameters ($1=hashed key; $2=validated integer seconds).
 * No user-provided SQL fragments are interpolated into this statement.
 */
export const RATE_LIMIT_SQL = `
INSERT INTO "RateLimitCounter" ("key", "hits", "windowEnd")
VALUES ($1, 1, NOW() + ($2::integer * INTERVAL '1 second'))
ON CONFLICT ("key") DO UPDATE
SET "hits" = CASE
      WHEN "RateLimitCounter"."windowEnd" <= NOW() THEN 1
      ELSE "RateLimitCounter"."hits" + 1
    END,
    "windowEnd" = CASE
      WHEN "RateLimitCounter"."windowEnd" <= NOW()
        THEN NOW() + ($2::integer * INTERVAL '1 second')
      ELSE "RateLimitCounter"."windowEnd"
    END
RETURNING "hits", "windowEnd"
`;
