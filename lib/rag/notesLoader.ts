/**
 * Loads a single user's own notes and topics from MongoDB and turns
 * them into RagDocument objects - the personal-content counterpart to
 * lib/rag/loader.ts (which fetches public URLs instead).
 *
 * These are the same "notes" and "topics" collections used by
 * app/actions.ts (createNote/getNotes/createTopic/getTopics etc.) - we
 * just read them directly here rather than going through those
 * actions, since this runs server-side already and needs the raw
 * content (HTML) rather than the serialized shape the UI expects.
 */
import { ObjectId } from "mongodb";
import client from "@/lib/mongodb";
import { htmlToPlainText } from "./loader";
import type { RagDocument } from "./loader";

const MIN_TEXT_LENGTH = 20; // skip near-empty notes/topics, not worth indexing

export async function loadUserContent(userId: string): Promise<RagDocument[]> {
  const mongoClient = await client.connect();
  const db = mongoClient.db();
  const ownerId = new ObjectId(userId);

  const [notes, topics] = await Promise.all([
    db.collection("notes").find({ userId: ownerId }).toArray(),
    db.collection("topics").find({ userId: ownerId }).toArray(),
  ]);

  const docs: RagDocument[] = [];

  for (const note of notes) {
    const body = htmlToPlainText(note.content || "");
    const text = [note.summary, body].filter(Boolean).join("\n\n").trim();
    if (text.length < MIN_TEXT_LENGTH) continue;

    docs.push({
      url: `/audio-notes?noteId=${note._id.toString()}`,
      title: note.title || "Untitled note",
      text,
    });
  }

  for (const topic of topics) {
    const text = (topic.description || "").trim();
    if (text.length < MIN_TEXT_LENGTH) continue;

    docs.push({
      url: `/topics?topicId=${topic._id.toString()}`,
      title: topic.title || "Untitled topic",
      text,
    });
  }

  return docs;
}
