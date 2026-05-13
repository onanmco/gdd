# Installation From GitHub

Replace `OWNER/gdd` with the real GitHub repository path.

GDD includes built `dist/` files in releases, but building locally is still recommended after cloning.

## Claude Code

Claude Code installs plugins through marketplaces. This repo includes `.claude-plugin/marketplace.json`, so the repo itself can act as the marketplace.

Inside Claude Code:

```text
/plugin marketplace add OWNER/gdd
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

Codex does not currently have the same public marketplace install flow as Claude Code. Install from GitHub by cloning the repo, then registering it in the local Codex plugin marketplace:

```bash
git clone https://github.com/OWNER/gdd.git
cd gdd
npm install
npm run build
npm run validate
npm run install:codex
```

The installer:

- symlinks the repo to `~/plugins/gdd`;
- creates or updates `~/.agents/plugins/marketplace.json`;
- adds `gdd` as a local plugin entry.

Restart Codex, install/enable `gdd` from the Local marketplace, then use:

```text
$gdd:plan
$gdd:implement gdd/plans/<plan-slug>/plan.md
$gdd:continue gdd/plans/<plan-slug>/plan.md
```

The Codex adapter uses the same `skills/` directory and internal validators. If the installed Codex version supports plugin hooks, point them at:

```bash
node dist/internal.js guard-hook codex
```

## OpenCode

Install globally from GitHub:

```bash
git clone https://github.com/OWNER/gdd.git
cd gdd
npm install
npm run build
npm run validate
npm run install:opencode
```

The installer copies:

- commands to `~/.config/opencode/commands/`;
- hook plugin files to `~/.config/opencode/plugins/`.

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
