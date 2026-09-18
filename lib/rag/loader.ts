/**
 * Fetch web pages and turn them into clean, plain-text documents.
 *
 * Deliberately simple (fetch + cheerio) rather than a full crawler.
 * Point it at specific URLs you want in the knowledge base (docs, blog
 * posts, shared topic pages) rather than trying to crawl the whole site.
 */
import * as cheerio from "cheerio";
import { ragConfig } from "./config";

export interface RagDocument {
  url: string;
  title: string;
  text: string;
}

// Tags that never contain content worth indexing.
const NOISE_SELECTORS = ["script", "style", "nav", "footer", "header", "noscript", "svg", "form"];

export async function fetchUrl(url: string): Promise<RagDocument | null> {
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ragConfig.requestTimeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": ragConfig.userAgent },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.warn(`[rag/loader] Failed to fetch ${url}: HTTP ${res.status}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      console.warn(`[rag/loader] Skipping non-HTML content at ${url} (${contentType})`);
      return null;
    }

    html = await res.text();
  } catch (err) {
    console.warn(`[rag/loader] Failed to fetch ${url}:`, err);
    return null;
  }

  const $ = cheerio.load(html);
  NOISE_SELECTORS.forEach((sel) => $(sel).remove());

  const title = ($("title").first().text() || url).trim();

  // Prefer <main> or <article> if present - usually the actual content
  // rather than nav/sidebar chrome.
  const contentRoot = $("main").first().length
    ? $("main").first()
    : $("article").first().length
    ? $("article").first()
    : $("body");

  const text = cleanText(extractBlockText($, contentRoot));

  if (text.length < 50) {
    console.warn(`[rag/loader] Extracted text from ${url} is suspiciously short/empty`);
    return null;
  }

  return { url, title, text };
}

export async function fetchUrls(urls: string[]): Promise<RagDocument[]> {
  const results = await Promise.all(urls.map((u) => fetchUrl(u)));
  return results.filter((d): d is RagDocument => d !== null);
}

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, pre, caption";

/**
 * cheerio's plain .text() concatenates every text node with no
 * separator, which would glue adjacent paragraphs together. Extract
 * text block-by-block and join with newlines instead, so downstream
 * chunking (which splits on paragraph boundaries) works as expected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBlockText($: cheerio.CheerioAPI, root: any): string {
  const blocks = root
    .find(BLOCK_SELECTOR)
    .map((_: number, el: any) => $(el).text())
    .get()
    .map((t: string) => t.trim())
    .filter(Boolean);

  if (blocks.length > 0) {
    return blocks.join("\n");
  }
  // Fallback for pages with no recognizable block tags.
  return root.text();
}

function cleanText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Strips an HTML fragment down to clean, plain text using the same
 * block-aware extraction as fetchUrl(). Used to turn note/topic content
 * (stored as TipTap-generated HTML, see lib/rag/notesLoader.ts) into
 * text suitable for chunking - no fetching involved, just parsing.
 */
export function htmlToPlainText(html: string): string {
  if (!html || !html.trim()) return "";
  const $ = cheerio.load(html);
  NOISE_SELECTORS.forEach((sel) => $(sel).remove());
  return cleanText(extractBlockText($, $("body")));
}
