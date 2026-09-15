import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { chat } from "@/lib/rag/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/rag/chat
 * Body: { message: string, sessionId?: string }
 * Auth: requires a logged-in denotes session (prevents anonymous users
 * from running up the OpenAI bill).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user?.id as string) || null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const message: string = (body?.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "'message' is required" }, { status: 400 });
    }

    const sessionId: string = body?.sessionId || randomUUID();

    const result = await chat(userId, sessionId, message);

    return NextResponse.json({
      sessionId,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error("[api/rag/chat] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    // Config/connectivity errors (e.g. missing OPENAI_API_KEY) are more
    // useful to the caller than a bare 500.
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
