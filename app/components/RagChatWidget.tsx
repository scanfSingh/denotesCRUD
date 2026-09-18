"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useFeatureFlags } from "./FeatureFlagsProvider";
import { useRagChat } from "@/lib/useRagChat";

/** Other components (e.g. the home screen's "Ask AI" tiles) can open
 * this widget without any shared state by dispatching this event. */
export const OPEN_RAG_CHAT_EVENT = "denotes:open-rag-chat";

export default function RagChatWidget() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  // Fed from MongoDB via the root layout + FeatureFlagsProvider.
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

  useEffect(() => {
    const openWidget = () => setIsOpen(true);
    window.addEventListener(OPEN_RAG_CHAT_EVENT, openWidget);
    return () => window.removeEventListener(OPEN_RAG_CHAT_EVENT, openWidget);
  }, []);

  if (!ragChat.enabled) return null;
  if (status !== "authenticated" || !session) return null;
  // On the home page the assistant takes main stage as a large embedded
  // panel (see RagChatMainStage) instead of this floating messenger -
  // showing both at once would be redundant. Everywhere else, this
  // floating bubble is how the assistant appears.
  if (pathname === "/") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 flex h-[32rem] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">denotes Assistant</p>
              <p className="text-xs text-purple-100">Ask about notes, tasks &amp; topics</p>
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
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="rounded p-1.5 text-purple-100 hover:bg-white/10 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {(syncing || syncStatus) && (
            <div className="border-b border-gray-200 bg-purple-50 px-4 py-1.5 text-xs text-purple-700 dark:border-gray-700 dark:bg-gray-700/50 dark:text-purple-300">
              {syncing ? "Indexing your notes & topics…" : syncStatus}
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ask me anything about denotes, or about your own notes and topics - they're kept in
                sync automatically.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                  }`}
                >
                  {m.content}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 border-t border-black/10 pt-2 text-xs opacity-75 dark:border-white/10">
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
                <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  Thinking&hellip;
                </div>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-gray-200 p-3 dark:border-gray-700"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl hover:scale-105 transition-transform"
        title="denotes Assistant"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.17 0-2.29-.196-3.312-.552L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </div>
  );
}
