/**
 * Persists each user's cumulative "what to study next" learning plan -
 * generated from all of their completed mock interview feedback (see
 * lib/interview/insightsGenerator.ts). One document per user (_id ==
 * userId), overwritten each time the plan is (re)generated - there's
 * no history of past plans, just the current one, mirroring the same
 * pattern as lib/interview/resumeStore.ts.
 */
import { ObjectId, type Collection } from "mongodb";
import client from "@/lib/mongodb";

const COLLECTION = "interviewInsights";

export interface LearningTopic {
  topic: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface UserInsightsDoc {
  _id: ObjectId; // == userId
  overallSummary: string;
  topics: LearningTopic[];
  basedOnSessionCount: number;
  generatedAt: Date;
}

async function getCollection(): Promise<Collection<UserInsightsDoc>> {
  const mongoClient = await client.connect();
  return mongoClient.db().collection<UserInsightsDoc>(COLLECTION);
}

export async function getUserInsights(userId: string): Promise<UserInsightsDoc | null> {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(userId) });
}

export async function saveUserInsights(
  userId: string,
  input: { overallSummary: string; topics: LearningTopic[]; basedOnSessionCount: number }
): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        overallSummary: input.overallSummary,
        topics: input.topics,
        basedOnSessionCount: input.basedOnSessionCount,
        generatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}
