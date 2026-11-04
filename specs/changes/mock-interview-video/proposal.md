# Proposal: mock-interview-video

Stacked on PR #6 (`feature/mock-interview-ux`); this branch is `feature/mock-interview-video`.

## Problem Statement
The mock interview at `/mock-interview` is text-only: questions appear as chat bubbles and the candidate cannot rehearse the feel of a real video interview. Level 1 "video interview" adds a self-view webcam and an interviewer who speaks each question aloud, without changing how answers are captured or evaluated.

## Goals
- Show the user's own webcam preview during the interview (local only).
- Speak each interviewer question aloud via a swappable `speak(text)` helper, using Kokoro (in-browser, lazy-loaded) with the browser `speechSynthesis` as fallback.
- Handle camera permission gracefully, falling back to the existing text-only experience.
- Give the user controls: mute interviewer, camera on/off, replay question.
- Prevent the interviewer's voice from being captured by speech recognition.
- Ship behind a feature flag so it can be switched off.

## Non-Goals
- Recording, storing or uploading video or audio.
- Live conversational voice (Level 3), avatars, video/face/body-language analysis.
- Changing Type/Speak answer modes, the LLM feedback loop, server actions or API routes.
- Self-hosting the Kokoro model or adding it to the Vercel bundle.

## Acceptance Criteria
- [ ] With `interview.video` off, the interview page renders and behaves exactly as before: no camera request, no speech, no video controls, and `kokoro-js` is never imported.
- [ ] With the flag on, clicking "Start interview" and reaching the interview phase shows a camera preview (`<video>` muted, `playsInline`) fed by `getUserMedia({ video: true, audio: false })`.
- [ ] If camera permission is denied or no camera exists, a non-blocking notice explains it and the interview continues text-only (Type/Speak and the question list still work).
- [ ] A camera on/off toggle (`aria-pressed`) stops and restarts the video track; turning off shows a placeholder instead of the preview.
- [ ] Every new question (first and each follow-up) is spoken aloud automatically after the Start-click user gesture, unless the interviewer is muted.
- [ ] A "Mute interviewer" toggle (`aria-pressed`) silences current speech immediately and suppresses auto-speak for later questions; unmuting does not replay.
- [ ] A "Replay question" button re-speaks the latest question (cancelling any current speech first); it is disabled while muted.
- [ ] While the Kokoro model is loading, the user sees a "Loading interviewer voice..." indicator, and questions are spoken via `speechSynthesis` meanwhile; if Kokoro fails or is unsupported, `speechSynthesis` is used silently and the interview is unaffected. If neither exists, the voice controls are hidden/disabled with no error.
- [ ] A visible "Interviewer speaking" state is shown while TTS is playing.
- [ ] While the interviewer is speaking, the Speak-mode recorder cannot be started (and an active recording is stopped/not fed), so TTS audio is not transcribed into the answer.
- [ ] Type/Speak toggle, answer submission, feedback phase and all existing page tests behave unchanged.
- [ ] On ending the interview (manual, auto time-up, or reaching feedback) and on page unmount, all `MediaStreamTrack`s are stopped and any speech is cancelled.
- [ ] No video/audio data is sent over the network or persisted (only the Kokoro/ONNX model files are fetched from the Hugging Face CDN).
- [ ] `kokoro-js` is only reachable through a dynamic import inside a Web Worker, so it is absent from the server bundle and initial page JS.
- [ ] The flag is documented in FEATURE_FLAGS.md and MOCK_INTERVIEW_SETUP.md and appears in the admin flag dashboard automatically.

## Background
- `app/mock-interview/page.tsx` (client component, ~970 lines) has phases setup / interview / feedback. `handleStart` POSTs to `/api/interview/start`, sets `turns`, and `setPhase("interview")`. Follow-up questions arrive in `submitAnswer` via `submitInterviewAnswer` and are appended to `turns`.
- Answer modes `type`/`speak`; Speak renders `app/components/AudioRecorder.tsx`, which uses the Web Speech API `SpeechRecognition` (not `getUserMedia`), so the browser prompts for the mic on its own. It has no prop to pause/disable it.
- Flags: `lib/featureFlags.ts` defines `interview.enabled` (`NEXT_PUBLIC_FF_INTERVIEW === "true"`, default off); runtime values come from MongoDB via `FeatureFlagsProvider` / `useFeatureFlags()`; `listToggleableFlags()` derives the admin dashboard list from the static object.
- Existing page tests mock `useFeatureFlags` as `{ interview: { enabled: true } }` and `AudioRecorder` as a stub.
