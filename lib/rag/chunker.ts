/**
 * Split long documents into overlapping chunks small enough to embed
 * and feed to the LLM as context.
 *
 * Strategy: split on paragraph (newline) boundaries first, then
 * greedily pack paragraphs into chunks of roughly `chunkSize`
 * characters, carrying `overlap` characters of trailing context into
 * the next chunk so meaning isn't lost across chunk boundaries.
 */
import type { RagDocument } from "./loader";

export interface RagChunk {
  text: string;
  sourceUrl: string;
  title: string;
  chunkIndex: number;
}

export function chunkDocument(doc: RagDocument, chunkSize: number, overlap: number): RagChunk[] {
  const paragraphs = doc.text
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    let candidate = current ? `${current}\n${para}`.trim() : para;

    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    // Current chunk is full; flush it and start a new one, seeded
    // with the tail of the previous chunk for continuity.
    if (current) {
      chunks.push(current);
      current = tail(current, overlap);
      candidate = current ? `${current}\n${para}`.trim() : para;
    }

    // A single paragraph longer than chunkSize has to be hard-split.
    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      for (const piece of hardSplit(para, chunkSize, overlap)) {
        chunks.push(piece);
      }
      current = "";
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((text, i) => ({
    text,
    sourceUrl: doc.url,
    title: doc.title,
    chunkIndex: i,
  }));
}

export function chunkDocuments(docs: RagDocument[], chunkSize: number, overlap: number): RagChunk[] {
  const result: RagChunk[] = [];
  for (const doc of docs) {
    result.push(...chunkDocument(doc, chunkSize, overlap));
  }
  return result;
}

function tail(text: string, overlap: number): string {
  if (overlap <= 0 || text.length <= overlap) return "";
  return text.slice(-overlap);
}

function hardSplit(text: string, chunkSize: number, overlap: number): string[] {
  const pieces: string[] = [];
  const step = Math.max(chunkSize - overlap, 1);
  for (let start = 0; start < text.length; start += step) {
    pieces.push(text.slice(start, start + chunkSize));
  }
  return pieces;
}
