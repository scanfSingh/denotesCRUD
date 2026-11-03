# CLAUDE.md

Guidance for Claude Code in this repository. Stack and conventions live in the `denotes-project` skill (`.claude/skills/denotes-project/SKILL.md`) — read it before touching code.

## Commands

```bash
npm run dev      # dev server
npm run build    # production build (also type-checks)
npx tsc --noEmit # fast type-check
npm test         # Jest (next/jest + jsdom + Testing Library)
npm test -- path/to/file.test.ts   # single file
npm run test:coverage
```

No linter is configured. Tests live in `__tests__/` folders beside the source (or as `<name>.test.ts(x)`); `@/` imports work in tests. Mock Mongo and external APIs (Gemini, Groq, Upstash) — never hit real services from tests.

## Spec-Driven Development

Every feature, bug fix, or change goes through a spec first. **Do not implement directly — start with `/feature`.**

| Stage | Agent | Output |
|---|---|---|
| 1 | `product-manager` | `proposal.md`, `design.md`, `tasks.md`, `test.md` in `specs/changes/<name>/` + a `feature/<name>` branch |
| 2 | `software-developer` | Code + tests for every task; ticked `tasks.md` |
| 3 | `reviewer` | **Hard gate.** Spec-conformance review + `tsc` + full Jest suite + `build`. Writes `signoff.md` or `rejection.md` (loops back to dev, max 3 attempts) |

- A feature is complete only on `REVIEWER: SIGNED OFF`.
- Specs live in `specs/changes/<kebab-case-name>/` and are committed with the code. They are the record of *why* a change was made; do not delete them.
- Trivial edits (typo, copy tweak, one-line config) may skip the pipeline — say so explicitly rather than skipping silently.
- Committing, pushing, and opening PRs are manual user actions after signoff.
- Resume an in-flight change with `/feature <change-name>`.
