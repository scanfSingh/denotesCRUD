"use client";

import { useEffect, useRef, useState } from "react";
import { useFeatureFlags } from "./FeatureFlagsProvider";
import { useRagChat } from "@/lib/useRagChat";

const SUGGESTIONS = [
  "What did I note recently?",
  "Summarize my open topics",
  "What have I written about this week?",
];

/** Distance from the bottom (px) within which we still treat the user
 * as "caught up" - new messages auto-scroll; beyond it, we leave the
 * view alone and show a "jump to latest" pill instead. */
const NEAR_BOTTOM_THRESHOLD = 48;

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatRelative(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 30) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

/**
 * The AI assistant's home-screen appearance: a large, always-visible
 * chat panel embedded directly in the page - the assistant "takes the
 * main stage" here, rather than being tucked away behind a floating
 * bubble. Every other screen uses the floating messenger widget
 * instead (see RagChatWidget) so it doesn't compete for space with
 * whatever that page is for.
 *
 * Shares its send/sync/reset logic with the widget via useRagChat(),
 * so the two surfaces behave identically.
 */
export default function RagChatMainStage() {
  const { ragChat } = useFeatureFlags();
  const {
    messages,
    input,
    setInput,
    loading,
    error,
    syncing,
    syncStatus,
    lastSyncedAt,
    sendMessage,
    retry,
    syncMyNotes,
    resetChat,
  } = useRagChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasUnseen, setHasUnseen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Front and center on the home page - worth focusing immediately so
  // typing a question doesn't need an extra click.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setHasUnseen(false);
    } else if (messages.length > 0) {
      setHasUnseen(true);
    }
  }, [messages, loading]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    setIsNearBottom(nearBottom);
    if (nearBottom) setHasUnseen(false);
  }

  function jumpToLatest() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setIsNearBottom(true);
    setHasUnseen(false);
  }

  async function copyMessage(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
    } catch {
      // Clipboard access can be blocked by browser settings - non-critical.
    }
  }

  if (!ragChat.enabled) return null;

  return (
    <section className="relative mb-8 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.03] to-transparent overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/15 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.17 0-2.29-.196-3.312-.552L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-600" title="Ready" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">denotes Assistant</p>
            <p className="text-xs text-purple-100">
              {lastSyncedAt ? `Notes synced ${formatRelative(lastSyncedAt)}` : "Ask about your notes, tasks & topics"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={syncMyNotes}
            disabled={syncing}
            title="Notes & topics sync automatically - tap to force a refresh now"
            className="rounded p-1.5 text-purple-100 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.5 9a7 7 0 0112.6-2.6M18.5 15a7 7 0 01-12.6 2.6" />
            </svg>
          </button>
          <button
            onClick={resetChat}
            disabled={messages.length === 0}
            title="Start a new conversation"
            className="rounded p-1.5 text-purple-100 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {(syncing || syncStatus) && (
        <div className="border-b border-white/[0.06] bg-purple-500/10 px-5 sm:px-6 py-1.5 text-xs text-purple-300">
          {syncing ? "Indexing your notes & topics…" : syncStatus}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-live="polite"
        className="max-h-[26rem] min-h-[14rem] space-y-4 overflow-y-auto px-5 sm:px-6 py-4"
      >
        {messages.length === 0 && (
          <div>
            <p className="text-base font-medium text-white mb-1">What can I help with?</p>
            <p className="text-sm text-slate-400 mb-3">
              Ask about denotes, or about your own notes and topics - they&apos;re kept in sync
              automatically as you save.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:bg-white/[0.1] hover:border-purple-500/30 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
              <div className="relative">
                <div
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-purple-600 text-white" : "bg-white/[0.06] text-slate-100"
                  }`}
                >
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 border-t border-white/10 pt-2 text-xs opacity-75">
                      {m.sources.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate underline"
                        >
                          {s.title || s.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === "assistant" && (
                  <button
                    onClick={() => copyMessage(m.id, m.content)}
                    title="Copy response"
                    className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-slate-500 hover:text-slate-300"
                  >
                    {copiedId === m.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <span className="mt-1 px-1 text-[11px] text-slate-500">{formatTime(m.timestamp)}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-3 py-2.5">
              <span className="sr-only">Assistant is typing</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-400">{error}</p>
            <button onClick={retry} className="text-xs font-medium text-purple-300 hover:text-purple-200 underline">
              Retry
            </button>
          </div>
        )}
      </div>

      {hasUnseen && (
        <button
          onClick={jumpToLatest}
          className="absolute bottom-16 right-5 sm:right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-medium shadow-lg hover:bg-purple-500 transition-colors"
        >
          New message
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="border-t border-white/[0.06] px-5 sm:px-6 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 shrink-0"
          >
            Send
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-slate-500">Press Enter to send</p>
      </form>
    </section>
  );
}
