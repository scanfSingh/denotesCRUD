import { NextRequest, NextResponse } from "next/server";
import { ragConfig } from "@/lib/rag/config";
import { ingestUrls } from "@/lib/rag/ingest";

// Node runtime (needs Mongo driver + fetch with full timeout control).
export const runtime = "nodejs";
// Ingesting several pages can take a while; raise the default 300s if
// you're ingesting large batches (Pro/Enterprise plans can go to 800s).
export const maxDuration = 120;

/**
 * POST /api/rag/ingest
 * Body: { urls: string[] }
 * Auth: Authorization: Bearer <RAG_INGEST_SECRET>
 *
 * Protected by a shared secret (not user login) since this is meant to
 * be called from an admin script/CI job, not end users. See
 * scripts/ingest-rag-content.js and RAG_CHAT_SETUP.md.
 */
export async function POST(request: NextRequest) {
  try {
    if (!ragConfig.ingestSecret) {
      return NextResponse.json(
        { error: "RAG_INGEST_SECRET is not configured on the server" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const providedSecret = authHeader.replace(/^Bearer\s+/i, "");
    if (providedSecret !== ragConfig.ingestSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const urls = body?.urls;
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "Body must include a non-empty 'urls' array" }, { status: 400 });
    }

    const summary = await ingestUrls(urls);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[api/rag/ingest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
