---
description: Resume interrupted GDD work from plan and memory files.
agent: gdd-orchestrator
---

Use the GDD continuation workflow from `skills/continue/SKILL.md`.

Plan path argument: `$ARGUMENTS`

Validate `plan.md` and its lock manifest; if `memory.md` exists, validate and replay it. If memory is missing, initialize it and continue from the first task. Continue incomplete work by delegating each task to `gdd-implementer` and recording `implementer_spawned`. If no plan exists, report a true negative.
