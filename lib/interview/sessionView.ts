/**
 * Pure helpers for mock interview sessions: answered-turn counting,
 * id validation, and mapping a stored session to the client detail shape.
 */
import type { InterviewTurn } from "./generator";
import type { InterviewFeedback, InterviewSessionDoc } from "./store";

export interface InterviewDetailView {
  id: string;
  role: string;
  difficulty: string;
  durationMinutes: number;
  createdAt: string;
  completedAt?: string;
  feedback: InterviewFeedback;
  turns: { question: string; answer?: string }[];
}

/** Number of turns with a non-blank answer. */
export function countAnsweredTurns(turns: Pick<InterviewTurn, "answer">[]): number {
  return turns.filter((t) => typeof t.answer === "string" && t.answer.trim().length > 0).length;
}

/** True only for a 24-character hex string (a valid ObjectId). */
export function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

/** Maps a session with feedback to the client shape; resume text is never included. */
export function toInterviewDetail(
  doc: InterviewSessionDoc & { _id: { toString(): string }; feedback: InterviewFeedback }
): InterviewDetailView {
  return {
    id: doc._id.toString(),
    role: doc.role,
    difficulty: doc.difficulty,
    durationMinutes: doc.durationMinutes,
    createdAt: doc.createdAt.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    feedback: doc.feedback,
    turns: doc.turns.map((t) => ({ question: t.question, answer: t.answer })),
  };
}
