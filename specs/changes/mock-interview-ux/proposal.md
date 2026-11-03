# Proposal: mock-interview-ux

## Problem Statement
The mock interview page (`app/mock-interview/page.tsx`) has several UX and safety gaps. "End interview" fires immediately with no confirmation; ending with zero answered turns saves a misleading 0/10 score that then feeds the learning plan; a failed answer submit has already cleared the textarea so the candidate loses what they wrote; `handleEndEarly` has no catch block so a thrown error leaves no message; the timer and chat are invisible to assistive tech; setup labels are not associated with inputs; and past interviews are a dead list with no way to re-read feedback or the transcript.

## Goals
- Prevent accidental or meaningless interview endings and never lose a typed answer.
- Make the timer, chat, and setup form accessible.
- Make the setup form clearer for first-time and returning users.
- Let users open a past completed interview to see its feedback and transcript.

## Non-Goals
- Resuming an in-progress interview after reload (item D).
- Refactoring the page into extracted components (item F).
- Pagination of past interviews (the existing limit of 20 stays).
- Any change to the learning plan generation or UI beyond not feeding it empty sessions.
- A new feature flag (`interview.enabled` already gates the page).

## Acceptance Criteria
### A. Flow safety
- [ ] Clicking "End interview" shows a confirmation prompt; the interview only ends after the user confirms, and choosing cancel keeps the interview running.
- [ ] Ending an interview (manually or via timer) with zero answered turns does not show a 0/10 score and does not offer "Update my learning plan"; the user is returned to setup with a short notice that the interview ended without answers.
- [ ] Server side, ending a session with zero answered turns does not call the LLM, stores no score/feedback, and such sessions are excluded from `getCompletedInterviewFeedbacks` (so never feed the learning plan).
- [ ] If submitting an answer fails (action returns `success: false` or throws), the answer text is back in the textarea, the optimistic answer bubble is removed from the chat, and an error is shown.
- [ ] Pressing Cmd+Enter or Ctrl+Enter in the answer textarea submits the answer (same rules as the button: non-empty, not already submitting).
- [ ] If `endInterviewEarly` throws or rejects, an error message is shown and the interview stays usable (submitting state resets).

### B. Timer and accessibility
- [ ] When the countdown reaches zero and the interview auto-ends, a visible "Time's up" notice is displayed (on the feedback screen, or on the setup screen in the zero-answer case).
- [ ] The countdown element has `role="timer"` and an accessible label (e.g. "Time remaining").
- [ ] The chat message container has `role="log"` with `aria-live="polite"` and an accessible label.
- [ ] Difficulty, duration, and Type/Speak toggle buttons expose `aria-pressed` reflecting selection.
- [ ] Every setup `<label>` is associated with its control via `htmlFor`/`id` (resume, role, skills); difficulty and duration groups are labelled via `role="group"` + `aria-labelledby`.
- [ ] The "Submit answer" button hover colour is `hover:bg-purple-500`, consistent with the other primary buttons.

### C. Setup form polish
- [ ] Resume validation errors (missing, bad type, too large) render directly beneath the resume field with `role="alert"`, not at the bottom of the form.
- [ ] Each difficulty option and each duration option shows a short description (visible text) of what it means.
- [ ] While starting, the submit button and an adjacent status line read that the resume is being analysed (e.g. "Analysing your resume and preparing your first question…"), announced via `role="status"`.
- [ ] A first-time user (no past sessions) sees an empty-state block explaining what the mock interview does and what to expect, in place of the Past interviews list.

### E. Past interview detail
- [ ] Each past session row is a keyboard-focusable button; completed sessions open a detail view, in-progress sessions are not openable (shown as "In progress", non-interactive).
- [ ] The detail view shows role/difficulty/duration/date, score, summary, strengths, improvements, and the full transcript (each question and the answer given).
- [ ] The detail view has a "Back" control that returns to the setup screen and past list.
- [ ] A new server action returns the detail for a session id only if the session belongs to the signed-in user; unauthenticated callers or other users' ids get `null`/an error with no data.
- [ ] Past rows for sessions ended without answers show "Ended - no answers" instead of a score and are not openable.

## Background
`page.tsx` is a single 718-line client component with phases `setup | interview | feedback`. `handleSubmitAnswer` sets the answer optimistically on the last turn and calls `setAnswer("")` before awaiting `submitInterviewAnswer`; on failure only `interviewError` is set. `handleEndEarly` wraps the call in `try/finally` with no `catch`, and the countdown effect calls it directly when time hits 0. `endInterviewEarly` in `app/interview-actions.ts` filters unanswered turns, calls the LLM with an empty transcript, and falls back to `{ score: 0 }` if the model returns a question; `completeInterviewSession` then persists it, and `getCompletedInterviewFeedbacks` (lib/interview/store.ts) includes it for the learning plan. `getMyInterviewSessions` returns `InterviewSummary` with no transcript or feedback beyond `score`. Feedback is stored in `doc.feedback`; turns in `doc.turns`.
