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

  // Gemini (primary generation - has a free tier)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.RAG_GEMINI_MODEL || "gemini-3.6-flash",
    temperature: Number(process.env.RAG_LLM_TEMPERATURE ?? "0.2"),
  },

  // Groq (fallback generation - used once the Gemini free tier is
  // exhausted, or on any Gemini quota/rate-limit error). Groq exposes an
  // OpenAI-compatible endpoint, so we reuse the `openai` SDK for it.
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.RAG_GROQ_MODEL || "openai/gpt-oss-120b",
    baseUrl: "https://api.groq.com/openai/v1",
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
  if (!ragConfig.gemini.apiKey && !ragConfig.groq.apiKey) {
    missing.push("GEMINI_API_KEY (or GROQ_API_KEY)");
  }
  if (missing.length > 0) {
    throw new Error(`RAG chat is missing required env vars: ${missing.join(", ")}`);
  }
}
