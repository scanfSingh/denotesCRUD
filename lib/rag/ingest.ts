/**
 * End-to-end ingestion: URLs -> fetch -> chunk -> store (Upstash Vector
 * embeds automatically). Called from app/api/rag/ingest/route.ts.
 */
import { ragConfig } from "./config";
import { fetchUrls } from "./loader";
import { chunkDocuments } from "./chunker";
import { storeChunks } from "./vectorStore";

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
