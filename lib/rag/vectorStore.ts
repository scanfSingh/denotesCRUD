/**
 * Vector storage layer backed by Upstash Vector.
 *
 * Upstash Vector is created (via the Upstash console) with a hosted
 * embedding model attached to the index, so we upsert/query raw text
 * via the `data` field and Upstash generates the embeddings for us -
 * no torch/sentence-transformers to bundle into a serverless function.
 *
 * See RAG_CHAT_SETUP.md for how to create the index.
 */
import { Index } from "@upstash/vector";
import { ragConfig } from "./config";
import type { RagChunk } from "./chunker";

export interface RagMetadata {
  sourceUrl: string;
  title: string;
  chunkIndex: number;
}

let _index: Index<RagMetadata> | null = null;

export function getVectorIndex(): Index<RagMetadata> {
  if (!_index) {
    if (!ragConfig.upstash.url || !ragConfig.upstash.token) {
      throw new Error(
        "Upstash Vector is not configured. Set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN."
      );
    }
    _index = new Index<RagMetadata>({
      url: ragConfig.upstash.url,
      token: ragConfig.upstash.token,
    });
  }
  return _index;
}

/** Deterministic ID so re-ingesting the same URL updates rather than
 * duplicates its chunks. */
function chunkId(chunk: RagChunk): string {
  return `${chunk.sourceUrl}::${chunk.chunkIndex}`;
}

const UPSERT_BATCH_SIZE = 50;

export async function storeChunks(chunks: RagChunk[]): Promise<number> {
  if (chunks.length === 0) return 0;

  const index = getVectorIndex();
  const records = chunks.map((c) => ({
    id: chunkId(c),
    data: c.text,
    metadata: { sourceUrl: c.sourceUrl, title: c.title, chunkIndex: c.chunkIndex },
  }));

  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    const batch = records.slice(i, i + UPSERT_BATCH_SIZE);
    await index.upsert(batch);
  }

  return records.length;
}

export interface RetrievedChunk {
  text: string;
  sourceUrl: string;
  title: string;
  score: number; // 0-1, higher = more relevant (Upstash returns normalized score)
}

export async function retrieve(query: string, topK: number = ragConfig.topK): Promise<RetrievedChunk[]> {
  const index = getVectorIndex();
  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
    includeData: true,
  });

  return results.map((r) => ({
    text: (r.data as string) || "",
    sourceUrl: r.metadata?.sourceUrl || "",
    title: r.metadata?.title || "",
    score: r.score,
  }));
}

export async function vectorStoreStats() {
  const index = getVectorIndex();
  const info = await index.info();
  return { vectorCount: info.vectorCount, pendingVectorCount: info.pendingVectorCount };
}

/**
 * Permanently deletes every chunk in the knowledge base (the default
 * namespace, which is all we ever write to). There's no undo - the
 * caller is responsible for confirming with the user first.
 */
export async function resetVectorStore(): Promise<void> {
  const index = getVectorIndex();
  await index.reset();
}
