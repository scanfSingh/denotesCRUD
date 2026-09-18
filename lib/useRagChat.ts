"use client";

import { useEffect, useRef, useState } from "react";
import { syncMyNotesToRag } from "@/app/rag-actions";

export interface ChatSource {
  url: string;
  title: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  timestamp: number;
}

const SESSION_STORAGE_KEY = "denotes-rag-session-id";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Shared chat state/actions behind both places the AI assistant
 * appears: the floating messenger widget (RagChatWidget, used on every
 * screen except home) and the full-width "main stage" panel embedded
 * directly in the authenticated home page (RagChatMainStage). Keeping
 * the send/sync/reset logic and session-id handling in one hook means
 * the two surfaces can't drift out of sync with each other.
 */
export function useRagChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const sessionIdRef = useRef<string>("");
  // The last question actually sent to the backend - kept separate from
  // `input` (which is cleared immediately) so a failed request can be
  // retried without the user having to retype it.
  const lastQuestionRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let sid = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sid) {
        sid = newId();
        window.localStorage.setItem(SESSION_STORAGE_KEY, sid);
      }
      sessionIdRef.current = sid;
    } catch {
      // localStorage can throw in private browsing / disabled storage;
      // fall back to an in-memory session id for this page load.
      sessionIdRef.current = newId();
    }
  }, []);

  /** Does the actual round trip for one question - split out from
   * sendMessage() so retry() can redo just the network call without
   * appending a duplicate user bubble. */
  async function runQuery(question: string) {
    lastQuestionRef.current = question;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, sessionId: sessionIdRef.current }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong");
      }

      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: data.answer, sources: data.sources, timestamp: Date.now() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /** `override` lets a caller (e.g. a suggestion chip) send a specific
   * question without first having to route it through the input box. */
  async function sendMessage(override?: string) {
    const question = (override ?? input).trim();
    if (!question || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: question, timestamp: Date.now() },
    ]);
    setInput("");
    await runQuery(question);
  }

  /** Re-asks the last question after a failed request, without adding
   * a second copy of the user's message to the transcript. */
  function retry() {
    if (!lastQuestionRef.current || loading) return;
    runQuery(lastQuestionRef.current);
  }

  async function syncMyNotes() {
    if (syncing) return;
    setSyncing(true);
    setSyncStatus(null);
    try {
      const result = await syncMyNotesToRag();
      if (result.success) {
        setLastSyncedAt(new Date());
        setSyncStatus(
          result.summary.chunksStored > 0
            ? `Indexed ${result.summary.requested} note${result.summary.requested === 1 ? "" : "s"}/topic${result.summary.requested === 1 ? "" : "s"} for chat.`
            : "No notes or topics to index yet."
        );
      } else {
        setSyncStatus(result.error);
      }
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : "Failed to sync your notes");
    } finally {
      setSyncing(false);
    }
  }

  async function resetChat() {
    setMessages([]);
    setError(null);
    lastQuestionRef.current = "";
    try {
      await fetch("/api/rag/chat/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      });
    } catch {
      // Non-critical - the UI has already cleared locally.
    }
  }

  return {
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
  };
}
