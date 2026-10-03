/**
 * Persists each user's most recently uploaded resume so the mock
 * interview feature doesn't need to ask for it on every visit. One
 * document per user (_id == userId), upserted in place whenever they
 * upload a new file - there's no history of past resumes, just the
 * current one.
 */
import { ObjectId, type Collection } from "mongodb";
import client from "@/lib/mongodb";

const COLLECTION = "userResumes";

export interface UserResumeDoc {
  _id: ObjectId; // == userId
  resumeText: string;
  resumeFileName: string;
  updatedAt: Date;
}

async function getCollection(): Promise<Collection<UserResumeDoc>> {
  const mongoClient = await client.connect();
  return mongoClient.db().collection<UserResumeDoc>(COLLECTION);
}

export async function getUserResume(userId: string): Promise<UserResumeDoc | null> {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(userId) });
}

export async function saveUserResume(
  userId: string,
  input: { resumeText: string; resumeFileName: string }
): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        resumeText: input.resumeText,
        resumeFileName: input.resumeFileName,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}
