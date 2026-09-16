import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/app/actions";
import { vectorStoreStats } from "@/lib/rag/vectorStore";
import { ragConfig } from "@/lib/rag/config";

export const runtime = "nodejs";

/**
 * GET /api/rag/health
 * Admin-only. Reports whether the RAG feature is configured and how
 * many chunks are currently indexed.
 */
export async function GET() {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configured = Boolean(
      ragConfig.upstash.url &&
        ragConfig.upstash.token &&
        (ragConfig.gemini.apiKey || ragConfig.groq.apiKey)
    );

    if (!configured) {
      return NextResponse.json({ status: "not_configured", configured });
    }

    const stats = await vectorStoreStats();
    return NextResponse.json({ status: "ok", configured, ...stats });
  } catch (error) {
    console.error("[api/rag/health] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
