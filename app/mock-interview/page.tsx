"use client";

import { useEffect, useRef, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";
import AudioRecorder from "../components/AudioRecorder";
import InterviewVideoPanel from "./InterviewVideoPanel";
import * as tts from "@/lib/interview/tts";
import { useInterviewMedia } from "@/lib/interview/useInterviewMedia";
import { useInterviewerVoice } from "@/lib/interview/useInterviewerVoice";
import { useFeatureFlags } from "../components/FeatureFlagsProvider";
import {
  submitInterviewAnswer,
  endInterviewEarly,
  getMyInterviewSessions,
  getMyInterviewDetail,
  getLearningInsights,
  generateMyLearningInsights,
  type InterviewSummary,
  type InterviewDetail,
  type LearningInsightsSummary,
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

type Phase = "setup" | "interview" | "feedback" | "detail";
type Duration = 30 | 60 | 90;

const DIFFICULTY_DESCRIPTIONS = {
  easy: "Fundamentals and warm-up questions",
  medium: "Practical, role-level questions",
  hard: "Deep dives and system design",
} as const;

const DURATION_DESCRIPTIONS = {
  30: "Quick practice session",
  60: "Standard session",
  90: "Extended deep-dive session",
} as const;

function FeedbackBody({ feedback }: { feedback: Feedback }) {
  return (
    <>
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
    </>
  );
}

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

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
  const [duration, setDuration] = useState<Duration>(30);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [starting, setStarting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastError, setPastError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [pastSessions, setPastSessions] = useState<InterviewSummary[]>([]);
  // The resume saved from a previous visit, if any - lets the setup
  // screen skip asking for an upload every time. "Replace" swaps this
  // out for a fresh upload, which also updates what's saved for next time.
  const [storedResume, setStoredResume] = useState<{ fileName: string; updatedAt: string } | null>(null);
  const [showResumeInput, setShowResumeInput] = useState(false);

  // Cumulative "what to study next" plan, built from every completed
  // interview's feedback. Cached in Mongo (not recomputed on every
  // load) and refreshed only when the user asks.
  const [insights, setInsights] = useState<LearningInsightsSummary | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Interview
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The answer currently being sent. Rendered as a chat bubble but only
  // merged into `turns` once the server accepts it, so a failure needs
  // no rollback and the textarea keeps the typed text.
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  // "speak" shows the microphone recorder above the textarea - the
  // transcript still lands in the same editable textarea rather than
  // auto-submitting, so a misheard word can be fixed before sending.
  const [answerMode, setAnswerMode] = useState<"type" | "speak">("type");
  // Epoch ms when the chosen duration runs out - set from the server's
  // own startedAt + durationMinutes so the countdown matches what the
  // backend actually enforces, not just a client-side guess.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const autoEndedRef = useRef(false);
  // Always points at the latest handleEnd so the timer effect never calls a stale closure.
  const endRef = useRef<(auto: boolean) => void>(() => {});

  // Feedback
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getMyInterviewSessions()
      .then(setPastSessions)
      .catch(() => {})
      .finally(() => setPastLoaded(true));
  }, []);

  useEffect(() => {
    getLearningInsights().then(setInsights).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/interview/resume")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.resumeFileName) {
          setStoredResume({ fileName: data.resumeFileName, updatedAt: data.updatedAt });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, submitting]);

  useEffect(() => {
    if (phase === "interview") answerRef.current?.focus();
  }, [phase, turns.length]);

  // Countdown ticks every second while the interview is live, and
  // auto-ends it the moment time runs out - the server enforces the
  // same deadline independently (see isInterviewTimeUp), this is just
  // what drives the on-screen timer and saves the candidate a click.
  useEffect(() => {
    if (phase !== "interview" || deadline === null) return;

    const tick = () => {
      const secondsLeft = Math.round((deadline - Date.now()) / 1000);
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0 && !autoEndedRef.current) {
        autoEndedRef.current = true;
        endRef.current(true);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [phase, deadline]);

  // Level 1 video interview (camera self-view + spoken questions). Hooks
  // are always called, but do nothing unless the flag is on.
  const videoOn = Boolean(interview.video);
  const media = useInterviewMedia(videoOn && phase === "interview");
  const voice = useInterviewerVoice();
  const { speakQuestion, cancel: cancelVoice } = voice;
  const latestQuestion = turns.length > 0 ? turns[turns.length - 1].question : "";

  // Speak each new question (first + follow-ups) unless muted.
  useEffect(() => {
    if (!videoOn || phase !== "interview" || !latestQuestion) return;
    speakQuestion(latestQuestion);
    // Keyed on the question count so re-renders never re-speak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoOn, phase, turns.length]);

  // Silence the interviewer once the interview is over / left.
  useEffect(() => {
    if (videoOn && phase !== "interview") cancelVoice();
  }, [videoOn, phase, cancelVoice]);

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
    setResumeError(null);
    setNotice(null);
    setTimeUp(false);
    if (!resumeFile && !storedResume) {
      setResumeError("Upload your resume (PDF or DOCX) to get started");
      return;
    }
    if (resumeFile) {
      const fileError = validateResumeFile(resumeFile);
      if (fileError) {
        setResumeError(fileError);
        return;
      }
    }

    // Must run synchronously inside the click handler (before any await)
    // so the browser allows audio playback for the first question.
    if (videoOn) tts.prime();

    setStarting(true);
    try {
      const formData = new FormData();
      // Omitted when reusing the resume already on file - the server
      // falls back to that saved copy.
      if (resumeFile) formData.append("resume", resumeFile);
      formData.append("skills", skills);
      formData.append("role", role || "Software Engineer");
      formData.append("difficulty", difficulty);
      formData.append("duration", String(duration));

      const res = await fetch("/api/interview/start", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start the interview");

      setSessionId(data.sessionId);
      setTurns([{ question: data.question }]);
      autoEndedRef.current = false;
      setDeadline(new Date(data.startedAt).getTime() + data.durationMinutes * 60_000);
      if (data.resumeFileName) {
        setStoredResume({ fileName: data.resumeFileName, updatedAt: new Date().toISOString() });
      }
      setShowResumeInput(false);
      setResumeFile(null);
      setPhase("interview");
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Failed to start the interview");
    } finally {
      setStarting(false);
    }
  }

  async function submitAnswer() {
    if (!sessionId || submitting) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setInterviewError("Enter an answer first");
      return;
    }

    setInterviewError(null);
    setSubmitting(true);
    setPendingAnswer(trimmed);
    if (videoOn) cancelVoice();

    try {
      const result = await submitInterviewAnswer(sessionId, trimmed);
      if (!result.success) {
        setInterviewError(result.error);
        return;
      }
      setAnswer("");
      if (result.done) {
        setFeedback(result.feedback);
        setPhase("feedback");
      } else {
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], answer: trimmed };
          return [...next, { question: result.question }];
        });
      }
    } catch (err) {
      setInterviewError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingAnswer(null);
      setSubmitting(false);
    }
  }

  function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    void submitAnswer();
  }

  function handleAnswerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submitAnswer();
    }
  }

  // `auto` is true when the countdown hit zero: that path skips the
  // confirmation panel and shows a "Time's up" notice afterwards.
  async function handleEnd(auto: boolean) {
    if (!sessionId) return;
    if (!auto && submitting) return;
    setShowEndConfirm(false);
    setInterviewError(null);
    setSubmitting(true);
    if (videoOn) cancelVoice();
    try {
      const result = await endInterviewEarly(sessionId);
      if (!result.success) {
        setInterviewError(result.error);
        return;
      }
      if (result.noAnswers) {
        resetToSetup();
        setNotice("The interview ended without any answers, so no score or feedback was saved.");
        setTimeUp(auto);
        return;
      }
      setFeedback(result.feedback);
      setTimeUp(auto);
      setPhase("feedback");
    } catch (err) {
      setInterviewError(err instanceof Error ? err.message : "Failed to end the interview");
    } finally {
      setSubmitting(false);
    }
  }
  endRef.current = handleEnd;

  async function openDetail(id: string) {
    setPastError(null);
    try {
      const result = await getMyInterviewDetail(id);
      if (!result) {
        setPastError("Couldn't load that interview.");
        return;
      }
      setDetail(result);
      setPhase("detail");
    } catch {
      setPastError("Couldn't load that interview.");
    }
  }

  async function handleGenerateInsights() {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const result = await generateMyLearningInsights();
      if (!result.success) {
        setInsightsError(result.error);
        return;
      }
      setInsights(result.insights);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to generate your learning plan");
    } finally {
      setInsightsLoading(false);
    }
  }

  function resetToSetup() {
    setPhase("setup");
    setSessionId(null);
    setTurns([]);
    setFeedback(null);
    setDetail(null);
    setPendingAnswer(null);
    setShowEndConfirm(false);
    setSubmitting(false);
    setNotice(null);
    setTimeUp(false);
    setSetupError(null);
    setResumeError(null);
    setPastError(null);
    setAnswer("");
    setInterviewError(null);
    setResumeFile(null);
    setShowResumeInput(false);
    setDeadline(null);
    setRemainingSeconds(null);
    autoEndedRef.current = false;
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
              {(timeUp || notice) && (
                <div role="status" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {timeUp && <p className="font-medium">Time&apos;s up</p>}
                  {notice && <p>{notice}</p>}
                </div>
              )}

              <form
                onSubmit={handleStart}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] via-white/[0.03] to-transparent p-6 space-y-5"
              >
                <div>
                  <label htmlFor="resume-input" className="block text-sm font-medium text-white mb-1.5">Resume (PDF or DOCX)</label>
                  {storedResume && !showResumeInput ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{storedResume.fileName}</p>
                        <p className="text-xs text-slate-500">
                          On file · updated {new Date(storedResume.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowResumeInput(true)}
                        className="shrink-0 text-xs font-medium text-purple-300 hover:text-purple-200"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="resume-input"
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            const fileError = validateResumeFile(file);
                            if (fileError) {
                              setResumeError(fileError);
                              setResumeFile(null);
                              e.target.value = "";
                              return;
                            }
                          }
                          setResumeError(null);
                          setResumeFile(file);
                        }}
                        className="block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:text-sm file:font-medium hover:file:bg-purple-500 file:cursor-pointer cursor-pointer rounded-lg border border-white/[0.1] bg-white/[0.04]"
                      />
                      {resumeFile && <p className="mt-1.5 text-xs text-slate-500">{resumeFile.name}</p>}
                      {storedResume && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowResumeInput(false);
                            setResumeFile(null);
                            setResumeError(null);
                          }}
                          className="mt-1.5 text-xs font-medium text-slate-400 hover:text-slate-300"
                        >
                          Keep current resume ({storedResume.fileName})
                        </button>
                      )}
                    </>
                  )}
                  {resumeError && (
                    <p role="alert" className="mt-1.5 text-xs text-red-400">
                      {resumeError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="role-input" className="block text-sm font-medium text-white mb-1.5">Target role</label>
                  <input
                    id="role-input"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Backend Engineer"
                    className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="skills-input" className="block text-sm font-medium text-white mb-1.5">Skills to focus on</label>
                  <input
                    id="skills-input"
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Node.js, MongoDB, system design"
                    className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Comma-separated. Leave blank to let it infer from your resume.</p>
                </div>

                <div role="group" aria-labelledby="difficulty-label">
                  <p id="difficulty-label" className="block text-sm font-medium text-white mb-1.5">Difficulty</p>
                  <div className="flex gap-2">
                    {(["easy", "medium", "hard"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={difficulty === d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                          difficulty === d
                            ? "bg-purple-600 text-white"
                            : "bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="block capitalize">{d}</span>
                        <span className="block text-[11px] font-normal opacity-80">{DIFFICULTY_DESCRIPTIONS[d]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div role="group" aria-labelledby="duration-label">
                  <p id="duration-label" className="block text-sm font-medium text-white mb-1.5">Duration</p>
                  <div className="flex gap-2">
                    {([30, 60, 90] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={duration === d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                          duration === d
                            ? "bg-purple-600 text-white"
                            : "bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="block">{d} min</span>
                        <span className="block text-[11px] font-normal opacity-80">{DURATION_DESCRIPTIONS[d]}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    The interview wraps up automatically and gives you feedback once time is up.
                  </p>
                </div>

                {setupError && <p className="text-xs text-red-400">{setupError}</p>}

                {starting && (
                  <p role="status" className="text-xs text-purple-300">
                    Analysing your resume and preparing your first question…
                  </p>
                )}

                <button
                  type="submit"
                  disabled={starting}
                  className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {starting ? "Analysing your resume…" : "Start interview"}
                </button>
              </form>

              {pastLoaded && pastSessions.length === 0 && (
                <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <p className="text-sm font-medium text-white mb-1">Your first mock interview</p>
                  <p className="text-sm text-slate-400">
                    Upload your resume and the AI interviewer asks questions tailored to it, one at a
                    time, within the time you choose. When it wraps up you get a score, strengths, and
                    areas to improve, and you can reopen it here later.
                  </p>
                </div>
              )}

              {pastSessions.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Past interviews</p>
                  {pastError && (
                    <p role="alert" className="mb-2 text-xs text-red-400">
                      {pastError}
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    {pastSessions.map((s) => {
                      const rowClass =
                        "flex w-full items-center justify-between px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-left";
                      const info = (
                        <div>
                          <p className="text-sm text-white">{s.role}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {s.difficulty} · {s.durationMinutes} min · {new Date(s.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      );
                      if (s.status === "completed" && typeof s.score === "number" && !s.endedWithoutAnswers) {
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => openDetail(s.id)}
                            className={`${rowClass} hover:bg-white/[0.07] focus:outline-none focus:border-purple-500`}
                          >
                            {info}
                            <span className="text-sm font-bold text-purple-300 tabular-nums">{s.score}/10</span>
                          </button>
                        );
                      }
                      return (
                        <div key={s.id} className={rowClass}>
                          {info}
                          <span className="text-xs text-slate-500">
                            {s.endedWithoutAnswers
                              ? "Ended - no answers"
                              : s.status === "completed"
                              ? "Completed"
                              : "In progress"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(insights || pastSessions.some((s) => s.status === "completed")) && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Your learning plan</p>
                    <button
                      type="button"
                      onClick={handleGenerateInsights}
                      disabled={insightsLoading}
                      className="text-xs font-medium text-purple-300 hover:text-purple-200 disabled:opacity-50"
                    >
                      {insightsLoading ? "Analyzing…" : insights ? "Refresh" : "Generate"}
                    </button>
                  </div>

                  {insightsError && <p className="mb-2 text-xs text-red-400">{insightsError}</p>}

                  {insights ? (
                    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] via-white/[0.03] to-transparent p-5">
                      <p className="text-sm text-slate-200 leading-relaxed mb-4">{insights.overallSummary}</p>
                      <div className="space-y-2.5">
                        {insights.topics.map((t, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2.5"
                          >
                            <span
                              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                t.priority === "high"
                                  ? "bg-red-500/20 text-red-300"
                                  : t.priority === "medium"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-slate-500/20 text-slate-300"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">{t.topic}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{t.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        Based on {insights.basedOnSessionCount} interview{insights.basedOnSessionCount === 1 ? "" : "s"} · updated{" "}
                        {new Date(insights.generatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center">
                      <p className="text-sm text-slate-400">
                        See a cumulative view of the topics you keep needing to work on, based on all your
                        past interview feedback.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {phase === "interview" && (
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.03] to-transparent overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-white">Question {turns.length}</p>
                  {remainingSeconds !== null && (
                    <span
                      role="timer"
                      aria-label="Time remaining"
                      className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded-full ${
                        remainingSeconds <= 60
                          ? "bg-red-500/90 text-white animate-pulse"
                          : "bg-black/20 text-purple-100"
                      }`}
                    >
                      {formatCountdown(remainingSeconds)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(true)}
                  disabled={submitting}
                  className="text-xs font-medium text-purple-100 hover:text-white disabled:opacity-50"
                >
                  End interview
                </button>
              </div>

              {showEndConfirm && (
                <div
                  role="alertdialog"
                  aria-labelledby="end-confirm-title"
                  aria-describedby="end-confirm-desc"
                  className="border-b border-white/[0.06] bg-amber-500/10 px-5 py-3"
                >
                  <p id="end-confirm-title" className="text-sm font-medium text-white">End this interview?</p>
                  <p id="end-confirm-desc" className="text-xs text-slate-300 mt-0.5">
                    You will get feedback on the questions you have answered so far. If you have not
                    answered any, nothing is saved.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEndConfirm(false)}
                      className="rounded-lg border border-white/[0.15] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEnd(false)}
                      disabled={submitting}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                    >
                      End interview
                    </button>
                  </div>
                </div>
              )}

              {videoOn && (
                <InterviewVideoPanel
                  stream={media.stream}
                  cameraStatus={media.status}
                  cameraOn={media.cameraOn}
                  onToggleCamera={media.toggleCamera}
                  voiceState={voice.state}
                  muted={voice.muted}
                  onToggleMute={() => voice.setMuted(!voice.muted)}
                  onReplay={voice.replay}
                  voiceSupported={voice.isSupported()}
                />
              )}

              <div
                ref={scrollRef}
                role="log"
                aria-live="polite"
                aria-label="Interview conversation"
                className="max-h-[28rem] min-h-[16rem] space-y-4 overflow-y-auto px-5 py-4"
              >
                {turns.map((t, i) => {
                  const shownAnswer = t.answer ?? (i === turns.length - 1 ? pendingAnswer ?? undefined : undefined);
                  return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-slate-100">
                        {t.question}
                      </div>
                    </div>
                    {shownAnswer && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-lg bg-purple-600 px-3 py-2 text-sm text-white whitespace-pre-wrap">
                          {shownAnswer}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
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

              <form onSubmit={handleSubmitAnswer} className="border-t border-white/[0.06] px-5 py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={answerMode === "type"}
                    onClick={() => setAnswerMode("type")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      answerMode === "type"
                        ? "bg-purple-600 text-white"
                        : "bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.06]"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M15 12h.01M17 20H7a2 2 0 01-2-2V8a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2z" />
                    </svg>
                    Type
                  </button>
                  <button
                    type="button"
                    aria-pressed={answerMode === "speak"}
                    onClick={() => setAnswerMode("speak")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      answerMode === "speak"
                        ? "bg-purple-600 text-white"
                        : "bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.06]"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0M12 18v3m-4 0h8M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    </svg>
                    Speak
                  </button>
                </div>

                {answerMode === "speak" && (
                  <AudioRecorder
                    showLivePreview
                    disabled={voice.state === "speaking"}
                    onTranscriptionComplete={(transcription) =>
                      setAnswer((prev) => (prev ? `${prev} ${transcription}` : transcription))
                    }
                    onError={(err) => setInterviewError(err)}
                  />
                )}

                <textarea
                  ref={answerRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleAnswerKeyDown}
                  aria-label="Your answer"
                  placeholder={answerMode === "speak" ? "Your transcribed answer will appear here - edit if needed..." : "Type your answer..."}
                  disabled={submitting}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Ctrl/Cmd + Enter to send</span>
                  <button
                    type="submit"
                    disabled={submitting || !answer.trim()}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                  >
                    Submit answer
                  </button>
                </div>
              </form>
            </div>
          )}

          {phase === "feedback" && feedback && (
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.03] to-transparent p-6">
              {timeUp && (
                <div role="status" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
                  Time&apos;s up
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Interview feedback</p>
                <span className="text-2xl font-bold text-purple-300 tabular-nums">{feedback.score}/10</span>
              </div>
              <FeedbackBody feedback={feedback} />

              {insightsError && <p className="mb-2 text-xs text-red-400">{insightsError}</p>}

              <button
                onClick={handleGenerateInsights}
                disabled={insightsLoading}
                className="w-full py-2.5 mb-3 rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {insightsLoading ? "Updating your learning plan…" : "Update my learning plan"}
              </button>

              <button
                onClick={resetToSetup}
                className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
              >
                Start another interview
              </button>
            </div>
          )}

          {phase === "detail" && detail && (
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.03] to-transparent p-6">
              <button
                type="button"
                onClick={resetToSetup}
                className="mb-4 text-xs font-medium text-purple-300 hover:text-purple-200"
              >
                Back
              </button>
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{detail.role}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {detail.difficulty} · {detail.durationMinutes} min · {new Date(detail.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-2xl font-bold text-purple-300 tabular-nums">{detail.feedback.score}/10</span>
              </div>
              <FeedbackBody feedback={detail.feedback} />

              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Transcript</p>
              <div className="space-y-4">
                {detail.turns.map((t, i) => (
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
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
