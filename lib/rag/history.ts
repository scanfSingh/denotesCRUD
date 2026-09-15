/**
 * Per-user, per-session chat history, persisted in MongoDB.
 *
 * Vercel serverless functions are stateless between invocations (and
 * may run on different instances concurrently), so an in-memory Map
 * won't reliably keep multi-turn context. Mongo is already part of
 * this app's stack, so we reuse it here instead of adding new infra.
 */
import type { Collection } from "mongodb";
import client from "@/lib/mongodb";
import { ragConfig } from "./config";
import type { ChatMessage } from "./generator";

const COLLECTION = "rag_chat_sessions";

interface RagSessionDoc {
  _id: string;
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  updatedAt: Date;
}

// Scope the document ID by user so one user can never read or reset
// another user's session just by guessing/sending a sessionId.
function docId(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

async function getCollection(): Promise<Collection<RagSessionDoc>> {
  const mongoClient = await client.connect();
  return mongoClient.db().collection<RagSessionDoc>(COLLECTION);
}

export async function getHistory(userId: string, sessionId: string): Promise<ChatMessage[]> {
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: docId(userId, sessionId) });
  return doc?.messages || [];
}

export async function appendTurn(
  userId: string,
  sessionId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  const collection = await getCollection();

  const history = await getHistory(userId, sessionId);
  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: assistantMessage });

  const maxMessages = ragConfig.maxHistoryTurns * 2;
  const trimmed = history.length > maxMessages ? history.slice(history.length - maxMessages) : history;

  await collection.updateOne(
    { _id: docId(userId, sessionId) },
    { $set: { userId, sessionId, messages: trimmed, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function clearSession(userId: string, sessionId: string): Promise<void> {
  const collection = await getCollection();
  await collection.deleteOne({ _id: docId(userId, sessionId) });
}
