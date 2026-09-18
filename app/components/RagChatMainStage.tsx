"use client";

import { useEffect, useRef } from "react";
import { useFeatureFlags } from "./FeatureFlagsProvider";
import { useRagChat } from "@/lib/useRagChat";

const SUGGESTIONS = [
  "What did I note recently?",
  "Summarize my open topics",
  "What have I written about this week?",
];

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
    sendMessage,
    syncMyNotes,
    resetChat,
  } = useRagChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!ragChat.enabled) return null;

  return (
    <section className="mb-8 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.03] to-transparent overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/15 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.17 0-2.29-.196-3.312-.552L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">denotes Assistant</p>
            <p className="text-xs text-purple-100">Ask about your notes, tasks &amp; topics</p>
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
            title="Start a new conversation"
            className="rounded p-1.5 text-purple-100 hover:bg-white/10 hover:text-white"
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

      <div ref={scrollRef} className="max-h-[26rem] min-h-[14rem] space-y-3 overflow-y-auto px-5 sm:px-6 py-4">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-slate-400 mb-3">
              Ask me anything about denotes, or about your own notes and topics - they&apos;re kept in
              sync automatically as you save.
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
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-white/[0.06] text-slate-100"
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
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-slate-400">
              Thinking&hellip;
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t border-white/[0.06] px-5 sm:px-6 py-3"
      >
        <input
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
      </form>
    </section>
  );
}
