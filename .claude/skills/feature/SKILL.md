---
name: feature
description: Run a feature, bug fix, or change through the spec-driven pipeline — product-manager → software-developer → reviewer — with the reviewer as a hard gate. On rejection, loops back to the developer with the issues list (max 3 attempts). Use for any new feature, bug fix, or change. Argument is a free-text description or an existing change-name to resume.
argument-hint: '[free-text description | existing change-name to resume]'
---

Run a change end-to-end through three role agents. Only a reviewer signoff marks it complete.

## Input

`$ARGUMENTS` — one of:
- A free-text description (e.g. `add dark mode toggle to profile page`)
- The name of an **existing** `specs/changes/<change-name>/` directory → **resume mode**
- Nothing — ask via **AskUserQuestion** what to build or fix

### Resume mode

If the argument matches an existing `specs/changes/<change-name>/` directory (check with Glob before invoking any agent), inspect artifacts and propose an entry stage:

| Observed state | Entry |
| --- | --- |
| `signoff.md` present | Already complete — report and stop |
| `rejection.md` newer than `signoff.md`/absent signoff | software-developer with `issues: see specs/changes/<name>/rejection.md` |
| All `tasks.md` boxes ticked, no verdict file | reviewer |
| `tasks.md` has unticked boxes | software-developer — first ask: "Did you implement some of this manually?" If yes, with the user's confirmation tick those tasks yourself, appending ` (user-implemented)`, and enter at the reviewer. This is the only case where you edit spec files. |

Confirm the entry stage with the user via **AskUserQuestion**, then run from that stage onward.

## Pipeline

You are the orchestrator. You do not read code or write artifacts — you only invoke the agents and act on their return lines.

### Stage 1 — product-manager

Invoke the `product-manager` subagent with the user's input. It branches, explores the codebase, and writes `proposal.md`, `design.md`, `tasks.md`, `test.md`. It returns:

```
PRODUCT-MANAGER: change=<change-name>
```

If the line is missing, abort and explain. **Then show the user the spec path and pause for approval via AskUserQuestion ("Spec looks good — proceed to implementation?")**. The spec is the point of this workflow; the user must get a chance to edit it before code is written.

### Stage 2 — software-developer

Invoke `software-developer` with `<change-name>`. It implements every unchecked task, writes the planned tests, and runs `tsc` plus scoped Jest. Returns:

```
SOFTWARE-DEVELOPER: change=<change-name> tasks-completed=<X/N> tsc=<pass|fail> scoped-tests=<pass|fail|n/a>
```

If `tsc=fail` or `scoped-tests=fail`, re-invoke it once with `issues:` set to the failure summary before continuing.

### Stage 3+ — reviewer (gate, with loop)

`attempt = 1`. Loop:

1. Invoke `reviewer` with `<change-name>`. It returns one of:
   ```
   REVIEWER: SIGNED OFF change=<change-name>
   REVIEWER: REJECTED change=<change-name> failed-gates=<list>
   ```
2. `SIGNED OFF` → print:
   ```
   ✅ <change-name> complete. Signoff: specs/changes/<change-name>/signoff.md
   Next (manual): review the diff, commit, push, open a PR.
   ```
   Stop. Do not commit, push, or open a PR.
3. `REJECTED` → print `🔄 Reviewer rejected attempt <attempt> (<gates>). Looping to software-developer.`, re-invoke `software-developer` with `issues: see specs/changes/<change-name>/rejection.md`, `attempt += 1`. If `attempt > 3`, print `❌ Aborting after 3 rejected attempts. See specs/changes/<change-name>/rejection.md.` and stop.

## Process sweep

Before invoking the reviewer, stop stray dev servers a prior stage may have left running:

```bash
pkill -f 'next dev' 2>/dev/null || true
pkill -f 'jest' 2>/dev/null || true
```

**Never `pkill -f node`** — that kills Claude Code itself.

## Guardrails

- Never bypass the reviewer; there is no manual skip.
- Order is always PM → Dev → Reviewer; only Dev → Reviewer loops.
- Never modify spec files yourself (except adopt-manual resume).
- If an agent fails to return its expected line, abort — don't guess the result.
