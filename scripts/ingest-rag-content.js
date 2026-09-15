#!/usr/bin/env node

/**
 * Ingest URLs into the RAG chat knowledge base by calling the
 * /api/rag/ingest endpoint.
 *
 * Usage:
 *   node scripts/ingest-rag-content.js https://denotes.co.in/blog https://denotes.co.in/topics-view
 *   node scripts/ingest-rag-content.js --file urls.txt
 *
 * Env vars (put these in .env.local for local dev, or export them
 * before running against production):
 *   RAG_APP_URL       Base URL of the app, e.g. http://localhost:3000
 *                      or https://denotes.co.in (default: http://localhost:3000)
 *   RAG_INGEST_SECRET Must match the RAG_INGEST_SECRET configured on the server.
 */
const fs = require("fs");
const path = require("path");

loadDotEnvLocal();

const APP_URL = process.env.RAG_APP_URL || "http://localhost:3000";
const SECRET = process.env.RAG_INGEST_SECRET;

async function main() {
  if (!SECRET) {
    console.error("RAG_INGEST_SECRET is not set. Add it to .env.local or export it before running.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let urls = [];

  const fileIndex = args.indexOf("--file");
  if (fileIndex !== -1) {
    const filePath = args[fileIndex + 1];
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    urls.push(...lines.map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
  } else {
    urls.push(...args);
  }

  if (urls.length === 0) {
    console.error("No URLs provided. Pass URLs as arguments or use --file urls.txt");
    process.exit(1);
  }

  console.log(`Ingesting ${urls.length} URL(s) into ${APP_URL} ...`);

  const res = await fetch(`${APP_URL}/api/rag/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET}`,
    },
    body: JSON.stringify({ urls }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Ingestion failed:", data);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  if (data.failedUrls?.length > 0) {
    console.warn(`\n${data.failedUrls.length} URL(s) could not be fetched:`, data.failedUrls);
  }
}

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
