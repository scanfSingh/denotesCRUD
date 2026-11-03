# Test Plan: mock-interview-ux

## Coverage Map
| # | Acceptance criterion | Behaviour to assert | Test file | Mocks needed |
| - | -------------------- | ------------------- | --------- | ------------ |
| 1 | End asks for confirmation | Click "End interview": alertdialog appears and `endInterviewEarly` not called; Cancel hides it and interview stays; Confirm calls it once | app/mock-interview/__tests__/page.test.tsx | `../interview-actions`, `../components/ProtectedRoute`, `Navigation`, `AudioRecorder`, `FeatureFlagsProvider` (useFeatureFlags), global `fetch` |
| 2 | Zero-answer end shows no score in UI | `endInterviewEarly` resolves `{success:true,noAnswers:true}`: no "/10" text, no "Update my learning plan", setup form shown with notice | page.test.tsx | same as 1 |
| 3 | Zero-answer server behaviour | `endInterviewEarly` with only unanswered turns does not call `generateInterviewTurn`, calls `completeInterviewWithoutFeedback`, returns `noAnswers:true`; with an answered turn it still generates feedback | app/__tests__/interview-actions.test.ts | `@/lib/interview/store`, `@/lib/interview/generator`, `../actions` (getCurrentUserId), `@/lib/mongodb` |
| 3b | Store excludes no-feedback sessions | `getCompletedInterviewFeedbacks` queries with `feedback: {$exists:true}`; `completeInterviewWithoutFeedback` sets `endedWithoutAnswers:true` and no `feedback` | lib/interview/__tests__/store.test.ts | `@/lib/mongodb` (fake collection) |
| 4 | Failed submit restores answer | `submitInterviewAnswer` returns `{success:false}` and, separately, rejects: textarea value equals the typed text, no answer bubble in the log, error text visible | page.test.tsx | same as 1 |
| 5 | Cmd/Ctrl+Enter submits | `userEvent.type` with `{Control>}{Enter}` and `{Meta>}{Enter}` calls `submitInterviewAnswer` once; plain Enter does not; empty text does not | page.test.tsx | same as 1 |
| 6 | `handleEndEarly` catch | `endInterviewEarly` rejects: error message shown, "End interview" button enabled again | page.test.tsx | same as 1 |
| 7 | Time's up notice | Fake timers; start interview with deadline in the past/near: after tick, `endInterviewEarly` called without confirmation and "Time's up" text visible on the resulting screen | page.test.tsx | same as 1 + `jest.useFakeTimers` |
| 8 | Timer role/label | `getByRole("timer", {name: /time remaining/i})` present with `m:ss` text | page.test.tsx | same as 1 |
| 9 | Chat role=log | `getByRole("log")` has `aria-live="polite"` and contains the question | page.test.tsx | same as 1 |
| 10 | aria-pressed | Difficulty/duration buttons: selected has `aria-pressed="true"`, others `false`; changes on click; same for Type/Speak | page.test.tsx | same as 1 |
| 11 | Label association | `getByLabelText(/target role/i)`, `/skills to focus on/i`, `/resume/i` resolve to the inputs; groups found via `getByRole("group", {name: /difficulty/i})` | page.test.tsx | same as 1 |
| 12 | Submit hover colour | Submit button className contains `hover:bg-purple-500` and not `hover:bg-purple-700` (class-string check only) | page.test.tsx | same as 1 |
| 13 | Inline resume validation | Submit without file: `getByRole("alert")` is within the resume field container; uploading a `.txt` file shows the type error there | page.test.tsx | same as 1 |
| 14 | Option descriptions | Each difficulty and duration description text is rendered | page.test.tsx | same as 1 |
| 15 | Analysing state | With `fetch` pending, `getByRole("status")` shows "Analysing your resume" and submit is disabled | page.test.tsx | same as 1 |
| 16 | First-time empty state | `getMyInterviewSessions` resolves `[]`: empty-state text shown; with sessions it is not | page.test.tsx | same as 1 |
| 17 | Clickable past rows | Completed row is a button, click calls `getMyInterviewDetail(id)`; in-progress row is not a button | page.test.tsx | same as 1 |
| 18 | Detail view content + Back | Shows score, summary, strengths, improvements, each question and answer; Back returns to setup form | page.test.tsx | same as 1 |
| 19 | Detail action ownership | Unauthenticated -> null without DB call; invalid id -> null; `getInterviewSession` called with (id, userId from session); not found / in-progress / no feedback -> null; owned completed -> detail without `resumeText` | app/__tests__/interview-actions.test.ts | same as 3 |
| 19b | Mapping helpers | `toInterviewDetail` maps ids/dates to strings and turns; `countAnsweredTurns` ignores empty/whitespace answers; `isValidSessionId` accepts 24-hex only | lib/interview/__tests__/sessionView.test.ts | none |
| 20 | "Ended - no answers" row | Summary with `endedWithoutAnswers:true` renders that label, no score, not a button | page.test.tsx | same as 1 |

## Notes
- Criterion 12 is only checked as a class string; the actual rendered hover colour cannot be verified in jsdom (explicit gap, confirm visually).
- Visual layout of the confirmation panel, option descriptions, empty state, and the pulse/colour of the timer are not unit-testable beyond text/role presence (explicit gaps for pure visuals).
- Screen-reader announcement behaviour of `aria-live` and `role="timer"` cannot be verified in Jest; only attributes are asserted.
- Page tests mock `AudioRecorder` (browser media APIs) and `ProtectedRoute`/`Navigation` (session/router). Use `getByRole` first, then `getByTestId`, then `getByText`.
- Server-action tests mock `@/lib/mongodb`, `@/lib/interview/*`, and `getCurrentUserId` from `app/actions`; no real DB or LLM calls.
