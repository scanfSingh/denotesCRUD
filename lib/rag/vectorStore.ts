/**
 * Vector storage layer backed by Upstash Vector.
 *
 * Upstash Vector is created (via the Upstash console) with a hosted
 * embedding model attached to the index, so we upsert/query raw text
 * via the `data` field and Upstash generates the embeddings for us -
 * no torch/sentence-transformers to bundle into a serverless function.
 *
 * See RAG_CHAT_SETUP.md for how to create the index.
 *
 * Namespaces (user-specific RAG)
 * -------------------------------
 * Upstash Vector supports namespaces - fully isolated partitions within
 * one index. We use this for per-user personal content:
 *   - the default (unnamed) namespace holds the shared/public knowledge
 *     base (docs/blog pages ingested by an admin via /api/rag/ingest)
 *   - each user's own notes/topics live in their own namespace, named
 *     via userNamespace(userId), and are never visible to other users
 * Chat retrieval (retrieveForUser) queries both and merges the results,
 * so answers can draw on public help content AND the asking user's own
 * notes - but one user's notes can never leak into another user's chat.
 */
import { Index } from "@upstash/vector";
import { ragConfig } from "./config";
import type { RagChunk } from "./chunker";

export interface RagMetadata {
  sourceUrl: string;
  title: string;
  chunkIndex: number;
  // Upstash Vector's Index<TMetadata> requires metadata to be an index
  // signature type (Dict), since it's stored/returned as arbitrary JSON.
  [key: string]: unknown;
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

/** The namespace a given user's own notes/topics are stored under.
 * Never overlaps with the default namespace (public KB) or any other
 * user's namespace. */
export function userNamespace(userId: string): string {
  return `user:${userId}`;
}

/** Returns the base index, or a namespace-scoped view of it. Every
 * Index method (upsert/query/info/reset/...) works the same on either -
 * Upstash namespaces are just isolated partitions of the same index. */
function scopedIndex(namespace?: string) {
  const index = getVectorIndex();
  return namespace ? index.namespace(namespace) : index;
}

/** Deterministic ID so re-ingesting the same URL updates rather than
 * duplicates its chunks. */
function chunkId(chunk: RagChunk): string {
  return `${chunk.sourceUrl}::${chunk.chunkIndex}`;
}

const UPSERT_BATCH_SIZE = 50;

export async function storeChunks(chunks: RagChunk[], namespace?: string): Promise<number> {
  if (chunks.length === 0) return 0;

  const index = scopedIndex(namespace);
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

export async function retrieve(
  query: string,
  topK: number = ragConfig.topK,
  namespace?: string
): Promise<RetrievedChunk[]> {
  const index = scopedIndex(namespace);
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

/**
 * Retrieval for a chat turn: combines the shared/public knowledge base
 * with the asking user's own notes/topics (if any), so answers can
 * draw on both. Each namespace is queried independently (Upstash
 * namespaces can't be queried together in one call), then results are
 * merged and re-ranked by score.
 */
export async function retrieveForUser(
  query: string,
  userId: string | null,
  topK: number = ragConfig.topK
): Promise<RetrievedChunk[]> {
  const queries = [retrieve(query, topK)];
  if (userId) {
    queries.push(retrieve(query, topK, userNamespace(userId)));
  }

  const results = (await Promise.all(queries)).flat();
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export async function vectorStoreStats(namespace?: string) {
  // Namespace-scoped index objects (Index.namespace(ns)) don't expose
  // info()/describe() - only the base index does, returning a
  // `namespaces` breakdown alongside the index-wide totals. So we
  // always call info() on the base index and pick out the right slice.
  const info = await getVectorIndex().info();

  if (!namespace) {
    return { vectorCount: info.vectorCount, pendingVectorCount: info.pendingVectorCount };
  }

  const nsInfo = info.namespaces?.[namespace];
  return {
    vectorCount: nsInfo?.vectorCount ?? 0,
    pendingVectorCount: nsInfo?.pendingVectorCount ?? 0,
  };
}

/**
 * Permanently deletes every chunk in the given namespace (the default/
 * public namespace if none is given). There's no undo - the caller is
 * responsible for confirming with the user first.
 */
export async function resetVectorStore(namespace?: string): Promise<void> {
  const index = scopedIndex(namespace);
  await index.reset();
}
