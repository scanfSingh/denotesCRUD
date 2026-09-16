/**
 * Generation: call Gemini with the retrieved context and produce a
 * grounded answer.
 *
 * Gemini is primary because it has a usable free tier. Once that free
 * tier is exhausted (or on any Gemini quota/rate-limit error), we
 * automatically fall back to Groq so the chat keeps working without
 * manual intervention. Groq exposes an OpenAI-compatible endpoint, so
 * the fallback path reuses the `openai` SDK pointed at Groq's base URL.
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

function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no relevant context found)";
  return chunks
    .map((c, i) => `[${i + 1}] Source: ${c.title} (${c.sourceUrl})\n${c.text}`)
    .join("\n\n");
}

/** Thrown when Gemini responds with a quota/rate-limit error, so the
 * caller knows to fall back to Groq rather than surface an error. */
class GeminiQuotaError extends Error {}

function isGeminiQuotaError(status: number, body: string): boolean {
  return status === 429 || body.includes("RESOURCE_EXHAUSTED");
}

async function generateWithGemini(
  question: string,
  contextBlock: string,
  history: ChatMessage[]
): Promise<string> {
  if (!ragConfig.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  // Gemini uses "model" instead of "assistant" for the AI turn.
  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: `Context:\n${contextBlock}\n\nQuestion: ${question}` }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ragConfig.gemini.model}:generateContent?key=${ragConfig.gemini.apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: ragConfig.gemini.temperature },
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    if (isGeminiQuotaError(res.status, bodyText)) {
      throw new GeminiQuotaError(bodyText.slice(0, 300));
    }
    throw new Error(`Gemini request failed (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const data = JSON.parse(bodyText);
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
  return text.trim();
}

let _groqClient: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (!_groqClient) {
    if (!ragConfig.groq.apiKey) {
      throw new Error("GROQ_API_KEY is not set.");
    }
    _groqClient = new OpenAI({ apiKey: ragConfig.groq.apiKey, baseURL: ragConfig.groq.baseUrl });
  }
  return _groqClient;
}

async function generateWithGroq(
  question: string,
  contextBlock: string,
  history: ChatMessage[]
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: `Context:\n${contextBlock}\n\nQuestion: ${question}` },
  ];

  const completion = await getGroqClient().chat.completions.create({
    model: ragConfig.groq.model,
    messages,
    temperature: ragConfig.groq.temperature,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatMessage[] = []
): Promise<string> {
  const contextBlock = buildContextBlock(chunks);

  if (ragConfig.gemini.apiKey) {
    try {
      const answer = await generateWithGemini(question, contextBlock, history);
      if (answer) return answer;
    } catch (err) {
      if (err instanceof GeminiQuotaError) {
        console.warn("[rag/generator] Gemini quota/rate-limit hit, falling back to Groq:", err.message);
      } else {
        console.error("[rag/generator] Gemini generation failed, falling back to Groq:", err);
      }
    }
  }

  if (ragConfig.groq.apiKey) {
    try {
      const answer = await generateWithGroq(question, contextBlock, history);
      return answer || "I couldn't generate a response.";
    } catch (err) {
      console.error("[rag/generator] Groq generation failed:", err);
      throw new Error(
        "Could not reach Gemini or Groq to generate an answer. Check GEMINI_API_KEY/GROQ_API_KEY and try again."
      );
    }
  }

  throw new Error("No generation provider configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.");
}
