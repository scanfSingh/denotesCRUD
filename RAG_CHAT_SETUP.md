# RAG Chat Setup Guide

This guide explains how to configure the AI chat assistant feature -
a Retrieval-Augmented Generation (RAG) chatbot embedded in the app that
answers questions grounded in content you ingest (docs, blog posts,
public topic pages).

Unlike a locally-run version, this implementation is fully serverless
and deploys on Vercel: Gemini handles generation (falling back to Groq
once Gemini's free tier is exhausted), and Upstash Vector handles both
embeddings and vector search (no Python, no GPU, no persistent server
process required).

## How it works

```
   URLs (docs/blog/topics) ──▶ lib/rag/loader.ts + chunker.ts ──▶ chunks
                                                                     │
                                                                     ▼
                                                        Upstash Vector index
                                                     (embeds text automatically)
                                                                     ▲
                                                                     │ similarity search
   user question ──▶ app/api/rag/chat/route.ts ──▶ lib/rag/pipeline.ts
                                                                     │
                                                                     ▼
                                                Gemini (falls back to Groq
                                                  on quota/rate-limit errors)
                                                                     │
                                                                     ▼
                                                      answer + source URLs
                                                  (chat history saved in MongoDB)
```

## Step 1: Create an Upstash Vector database

1. Go to [Upstash Console](https://console.upstash.com/) → **Vector** → **Create Index**
2. Choose a **name** and **region** close to where your Vercel functions run
3. Under **Type**, choose an index **with an embedding model** (not "custom/bring your own vectors") - e.g. `BAAI/bge-base-en-v1.5` is a good general-purpose default
4. Click **Create**
5. On the index's **Details** page, copy the **REST URL** and **REST Token**

## Step 2: Get a Gemini API key (and optionally a Groq key)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create a
   Gemini API key - it has a free tier, which is why it's used as the
   primary generation provider here
2. Optionally, also create a key at [console.groq.com](https://console.groq.com/keys).
   Groq is used automatically as a fallback if Gemini returns a
   quota/rate-limit error (e.g. once the free tier is used up for the day)
3. Note: this project separately depends on `openai` for the unrelated
   audio notes feature (`OPENAI_API_KEY`) - that's a different key/feature
   and isn't used by RAG chat anymore

## Step 3: Pick an ingest secret

The `/api/rag/ingest` endpoint is protected by a shared secret (not user
login), since it's meant to be called from a script or CI job to load
content into the knowledge base - not by end users. Generate one:

```bash
openssl rand -hex 32
```

## Step 4: Set environment variables

Add to `.env.local` for local development, and to your Vercel project's
**Settings → Environment Variables** for production:

```bash
# Vector store (from Step 1)
UPSTASH_VECTOR_REST_URL=https://xxxx.upstash.io
UPSTASH_VECTOR_REST_TOKEN=xxxx

# LLM (from Step 2)
GEMINI_API_KEY=xxxx
GROQ_API_KEY=xxxx

# Ingestion auth (from Step 3)
RAG_INGEST_SECRET=xxxx

# Turn the chat widget on (off by default)
NEXT_PUBLIC_FF_RAG_CHAT=true

# Optional tuning (defaults shown)
RAG_GEMINI_MODEL=gemini-3.6-flash
RAG_GROQ_MODEL=openai/gpt-oss-120b
RAG_LLM_TEMPERATURE=0.2
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=150
RAG_TOP_K=4
RAG_MAX_HISTORY_TURNS=6
```

## Step 5: Ingest content

With the dev server running (`npm run dev`) or against production:

```bash
# local
npm run rag:ingest -- https://denotes.co.in/blog https://denotes.co.in/topics-view

# or from a file, one URL per line
npm run rag:ingest -- --file urls.txt

# against production (set RAG_APP_URL first)
RAG_APP_URL=https://denotes.co.in npm run rag:ingest -- https://denotes.co.in/blog
```

Re-running ingestion on the same URL updates its chunks rather than
duplicating them (each chunk's ID is derived from its URL + position).

## Step 6: Try it out

Once `NEXT_PUBLIC_FF_RAG_CHAT=true` is set and you're logged in, a
floating chat button appears in the bottom-right corner of the app.
It only shows for authenticated users, to avoid unauthenticated
traffic burning through your Gemini/Groq quota.

Check `GET /api/rag/health` (admin-only - see `ADMIN_EMAILS` in
`app/actions.ts`) to confirm the vector store is configured and see how
many chunks are indexed.

## Notes on deploying to Vercel

- Both `/api/rag/ingest` and `/api/rag/chat` run on the **Node.js
  runtime** (declared via `export const runtime = "nodejs"`), since
  they use the MongoDB driver - they will not work on the Edge runtime.
- `/api/rag/ingest` sets `maxDuration = 120` since fetching and chunking
  several pages can take a while. If you ingest large batches, either
  raise this further (Pro/Enterprise plans support up to 800s, see
  [Vercel's function duration docs](https://vercel.com/docs/functions/configuring-functions/duration))
  or call the endpoint with smaller batches of URLs.
- Nothing here needs persistent disk or a long-running process, which
  is exactly what made the original local/Ollama version incompatible
  with Vercel - Gemini, Groq, and Upstash Vector are all plain HTTPS APIs.
- Chat history is stored in the `rag_chat_sessions` MongoDB collection,
  scoped per user + session ID, and trimmed to the last
  `RAG_MAX_HISTORY_TURNS` turns.

## Extending this

- **Index your own notes/topics, not just public pages**: write an
  alternative to `lib/rag/loader.ts` that reads directly from your
  `topics`/`notes` MongoDB collections, and add a `userId` field to
  chunk metadata (Upstash Vector supports metadata filtering) so each
  user's chat only retrieves their own content.
- **Streaming responses**: both Gemini's REST API and Groq's OpenAI-compatible
  SDK support streaming; wire that through a streamed `Response` in the
  route handler for a typing effect in the widget.
- **Reranking**: if answers start feeling off-topic as the knowledge
  base grows, add a reranking step on top of the initial Upstash Vector
  results before passing them to the generation step.
