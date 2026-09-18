"use server";

import { isCurrentUserAdmin, getCurrentUserId } from "./actions";
import { ingestUrls, ingestUserContent, type IngestSummary } from "@/lib/rag/ingest";
import { resetVectorStore, vectorStoreStats, userNamespace } from "@/lib/rag/vectorStore";
import { ragConfig } from "@/lib/rag/config";

/**
 * Server actions backing the "Knowledge Base" panel in the admin
 * dashboard (app/admin/page.tsx). These run with the caller's own
 * logged-in session, so - unlike /api/rag/ingest - they don't need the
 * separate RAG_INGEST_SECRET; admin status is checked directly instead.
 */

export interface RagAdminStats {
  configured: boolean;
  vectorCount?: number;
  pendingVectorCount?: number;
}

export async function getRagAdminStats(): Promise<RagAdminStats> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const configured = Boolean(
    ragConfig.upstash.url &&
      ragConfig.upstash.token &&
      (ragConfig.gemini.apiKey || ragConfig.groq.apiKey)
  );
  if (!configured) {
    return { configured };
  }

  const stats = await vectorStoreStats();
  return { configured, ...stats };
}

export async function adminIngestRagUrls(
  urls: string[]
): Promise<{ success: true; summary: IngestSummary } | { success: false; error: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const cleaned = urls.map((u) => u.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      return { success: false, error: "Enter at least one URL" };
    }

    const summary = await ingestUrls(cleaned);
    return { success: true, summary };
  } catch (error) {
    console.error("[rag-actions] adminIngestRagUrls failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to ingest URLs",
    };
  }
}

export async function adminResetRagKnowledgeBase(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    await resetVectorStore();
    return { success: true };
  } catch (error) {
    console.error("[rag-actions] adminResetRagKnowledgeBase failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset knowledge base",
    };
  }
}

/**
 * Server actions backing "personal RAG": any logged-in user (not just
 * admins) can index their own notes/topics so the chat widget can
 * answer questions grounded in their own content. Each user's content
 * lives in their own Upstash Vector namespace (see
 * lib/rag/vectorStore.ts) - these actions only ever touch the calling
 * user's own namespace, never anyone else's.
 */

export interface MyRagStats {
  configured: boolean;
  vectorCount?: number;
  pendingVectorCount?: number;
}

export async function getMyRagStats(): Promise<MyRagStats> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const configured = Boolean(
    ragConfig.upstash.url &&
      ragConfig.upstash.token &&
      (ragConfig.gemini.apiKey || ragConfig.groq.apiKey)
  );
  if (!configured) {
    return { configured };
  }

  const stats = await vectorStoreStats(userNamespace(userId));
  return { configured, ...stats };
}

export async function syncMyNotesToRag(): Promise<
  { success: true; summary: IngestSummary } | { success: false; error: string }
> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const summary = await ingestUserContent(userId);
    return { success: true, summary };
  } catch (error) {
    console.error("[rag-actions] syncMyNotesToRag failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync your notes",
    };
  }
}
