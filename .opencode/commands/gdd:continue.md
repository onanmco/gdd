---
description: Resume interrupted GDD work from plan and memory files.
---

Use the GDD continuation workflow from `skills/continue/SKILL.md`.

Plan path argument: `$ARGUMENTS`

Validate `plan.md`; if `memory.md` exists, validate and replay it. If memory is missing, initialize it and continue from the first task. If no plan exists, report a true negative.
