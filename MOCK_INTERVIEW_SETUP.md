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
resume text, chosen skills/role/difficulty, the full question/answer
transcript, and - once finished - a summary, strengths, improvements, and a
1-10 score.

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
quick action. Upload a resume (PDF or DOCX only - legacy `.doc` and scanned
image PDFs aren't supported), optionally list skills to focus on, pick a
difficulty, and start.

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
