import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { appendMemoryEntry, initMemoryFile } from "./ledger/memoryWriter.js";
import { validateLockManifest, writeLockManifest } from "./manifest/manifest.js";
import { guardHarnessEvent, readJsonFromStdin, readYamlFromStdin } from "./guards/hookGuard.js";
import { validateMemoryFiles } from "./validators/memoryValidator.js";
import { validatePlanFile } from "./validators/planValidator.js";
import {
  prepareDiagramCompanion,
  prepareVisualCompanion,
  startVisualCompanion
} from "./visual/server.js";

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "validate-plan": {
      const planPath = requiredArg(args, 0, "plan path");
      const plan = await validatePlanFile(planPath);
      console.log(`valid plan: ${plan.frontmatter.plan_name} (${plan.tasks.length} tasks)`);
      return;
    }

    case "validate-lock": {
      const planPath = requiredArg(args, 0, "plan path");
      const manifest = await validateLockManifest(planPath);
      console.log(`valid lock: ${manifest.plan_name} (${manifest.files.length} files)`);
      return;
    }

    case "validate-memory": {
      const planPath = requiredArg(args, 0, "plan path");
      const memoryPath = requiredArg(args, 1, "memory path");
      const memory = await validateMemoryFiles(planPath, memoryPath);
      console.log(`valid memory: ${memory.entries.length} ledger entries`);
      return;
    }

    case "init-memory": {
      const planPath = requiredArg(args, 0, "plan path");
      const memoryPath = args[1];
      const created = await initMemoryFile(planPath, memoryPath);
      console.log(`created memory: ${created}`);
      return;
    }

    case "append-memory": {
      const planPath = requiredArg(args, 0, "plan path");
      const memoryPath = requiredArg(args, 1, "memory path");
      const draft = readYamlFromStdin();
      const entry = await appendMemoryEntry(planPath, memoryPath, draft);
      console.log(`appended ${entry.id}: ${entry.event}`);
      return;
    }

    case "write-manifest": {
      const planPath = requiredArg(args, 0, "plan path");
      const plan = await validatePlanFile(planPath);
      const manifest = await writeLockManifest(plan, planPath);
      console.log(`created manifest for ${manifest.files.length} files`);
      return;
    }

    case "guard-hook": {
      const harness = (args[0] ?? "other") as "claude" | "opencode" | "codex" | "other";
      const input = readJsonFromStdin();
      const decision = await guardHarnessEvent(harness, input);
      if (!decision.allow) {
        console.error(decision.reason ?? "GDD guard blocked this action.");
        process.exit(2);
      }
      return;
    }

    case "check-append-only": {
      const previousPath = requiredArg(args, 0, "previous memory path");
      const nextPath = requiredArg(args, 1, "next memory path");
      const [previous, next] = await Promise.all([
        readFile(previousPath, "utf8"),
        readFile(nextPath, "utf8")
      ]);
      if (!next.startsWith(previous)) {
        throw new Error("memory.md is append-only; existing bytes were modified.");
      }
      console.log("append-only check passed");
      return;
    }

    case "parse-yaml": {
      const file = requiredArg(args, 0, "YAML file");
      console.log(JSON.stringify(parseYaml(await readFile(file, "utf8")), null, 2));
      return;
    }

    case "visual-server": {
      const visualDir = requiredArg(args, 0, "visual directory");
      const port = args[1] ? Number(args[1]) : undefined;
      await startVisualCompanion(visualDir, port);
      return;
    }

    case "prepare-visual": {
      const planDir = requiredArg(args, 0, "plan directory");
      await prepareVisualCompanion(planDir);
      return;
    }

    case "prepare-diagrams": {
      const planDir = requiredArg(args, 0, "plan directory");
      await prepareDiagramCompanion(planDir);
      return;
    }

    default:
      throw new Error(
        `Unknown internal command '${command ?? ""}'. ` +
          "Expected validate-plan, validate-lock, validate-memory, init-memory, append-memory, write-manifest, guard-hook, prepare-visual, prepare-diagrams, visual-server, or check-append-only."
      );
  }
}

function requiredArg(args: string[], index: number, label: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
