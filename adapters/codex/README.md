# Codex Adapter

Codex uses `.codex-plugin/plugin.json` and the shared `skills/` directory.

Use native Codex skill invocation:

- `$gdd:plan`
- `$gdd:implement`
- `$gdd:continue`

If your Codex install supports plugin hooks, configure write/edit hooks to call:

```bash
node dist/internal.js guard-hook codex
```
