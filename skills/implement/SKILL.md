---
name: implement
description: Use for `/gdd:implement` or `$gdd:implement` when the user has a locked GDD plan and wants autonomous TDD implementation.
---

# GDD Implement

This skill implements a locked GDD plan with sequential task execution, append-only memory, and mandatory TDD.

Delegation rules apply to the command or orchestrator agent. If you are already running as `gdd-implementer`, implement only the assigned task and do not spawn another implementer.

## Non-Negotiable Rules

- Do not ask the user new product or implementation questions after development starts.
- Validate `plan.md` before doing any work.
- Validate the plan lock before doing any implementation work.
- Create `memory.md` right before the first implementation task if it does not exist.
- Never edit `plan.md`, diagrams, `manifest.json`, or existing `memory.md` bytes.
- Append to memory only with the internal append command.
- Execute tasks sequentially by default.
- When the harness supports subagents, the main agent is an orchestrator: it must invoke `gdd-implementer` for each incomplete task and must not implement task code itself.
- Before each delegated task starts, append `implementer_spawned` with command evidence that names the task and `gdd-implementer`.
- Every task must run RED -> GREEN -> REFACTOR before completion.
- `red_recorded` must include objective failing command evidence. A narrative coverage gap is not RED.
- Guard errors are hard failures. Do not treat guard errors as warnings and do not bypass them with shell writes.
- A task cannot be completed without ordered memory entries for:
  `task_started`, `red_recorded`, `green_recorded`, `refactor_recorded`, `acceptance_verified`, `task_completed`.
- If a task gets stuck, spawn or invoke a reviewer/debugger subagent where the harness supports it, append `reviewer_spawned` or `debugger_spawned`, then keep working or move to another unblocked task.
- If the harness cannot spawn subagents, state the limitation and continue with the main-agent fallback using the same memory and TDD requirements.

## Required Flow

1. Resolve the plan path from the user argument or current context.
2. Run:

```bash
node <plugin-root>/dist/internal.js validate-plan <plan.md>
```

3. Run:

```bash
node <plugin-root>/dist/internal.js validate-lock <plan.md>
```

4. If `memory.md` is absent, run:

```bash
node <plugin-root>/dist/internal.js init-memory <plan.md>
```

5. Run:

```bash
node <plugin-root>/dist/internal.js validate-memory <plan.md> <memory.md>
```

6. Replay memory to find the first incomplete task.
7. Set task guard context for the harness when possible:

```bash
export GDD_ACTIVE_PLAN="<plan.md>"
export GDD_ACTIVE_MEMORY="<memory.md>"
export GDD_ACTIVE_TASK="TASK-000"
export GDD_REPO_ROOT="$PWD"
```

8. For each task:
   - invoke `gdd-implementer` when subagents are available;
   - append `implementer_spawned` before task work begins;
   - have the implementer append `task_started`;
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
event: implementer_spawned
harness: opencode
agent: main
summary: Delegated TASK-001 to gdd-implementer.
evidence:
  commands:
    - command: spawn subagent gdd-implementer TASK-001
      exit_code: 0
      output_excerpt: gdd-implementer accepted TASK-001.
  files_changed: []
next_action: Subagent will append task_started and prove RED.
YAML
```

Task implementation evidence must be appended by the implementer with `agent: subagent`:

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

9. After each task, rerun:

```bash
node <plugin-root>/dist/internal.js validate-memory <plan.md> <memory.md>
```
