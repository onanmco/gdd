# OpenCode Adapter

OpenCode commands live in `.opencode/commands/`.

Supported commands:

- `/gdd:plan`
- `/gdd:implement`
- `/gdd:continue`
- `/gdd-plan`
- `/gdd-implement`
- `/gdd-continue`

The OpenCode TypeScript plugin lives at `.opencode/plugins/gdd.ts` and calls the internal hook guard before tool execution.
