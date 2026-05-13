import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  getPlanLockState,
  validateLockManifest,
  writeLockManifest
} from "../../src/manifest/manifest.js";
import { validatePlanFile } from "../../src/validators/planValidator.js";
import { validPlanMarkdown } from "./planValidator.test.js";

describe("lock manifest", () => {
  it("creates and validates a lock manifest", async () => {
    const { planPath } = await setupPlan();
    const manifest = await writeLockManifest(await validatePlanFile(planPath), planPath);

    expect(manifest.files.map((file) => file.path)).toEqual([
      "plan.md",
      "diagrams/flowchart.mmd",
      "diagrams/sequence.mmd"
    ]);
    await expect(validateLockManifest(planPath)).resolves.toMatchObject({
      locked: true,
      plan_slug: "validator-plan"
    });
  });

  it("detects tampering after lock", async () => {
    const { planPath } = await setupPlan();
    await writeLockManifest(await validatePlanFile(planPath), planPath);
    await writeFile(planPath, validPlanMarkdown().replace("Validate GDD plans.", "Tampered."));

    await expect(validateLockManifest(planPath)).rejects.toThrow(/hash mismatch/);
  });

  it("reports unlocked state when no manifest exists", async () => {
    const { planDir } = await setupPlan();
    await expect(getPlanLockState(planDir)).resolves.toEqual({
      locked: false,
      valid: false
    });
  });
});

async function setupPlan(): Promise<{ planDir: string; planPath: string }> {
  const dir = await mkdir(join(tmpdir(), `gdd-manifest-test-${Date.now()}-${Math.random()}`), {
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

  return { planDir, planPath };
}
