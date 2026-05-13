import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { guardHarnessEvent } from "../../src/guards/hookGuard.js";
import { writeLockManifest } from "../../src/manifest/manifest.js";
import { validatePlanFile } from "../../src/validators/planValidator.js";
import { validPlanMarkdown } from "./planValidator.test.js";

describe("hook guard", () => {
  it("allows draft plan edits before a lock manifest exists", async () => {
    const decision = await guardHarnessEvent("claude", {
      tool_input: {
        file_path: "gdd/plans/example/plan.md"
      }
    });

    expect(decision.allow).toBe(true);
  });

  it("blocks direct edits to locked plans", async () => {
    const { dir, planPath } = await setupLockedPlan();
    const decision = await guardHarnessEvent("claude", {
      tool_input: {
        file_path: planPath
      }
    }, {
      GDD_REPO_ROOT: dir
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toMatch(/immutable/);
  });

  it("blocks direct manifest and memory edits regardless of lock state", async () => {
    const manifestDecision = await guardHarnessEvent("claude", {
      tool_input: {
        file_path: "gdd/plans/example/manifest.json"
      }
    });
    const memoryDecision = await guardHarnessEvent("claude", {
      tool_input: {
        file_path: "gdd/plans/example/memory.md"
      }
    });

    expect(manifestDecision.allow).toBe(false);
    expect(memoryDecision.allow).toBe(false);
  });

  it("blocks shell redirection that targets a locked plan", async () => {
    const { dir } = await setupLockedPlan();
    const decision = await guardHarnessEvent("opencode", {
      output: {
        args: {
          command: "cat > gdd/plans/validator-plan/plan.md <<'EOF'\nchanged\nEOF",
          workdir: dir
        }
      }
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toMatch(/Shell command/);
  });

  it("allows read-only shell commands against locked artifacts", async () => {
    const { dir } = await setupLockedPlan();
    const decision = await guardHarnessEvent("opencode", {
      output: {
        args: {
          command: "sed -n '1,20p' gdd/plans/validator-plan/plan.md",
          workdir: dir
        }
      }
    });

    expect(decision.allow).toBe(true);
  });

  it("allows unrelated tool events when no active task is configured", async () => {
    const decision = await guardHarnessEvent("opencode", {
      output: {
        args: {
          filePath: "src/index.ts"
        }
      }
    });

    expect(decision.allow).toBe(true);
  });
});

async function setupLockedPlan(): Promise<{ dir: string; planPath: string }> {
  const dir = await mkdir(join(tmpdir(), `gdd-hook-test-${Date.now()}-${Math.random()}`), {
    recursive: true
  });
  if (!dir) {
    throw new Error("failed to create temp dir");
  }

  const planDir = join(dir, "gdd", "plans", "validator-plan");
  await mkdir(join(planDir, "diagrams"), { recursive: true });
  const planPath = join(planDir, "plan.md");
  await writeFile(planPath, validPlanMarkdown());
  await writeFile(join(planDir, "diagrams", "flowchart.mmd"), "flowchart TD\nA-->B\n");
  await writeFile(join(planDir, "diagrams", "sequence.mmd"), "sequenceDiagram\nA->>B: ok\n");
  await writeLockManifest(await validatePlanFile(planPath), planPath);

  return { dir, planPath };
}
