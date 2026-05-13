# Architecture

GDD is deliberately skill-based. The user does not run a standalone `gdd` CLI. Harness-native skills and commands drive the workflow, while internal Node scripts provide hard validation and hook enforcement.

## Components

- `skills/`: canonical `plan`, `implement`, and `continue` workflows.
- `schemas/`: public schema definitions for `plan.md` and `memory.md`.
- `src/validators/`: executable Markdown/YAML validators.
- `src/ledger/`: hash-chain memory creation and append-only entry generation.
- `src/guards/`: hook guard for locked artifacts, allowed scope, and pre-RED edits.
- `src/visual/`: plan-local visual companion server.
- `agents/`: Claude-compatible subagent definitions for implementation, review, and debugging.
- `.opencode/commands/`: OpenCode slash commands and aliases.
- `.opencode/plugins/`: OpenCode TypeScript hook plugin.
- `.claude-plugin/` and `.codex-plugin/`: plugin manifests.

## Guard Model

GDD uses layered enforcement:

1. Skills define the workflow and require internal validator calls at phase boundaries.
2. Validators reject malformed plans, unconfirmed task contracts, invalid memory, and out-of-order TDD completion.
3. Hook guards block direct writes to locked artifacts and block source edits before RED evidence when `GDD_ACTIVE_PLAN`, `GDD_ACTIVE_MEMORY`, and `GDD_ACTIVE_TASK` are set.
4. Memory is append-only by construction through `append-memory`; historical tampering is detected by the hash chain.

## TDD State Machine

The completion path is:

```text
task_started -> red_recorded -> green_recorded -> refactor_recorded -> acceptance_verified -> task_completed
```

`append-memory` refuses to append later events before prerequisite events. `validate-memory` replays the full ledger and rejects invalid completions.

## Visual Companion

For UI work, `gdd:plan` may create `gdd/plans/{plan_slug}/visual/index.html` from `templates/visual/index.html` and serve it with:

```bash
node dist/internal.js visual-server gdd/plans/{plan_slug}/visual 4377
```

The server appends click/review events to `visual/events.ndjson`, keeping visual clarification tied to the plan folder.
