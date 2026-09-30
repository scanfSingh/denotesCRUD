/**
 * Minimal ambient types for the two resume-parsing libraries used by
 * lib/interview/resumeParser.ts - neither ships its own TypeScript
 * declarations, and there's no need to pull in @types packages for
 * the handful of exports we actually call.
 */
declare module "pdf-parse" {
  interface PDFParseResult {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  }
  function pdfParse(dataBuffer: Buffer): Promise<PDFParseResult>;
  export default pdfParse;
}

declare module "mammoth" {
  interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(input: { buffer: Buffer }): Promise<ExtractRawTextResult>;
}
