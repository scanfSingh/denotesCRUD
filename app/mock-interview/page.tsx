"use client";

import { useEffect, useRef, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";
import { useFeatureFlags } from "../components/FeatureFlagsProvider";
import {
  submitInterviewAnswer,
  endInterviewEarly,
  getMyInterviewSessions,
  type InterviewSummary,
} from "../interview-actions";

interface ChatTurn {
  question: string;
  answer?: string;
}

interface Feedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  score: number;
}

type Phase = "setup" | "interview" | "feedback";

// Keep in sync with INTERVIEW_MAX_RESUME_BYTES / lib/interview/config.ts -
// checked here too so a bad file is caught before the upload round trip,
// not just with a generic error after the fact.
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function validateResumeFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".doc") && !name.endsWith(".docx")) {
    return "Legacy .doc files aren't supported - save as .docx or .pdf instead.";
  }
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Upload a PDF or Word (.docx) file.";
  }
  if (file.size > MAX_RESUME_BYTES) {
    return `That file is too large (max ${Math.round(MAX_RESUME_BYTES / 1024 / 1024)}MB).`;
  }
  return null;
}

export default function MockInterviewPage() {
  const { interview } = useFeatureFlags();
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup form
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [starting, setStarting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<InterviewSummary[]>([]);

  // Interview
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  // Feedback
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getMyInterviewSessions().then(setPastSessions).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, submitting]);

  useEffect(() => {
    if (phase === "interview") answerRef.current?.focus();
  }, [phase, turns.length]);

  if (!interview.enabled) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
          <p className="text-slate-400">Mock interview isn't enabled on this deployment.</p>
        </div>
      </ProtectedRoute>
    );
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setSetupError(null);
    if (!resumeFile) {
      setSetupError("Upload your resume (PDF or DOCX) to get started");
      return;
    }
    const fileError = validateResumeFile(resumeFile);
    if (fileError) {
      setSetupError(fileError);
      return;
    }

    setStarting(true);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("skills", skills);
      formData.append("role", role || "Software Engineer");
      formData.append("difficulty", difficulty);

      const res = await fetch("/api/interview/start", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start the interview");

      setSessionId(data.sessionId);
      setTurns([{ question: data.question }]);
      setPhase("interview");
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Failed to start the interview");
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || submitting) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setInterviewError("Enter an answer first");
      return;
    }

    setInterviewError(null);
    setSubmitting(true);
    setTurns((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], answer: trimmed };
      return next;
    });
    setAnswer("");

    try {
      const result = await submitInterviewAnswer(sessionId, trimmed);
      if (!result.success) {
        setInterviewError(result.error);
        return;
      }
      if (result.done) {
        setFeedback(result.feedback);
        setPhase("feedback");
      } else {
        setTurns((prev) => [...prev, { question: result.question }]);
      }
    } catch (err) {
      setInterviewError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEndEarly() {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      const result = await endInterviewEarly(sessionId);
      if (result.success) {
        setFeedback(result.feedback);
        setPhase("feedback");
      } else {
        setInterviewError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetToSetup() {
    setPhase("setup");
    setSessionId(null);
    setTurns([]);
    setFeedback(null);
    setInterviewError(null);
    setResumeFile(null);
    getMyInterviewSessions().then(setPastSessions).catch(() => {});
  }

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <p className="text-purple-300 font-medium text-xs uppercase tracking-wider mb-2">Mock interview</p>
            <h1 className="text-2xl font-bold text-white">Practice with an AI interviewer</h1>
            <p className="text-sm text-slate-400 mt-1">
              Upload your resume, pick the skills you want to be tested on, and get asked real
              interview questions with feedback at the end.
            </p>
          </div>

          {phase === "setup" && (
            <>
              <form
                onSubmit={handleStart}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] via-white/[0.03] to-transparent p-6 space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Resume (PDF or DOCX)</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        const fileError = validateResumeFile(file);
                        if (fileError) {
                          setSetupError(fileError);
                          setResumeFile(null);
                          e.target.value = "";
                          return;
                        }
                      }
                      setSetupError(null);
                      setResumeFile(file);
                    }}
                    className="block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:text-sm file:font-medium hover:file:bg-purple-500 file:cursor-pointer cursor-pointer rounded-lg border border-white/[0.1] bg-white/[0.04]"
                  />
                  {resumeFile && <p className="mt-1.5 text-xs text-slate-500">{resumeFile.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Target role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Backend Engineer"
                    className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Skills to focus on</label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Node.js, MongoDB, system design"
                    className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Comma-separated. Leave blank to let it infer from your resume.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Difficulty</label>
                  <div className="flex gap-2">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                          difficulty === d
                            ? "bg-purple-600 text-white"
                            : "bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.06]"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {setupError && <p className="text-xs text-red-400">{setupError}</p>}

                <button
                  type="submit"
                  disabled={starting}
                  className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {starting ? "Starting…" : "Start interview"}
                </button>
              </form>

              {pastSessions.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Past interviews</p>
                  <div className="flex flex-col gap-2">
                    {pastSessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08]"
                      >
                        <div>
                          <p className="text-sm text-white">{s.role}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {s.difficulty} · {new Date(s.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {s.status === "completed" && typeof s.score === "number" ? (
                          <span className="text-sm font-bold text-purple-300 tabular-nums">{s.score}/10</span>
                        ) : (
                          <span className="text-xs text-slate-500">In progress</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {phase === "interview" && (
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.03] to-transparent overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                <p className="text-sm font-semibold text-white">Question {turns.length}</p>
                <button
                  onClick={handleEndEarly}
                  disabled={submitting}
                  className="text-xs font-medium text-purple-100 hover:text-white disabled:opacity-50"
                >
                  End interview
                </button>
              </div>

              <div ref={scrollRef} className="max-h-[28rem] min-h-[16rem] space-y-4 overflow-y-auto px-5 py-4">
                {turns.map((t, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-slate-100">
                        {t.question}
                      </div>
                    </div>
                    {t.answer && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-lg bg-purple-600 px-3 py-2 text-sm text-white whitespace-pre-wrap">
                          {t.answer}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {submitting && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-3 py-2.5">
                      <span className="sr-only">Interviewer is typing</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    </div>
                  </div>
                )}
                {interviewError && <p className="text-xs text-red-400">{interviewError}</p>}
              </div>

              <form onSubmit={handleSubmitAnswer} className="border-t border-white/[0.06] px-5 py-3 space-y-2">
                <textarea
                  ref={answerRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  disabled={submitting}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !answer.trim()}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    Submit answer
                  </button>
                </div>
              </form>
            </div>
          )}

          {phase === "feedback" && feedback && (
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.03] to-transparent p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Interview feedback</p>
                <span className="text-2xl font-bold text-purple-300 tabular-nums">{feedback.score}/10</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed mb-6">{feedback.summary}</p>

              {feedback.strengths.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">Strengths</p>
                  <ul className="space-y-1.5">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2">
                        <span className="text-emerald-400">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.improvements.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">Room to improve</p>
                  <ul className="space-y-1.5">
                    {feedback.improvements.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2">
                        <span className="text-amber-400">-</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={resetToSetup}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
              >
                Start another interview
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
