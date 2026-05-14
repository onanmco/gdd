#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const targetProject = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(homedir(), ".config/opencode");
const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const runtimeRoot = resolve(targetProject, "gdd-runtime");
const commandsRoot = resolve(targetProject, "commands");
const agentsRoot = resolve(targetProject, "agents");
const internalEntry = resolve(runtimeRoot, "dist/internal.js");

await mkdir(targetProject, { recursive: true });
await cp(resolve(repoRoot, ".opencode/commands"), commandsRoot, { recursive: true });
await installOpenCodeAgents();
await mkdir(resolve(targetProject, "plugins"), { recursive: true });
await rm(runtimeRoot, { recursive: true, force: true });
await mkdir(runtimeRoot, { recursive: true });
await cp(resolve(repoRoot, "dist"), resolve(runtimeRoot, "dist"), { recursive: true });
await cp(resolve(repoRoot, "schemas"), resolve(runtimeRoot, "schemas"), { recursive: true });
await cp(resolve(repoRoot, "skills"), resolve(runtimeRoot, "skills"), { recursive: true });
await cp(resolve(repoRoot, "templates"), resolve(runtimeRoot, "templates"), { recursive: true });
await writeRuntimePackageJson();

await rewriteInstalledMarkdown(commandsRoot);
await rewriteInstalledMarkdown(agentsRoot, (name) => name.startsWith("gdd-"));
await rewriteInstalledMarkdown(resolve(runtimeRoot, "skills"));

const installResult = spawnSync(npmCommand(), [
  "install",
  "--omit=dev",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund"
], {
  cwd: runtimeRoot,
  stdio: "inherit"
});

if (installResult.error) {
  throw installResult.error;
}
if (installResult.status !== 0) {
  process.exit(installResult.status ?? 1);
}

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
    },
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(\`
## GDD Continuation
If the session is continuing a GDD run, reopen the active plan.md and memory.md.
Never rely on chat history for task status; replay memory.md and continue from the first incomplete task.
\`)
    }
  }
}
`
);

console.log(`Installed GDD OpenCode adapter into ${targetProject}`);
console.log(`Installed GDD OpenCode runtime into ${runtimeRoot}`);
console.log(`Installed GDD OpenCode agents into ${agentsRoot}`);
console.log("Restart OpenCode and run /gdd:plan, /gdd:implement, or /gdd:continue.");

async function installOpenCodeAgents() {
  await mkdir(agentsRoot, { recursive: true });
  const entries = await readdir(resolve(repoRoot, ".opencode/agents"), { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile() || !entry.name.startsWith("gdd-") || !entry.name.endsWith(".md")) {
        return;
      }

      await cp(resolve(repoRoot, ".opencode/agents", entry.name), resolve(agentsRoot, entry.name), {
        force: true
      });
    })
  );
}

async function rewriteInstalledMarkdown(root, shouldRewriteFile = () => true) {
  const entries = await readdir(root, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(root, entry.name);
      if (entry.isDirectory()) {
        await rewriteInstalledMarkdown(path, shouldRewriteFile);
        return;
      }
      if (!entry.isFile() || !entry.name.endsWith(".md") || !shouldRewriteFile(entry.name)) {
        return;
      }

      const markdown = await readFile(path, "utf8");
      const rewritten = markdown
        .replaceAll("skills/plan/SKILL.md", resolve(runtimeRoot, "skills/plan/SKILL.md"))
        .replaceAll(
          "skills/implement/SKILL.md",
          resolve(runtimeRoot, "skills/implement/SKILL.md")
        )
        .replaceAll(
          "skills/continue/SKILL.md",
          resolve(runtimeRoot, "skills/continue/SKILL.md")
        )
        .replaceAll("<plugin-root>/dist/internal.js", shellQuote(internalEntry))
        .replaceAll("node dist/internal.js", `node ${shellQuote(internalEntry)}`)
        .replaceAll("schemas/README.md", resolve(runtimeRoot, "schemas/README.md"));

      if (rewritten !== markdown) {
        await writeFile(path, rewritten);
      }
    })
  );
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function writeRuntimePackageJson() {
  const sourcePackage = JSON.parse(await readFile(resolve(repoRoot, "package.json"), "utf8"));
  const runtimePackage = {
    name: sourcePackage.name,
    version: sourcePackage.version,
    private: true,
    type: sourcePackage.type,
    dependencies: sourcePackage.dependencies ?? {},
    engines: sourcePackage.engines
  };

  await writeFile(
    resolve(runtimeRoot, "package.json"),
    `${JSON.stringify(runtimePackage, null, 2)}\n`
  );
}
