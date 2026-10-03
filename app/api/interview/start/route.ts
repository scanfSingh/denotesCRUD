import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseResumeFile } from "@/lib/interview/resumeParser";
import { generateInterviewTurn } from "@/lib/interview/generator";
import { createInterviewSession, type InterviewDurationMinutes } from "@/lib/interview/store";
import { getUserResume, saveUserResume } from "@/lib/interview/resumeStore";
import { interviewConfig } from "@/lib/interview/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_DURATIONS: InterviewDurationMinutes[] = [30, 60, 90];

/**
 * POST /api/interview/start
 * multipart/form-data: resume (File, optional), skills (comma-separated
 * string), role (string), difficulty ("easy" | "medium" | "hard"),
 * duration ("30" | "60" | "90", minutes)
 *
 * A plain route rather than a server action because it needs to accept
 * a file upload - parses the resume, kicks off the interview with the
 * LLM for the first question, and persists the new session.
 *
 * The resume file is optional: when provided it's parsed and saved as
 * the user's current resume (replacing whatever was there before), so
 * the next interview can reuse it without asking again; when omitted,
 * the previously saved resume is used instead.
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
    const durationParsed = Number(formData.get("duration"));
    const durationMinutes: InterviewDurationMinutes = VALID_DURATIONS.includes(
      durationParsed as InterviewDurationMinutes
    )
      ? (durationParsed as InterviewDurationMinutes)
      : 30;

    let resumeText: string;
    let resumeFileName: string;

    if (resumeFile) {
      if (resumeFile.size > interviewConfig.maxResumeBytes) {
        return NextResponse.json(
          { error: `Resume file is too large (max ${Math.round(interviewConfig.maxResumeBytes / 1024 / 1024)}MB)` },
          { status: 400 }
        );
      }
      const parsed = await parseResumeFile(resumeFile);
      resumeText = parsed.text;
      resumeFileName = resumeFile.name;
      // Save as the user's current resume so future interviews (and the
      // "resume on file" display) don't need a re-upload.
      await saveUserResume(userId, { resumeText, resumeFileName });
    } else {
      const stored = await getUserResume(userId);
      if (!stored) {
        return NextResponse.json({ error: "Upload a resume file (PDF or DOCX)" }, { status: 400 });
      }
      resumeText = stored.resumeText;
      resumeFileName = stored.resumeFileName;
    }

    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

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
      resumeFileName,
      skills,
      role,
      difficulty,
      durationMinutes,
      firstQuestion,
    });

    return NextResponse.json({
      sessionId: doc._id.toString(),
      question: firstQuestion,
      durationMinutes: doc.durationMinutes,
      startedAt: doc.createdAt.toISOString(),
      resumeFileName,
    });
  } catch (error) {
    console.error("[api/interview/start] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to start the interview";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
