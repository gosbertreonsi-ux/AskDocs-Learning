-- Additive migration: retains all existing users, documents and vectors.
ALTER TABLE "Document"
  ADD COLUMN "indexStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "indexError" TEXT,
  ADD COLUMN "indexedAt" TIMESTAMP(3);

-- Previously indexed documents remain searchable and display READY.
UPDATE "Document" AS d
SET "indexStatus" = 'READY', "indexedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1 FROM "DocumentChunk" AS c WHERE c."documentId" = d."id"
);

CREATE INDEX "Document_indexStatus_idx" ON "Document"("indexStatus");
