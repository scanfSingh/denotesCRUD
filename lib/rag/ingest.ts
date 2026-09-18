/**
 * End-to-end ingestion: URLs -> fetch -> chunk -> store (Upstash Vector
 * embeds automatically). Called from app/api/rag/ingest/route.ts.
 */
import { ragConfig } from "./config";
import { fetchUrls } from "./loader";
import { loadUserContent } from "./notesLoader";
import { chunkDocuments } from "./chunker";
import { storeChunks, resetVectorStore, userNamespace } from "./vectorStore";

export interface IngestSummary {
  requested: number;
  fetched: number;
  chunksStored: number;
  failedUrls: string[];
}

export async function ingestUrls(rawUrls: string[]): Promise<IngestSummary> {
  const urls = rawUrls.map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) {
    return { requested: 0, fetched: 0, chunksStored: 0, failedUrls: [] };
  }

  const docs = await fetchUrls(urls);
  const fetchedUrls = new Set(docs.map((d) => d.url));
  const failedUrls = urls.filter((u) => !fetchedUrls.has(u));

  const chunks = chunkDocuments(docs, ragConfig.chunk.size, ragConfig.chunk.overlap);
  const chunksStored = await storeChunks(chunks);

  return { requested: urls.length, fetched: docs.length, chunksStored, failedUrls };
}

/**
 * Re-indexes one user's own notes/topics into their personal Upstash
 * Vector namespace (see vectorStore.ts), so their chat can retrieve
 * grounded answers from their own content - isolated from every other
 * user's data and from the shared/public knowledge base.
 *
 * This is a full re-index rather than an incremental sync: the
 * namespace is cleared first, then rebuilt from the current state of
 * their notes/topics. Personal note collections are small enough
 * (see RAG_CHAT_SETUP.md) that this is simpler and safer than trying
 * to diff stale chunks from edited/deleted notes.
 */
export async function ingestUserContent(userId: string): Promise<IngestSummary> {
  const namespace = userNamespace(userId);
  const docs = await loadUserContent(userId);

  await resetVectorStore(namespace);

  if (docs.length === 0) {
    return { requested: 0, fetched: 0, chunksStored: 0, failedUrls: [] };
  }

  const chunks = chunkDocuments(docs, ragConfig.chunk.size, ragConfig.chunk.overlap);
  const chunksStored = await storeChunks(chunks, namespace);

  return { requested: docs.length, fetched: docs.length, chunksStored, failedUrls: [] };
}
