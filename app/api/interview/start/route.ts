import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseResumeFile } from "@/lib/interview/resumeParser";
import { generateInterviewTurn } from "@/lib/interview/generator";
import { createInterviewSession } from "@/lib/interview/store";
import { interviewConfig } from "@/lib/interview/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/interview/start
 * multipart/form-data: resume (File), skills (comma-separated string),
 * role (string), difficulty ("easy" | "medium" | "hard")
 *
 * A plain route rather than a server action because it needs to accept
 * a file upload - parses the resume, kicks off the interview with the
 * LLM for the first question, and persists the new session.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user?.id as string) || null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!interviewConfig.gemini.apiKey && !interviewConfig.groq.apiKey) {
      return NextResponse.json(
        { error: "Mock interview isn't configured on this deployment yet." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const resumeFile = formData.get("resume") as File | null;
    const skillsRaw = (formData.get("skills") as string) || "";
    const role = ((formData.get("role") as string) || "Software Engineer").trim();
    const difficultyRaw = ((formData.get("difficulty") as string) || "medium").trim();
    const difficulty = (["easy", "medium", "hard"].includes(difficultyRaw) ? difficultyRaw : "medium") as
      | "easy"
      | "medium"
      | "hard";

    if (!resumeFile) {
      return NextResponse.json({ error: "Upload a resume file (PDF or DOCX)" }, { status: 400 });
    }
    if (resumeFile.size > interviewConfig.maxResumeBytes) {
      return NextResponse.json(
        { error: `Resume file is too large (max ${Math.round(interviewConfig.maxResumeBytes / 1024 / 1024)}MB)` },
        { status: 400 }
      );
    }

    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { text: resumeText } = await parseResumeFile(resumeFile);

    const firstTurn = await generateInterviewTurn(
      { resumeText, skills, role, difficulty, turns: [] },
      false
    );
    const firstQuestion =
      firstTurn.type === "question"
        ? firstTurn.question
        : "Let's start - tell me a bit about your background and what you're looking for in this role.";

    const doc = await createInterviewSession({
      userId,
      resumeText,
      resumeFileName: resumeFile.name,
      skills,
      role,
      difficulty,
      firstQuestion,
    });

    return NextResponse.json({
      sessionId: doc._id.toString(),
      question: firstQuestion,
    });
  } catch (error) {
    console.error("[api/interview/start] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to start the interview";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
