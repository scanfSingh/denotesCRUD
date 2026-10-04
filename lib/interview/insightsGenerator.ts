/**
 * Generation for the cumulative "what to study next" learning plan:
 * given every one of a user's past mock interview feedbacks (strengths,
 * areas to improve, role/skills/difficulty context), ask the LLM to
 * find recurring themes and produce a prioritized list of topics to
 * focus on.
 *
 * Same Gemini-primary/Groq-fallback shape as lib/interview/generator.ts
 * - kept as its own self-contained module rather than shared code,
 * since the prompt/response contract here is different (one-shot
 * aggregate analysis, not a back-and-forth interview turn).
 */
import OpenAI from "openai";
import { interviewConfig } from "./config";
import type { CompletedInterviewSummary } from "./store";

export interface LearningTopic {
  topic: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface LearningInsights {
  overallSummary: string;
  topics: LearningTopic[];
}

const SYSTEM_PROMPT = `You are a career coach reviewing a candidate's past mock interview \
feedback. You'll be given several past interviews, each with the target role, skills focus, \
difficulty, score, strengths, and areas to improve.

Respond with ONLY a single JSON object, no markdown fences, no extra text:
{"overallSummary": "<2-3 sentence summary of overall progress and recurring patterns>", \
"topics": [{"topic": "<short topic/skill name>", "reason": "<1-2 sentences grounded in the \
feedback, citing what kept coming up>", "priority": "high" | "medium" | "low"}, ...]}

Merge similar or repeated themes into a single topic rather than listing near-duplicates. \
Order topics with "high" priority first. Return at most 8 topics. Only reference things the \
feedback actually said - never invent a weakness that wasn't mentioned.`;

function buildUserPrompt(sessions: CompletedInterviewSummary[]): string {
  const blocks = sessions.map((s, i) => {
    const skills = s.skills.join(", ") || "(none specified)";
    const strengths = s.feedback.strengths.join("; ") || "(none noted)";
    const improvements = s.feedback.improvements.join("; ") || "(none noted)";
    return `Interview ${i + 1} - Role: ${s.role} | Skills: ${skills} | Difficulty: ${s.difficulty} | Score: ${s.feedback.score}/10
Strengths: ${strengths}
Areas to improve: ${improvements}`;
  });

  return `Here are the candidate's past mock interviews, most recent first:

${blocks.join("\n\n")}

Respond with the JSON object described in your instructions.`;
}

function parseResult(raw: string): LearningInsights {
  // Models occasionally wrap JSON in ```json fences despite instructions -
  // strip those before parsing rather than failing outright.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return {
      overallSummary: cleaned || "Couldn't generate a summary this time - try again.",
      topics: [],
    };
  }

  const obj = data as Record<string, unknown>;
  const topics = Array.isArray(obj.topics)
    ? (obj.topics as Record<string, unknown>[])
        .map((t) => ({
          topic: String(t?.topic || "").trim(),
          reason: String(t?.reason || "").trim(),
          priority: (["high", "medium", "low"].includes(String(t?.priority))
            ? t.priority
            : "medium") as "high" | "medium" | "low",
        }))
        .filter((t) => t.topic)
    : [];

  return { overallSummary: String(obj.overallSummary || ""), topics };
}

class GeminiQuotaError extends Error {}

function isGeminiQuotaError(status: number, body: string): boolean {
  return status === 429 || body.includes("RESOURCE_EXHAUSTED");
}

async function generateWithGemini(userPrompt: string): Promise<string> {
  if (!interviewConfig.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${interviewConfig.gemini.model}:generateContent?key=${interviewConfig.gemini.apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: interviewConfig.gemini.temperature },
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
    if (!interviewConfig.groq.apiKey) {
      throw new Error("GROQ_API_KEY is not set.");
    }
    _groqClient = new OpenAI({ apiKey: interviewConfig.groq.apiKey, baseURL: interviewConfig.groq.baseUrl });
  }
  return _groqClient;
}

async function generateWithGroq(userPrompt: string): Promise<string> {
  const completion = await getGroqClient().chat.completions.create({
    model: interviewConfig.groq.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: interviewConfig.groq.temperature,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

export async function generateLearningInsights(
  sessions: CompletedInterviewSummary[]
): Promise<LearningInsights> {
  const userPrompt = buildUserPrompt(sessions);

  if (interviewConfig.gemini.apiKey) {
    try {
      const raw = await generateWithGemini(userPrompt);
      if (raw) return parseResult(raw);
    } catch (err) {
      if (err instanceof GeminiQuotaError) {
        console.warn("[interview/insightsGenerator] Gemini quota/rate-limit hit, falling back to Groq:", err.message);
      } else {
        console.error("[interview/insightsGenerator] Gemini generation failed, falling back to Groq:", err);
      }
    }
  }

  if (interviewConfig.groq.apiKey) {
    try {
      const raw = await generateWithGroq(userPrompt);
      if (raw) return parseResult(raw);
      throw new Error("Empty response from Groq");
    } catch (err) {
      console.error("[interview/insightsGenerator] Groq generation failed:", err);
      throw new Error(
        "Could not reach Gemini or Groq to generate your learning plan. Check GEMINI_API_KEY/GROQ_API_KEY and try again."
      );
    }
  }

  throw new Error("No generation provider configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.");
}
