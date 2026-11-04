# Test Plan: mock-interview-video

## Coverage Map
| # | Acceptance criterion | Behaviour to assert | Test file | Mocks needed |
| - | -------------------- | ------------------- | --------- | ------------ |
| 1 | Flag off = unchanged | With `interview.video` falsy: `getUserMedia` not called, no video/mute/replay controls, `speak` not called, tts module/worker never constructed | app/mock-interview/__tests__/page.test.tsx | `useFeatureFlags`, `@/lib/interview/tts`, `navigator.mediaDevices` |
| 2 | Camera preview on start | After Start (flag on) `getUserMedia` called with `{ video: true, audio: false }` and a muted video element is present | app/mock-interview/__tests__/page.test.tsx | `getUserMedia` returning fake stream with track `stop` spies, tts |
| 3 | Camera denied fallback | `getUserMedia` rejects `NotAllowedError`: notice text shown, answer textarea + Type/Speak still work, submit still works | app/mock-interview/__tests__/page.test.tsx, lib/interview/__tests__/useInterviewMedia.test.ts | `getUserMedia` reject |
| 4 | Camera toggle | Clicking "Camera" (aria-pressed flips) calls `track.stop()`; clicking again re-requests stream; placeholder when off | app/mock-interview/__tests__/InterviewVideoPanel.test.tsx, lib/interview/__tests__/useInterviewMedia.test.ts | `getUserMedia` |
| 5 | Auto-speak questions | First question spoken once after start; follow-up question spoken after submit; muted = not spoken | app/mock-interview/__tests__/page.test.tsx | tts `speak` jest.fn, server action mocks |
| 6 | Mute interviewer | Toggle calls `cancel()`; later questions not spoken; unmute does not replay | app/mock-interview/__tests__/page.test.tsx, InterviewVideoPanel.test.tsx | tts |
| 7 | Replay question | Click calls `speak(latestQuestion)`; button disabled while muted | InterviewVideoPanel.test.tsx, page.test.tsx | tts |
| 8 | Loading + fallback | Kokoro engine in `loading`: `speak` uses `speechSynthesis.speak`; worker error -> speechSynthesis used, no thrown error; neither available -> no throw, `isSupported()` false; loading text rendered when state `loading` | lib/interview/__tests__/tts.test.ts, InterviewVideoPanel.test.tsx | `global.Worker` fake, `window.speechSynthesis` + `SpeechSynthesisUtterance`, `AudioContext` fake |
| 9 | Speaking indicator | State `speaking` shows "Interviewer speaking"; returns to idle on utterance end/error | tts.test.ts, InterviewVideoPanel.test.tsx | speechSynthesis fake firing `onend` |
| 10 | Recorder blocked while speaking | `AudioRecorder` with `disabled` has disabled start button; becoming disabled mid-recording stops recognition; page passes `disabled` true while speaking | app/components/__tests__/AudioRecorder.test.tsx, page.test.tsx | `window.SpeechRecognition` fake (start/stop/abort spies) |
| 11 | Existing behaviour unchanged | Existing page.test.tsx suite passes unmodified | app/mock-interview/__tests__/page.test.tsx | as existing |
| 12 | Cleanup | Ending interview, reaching feedback, and unmount each call `track.stop()` on all tracks and `tts.cancel()` | page.test.tsx, useInterviewMedia.test.ts | fake stream with 2 tracks |
| 13 | No upload | During a full flag-on flow, `fetch` is only called with `/api/interview/*` URLs and no Blob/MediaRecorder is constructed (`MediaRecorder` undefined/spy not called) | page.test.tsx | `fetch` mock |
| 14 | Lazy kokoro | `tts.ts` import does not import `kokoro-js` (jest.mock factory not invoked at import); worker file only loads it via `import()` after a `generate` request; mocked `kokoro-js` `KokoroTTS.from_pretrained` called once with `onnx-community/Kokoro-82M-v1.0-ONNX` | lib/interview/__tests__/kokoroWorker.test.ts, tts.test.ts | `jest.mock("kokoro-js")`, fake `self.postMessage` |
| 15 | Flag defined and listed | `featureFlags.interview.video` is boolean and `listToggleableFlags()` contains `interview.video`; `mergeWithDefaults({})` includes it | lib/__tests__/featureFlags.test.ts | none |

## Notes
- jsdom lacks `getUserMedia`, `speechSynthesis`, `SpeechSynthesisUtterance`, `AudioContext`, `Worker`, `HTMLMediaElement.play`; define per-test fakes on `navigator.mediaDevices`, `window`, and `global`, restore in `afterEach`. Mock `@/lib/interview/tts` wholesale in page/panel tests; test the real module only in `tts.test.ts`.
- Not unit-testable (recorded as explicit gaps): real Kokoro audio quality/latency and actual model download; real camera rendering and layout/visual styling of the panel; real browser autoplay-policy behaviour (only asserted that `prime()` is called synchronously in the Start handler, via call order vs. mocked fetch); echo/feedback of TTS into a real microphone; bundle-size/server-bundle exclusion (verify via `npm run build` output manually); Safari/Firefox support differences (SpeechRecognition especially).
- Existing tests mock `useFeatureFlags` as `{ interview: { enabled: true } }`; new tests use `{ interview: { enabled: true, video: true } }`.
