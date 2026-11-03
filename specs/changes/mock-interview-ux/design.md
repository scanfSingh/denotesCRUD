# Design: mock-interview-ux

## Approach
Keep the single client component (refactor is out of scope) but add a fourth phase value `"detail"` for past-session viewing, a small inline confirmation UI for ending, and state for a "notice" banner. Business rules that need testing live outside the component: a new pure helper module `lib/interview/sessionView.ts` (answered-turn counting, "should this session produce feedback", mapping a session doc to the client detail shape), and server actions that use it.

Zero-answer handling: `endInterviewEarly` counts answered turns first. If zero, it skips the LLM, calls a new store function `completeInterviewWithoutFeedback(sessionId)` that sets `status: "completed"`, `completedAt`, `endedWithoutAnswers: true` and writes no `feedback`. Because `getCompletedInterviewFeedbacks` already requires `feedback: { $exists: true }`, such sessions never reach the learning plan. The action returns `{ success: true, noAnswers: true }`. `submitInterviewAnswer` is unaffected (it always has at least one answer). The confirm dialog uses an inline in-page confirmation panel (role="alertdialog") rather than `window.confirm`, so it is testable and styled; Cancel and Confirm buttons.

Submit failure restore: do not clear the textarea until success. Keep the optimistic bubble but on failure roll back the last turn's answer (remove it) and keep/restore `answer`. Simplest: on submit, remember `trimmed`; set turn answer optimistically and `setAnswer("")` is replaced by clearing only after `result.success`. Since the textarea is `disabled` while submitting and shows the answer, the optimistic bubble would duplicate it; so render the optimistic answer bubble from a `pendingAnswer` state instead of mutating `turns`, and push it into `turns` only on success. This removes the need for rollback.

Time's up: the auto-end path sets a `timeUp` flag (ref + state) so the resulting feedback/setup screen shows a "Time's up" banner. Reset in `resetToSetup`.

Past detail: `getMyInterviewSessions` summary gains `endedWithoutAnswers`. New action `getMyInterviewDetail(sessionId)` returns the detail. Clicking a completed row calls it, sets `detail` state, `phase = "detail"`.

## Impacted Files
| File | Change | Notes |
| ---- | ------ | ----- |
| lib/interview/store.ts | modify | Add `endedWithoutAnswers?: boolean` to `InterviewSessionDoc`; add `completeInterviewWithoutFeedback`. `getCompletedInterviewFeedbacks` unchanged (already requires feedback). |
| lib/interview/sessionView.ts | create | Pure helpers: `countAnsweredTurns`, `toInterviewDetail`, `isValidSessionId`. |
| app/interview-actions.ts | modify | `endInterviewEarly` zero-answer branch and new return variant; extend `InterviewSummary`; add `InterviewDetail` type and `getMyInterviewDetail`. |
| app/mock-interview/page.tsx | modify | All UI items A, B, C, E. |
| MOCK_INTERVIEW_SETUP.md | modify | Short note on zero-answer sessions and past-interview detail. |
| lib/interview/__tests__/sessionView.test.ts | create | Helper tests. |
| lib/interview/__tests__/store.test.ts | create | Store function tests with fake collection. |
| app/__tests__/interview-actions.test.ts | create | Server action tests with mocks. |
| app/mock-interview/__tests__/page.test.tsx | create | RTL tests. |

## Data Model
Collection `interviewSessions` (unchanged shape otherwise). One new optional field on `InterviewSessionDoc`: `endedWithoutAnswers?: boolean`. No migration; absent means false. Existing 0/10 sessions already stored stay as-is.

New/extended client types in `app/interview-actions.ts`:
```ts
export interface InterviewSummary { /* existing */ endedWithoutAnswers?: boolean; }
export interface InterviewDetail {
  id: string; role: string; difficulty: string; durationMinutes: number;
  createdAt: string; completedAt?: string;
  feedback: InterviewFeedback;               // detail only returned when feedback exists
  turns: { question: string; answer?: string }[];
}
export type EndInterviewResult =
  | { success: true; feedback: InterviewFeedback; noAnswers?: false }
  | { success: true; noAnswers: true }
  | { success: false; error: string };
```
Resume text is never included in the detail.

## Server Actions / API
| Name or route | Auth required | Input | Output |
| ------------- | ------------- | ----- | ------ |
| `endInterviewEarly(sessionId)` (modified) | yes, `getCurrentUserId()` | sessionId | `EndInterviewResult`; zero answered turns: no LLM call, no score |
| `getMyInterviewSessions()` (modified) | yes (returns [] if none) | none | `InterviewSummary[]` incl. `endedWithoutAnswers` |
| `getMyInterviewDetail(sessionId)` (new) | yes; query scoped by `userId` via `getInterviewSession(sessionId, userId)` | sessionId (validated as ObjectId hex, else null) | `InterviewDetail \| null`; null when unauthenticated, invalid id, not found, not owned, not completed, or no feedback |

## UI
Remains one `"use client"` page. Changes:
- End confirmation panel (`role="alertdialog"`, Cancel / "End interview"), shown inline under the header bar; opened by the header button.
- Timer span: `role="timer"`, `aria-label="Time remaining"`; (no aria-live to avoid per-second announcements).
- Chat container: `role="log"`, `aria-live="polite"`, `aria-label="Interview conversation"`.
- `aria-pressed` on difficulty, duration, Type/Speak buttons; labels with `htmlFor`/`id`; groups with `role="group"` and `aria-labelledby`.
- Textarea `onKeyDown`: `(metaKey || ctrlKey) && key === "Enter"` triggers submit. Hint text "Ctrl/Cmd + Enter to send".
- Submit button hover `hover:bg-purple-500`.
- Resume error state `resumeError` separate from `setupError`, rendered under the resume field.
- Option descriptions (page-level constants): easy "Fundamentals and warm-up questions", medium "Practical, role-level questions", hard "Deep dives and system design"; 30 min "Quick practice session", 60 min "Standard session", 90 min "Extended deep-dive session".
- Starting state: `role="status"` line "Analysing your resume and preparing your first question…".
- Empty state when `pastSessions.length === 0`.
- Past rows: `<button>` for completed-with-feedback sessions; plain `<div>` otherwise. Detail phase renders summary/strengths/improvements/transcript with a "Back" button.
- Notice banner state (`notice`) used for "Time's up" and "Interview ended without answers".

## Feature Flag / Env
None. No new flag: the page is already gated by `interview.enabled` (`lib/featureFlags.ts`), and the new behaviour is part of that page. No new env vars.
