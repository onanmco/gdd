---
description: Create a locked Goal Driven Development plan.
---

Use the GDD planning workflow from `skills/plan/SKILL.md`.

The plan name must be explicitly asked. Interactively clarify requirements, research comparable-domain projects separately from tooling, decide stack with the user, offer `visual/` companion artifacts for UI work, generate browser-ready visual and Mermaid diagram views with `prepare-visual` / `prepare-diagrams`, then confirm every task's acceptance criteria and exact testing method before writing `gdd/plans/{plan_slug}/plan.md`.

Validate before locking:

```bash
node dist/internal.js validate-plan gdd/plans/<plan_slug>/plan.md
node dist/internal.js write-manifest gdd/plans/<plan_slug>/plan.md
node dist/internal.js validate-lock gdd/plans/<plan_slug>/plan.md
```
