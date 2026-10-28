
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Store individual document passages and embeddings
CREATE TABLE "DocumentChunk" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "embedding" vector(768) NOT NULL,

  CONSTRAINT "DocumentChunk_pkey"
    PRIMARY KEY ("id")
);

-- A passage position must be unique within its document
CREATE UNIQUE INDEX
  "DocumentChunk_documentId_chunkIndex_key"
ON "DocumentChunk" ("documentId", "chunkIndex");

-- Improve document-specific filtering
CREATE INDEX "DocumentChunk_documentId_idx"
ON "DocumentChunk" ("documentId");

-- Link chunks to documents
ALTER TABLE "DocumentChunk"
ADD CONSTRAINT "DocumentChunk_documentId_fkey"
FOREIGN KEY ("documentId")
REFERENCES "Document"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Approximate vector index for future larger datasets
CREATE INDEX "DocumentChunk_embedding_hnsw_idx"
ON "DocumentChunk"
USING hnsw ("embedding" vector_cosine_ops);
