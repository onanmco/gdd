#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const command = process.argv[2];
const repoRoot = resolve(new URL("..", import.meta.url).pathname);

if (command !== "opencode") {
  console.error("Usage: gdd-install opencode");
  process.exit(1);
}

const result = spawnSync("node", [resolve(repoRoot, "scripts/install-opencode-adapter.mjs")], {
  cwd: repoRoot,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
