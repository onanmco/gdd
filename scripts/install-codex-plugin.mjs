#!/usr/bin/env node
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { existsSync, lstatSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const pluginPath = resolve(homedir(), "plugins/gdd");
const marketplacePath = resolve(homedir(), ".agents/plugins/marketplace.json");

await mkdir(dirname(pluginPath), { recursive: true });
await mkdir(dirname(marketplacePath), { recursive: true });

if (existsSync(pluginPath)) {
  const stat = lstatSync(pluginPath);
  if (!stat.isSymbolicLink()) {
    throw new Error(`${pluginPath} already exists and is not a symlink. Remove it or install manually.`);
  }
  rmSync(pluginPath);
}

await symlink(repoRoot, pluginPath, "dir");

const marketplace = existsSync(marketplacePath)
  ? JSON.parse(await readFile(marketplacePath, "utf8"))
  : {
      name: "local",
      interface: {
        displayName: "Local"
      },
      plugins: []
    };

marketplace.name ??= "local";
marketplace.interface ??= { displayName: "Local" };
marketplace.interface.displayName ??= "Local";
marketplace.plugins ??= [];
marketplace.plugins = marketplace.plugins.filter((plugin) => plugin.name !== "gdd");
marketplace.plugins.push({
  name: "gdd",
  source: {
    source: "local",
    path: "./plugins/gdd"
  },
  policy: {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL"
  },
  category: "Productivity"
});

await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);

console.log(`Linked ${pluginPath} -> ${repoRoot}`);
console.log(`Updated ${marketplacePath}`);
console.log("Restart Codex and install/enable the gdd plugin from the Local marketplace.");
