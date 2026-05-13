---
name: implement
description: Use for `/gdd:implement` or `$gdd:implement` when the user has a locked GDD plan and wants autonomous TDD implementation.
---

# GDD Implement

This skill implements a locked GDD plan with sequential task execution, append-only memory, and mandatory TDD.

## Non-Negotiable Rules

- Do not ask the user new product or implementation questions after development starts.
- Validate `plan.md` before doing any work.
- Create `memory.md` right before the first implementation task if it does not exist.
- Never edit `plan.md`, diagrams, `manifest.json`, or existing `memory.md` bytes.
- Append to memory only with the internal append command.
- Execute tasks sequentially by default.
- Every task must run RED -> GREEN -> REFACTOR before completion.
- A task cannot be completed without ordered memory entries for:
  `task_started`, `red_recorded`, `green_recorded`, `refactor_recorded`, `acceptance_verified`, `task_completed`.
- If a task gets stuck, spawn or invoke a reviewer/debugger subagent where the harness supports it, append `reviewer_spawned` or `debugger_spawned`, then keep working or move to another unblocked task.

## Required Flow

1. Resolve the plan path from the user argument or current context.
2. Run:

```bash
node <plugin-root>/dist/internal.js validate-plan <plan.md>
```

3. If `memory.md` is absent, run:

```bash
node <plugin-root>/dist/internal.js init-memory <plan.md>
```

4. Run:

```bash
node <plugin-root>/dist/internal.js validate-memory <plan.md> <memory.md>
```

5. Replay memory to find the first incomplete task.
6. Set task guard context for the harness when possible:

```bash
export GDD_ACTIVE_PLAN="<plan.md>"
export GDD_ACTIVE_MEMORY="<memory.md>"
export GDD_ACTIVE_TASK="TASK-000"
export GDD_REPO_ROOT="$PWD"
```

7. For each task:
   - append `task_started`;
   - create the planned failing test first;
   - run the planned RED command and append `red_recorded` with failing evidence;
   - implement only the minimum required code;
   - run the planned GREEN command and append `green_recorded`;
   - refactor if useful;
   - run the planned REFACTOR verification and append `refactor_recorded`;
   - verify each acceptance criterion and append `acceptance_verified`;
   - append `task_completed`.

Append memory entries with:

```bash
node <plugin-root>/dist/internal.js append-memory <plan.md> <memory.md> <<'YAML'
task_id: TASK-001
event: red_recorded
harness: codex
agent: subagent
summary: Added failing validator test before implementation.
evidence:
  commands:
    - command: npm test -- plan-validator.test.ts
      exit_code: 1
      output_excerpt: Expected schema error was not thrown.
  files_changed:
    - tests/validators/plan-validator.test.ts
next_action: Implement the minimum validator logic.
YAML
```

8. After each task, rerun:

```bash
node <plugin-root>/dist/internal.js validate-memory <plan.md> <memory.md>
```
