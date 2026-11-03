# Tasks: mock-interview-ux

## Implementation Checklist
- [x] Add `endedWithoutAnswers?: boolean` to `InterviewSessionDoc` in lib/interview/store.ts
- [x] Add `completeInterviewWithoutFeedback(sessionId)` to lib/interview/store.ts (sets status completed, completedAt, endedWithoutAnswers, no feedback)
- [x] Create lib/interview/sessionView.ts with `countAnsweredTurns`, `isValidSessionId`, `toInterviewDetail`
- [x] Add `InterviewDetail` and `EndInterviewResult` types in app/interview-actions.ts; add `endedWithoutAnswers` to `InterviewSummary` and map it in `getMyInterviewSessions`
- [x] Update `endInterviewEarly`: zero answered turns skips the LLM and returns `{ success: true, noAnswers: true }`
- [x] Add `getMyInterviewDetail(sessionId)` server action with session ownership check
- [x] page.tsx: replace optimistic turn mutation with `pendingAnswer`; keep textarea text until success; restore on failure
- [x] page.tsx: Cmd/Ctrl+Enter submit handler on the textarea plus hint text
- [x] page.tsx: add catch block to `handleEndEarly` and handle `noAnswers` result (return to setup with notice)
- [x] page.tsx: end-confirmation panel (`role="alertdialog"`) wired to the header button; timer auto-end bypasses confirmation
- [x] page.tsx: `timeUp` state and "Time's up" notice on feedback/setup screens; reset in `resetToSetup`
- [x] page.tsx: `role="timer"` + aria-label on countdown
- [x] page.tsx: `role="log"`, `aria-live="polite"`, aria-label on chat container
- [x] page.tsx: `aria-pressed` on difficulty, duration, and Type/Speak buttons
- [x] page.tsx: `htmlFor`/`id` on resume, role, skills labels; `role="group"` + `aria-labelledby` for difficulty and duration
- [x] page.tsx: change submit button hover to `hover:bg-purple-500`
- [x] page.tsx: separate `resumeError` rendered under the resume field with `role="alert"`
- [x] page.tsx: short descriptions for each difficulty and duration option
- [x] page.tsx: "Analysing your resume" `role="status"` line while `starting`
- [x] page.tsx: first-time-user empty state when no past sessions
- [x] page.tsx: clickable past rows (button for completed w/ feedback), "Ended - no answers" label, and `"detail"` phase view with Back
- [x] Write tests per test.md (sessionView, store, interview-actions, page)
- [x] Update MOCK_INTERVIEW_SETUP.md with a short note on the new behaviours

## Notes
- Order: types/store -> sessionView helper -> actions -> page -> docs/tests.
- `app/interview-actions.ts` is a "use server" file: export only async functions plus types, no constants.
- Keep `getCompletedInterviewFeedbacks` filter on `feedback: { $exists: true }`; that is what keeps no-answer sessions out of the learning plan.
- The timer effect closes over `handleEndEarly`; make sure the auto-end path does not require confirmation and does not depend on stale state.
- `getInterviewSession` already scopes by `userId`; reuse it for the detail action and validate the id string before `new ObjectId()` (invalid ids throw).
- Past sessions already stored with a 0 score from zero answers are not migrated (non-goal).
