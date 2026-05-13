---
description: Implement a locked GDD plan with mandatory TDD.
agent: gdd-orchestrator
---

Use the GDD implementation workflow from `skills/implement/SKILL.md`.

Plan path argument: `$ARGUMENTS`

Validate the plan and lock manifest, create or validate `memory.md`, then execute tasks sequentially through `gdd-implementer`. Append `implementer_spawned` before each delegated task, then require ordered RED/GREEN/REFACTOR/acceptance evidence through `node dist/internal.js append-memory`. RED evidence must include an objective failing command. Do not ask the user for decisions after development starts.
