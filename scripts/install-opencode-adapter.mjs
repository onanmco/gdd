#!/usr/bin/env node
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const targetProject = resolve(process.argv[2] ?? process.cwd());
const repoRoot = resolve(new URL("..", import.meta.url).pathname);

await mkdir(resolve(targetProject, ".opencode"), { recursive: true });
await cp(resolve(repoRoot, ".opencode/commands"), resolve(targetProject, ".opencode/commands"), {
  recursive: true
});
await cp(resolve(repoRoot, ".opencode/plugins"), resolve(targetProject, ".opencode/plugins"), {
  recursive: true
});

console.log(`Installed GDD OpenCode adapter into ${targetProject}/.opencode`);
