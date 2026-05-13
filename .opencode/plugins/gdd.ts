import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "@opencode-ai/plugin";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const GddPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const result = spawnSync("node", ["dist/internal.js", "guard-hook", "opencode"], {
        cwd: pluginRoot,
        input: JSON.stringify({ input, output }),
        encoding: "utf8"
      });

      if (result.status !== 0) {
        throw new Error(result.stderr.trim() || "GDD guard blocked this action.");
      }
    },
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(`
## GDD Continuation
If the session is continuing a GDD run, reopen the active plan.md and memory.md.
Never rely on chat history for task status; replay memory.md and continue from the first incomplete task.
`);
    }
  };
};
