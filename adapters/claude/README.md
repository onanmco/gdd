# Claude Adapter

Claude Code uses the plugin manifest in `.claude-plugin/plugin.json`.

Native commands are plugin-scoped skills:

- `/gdd:plan`
- `/gdd:implement`
- `/gdd:continue`

Hooks are configured in `hooks/hooks.json` and call:

```bash
cd "${CLAUDE_PLUGIN_ROOT}" && node dist/internal.js guard-hook claude
```

Subagents are defined in `agents/`.
