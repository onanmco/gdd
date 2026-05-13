# GDD

Goal Driven Development is a skill-based AI development plugin for plan-first, TDD-enforced implementation across Claude Code, Codex, OpenCode, and other agent harnesses.

GDD has two phases:

1. `gdd:plan`: turn an idea into a locked plan under `gdd/plans/{plan_slug}/`.
2. `gdd:implement` / `gdd:continue`: orchestrate the locked plan through sequential `gdd-implementer` subagent task loops with append-only memory.

## Commands

Use the native invocation style of your harness:

- Claude Code: `/gdd:plan`, `/gdd:implement`, `/gdd:continue`
- OpenCode: `/gdd:plan`, `/gdd:implement`, `/gdd:continue`, plus `/gdd-plan` aliases
- Codex: `$gdd:plan`, `$gdd:implement`, `$gdd:continue` when installed as a Codex plugin

## Install From GitHub

Claude Code:

```text
/plugin marketplace add onanmco/gdd
/plugin install gdd@gdd
```

Then restart Claude Code and run `/gdd:plan`.

Codex:

```bash
codex plugin marketplace add onanmco/gdd
```

Then restart Codex and run `$gdd:plan`. Codex clones/caches the marketplace internally, so you do not need to keep a local checkout.

OpenCode:

```bash
npm exec --yes --package github:onanmco/gdd gdd-install -- opencode
```

Then restart OpenCode and run `/gdd:plan`. The installer copies commands, GDD agents, and runtime into `~/.config/opencode`, so no local repository is required.

For details, see [docs/installation.md](docs/installation.md).

## What GDD Enforces

- The plan name is always asked from the user.
- Comparable-domain research is required separately from tooling research.
- `plan.md` and Mermaid diagrams are immutable after `manifest.json` locks them.
- `memory.md` is append-only and hash-chained.
- Implementation commands use a main orchestrator and delegate each task to `gdd-implementer` where the harness supports subagents.
- Every task has structured requirements, acceptance criteria, and testing method.
- Acceptance criteria and testing method must be user-confirmed for every task before planning can finish.
- Automated tests are mandatory unless the user explicitly approves a per-task exception during planning.
- Task completion requires ordered memory evidence for `task_started`, `red_recorded`, `green_recorded`, `refactor_recorded`, `acceptance_verified`, and `task_completed`. Delegated runs also record `implementer_spawned` before `task_started`.

## Artifact Layout

```text
gdd/plans/{plan_slug}/
  plan.md
  manifest.json
  memory.md
  diagrams/
    flowchart.mmd
    sequence.mmd
    index.html
  visual/
    index.html
    events.ndjson
```

## Development

Install dependencies and validate:

```bash
npm install
npm run validate
npm run build
```

Internal guard commands are exposed through `node dist/internal.js`. They are not a user-facing `gdd` CLI; skills and hooks invoke them to enforce schema, immutability, append-only memory, and TDD transitions.

Useful internal commands:

```bash
node dist/internal.js validate-plan gdd/plans/example/plan.md
node dist/internal.js validate-lock gdd/plans/example/plan.md
node dist/internal.js init-memory gdd/plans/example/plan.md
node dist/internal.js validate-memory gdd/plans/example/plan.md gdd/plans/example/memory.md
node dist/internal.js append-memory gdd/plans/example/plan.md gdd/plans/example/memory.md < entry.yaml
node dist/internal.js prepare-visual gdd/plans/example
node dist/internal.js prepare-diagrams gdd/plans/example
node dist/internal.js visual-server gdd/plans/example/visual
```

## Schemas

Schema documentation lives in [schemas/README.md](schemas/README.md). JSON Schema files live in:

- [schemas/plan.v1.schema.json](schemas/plan.v1.schema.json)
- [schemas/memory.v1.schema.json](schemas/memory.v1.schema.json)

The TypeScript validators enforce additional cross-field rules that JSON Schema cannot express cleanly, including acceptance criterion test references, task dependency references, and TDD ledger replay order.
