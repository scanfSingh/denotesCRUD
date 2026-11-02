---
name: denotes-project
description: Project guide for "denotes" (denotesCRUD), a Next.js 15 + MongoDB notes/topics/tasks app with audio transcription, RAG chat and mock interviews. Use when working in this repo: adding pages, server actions, API routes, feature flags, auth, email, RAG or interview features, or debugging setup and env issues.
---

# Denotes project guide

Repo: github.com/scanfSingh/denotesCRUD. Deployed on Vercel at denotes-crud.vercel.app. App name in package.json: `denotes`.

## Stack
- Next.js 15 (App Router), React 19, TypeScript, Tailwind v4 (+ typography plugin)
- MongoDB via the `mongodb` driver (`lib/mongodb.ts` exports a lazy proxy client; use `client.connect()` then `.db()`)
- Auth: next-auth v5 beta (`lib/auth.ts`), Google OAuth + email/password credentials (bcryptjs), MongoDB adapter, email verification and password reset
- Email: nodemailer (`lib/email.ts`; see EMAIL_SETUP.md)
- Rich text: Tiptap (`app/components/RichTextEditor.tsx`)
- Audio notes: whisper-node + ffmpeg-static + optional OpenAI processing
- RAG chat: Upstash Vector (embeddings and search) + Gemini (primary) with Groq fallback
- Mock interview: reuses the Gemini/Groq config from RAG

## Commands
- `npm run dev` / `build` / `start`
- `npm run download-whisper` (needed before audio transcription works)
- `npm run rag:ingest` (ingest public content into the vector index)

## Layout
- `app/<route>/page.tsx` + `layout.tsx`: pages (blog, topics, topics-view, shared-topics, friends, crud (tasks), audio-notes, mock-interview, profile, admin, inventory, login, forgot/reset-password)
- `app/actions.ts`: main server actions ("use server"): tasks, subjects, topics, notes, friends, sharing, auth helpers. `getCurrentUserId()` is the standard way to get the session user
- `app/interview-actions.ts`, `app/rag-actions.ts`, `app/feature-flags-actions.ts`: feature-specific server actions
- `app/api/*`: route handlers (auth, rag/chat|ingest|health, audio/transcribe|process|test, interview/start|resume, blog/[id])
- `app/components/`: shared UI (Navigation, ProtectedRoute, RagChatWidget, AudioRecorder, ThemeProvider, FeatureFlagsProvider, ...)
- `lib/`: `mongodb.ts`, `auth.ts`, `email.ts`, `featureFlags.ts`, `featureFlagOverrides.ts`, `whisper-fix.ts`, `rag/*`, `interview/*`
- `types/`: ambient type declarations (whisper-node, resume parsers)
- Setup docs at repo root: QUICK_START, FEATURE_FLAGS, GOOGLE_AUTH_SETUP, EMAIL_SETUP, RAG_CHAT_SETUP, MOCK_INTERVIEW_SETUP, SETUP_WHISPER, MODEL_DOWNLOAD. Read the matching doc before changing a feature's setup

## Conventions
1. **Server actions for data access.** Put CRUD in a "use server" file, authenticate with `getCurrentUserId()`, scope every query by user ID, and call `revalidatePath` after mutations. Convert `ObjectId` to strings when returning to the client.
2. **Every new feature gets a feature flag.** Add it to `lib/featureFlags.ts` using `process.env.NEXT_PUBLIC_FF_<NAME> !== "false"` (default on) or `=== "true"` (default off), document it in FEATURE_FLAGS.md, and gate both the route/UI and the navigation link. Check flags via `featureFlags.<group>.<flag>` or `isFeatureEnabled(group, flag)`.
3. **Protect pages** with `ProtectedRoute` or by checking the session; route protection lives with the page's `layout.tsx`.
4. **Content changes re-index RAG.** User notes/topics mutations call `scheduleUserContentReindex` (`lib/rag/ingest.ts`). Keep that call when adding new content mutations. RAG namespaces: default = public, `user:<id>` = personal. Never mix them.
5. **LLM config is centralized.** Gemini/Groq keys and models come from `lib/rag/config.ts`; interview config imports it. Don't add new provider env vars for a feature that can reuse them. Gemini falls back to Groq on quota/rate-limit errors.
6. **Use the `@/` import alias** and keep TypeScript strict (no new `any` unless matching existing patterns).
7. **Emails** go through helpers in `lib/email.ts`; add a new helper there rather than calling nodemailer inline.

## Environment variables (names only; never print or commit values)
`MONGODB_URI`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, SMTP/email vars (see EMAIL_SETUP.md), `OPENAI_API_KEY` (audio AI processing only), `GEMINI_API_KEY`, `GROQ_API_KEY`, `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`, `RAG_INGEST_SECRET`, `NEXT_PUBLIC_FF_*` flags, optional `RAG_*` and `INTERVIEW_*` tuning vars. Secrets live in `.env.local` (git-ignored). Never read it out loud or include its values in output.

## Common pitfalls
- "Whisper model not found": run `npm run download-whisper`. FFmpeg problems: ensure `ffmpeg-static` is installed. Whisper and ffmpeg don't work in Vercel serverless the same as locally; check SETUP_WHISPER.md first.
- Missing `MONGODB_URI` throws at first DB use, not at import.
- `lib/mongodb.ts` sets `tlsAllowInvalidCertificates`; don't copy that into new code without reason.
- `NEXT_PUBLIC_*` flags are inlined at build time, so restart or redeploy after changing them.
- Families feature is intentionally disabled (flag defaults to off).
- Root `README.md` is the generic Next.js + MongoDB template text; the setup `.md` files are the real docs.

## Workflow for a typical change
1. Find the nearest existing feature (page + actions + flag) and mirror its structure.
2. Implement the server action, then the page/component, then the nav link, all behind a flag.
3. Update FEATURE_FLAGS.md (and the relevant setup doc) when adding flags or env vars.
4. Run `npm run build` to catch type errors before finishing.
