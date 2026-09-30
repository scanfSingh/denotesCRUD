/**
 * Generation for the mock interview feature: given a candidate's
 * resume, chosen skills/role/difficulty, and the Q&A so far, ask the
 * LLM either for the next interview question or - once the interview
 * is done - a final written evaluation.
 *
 * Same Gemini-primary/Groq-fallback shape as lib/rag/generator.ts
 * (kept as a separate, self-contained module rather than shared code,
 * since the prompt/response contract here is completely different -
 * structured JSON turns, not a grounded chat answer).
 */
import OpenAI from "openai";
import { interviewConfig } from "./config";

export interface InterviewTurn {
  question: string;
  answer?: string;
}

export interface InterviewSessionInput {
  resumeText: string;
  skills: string[];
  role: string;
  difficulty: "easy" | "medium" | "hard";
  turns: InterviewTurn[];
}

export type InterviewResult =
  | { type: "question"; question: string }
  | {
      type: "feedback";
      summary: string;
      strengths: string[];
      improvements: string[];
      score: number;
    };

const SYSTEM_PROMPT = `You are an experienced technical interviewer conducting a mock \
interview. You are given a candidate's resume, their target role, the skills \
they want to be tested on, a difficulty level, and the interview transcript \
so far.

Respond with ONLY a single JSON object, no markdown fences, no extra text.

While the interview is still in progress, respond with:
{"type": "question", "question": "<your next interview question>"}

Ask exactly one question at a time. Base questions on the resume and chosen \
skills - mix behavioral and technical questions appropriate to the stated \
difficulty. Ask natural follow-ups when an answer is vague or you spot \
something worth digging into on the resume.

When told the interview is complete, respond instead with:
{"type": "feedback", "summary": "<2-3 sentence overall impression>", \
"strengths": ["<short point>", ...], "improvements": ["<short point>", ...], \
"score": <integer 1-10>}

Keep "strengths" and "improvements" to 2-4 short points each, grounded in \
what the candidate actually said - never invent claims they didn't make.`;

function buildUserPrompt(input: InterviewSessionInput, isFinal: boolean): string {
  const transcript = input.turns.length
    ? input.turns
        .map(
          (t, i) =>
            `Q${i + 1}: ${t.question}\n${t.answer ? `A${i + 1}: ${t.answer}` : "(no answer yet)"}`
        )
        .join("\n\n")
    : "(interview hasn't started yet)";

  return `Target role: ${input.role || "Software Engineer"}
Difficulty: ${input.difficulty}
Skills to focus on: ${input.skills.join(", ") || "(none specified - infer from resume)"}

Resume:
${input.resumeText}

Transcript so far:
${transcript}

${isFinal
    ? "The interview is now complete. Respond with the final feedback JSON object."
    : "Respond with the next question JSON object."}`;
}

function parseResult(raw: string): InterviewResult {
  // Models occasionally wrap JSON in ```json fences despite instructions -
  // strip those before parsing rather than failing outright.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    // Fall back to treating the raw text as a question so a slightly
    // malformed response doesn't just break the interview.
    return { type: "question", question: cleaned || "Can you tell me about a project you're proud of?" };
  }

  const obj = data as Record<string, unknown>;
  if (obj?.type === "feedback") {
    return {
      type: "feedback",
      summary: String(obj.summary || ""),
      strengths: Array.isArray(obj.strengths) ? obj.strengths.map(String) : [],
      improvements: Array.isArray(obj.improvements) ? obj.improvements.map(String) : [],
      score: Number(obj.score) || 0,
    };
  }
  return { type: "question", question: String(obj?.question || cleaned) };
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

export async function generateInterviewTurn(
  input: InterviewSessionInput,
  isFinal: boolean
): Promise<InterviewResult> {
  const userPrompt = buildUserPrompt(input, isFinal);

  if (interviewConfig.gemini.apiKey) {
    try {
      const raw = await generateWithGemini(userPrompt);
      if (raw) return parseResult(raw);
    } catch (err) {
      if (err instanceof GeminiQuotaError) {
        console.warn("[interview/generator] Gemini quota/rate-limit hit, falling back to Groq:", err.message);
      } else {
        console.error("[interview/generator] Gemini generation failed, falling back to Groq:", err);
      }
    }
  }

  if (interviewConfig.groq.apiKey) {
    try {
      const raw = await generateWithGroq(userPrompt);
      if (raw) return parseResult(raw);
      throw new Error("Empty response from Groq");
    } catch (err) {
      console.error("[interview/generator] Groq generation failed:", err);
      throw new Error(
        "Could not reach Gemini or Groq to continue the interview. Check GEMINI_API_KEY/GROQ_API_KEY and try again."
      );
    }
  }

  throw new Error("No generation provider configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.");
}
