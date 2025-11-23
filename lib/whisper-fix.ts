/**
 * Fix for whisper-node path resolution in Next.js
 * Next.js changes __dirname resolution, so we need to provide the correct path
 */

import path from "path";
import { existsSync } from "fs";

// Get the actual project root
const PROJECT_ROOT = process.cwd();
const WHISPER_NODE_PATH = path.join(PROJECT_ROOT, "node_modules", "whisper-node");
const WHISPER_CPP_PATH = path.join(WHISPER_NODE_PATH, "lib", "whisper.cpp");
const WHISPER_MAIN_PATH = path.join(WHISPER_CPP_PATH, "main");

// Verify paths exist
export function verifyWhisperSetup(): { valid: boolean; error?: string } {
  if (!existsSync(WHISPER_CPP_PATH)) {
    return {
      valid: false,
      error: `whisper.cpp not found at: ${WHISPER_CPP_PATH}`,
    };
  }

  if (!existsSync(WHISPER_MAIN_PATH)) {
    return {
      valid: false,
      error: `whisper main binary not found at: ${WHISPER_MAIN_PATH}. Please run: cd ${WHISPER_CPP_PATH} && make`,
    };
  }

  return { valid: true };
}

export function getWhisperPaths() {
  return {
    whisperCppPath: WHISPER_CPP_PATH,
    whisperMainPath: WHISPER_MAIN_PATH,
    whisperNodePath: WHISPER_NODE_PATH,
  };
}

