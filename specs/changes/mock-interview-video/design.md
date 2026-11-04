# Design: mock-interview-video

## Approach
A new `lib/interview/tts.ts` module exposes a swappable TTS interface: `speak(text)`, `cancel()`, `prime()`, `getState()`, `subscribe(listener)`, plus `isSupported()`. The default engine tries Kokoro through a Web Worker (`lib/interview/kokoroWorker.ts`) that lazily `import("kokoro-js")`s inside the worker; the worker posts back `loading` / `ready` / `error` and, per request, a Float32 PCM buffer + sample rate, which the main thread plays through an `AudioContext`. While state is `loading`, or after `error`/no Worker, `speak` uses `window.speechSynthesis`. The engine is behind an `TtsEngine` interface (`speak/cancel/prime/dispose`) so a different provider can be swapped in by changing one factory.

A new client hook `lib/interview/useInterviewMedia.ts` (camera stream + permission status + toggle + cleanup) and a small component `app/mock-interview/InterviewVideoPanel.tsx` (self-view, camera toggle, mute, replay, speaking/loading indicators) are wired into `app/mock-interview/page.tsx`, rendered only when `interview.video` is on. Answer capture is untouched except that `AudioRecorder` gets an optional `disabled` prop that the page sets while the interviewer is speaking.

## Decisions (recorded because the user was not asked)
- **Feature flag**: add `interview.video` in `lib/featureFlags.ts` with `process.env.NEXT_PUBLIC_FF_INTERVIEW_VIDEO === "true"` (default OFF). Rationale: the camera prompt, ~90 MB first-use model download and the privacy surface should be an explicit opt-in, mirroring `interview.enabled` and `ragChat.enabled` (both default off). Because `listToggleableFlags()` enumerates the static object, it shows up in the admin dashboard with no extra work; `mergeWithDefaults` fills it for older DB docs. The page gates on `interview.video` read from `useFeatureFlags()` (DB-backed), and also requires `interview.enabled` implicitly (page already returns early).
- **Dependency**: `kokoro-js` `^1.2.1` (npm `latest` = 1.2.1, verified via `npm view`; repo hexgrad/kokoro; depends on `@huggingface/transformers ^3.5.1` and `phonemizer ^1.2.1`). API per its README (verified against upstream README, not memory): `KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "wasm" })`, then `await tts.generate(text, { voice: "af_heart" })` returns a `RawAudio` object. UNVERIFIED by the PM: the exact fields of the returned audio (expected `audio.audio` Float32Array and `audio.sampling_rate`, from transformers.js `RawAudio`) and whether the Next/webpack worker build resolves `kokoro-js`'s browser entry; the developer must confirm in `node_modules/kokoro-js` types and with `npm run build`, and note findings in a code comment. Default `dtype: "q8"`, `device: "wasm"` (WebGPU is not assumed). Voice `af_heart`.
- **Lazy loading / bundle**: `kokoro-js` is imported only via `await import("kokoro-js")` inside the worker file, and the worker is created with `new Worker(new URL("./kokoroWorker.ts", import.meta.url), { type: "module" })` only on the client, after the interview starts with the flag on. Nothing imports `kokoro-js` from server code, page top-level, or `tts.ts` statically. If webpack worker bundling of `kokoro-js` proves problematic, fallback (documented option): dynamic import on the main thread inside `tts.ts` (still lazy, still client-only). Model files come from the Hugging Face CDN and are cached by the browser (transformers.js Cache API); nothing is added to `public/` or the Vercel function bundle. May require `next.config.js` tweaks (e.g. `serverExternalPackages` is NOT needed; `onnxruntime-node`/`sharp` aliasing to `false` for client may be needed). Developer to verify with `npm run build`.
- **Autoplay policy**: audio and `speechSynthesis` need prior user activation. `handleStart` (the Start interview submit click) synchronously calls `tts.prime()` before the `await fetch`; `prime()` creates/resumes the `AudioContext` and issues a silent/empty utterance to unlock `speechSynthesis`. The first question is then spoken after the phase flips to `interview`. If a `speak` is rejected by the browser (e.g. `NotAllowedError`/context `suspended`), state shows idle and the Replay button (a fresh gesture) works.
- **Mic / `AudioRecorder` interaction**: `AudioRecorder` uses `SpeechRecognition`, not `getUserMedia`, so the camera request is `getUserMedia({ video: true, audio: false })`; there is no double mic-capture conflict and the page never opens an audio track. To keep TTS out of the transcript: (a) page passes `disabled={ttsState === "speaking"}` to `AudioRecorder`, which disables its start button; (b) when `disabled` becomes true while recording (e.g. the user hits Replay or a new question is spoken), `AudioRecorder` runs its existing stop path so the partial transcript is kept and recognition ends before TTS output is audible. Acoustic echo beyond this is out of scope (headphones recommended; mention in docs).
- **Stale/rapid speech**: `speak()` always `cancel()`s first. A new question or Replay never overlaps. Submitting an answer calls `cancel()`.

## Impacted Files
| File | Change | Notes |
| ---- | ------ | ----- |
| `package.json` / `package-lock.json` | modify | add `kokoro-js@^1.2.1` |
| `lib/featureFlags.ts` | modify | add `interview.video` flag |
| `lib/interview/tts.ts` | create | `speak/cancel/prime/getState/subscribe`, engine selection + speechSynthesis fallback |
| `lib/interview/kokoroWorker.ts` | create | Web Worker: dynamic `import("kokoro-js")`, load model, generate PCM |
| `lib/interview/useInterviewMedia.ts` | create | camera stream hook with permission status, toggle, track cleanup |
| `lib/interview/useInterviewerVoice.ts` | create | React hook over tts state: `{ state, muted, setMuted, replay, speakQuestion }` |
| `app/mock-interview/InterviewVideoPanel.tsx` | create | self-view `<video>`, toggles, indicators |
| `app/mock-interview/page.tsx` | modify | flag gate, `tts.prime()` in `handleStart`, speak on new question, cleanup on end/unmount, pass `disabled` to recorder |
| `app/components/AudioRecorder.tsx` | modify | optional `disabled` prop; stop recording and block start when true |
| `app/mock-interview/__tests__/page.test.tsx` | modify | add video-flag cases; existing cases untouched |
| `lib/interview/__tests__/tts.test.ts`, `useInterviewMedia.test.ts`, `app/mock-interview/__tests__/InterviewVideoPanel.test.tsx`, `app/components/__tests__/AudioRecorder.test.tsx` | create | see test.md |
| `next.config.js` | modify (only if build needs it) | client alias/externals for onnxruntime-node/sharp |
| `FEATURE_FLAGS.md`, `MOCK_INTERVIEW_SETUP.md` | modify | document flag, first-load model download, privacy (no recording) |

## Data Model
None. No Mongo changes; no video/audio persisted.

## Server Actions / API
| Name or route | Auth required | Input | Output |
| ------------- | ------------- | ----- | ------ |
| None added or changed | n/a | n/a | n/a |

All new code is client-side; existing `/api/interview/start` and `submitInterviewAnswer` are untouched.

## UI
- Client-only. `InterviewVideoPanel` sits above/beside the conversation log in the interview phase, only when `interview.video`. Contents: `<video autoPlay muted playsInline>` bound via ref to `stream`; placeholder when camera off/denied/unavailable; buttons with accessible names and `aria-pressed`: "Camera" toggle, "Mute interviewer" toggle, "Replay question"; `role="status"` text "Loading interviewer voice..." (state `loading`) and "Interviewer speaking" (state `speaking`); denial notice as `role="status"` text "Camera unavailable. Continuing without video."
- `useInterviewMedia`: starts the stream when `enabled && phase === "interview"`; cleans up (`track.stop()` for all tracks, `srcObject = null`) on disable, phase change away from `interview`, and unmount. Camera off = stop tracks; on = re-request.
- Speak trigger: effect keyed on `turns.length` while `phase === "interview"` calls `speakQuestion(turns.at(-1).question)` unless muted; `handleEnd`, feedback phase and unmount call `cancel()`.
- `tts` is a module singleton created lazily client-side only (guard `typeof window`), so SSR import is safe.

## Feature Flag / Env
- New flag `interview.video`, env `NEXT_PUBLIC_FF_INTERVIEW_VIDEO` (`"true"` to enable by default; inlined at build time; DB override via admin dashboard). Document in FEATURE_FLAGS.md and MOCK_INTERVIEW_SETUP.md.
- No new secrets. Network: Hugging Face CDN for model `onnx-community/Kokoro-82M-v1.0-ONNX` (first use only, then browser-cached).
