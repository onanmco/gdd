# Architecture

GDD is deliberately skill-based. The user does not run a standalone `gdd` CLI. Harness-native skills and commands drive the workflow, while internal Node scripts provide hard validation and hook enforcement.

## Components

- `skills/`: canonical `plan`, `implement`, and `continue` workflows.
- `schemas/`: public schema definitions for `plan.md` and `memory.md`.
- `src/validators/`: executable Markdown/YAML validators.
- `src/ledger/`: hash-chain memory creation and append-only entry generation.
- `src/guards/`: hook guard for locked artifacts, allowed scope, and pre-RED edits.
- `src/visual/`: plan-local visual companion server.
- `agents/`: Claude-compatible agent definitions for implementation orchestration, task implementation, review, and debugging.
- `.opencode/agents/`: OpenCode-specific copies with primary/subagent mode and permission frontmatter.
- `.opencode/commands/`: OpenCode slash commands and aliases.
- `.opencode/plugins/`: OpenCode TypeScript hook plugin.
- `.claude-plugin/` and `.codex-plugin/`: plugin manifests.

## Guard Model

GDD uses layered enforcement:

1. Skills define the workflow and require internal validator calls at phase boundaries.
2. Implementation skills make the command agent an orchestrator and delegate each task to `gdd-implementer` when subagents are available.
3. Validators reject malformed plans, unconfirmed task contracts, invalid memory, and out-of-order TDD completion.
4. Hook guards block direct writes to lock manifests and memory, block writes to locked plan artifacts after `manifest.json` exists, and block source edits before RED evidence when `GDD_ACTIVE_PLAN`, `GDD_ACTIVE_MEMORY`, and `GDD_ACTIVE_TASK` are set.
5. Memory is append-only by construction through `append-memory`; historical tampering is detected by the hash chain.

## TDD State Machine

The completion path is:

```text
task_started -> red_recorded -> green_recorded -> refactor_recorded -> acceptance_verified -> task_completed
```

`append-memory` refuses to append later events before prerequisite events, validates the fully constructed entry before writing, and requires `red_recorded` to include a failing command. `validate-memory` replays the full ledger and rejects invalid completions.

Delegated implementations also record `implementer_spawned` before `task_started`. The event is optional for harnesses that cannot spawn subagents, but invalid if recorded after task work has already started.

## Visual Companion

For UI work, `gdd:plan` may create `gdd/plans/{plan_slug}/visual/index.html` from `templates/visual/index.html` and make it browser-ready with:

```bash
node dist/internal.js prepare-visual gdd/plans/{plan_slug}
```

The command prints a `file://` URL that can be opened directly in a browser. The optional `visual-server` command still exists when event capture into `visual/events.ndjson` is useful.

## Diagram Companion

`gdd:plan` creates Mermaid sources under `diagrams/` and then runs:

```bash
node dist/internal.js prepare-diagrams gdd/plans/{plan_slug}
```

The command writes `diagrams/index.html` with the Mermaid sources inlined and prints a browser-ready `file://` URL.
