---
name: continue
description: Use for `/gdd:continue` or `$gdd:continue` to resume an interrupted GDD implementation from a plan path.
---

# GDD Continue

This skill resumes a GDD run from disk state, not chat history.

## Required Flow

1. Require a plan path argument or identify exactly one active `gdd/plans/*/plan.md`.
2. If no plan exists, report a true negative: no GDD plan can be resumed.
3. Validate the plan:

```bash
node <plugin-root>/dist/internal.js validate-plan <plan.md>
```

4. If `memory.md` does not exist, start from scratch by creating it:

```bash
node <plugin-root>/dist/internal.js init-memory <plan.md>
```

5. If `memory.md` exists, validate it:

```bash
node <plugin-root>/dist/internal.js validate-memory <plan.md> <memory.md>
```

6. Replay the memory ledger to determine completed tasks and the current incomplete task.
7. Continue with the same rules as `gdd:implement`.

## Resume Rules

- Never infer progress from chat history.
- Never rewrite previous memory entries.
- If validation fails, append or report a blocker depending on whether memory can still be safely appended.
- If the plan exists but memory does not, this is a valid start-from-scratch resume.
- If neither exists, respond clearly that there is nothing to continue.
