/**
 * Generation: call OpenAI with the retrieved context and produce a
 * grounded answer.
 */
import OpenAI from "openai";
import { ragConfig } from "./config";
import type { RetrievedChunk } from "./vectorStore";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are the help assistant embedded in denotes, a note-taking \
and knowledge management app. Answer the user's question using ONLY the \
context provided below, plus the recent conversation history for follow-up \
questions.

Rules:
- If the context does not contain enough information to answer, say so \
plainly instead of guessing.
- Be concise and direct. Use short paragraphs or bullet points where helpful.
- When you use a piece of context, you don't need to restate the URL inline \
- sources are shown separately to the user.
- Never invent facts, features, or URLs that aren't in the context.`;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!ragConfig.openai.apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    _client = new OpenAI({ apiKey: ragConfig.openai.apiKey });
  }
  return _client;
}

function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no relevant context found)";
  return chunks
    .map((c, i) => `[${i + 1}] Source: ${c.title} (${c.sourceUrl})\n${c.text}`)
    .join("\n\n");
}

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatMessage[] = []
): Promise<string> {
  const contextBlock = buildContextBlock(chunks);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: `Context:\n${contextBlock}\n\nQuestion: ${question}` },
  ];

  try {
    const completion = await getClient().chat.completions.create({
      model: ragConfig.openai.model,
      messages,
      temperature: ragConfig.openai.temperature,
    });
    return completion.choices[0]?.message?.content?.trim() || "I couldn't generate a response.";
  } catch (err) {
    console.error("[rag/generator] OpenAI generation failed:", err);
    throw new Error("Could not reach OpenAI to generate an answer. Check OPENAI_API_KEY and try again.");
  }
}
