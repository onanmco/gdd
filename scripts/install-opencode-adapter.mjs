#!/usr/bin/env node
import { cp, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const targetProject = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(homedir(), ".config/opencode");
const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const runtimeRoot = resolve(targetProject, "gdd-runtime");

await mkdir(targetProject, { recursive: true });
await cp(resolve(repoRoot, ".opencode/commands"), resolve(targetProject, "commands"), {
  recursive: true
});
await mkdir(resolve(targetProject, "plugins"), { recursive: true });
await mkdir(runtimeRoot, { recursive: true });
await cp(resolve(repoRoot, "dist"), resolve(runtimeRoot, "dist"), { recursive: true });
await cp(resolve(repoRoot, "package.json"), resolve(runtimeRoot, "package.json"));
await cp(resolve(repoRoot, "package-lock.json"), resolve(runtimeRoot, "package-lock.json"));
await cp(resolve(repoRoot, "node_modules"), resolve(runtimeRoot, "node_modules"), { recursive: true });
await writeFile(
  resolve(targetProject, "plugins/gdd.ts"),
  `import { spawnSync } from "node:child_process"

const runtimeRoot = ${JSON.stringify(runtimeRoot)}

export const GddPlugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const result = spawnSync(
        "node",
        ["dist/internal.js", "guard-hook", "opencode"],
        {
          cwd: runtimeRoot,
          input: JSON.stringify({ input, output }),
          encoding: "utf8"
        }
      )

      if (result.status !== 0) {
        throw new Error(result.stderr.trim() || "GDD guard blocked this action.")
      }
    }
  }
}
`
);

console.log(`Installed GDD OpenCode adapter into ${targetProject}`);
console.log(`Installed GDD OpenCode runtime into ${runtimeRoot}`);
console.log("Restart OpenCode and run /gdd:plan, /gdd:implement, or /gdd:continue.");
