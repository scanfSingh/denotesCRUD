# Mock Interview Setup Guide

A feature-flagged page (`/mock-interview`) where a logged-in user uploads
their resume, picks a target role/skills/difficulty, and is interviewed by
an AI - one question at a time, with written feedback and a score at the
end.

It reuses the same Gemini-primary/Groq-fallback setup as the AI chat
assistant (see `RAG_CHAT_SETUP.md`) - no separate LLM keys needed.

## How it works

```
resume file (PDF/DOCX) ──▶ app/api/interview/start ──▶ lib/interview/resumeParser.ts
                                     │                        (pdf-parse / mammoth)
                                     ▼
                     lib/interview/generator.ts (Gemini, falls back to Groq)
                                     │
                                     ▼
                     interviewSessions (MongoDB) ──▶ first question
                                     │
       user answers ──▶ app/interview-actions.ts ──▶ next question,
                          submitInterviewAnswer()      or final feedback
                                                        after N turns
```

Each interview is a single MongoDB document (`interviewSessions` collection):
resume text, chosen skills/role/difficulty, chosen duration, the full
question/answer transcript, and - once finished - a summary, strengths,
improvements, and a 1-10 score.

### Resume persistence

A user's most recently uploaded resume is saved separately, in its own
`userResumes` collection (one document per user, keyed by `userId`,
`lib/interview/resumeStore.ts`) - so they're not asked to re-upload it on
every visit:

- Uploading a resume when starting an interview always saves it as that
  user's current resume (`saveUserResume`), replacing whatever was saved
  before.
- Starting a new interview without choosing a file reuses the saved resume
  (`getUserResume`) - if none exists yet, the API returns an error asking
  for an upload.
- `GET /api/interview/resume` returns the current filename + last-updated
  time so the setup screen can show "Resume on file" instead of an empty
  upload field; a "Replace" button reveals the file input again so the
  user can swap it out anytime.

### Duration (30 / 60 / 90 minutes)

The candidate picks a duration on the setup screen. `durationMinutes` is
stored on the session document at creation time, and the interview ends
automatically - triggering final feedback - whichever comes first:

- **Time runs out**: `isInterviewTimeUp()` (`lib/interview/store.ts`) compares
  `createdAt + durationMinutes` against the current time. It's checked
  server-side on every answer submission (`submitInterviewAnswer` in
  `app/interview-actions.ts`), so it's enforced even if the client's own
  countdown is tampered with or closed.
- **The turn-count ceiling** (`INTERVIEW_MAX_TURNS`, default 40) is hit - a
  defensive backstop only, high enough that a normal 30/60/90-minute
  interview never reaches it.

The client mirrors the same deadline for a live countdown in the interview
header (turns red in the last minute) and auto-ends the interview the moment
it hits zero, via the same "end early" flow the candidate's own "End
interview" button uses.

## Step 1: Install the new dependencies

This feature adds two packages for parsing uploaded resumes - run this
locally (this environment couldn't reach the npm registry to do it for you):

```bash
npm install pdf-parse mammoth
```

## Step 2: Turn the feature on

No new API keys needed if Gemini/Groq are already configured for the chat
assistant. Just set:

```bash
NEXT_PUBLIC_FF_INTERVIEW=true
```

Optional tuning (defaults shown):

```bash
INTERVIEW_MAX_TURNS=6          # question/answer pairs before feedback
INTERVIEW_MAX_RESUME_BYTES=5242880   # 5MB upload limit
```

Like every other flag in this app, `interview.enabled` is also toggleable
at runtime from the admin dashboard's Feature Flags panel - no redeploy
needed to turn it on/off later.

## Step 3: Try it out

Once the flag is on, "Mock Interview" appears in the nav and as a home-screen
quick action. The first time, upload a resume (PDF or DOCX only - legacy
`.doc` and scanned image PDFs aren't supported); after that it's remembered,
so later visits just show "Resume on file" with a "Replace" option instead
of asking again. Optionally list skills to focus on, pick a difficulty and a
duration (30/60/90 minutes), and start.

Each question can be answered either by typing or - via the "Speak" toggle
above the answer box - by voice: it reuses the same `AudioRecorder` component
and browser Speech Recognition API as the audio notes feature, so there's no
separate backend transcription call. The transcript lands in the same
editable textarea rather than auto-submitting, so a misheard word can be
fixed before sending. Voice mode needs a Speech-Recognition-capable browser
(Chrome, Edge, or Safari) and microphone permission - unsupported browsers
fall back to a message and the candidate can just type instead.

## Notes on deploying to Vercel

- `app/api/interview/start/route.ts` runs on the **Node.js runtime**
  (`export const runtime = "nodejs"`) since resume parsing and the MongoDB
  driver need Node APIs - it won't work on the Edge runtime.
- `pdf-parse` and `mammoth` are both pure JS/WASM, so no native build step
  or extra Vercel configuration is required beyond `serverExternalPackages`
  in `next.config.js` (already added).
- Resumes are stored as extracted plain text on the session document, not
  as the original file - nothing binary is kept in MongoDB.

## Extending this

- **Role-specific question banks**: right now every question is generated
  fresh by the LLM; a curated question bank per role could be blended in
  for more consistency across interviews.
- **Resume reuse**: since resume text is already saved per session, a
  "reuse my last resume" shortcut on the setup screen would save a
  re-upload for repeat practice.
