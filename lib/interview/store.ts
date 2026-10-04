/**
 * MongoDB access for mock interview sessions. Single collection,
 * one document per interview - small enough that there's no need to
 * split questions/answers into their own collection.
 */
import { ObjectId, type Collection } from "mongodb";
import client from "@/lib/mongodb";
import type { InterviewTurn } from "./generator";

const COLLECTION = "interviewSessions";

export interface InterviewFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  score: number;
}

export type InterviewDurationMinutes = 30 | 60 | 90;

export interface InterviewSessionDoc {
  _id?: ObjectId;
  userId: ObjectId;
  resumeText: string;
  resumeFileName: string;
  skills: string[];
  role: string;
  difficulty: "easy" | "medium" | "hard";
  durationMinutes: InterviewDurationMinutes;
  status: "in_progress" | "completed";
  turns: InterviewTurn[];
  feedback?: InterviewFeedback;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

async function getCollection(): Promise<Collection<InterviewSessionDoc>> {
  const mongoClient = await client.connect();
  return mongoClient.db().collection<InterviewSessionDoc>(COLLECTION);
}

export async function createInterviewSession(input: {
  userId: string;
  resumeText: string;
  resumeFileName: string;
  skills: string[];
  role: string;
  difficulty: "easy" | "medium" | "hard";
  durationMinutes: InterviewDurationMinutes;
  firstQuestion: string;
}): Promise<InterviewSessionDoc & { _id: ObjectId }> {
  const collection = await getCollection();
  const now = new Date();
  const doc: InterviewSessionDoc = {
    userId: new ObjectId(input.userId),
    resumeText: input.resumeText,
    resumeFileName: input.resumeFileName,
    skills: input.skills,
    role: input.role,
    difficulty: input.difficulty,
    durationMinutes: input.durationMinutes,
    status: "in_progress",
    turns: [{ question: input.firstQuestion }],
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/** True once the session's allotted time has elapsed - used to force a
 * final evaluation even if the turn-count cap hasn't been hit yet. */
export function isInterviewTimeUp(doc: Pick<InterviewSessionDoc, "createdAt" | "durationMinutes">): boolean {
  const deadline = doc.createdAt.getTime() + doc.durationMinutes * 60_000;
  return Date.now() >= deadline;
}

/** Only ever returns a session belonging to the given user - callers
 * never need to separately check ownership. */
export async function getInterviewSession(
  sessionId: string,
  userId: string
): Promise<(InterviewSessionDoc & { _id: ObjectId }) | null> {
  const collection = await getCollection();
  const doc = await collection.findOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(userId),
  });
  return doc as (InterviewSessionDoc & { _id: ObjectId }) | null;
}

export async function appendQuestion(sessionId: string, question: string): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: new ObjectId(sessionId) },
    { $push: { turns: { question } }, $set: { updatedAt: new Date() } }
  );
}

export async function answerLastTurn(sessionId: string, answer: string): Promise<void> {
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: new ObjectId(sessionId) });
  if (!doc || doc.turns.length === 0) return;
  const lastIndex = doc.turns.length - 1;
  await collection.updateOne(
    { _id: new ObjectId(sessionId) },
    { $set: { [`turns.${lastIndex}.answer`]: answer, updatedAt: new Date() } }
  );
}

export async function completeInterviewSession(
  sessionId: string,
  feedback: InterviewFeedback
): Promise<void> {
  const collection = await getCollection();
  const now = new Date();
  await collection.updateOne(
    { _id: new ObjectId(sessionId) },
    { $set: { status: "completed", feedback, updatedAt: now, completedAt: now } }
  );
}

export async function listInterviewSessions(
  userId: string,
  limit = 20
): Promise<(InterviewSessionDoc & { _id: ObjectId })[]> {
  const collection = await getCollection();
  const docs = await collection
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs as (InterviewSessionDoc & { _id: ObjectId })[];
}

export interface CompletedInterviewSummary {
  role: string;
  skills: string[];
  difficulty: "easy" | "medium" | "hard";
  feedback: InterviewFeedback;
  completedAt: Date;
}

/** Every completed interview's feedback for a user, most recent first -
 * the raw material for the cumulative "what to study next" learning
 * plan (see lib/interview/insightsGenerator.ts). Only sessions that
 * actually finished with feedback are included. */
export async function getCompletedInterviewFeedbacks(
  userId: string,
  limit = 50
): Promise<CompletedInterviewSummary[]> {
  const collection = await getCollection();
  const docs = await collection
    .find({ userId: new ObjectId(userId), status: "completed", feedback: { $exists: true } })
    .sort({ completedAt: -1 })
    .limit(limit)
    .toArray();
  return docs
    .filter((d): d is InterviewSessionDoc & { feedback: InterviewFeedback } => Boolean(d.feedback))
    .map((d) => ({
      role: d.role,
      skills: d.skills,
      difficulty: d.difficulty,
      feedback: d.feedback,
      completedAt: d.completedAt ?? d.updatedAt,
    }));
}
