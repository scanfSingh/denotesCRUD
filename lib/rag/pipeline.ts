/**
 * Orchestrates a single chat turn: retrieve -> generate -> record
 * history. This is the one function the API route calls.
 */
import { retrieve } from "./vectorStore";
import { generateAnswer } from "./generator";
import { getHistory, appendTurn } from "./history";

export interface ChatSource {
  url: string;
  title: string;
  score: number;
}

export interface ChatResult {
  answer: string;
  sources: ChatSource[];
}

export async function chat(userId: string, sessionId: string, question: string): Promise<ChatResult> {
  const chunks = await retrieve(question);
  const history = await getHistory(userId, sessionId);

  let answer: string;
  if (chunks.length === 0) {
    answer =
      "I couldn't find anything relevant in the knowledge base yet. Try rephrasing your question, or check back once more content has been added.";
  } else {
    answer = await generateAnswer(question, chunks, history);
  }

  await appendTurn(userId, sessionId, question, answer);

  // Deduplicate sources by URL, keeping the best score per URL.
  const bestByUrl = new Map<string, ChatSource>();
  for (const c of chunks) {
    const existing = bestByUrl.get(c.sourceUrl);
    if (!existing || c.score > existing.score) {
      bestByUrl.set(c.sourceUrl, { url: c.sourceUrl, title: c.title, score: Math.round(c.score * 1000) / 1000 });
    }
  }

  return { answer, sources: Array.from(bestByUrl.values()) };
}
