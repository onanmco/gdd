# Installation From GitHub

GDD includes built `dist/` files in releases, but building locally is still recommended after cloning.

## Claude Code

Claude Code installs plugins through marketplaces. This repo includes `.claude-plugin/marketplace.json`, so the repo itself can act as the marketplace.

Inside Claude Code:

```text
/plugin marketplace add onanmco/gdd
/plugin install gdd@gdd
```

Restart Claude Code, then use:

```text
/gdd:plan
/gdd:implement gdd/plans/<plan-slug>/plan.md
/gdd:continue gdd/plans/<plan-slug>/plan.md
```

For private repositories, authenticate GitHub first with your normal git credentials or `gh auth login`.

Claude plugin contents:

- skills: `skills/`
- agents: `agents/`
- hooks: `hooks/hooks.json`

The hook commands use `${CLAUDE_PLUGIN_ROOT}` and expect `dist/internal.js` to exist.

## Codex

Codex installs plugin marketplaces directly from GitHub. This repo includes `.agents/plugins/marketplace.json`, so users do not need to keep a local clone.

```bash
codex plugin marketplace add onanmco/gdd
```

Restart Codex, then use:

```text
$gdd:plan
$gdd:implement gdd/plans/<plan-slug>/plan.md
$gdd:continue gdd/plans/<plan-slug>/plan.md
```

To update later:

```bash
codex plugin marketplace upgrade gdd
```

The Codex adapter uses the same `skills/` directory and internal validators.

## OpenCode

Install globally from GitHub without keeping a local clone:

```bash
npm exec --yes --package github:onanmco/gdd gdd-install -- opencode
```

The installer copies:

- commands to `~/.config/opencode/commands/`;
- hook plugin files to `~/.config/opencode/plugins/`.
- runtime files and dependencies to `~/.config/opencode/gdd-runtime/`.

Restart OpenCode, then use:

```text
/gdd:plan
/gdd:implement gdd/plans/<plan-slug>/plan.md
/gdd:continue gdd/plans/<plan-slug>/plan.md
```

Aliases are also installed:

```text
/gdd-plan
/gdd-implement
/gdd-continue
```

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
