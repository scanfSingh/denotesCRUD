# Tasks: mock-interview-video

## Implementation Checklist
- [x] Add `kokoro-js@^1.2.1` to package.json (`npm install kokoro-js`); inspect `node_modules/kokoro-js` types to confirm `generate()` return shape and note it in a comment
- [x] Add `interview.video` flag (`NEXT_PUBLIC_FF_INTERVIEW_VIDEO === "true"`) to `lib/featureFlags.ts`
- [x] Define `TtsState` (`"idle" | "loading" | "speaking"`) and `TtsEngine` types in `lib/interview/tts.ts`
- [x] Create `lib/interview/kokoroWorker.ts` (dynamic `import("kokoro-js")`, model load, generate -> PCM message, error message)
- [x] Implement speechSynthesis engine (cancel, utterance start/end/error events) in `lib/interview/tts.ts`
- [x] Implement Kokoro engine wrapper (spawn worker lazily, AudioContext playback, cancel via `AudioBufferSourceNode.stop`) in `lib/interview/tts.ts`
- [x] Implement `speak/cancel/prime/getState/subscribe/isSupported` with Kokoro-then-speechSynthesis fallback and always-cancel-first
- [x] Create `lib/interview/useInterviewMedia.ts` (permission status, toggle, stops all tracks on disable/unmount)
- [x] Create `lib/interview/useInterviewerVoice.ts` (state subscription, mute, replay, speakQuestion)
- [x] Add optional `disabled` prop to `app/components/AudioRecorder.tsx` (block start; stop recording when it becomes true)
- [x] Create `app/mock-interview/InterviewVideoPanel.tsx`
- [x] Wire `page.tsx`: flag gate, `tts.prime()` in `handleStart`, speak new questions, pass `disabled` to recorder, cancel + stop camera on end/feedback/unmount
- [x] Verify `npm run build` (worker + kokoro-js bundling); adjust `next.config.js` only if required and confirm kokoro is absent from the server bundle
- [x] Write tests listed in test.md
- [x] Update FEATURE_FLAGS.md and MOCK_INTERVIEW_SETUP.md (flag, model download size/CDN, no recording, browser support)

## Notes
- Order: flag/dependency -> tts lib -> hooks -> AudioRecorder prop -> panel -> page wiring -> docs.
- `prime()` must be called synchronously in the click handler, before any `await`.
- Existing page tests mock `useFeatureFlags` without `interview.video` (falsy = off); they must keep passing unmodified.
- `NEXT_PUBLIC_*` flags are inlined at build time; restart after changing.
- Do not add static imports of `kokoro-js` anywhere.
