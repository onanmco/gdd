# Installation

Run this from the plugin repo before installing:

```bash
npm install
npm run build
npm run validate
```

## Claude Code

Install this repo as a Claude Code plugin using Claude's plugin installation flow. The plugin manifest is `.claude-plugin/plugin.json`.

Claude plugin contents:

- skills: `skills/`
- agents: `agents/`
- hooks: `hooks/hooks.json`

The hook commands use `${CLAUDE_PLUGIN_ROOT}` and expect `dist/internal.js` to exist.

## Codex

Install as a Codex plugin using `.codex-plugin/plugin.json`. The shared skills are exposed as `gdd:plan`, `gdd:implement`, and `gdd:continue`.

The Codex adapter uses the same `skills/` directory and internal validators. If the installed Codex version supports plugin hooks, point them at:

```bash
node dist/internal.js guard-hook codex
```

## OpenCode

Copy or symlink these paths into a project that uses OpenCode:

```text
.opencode/commands/
.opencode/plugins/gdd.ts
```

Commands:

- `/gdd:plan`
- `/gdd:implement`
- `/gdd:continue`
- `/gdd-plan`
- `/gdd-implement`
- `/gdd-continue`

The OpenCode plugin calls:

```bash
node dist/internal.js guard-hook opencode
```

## Other Harnesses

Use `skills/` as the canonical workflow source and invoke these internal commands around phase transitions:

```bash
node dist/internal.js validate-plan <plan.md>
node dist/internal.js init-memory <plan.md>
node dist/internal.js validate-memory <plan.md> <memory.md>
node dist/internal.js append-memory <plan.md> <memory.md> < entry.yaml
```

If the harness supports hooks, block direct edits to locked artifacts and call:

```bash
node dist/internal.js guard-hook other
```
