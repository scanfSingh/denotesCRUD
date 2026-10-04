"use server";

import { getCurrentUserId } from "./actions";
import { generateInterviewTurn, type InterviewTurn } from "@/lib/interview/generator";
import {
  getInterviewSession,
  appendQuestion,
  answerLastTurn,
  completeInterviewSession,
  listInterviewSessions,
  isInterviewTimeUp,
  getCompletedInterviewFeedbacks,
  type InterviewFeedback,
} from "@/lib/interview/store";
import { interviewConfig } from "@/lib/interview/config";
import { generateLearningInsights } from "@/lib/interview/insightsGenerator";
import { getUserInsights, saveUserInsights, type LearningTopic } from "@/lib/interview/insightsStore";

/**
 * Server actions backing the /mock-interview page. Resume upload +
 * session creation is a plain route (app/api/interview/start) since it
 * needs multipart/form-data; everything after that - submitting an
 * answer, ending early, listing past interviews - is a normal action.
 */

export type InterviewStepResult =
  | { success: true; done: false; question: string }
  | { success: true; done: true; feedback: InterviewFeedback }
  | { success: false; error: string };

export async function submitInterviewAnswer(
  sessionId: string,
  answer: string
): Promise<InterviewStepResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const trimmed = answer.trim();
    if (!trimmed) return { success: false, error: "Enter an answer first" };

    const doc = await getInterviewSession(sessionId, userId);
    if (!doc) return { success: false, error: "Interview not found" };
    if (doc.status === "completed") return { success: false, error: "This interview already ended" };

    await answerLastTurn(sessionId, trimmed);

    const turns: InterviewTurn[] = [
      ...doc.turns.slice(0, -1),
      { ...doc.turns[doc.turns.length - 1], answer: trimmed },
    ];
    // Whichever comes first: the candidate's chosen duration running out,
    // or the defensive turn-count ceiling.
    const isFinal = turns.length >= interviewConfig.maxTurns || isInterviewTimeUp(doc);

    const result = await generateInterviewTurn(
      { resumeText: doc.resumeText, skills: doc.skills, role: doc.role, difficulty: doc.difficulty, turns },
      isFinal
    );

    if (result.type === "feedback") {
      await completeInterviewSession(sessionId, {
        summary: result.summary,
        strengths: result.strengths,
        improvements: result.improvements,
        score: result.score,
      });
      return { success: true, done: true, feedback: result };
    }

    await appendQuestion(sessionId, result.question);
    return { success: true, done: false, question: result.question };
  } catch (error) {
    console.error("[interview-actions] submitInterviewAnswer failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to continue the interview",
    };
  }
}

export async function endInterviewEarly(
  sessionId: string
): Promise<{ success: true; feedback: InterviewFeedback } | { success: false; error: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const doc = await getInterviewSession(sessionId, userId);
    if (!doc) return { success: false, error: "Interview not found" };
    if (doc.status === "completed") {
      return doc.feedback
        ? { success: true, feedback: doc.feedback }
        : { success: false, error: "This interview already ended" };
    }

    // Drop a trailing unanswered question so the model evaluates only
    // what was actually answered.
    const answeredTurns = doc.turns.filter((t) => t.answer);
    const result = await generateInterviewTurn(
      {
        resumeText: doc.resumeText,
        skills: doc.skills,
        role: doc.role,
        difficulty: doc.difficulty,
        turns: answeredTurns,
      },
      true
    );

    const feedback: InterviewFeedback =
      result.type === "feedback"
        ? result
        : { summary: "Interview ended early.", strengths: [], improvements: [], score: 0 };

    await completeInterviewSession(sessionId, feedback);
    return { success: true, feedback };
  } catch (error) {
    console.error("[interview-actions] endInterviewEarly failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to end the interview",
    };
  }
}

export interface InterviewSummary {
  id: string;
  role: string;
  difficulty: string;
  durationMinutes: number;
  status: "in_progress" | "completed";
  score?: number;
  createdAt: string;
}

export async function getMyInterviewSessions(): Promise<InterviewSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const docs = await listInterviewSessions(userId);
  return docs.map((d) => ({
    id: d._id.toString(),
    role: d.role,
    difficulty: d.difficulty,
    durationMinutes: d.durationMinutes,
    status: d.status,
    score: d.feedback?.score,
    createdAt: d.createdAt.toISOString(),
  }));
}

export interface LearningInsightsSummary {
  overallSummary: string;
  topics: LearningTopic[];
  basedOnSessionCount: number;
  generatedAt: string;
}

/** The cached learning plan, if one has been generated before - doesn't
 * call the LLM, just reads whatever's saved. */
export async function getLearningInsights(): Promise<LearningInsightsSummary | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const doc = await getUserInsights(userId);
  if (!doc) return null;

  return {
    overallSummary: doc.overallSummary,
    topics: doc.topics,
    basedOnSessionCount: doc.basedOnSessionCount,
    generatedAt: doc.generatedAt.toISOString(),
  };
}

export type GenerateInsightsResult =
  | { success: true; insights: LearningInsightsSummary }
  | { success: false; error: string };

/** (Re)generates the cumulative learning plan from every completed
 * interview's feedback, and saves it as the user's current plan. */
export async function generateMyLearningInsights(): Promise<GenerateInsightsResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const sessions = await getCompletedInterviewFeedbacks(userId);
    if (sessions.length === 0) {
      return { success: false, error: "Finish at least one interview first to get a learning plan." };
    }

    const result = await generateLearningInsights(sessions);
    await saveUserInsights(userId, {
      overallSummary: result.overallSummary,
      topics: result.topics,
      basedOnSessionCount: sessions.length,
    });

    return {
      success: true,
      insights: {
        overallSummary: result.overallSummary,
        topics: result.topics,
        basedOnSessionCount: sessions.length,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[interview-actions] generateMyLearningInsights failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate your learning plan",
    };
  }
}
