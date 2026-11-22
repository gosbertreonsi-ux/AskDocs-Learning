-- Durable request counters shared by all Next.js instances.
-- No user emails or IPs are stored; keys are SHA-256 digests.
-- Additive; does not modify existing accounts or documents.
CREATE TABLE IF NOT EXISTS "RateLimitCounter" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "windowEnd" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "RateLimitCounter_windowEnd_idx" ON "RateLimitCounter"("windowEnd");
