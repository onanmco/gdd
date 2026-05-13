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
node <plugin-root>/dist/internal.js validate-lock <plan.md>
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
7. Continue with the same rules as `gdd:implement`: the main agent orchestrates, invokes `gdd-implementer` for each incomplete task when subagents are available, and records `implementer_spawned` before `task_started`.

## Resume Rules

- Never infer progress from chat history.
- Never rewrite previous memory entries.
- If validation fails, append or report a blocker depending on whether memory can still be safely appended.
- `red_recorded` must include objective failing command evidence.
- Guard errors are hard failures. Do not treat guard errors as warnings and do not bypass them with shell writes.
- When the harness supports subagents, do not continue task implementation in the main agent. Delegate the incomplete task to `gdd-implementer`.
- If the harness cannot spawn subagents, state the limitation and continue with the main-agent fallback using the same memory and TDD requirements.
- If the plan exists but memory does not, this is a valid start-from-scratch resume.
- If neither exists, respond clearly that there is nothing to continue.
