import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearSession } from "@/lib/rag/history";

export const runtime = "nodejs";

/**
 * POST /api/rag/chat/reset
 * Body: { sessionId: string }
 * Clears a user's own chat history for that session (ownership is
 * enforced inside clearSession via the userId:sessionId doc key).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user?.id as string) || null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const sessionId: string = body?.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: "'sessionId' is required" }, { status: 400 });
    }

    await clearSession(userId, sessionId);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[api/rag/chat/reset] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
