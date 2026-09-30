/**
 * Central configuration for the mock interview feature.
 *
 * Reuses the same Gemini/Groq API keys and models as the RAG chat
 * feature (lib/rag/config.ts) - both features are just different
 * prompts over the same two providers, so there's no reason to ask
 * for (or manage) a second set of LLM env vars.
 */
import { ragConfig } from "@/lib/rag/config";

export const interviewConfig = {
  gemini: ragConfig.gemini,
  groq: ragConfig.groq,

  // How many question/answer turns before the interview wraps up on
  // its own if the candidate hasn't ended it early.
  maxTurns: Number(process.env.INTERVIEW_MAX_TURNS ?? "6"),

  // Largest resume file accepted, in bytes (5 MB).
  maxResumeBytes: Number(process.env.INTERVIEW_MAX_RESUME_BYTES ?? String(5 * 1024 * 1024)),
};

export function assertInterviewConfigured() {
  if (!interviewConfig.gemini.apiKey && !interviewConfig.groq.apiKey) {
    throw new Error(
      "Mock interview is missing required env vars: GEMINI_API_KEY (or GROQ_API_KEY)"
    );
  }
}
