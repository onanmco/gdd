#!/usr/bin/env node
import { cp, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const targetProject = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(homedir(), ".config/opencode");
const repoRoot = resolve(new URL("..", import.meta.url).pathname);

await mkdir(targetProject, { recursive: true });
await cp(resolve(repoRoot, ".opencode/commands"), resolve(targetProject, "commands"), {
  recursive: true
});
await cp(resolve(repoRoot, ".opencode/plugins"), resolve(targetProject, "plugins"), {
  recursive: true
});

console.log(`Installed GDD OpenCode adapter into ${targetProject}`);
console.log("Restart OpenCode and run /gdd:plan, /gdd:implement, or /gdd:continue.");
