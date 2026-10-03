import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserResume } from "@/lib/interview/resumeStore";

export const runtime = "nodejs";

/**
 * GET /api/interview/resume
 * Returns the current signed-in user's saved resume metadata (filename +
 * last-updated time), or { resumeFileName: null } if they haven't uploaded
 * one yet. Lets the mock-interview setup screen show "resume on file"
 * instead of asking for an upload every time.
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user?.id as string) || null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stored = await getUserResume(userId);
  if (!stored) {
    return NextResponse.json({ resumeFileName: null });
  }

  return NextResponse.json({
    resumeFileName: stored.resumeFileName,
    updatedAt: stored.updatedAt.toISOString(),
  });
}
