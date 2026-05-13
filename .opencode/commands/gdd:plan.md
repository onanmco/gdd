---
description: Create a locked Goal Driven Development plan.
---

Use the GDD planning workflow from `skills/plan/SKILL.md`.

The plan name must be explicitly asked. Interactively clarify requirements, research similar projects, decide stack with the user, offer `visual/` companion artifacts for UI work, generate and confirm Mermaid diagrams, then confirm every task's acceptance criteria and exact testing method before writing `gdd/plans/{plan_slug}/plan.md`.

Validate before locking:

```bash
node dist/internal.js validate-plan gdd/plans/<plan_slug>/plan.md
node dist/internal.js write-manifest gdd/plans/<plan_slug>/plan.md
```
