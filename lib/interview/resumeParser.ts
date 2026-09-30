/**
 * Turns an uploaded resume file (PDF or DOCX) into plain text so it
 * can be dropped straight into an LLM prompt. Both libraries are pure
 * JS/WASM - no native build step, so they work fine on Vercel's
 * serverless functions.
 *
 * Not exported for use outside the Node runtime - see the `runtime =
 * "nodejs"` export required on any route/action that calls this.
 */

export interface ParsedResume {
  text: string;
  truncated: boolean;
}

// Keep prompts a sane size - a resume this long is almost certainly
// not a resume anymore, and we don't want one bad upload to blow the
// LLM's context window or the Vercel function's memory.
const MAX_RESUME_CHARS = 20000;

function clamp(text: string): ParsedResume {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= MAX_RESUME_CHARS) {
    return { text: cleaned, truncated: false };
  }
  return { text: cleaned.slice(0, MAX_RESUME_CHARS), truncated: true };
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic import: pdf-parse touches the filesystem at module load
  // time in some versions, so we only pull it in when actually needed.
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text || "";
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

/** Parses a resume file into plain text based on its filename/mimetype.
 * Throws a user-facing error for unsupported formats. */
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  let raw: string;
  if (type.includes("pdf") || name.endsWith(".pdf")) {
    raw = await parsePdf(buffer);
  } else if (
    type.includes("wordprocessingml") ||
    name.endsWith(".docx")
  ) {
    raw = await parseDocx(buffer);
  } else if (name.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc files aren't supported - please save your resume as .docx or .pdf and try again."
    );
  } else if (type.startsWith("text/") || name.endsWith(".txt")) {
    raw = buffer.toString("utf-8");
  } else {
    throw new Error("Unsupported resume format - upload a PDF or Word (.docx) file.");
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Couldn't find any readable text in that file - is it a scanned image?");
  }
  return clamp(trimmed);
}
