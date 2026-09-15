/**
 * Central configuration for the RAG chat feature.
 *
 * All values are environment-variable driven so behavior can differ
 * between local dev and the Vercel deployment without code changes.
 */

export const ragConfig = {
  // Upstash Vector (serverless vector DB, embeds text for us server-side)
  upstash: {
    url: process.env.UPSTASH_VECTOR_REST_URL || "",
    token: process.env.UPSTASH_VECTOR_REST_TOKEN || "",
  },

  // OpenAI (generation)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.RAG_OPENAI_MODEL || "gpt-4o-mini",
    temperature: Number(process.env.RAG_LLM_TEMPERATURE ?? "0.2"),
  },

  // Chunking
  chunk: {
    size: Number(process.env.RAG_CHUNK_SIZE ?? "800"), // characters
    overlap: Number(process.env.RAG_CHUNK_OVERLAP ?? "150"), // characters
  },

  // Retrieval
  topK: Number(process.env.RAG_TOP_K ?? "4"),

  // Chat memory (stored in Mongo, see lib/rag/history.ts)
  maxHistoryTurns: Number(process.env.RAG_MAX_HISTORY_TURNS ?? "6"),

  // Fetching pages to ingest
  requestTimeoutMs: Number(process.env.RAG_REQUEST_TIMEOUT_MS ?? "15000"),
  userAgent: process.env.RAG_USER_AGENT || "denotes-rag-bot/1.0 (+https://denotes.co.in)",

  // Secret used to authorize calls to /api/rag/ingest (a script or admin
  // tool, not an end user) - set this in Vercel env vars.
  ingestSecret: process.env.RAG_INGEST_SECRET || "",
};

export function assertRagConfigured() {
  const missing: string[] = [];
  if (!ragConfig.upstash.url) missing.push("UPSTASH_VECTOR_REST_URL");
  if (!ragConfig.upstash.token) missing.push("UPSTASH_VECTOR_REST_TOKEN");
  if (!ragConfig.openai.apiKey) missing.push("OPENAI_API_KEY");
  if (missing.length > 0) {
    throw new Error(`RAG chat is missing required env vars: ${missing.join(", ")}`);
  }
}
