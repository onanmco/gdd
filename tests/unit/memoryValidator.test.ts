import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { appendMemoryEntry, initMemoryFile } from "../../src/ledger/memoryWriter.js";
import { validateMemoryFiles } from "../../src/validators/memoryValidator.js";
import { validPlanMarkdown } from "./planValidator.test.js";

describe("memory validator", () => {
  it("creates a valid append-only memory file", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);

    const memory = await validateMemoryFiles(planPath, memoryPath);
    expect(memory.entries).toHaveLength(1);
    expect(memory.entries[0]?.event).toBe("memory_created");
  });

  it("blocks task completion before RED/GREEN/REFACTOR evidence exists", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);

    await expect(
      appendMemoryEntry(planPath, memoryPath, draft("task_completed"))
    ).rejects.toThrow(/acceptance_verified/);
  });

  it("accepts a complete ordered TDD ledger", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);

    for (const event of [
      "task_started",
      "red_recorded",
      "green_recorded",
      "refactor_recorded",
      "acceptance_verified",
      "task_completed"
    ] as const) {
      await appendMemoryEntry(planPath, memoryPath, draft(event));
    }

    const memory = await validateMemoryFiles(planPath, memoryPath);
    expect(memory.entries.at(-1)?.event).toBe("task_completed");
  });

  it("detects historical memory edits through the hash chain", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);
    await appendMemoryEntry(planPath, memoryPath, draft("task_started"));

    const original = await readFile(memoryPath, "utf8");
    await writeFile(memoryPath, original.replace("Task event task_started.", "Tampered."));

    await expect(validateMemoryFiles(planPath, memoryPath)).rejects.toThrow(/entry_hash/);
  });
});

async function setupPlan(): Promise<{ planPath: string; memoryPath: string }> {
  const dir = await mkdir(join(tmpdir(), `gdd-test-${Date.now()}-${Math.random()}`), {
    recursive: true
  });
  if (!dir) {
    throw new Error("failed to create temp dir");
  }
  const planPath = join(dir, "plan.md");
  const memoryPath = join(dir, "memory.md");
  await writeFile(planPath, validPlanMarkdown());
  return { planPath, memoryPath };
}

function draft(event: string) {
  return {
    task_id: "TASK-001",
    event,
    harness: "codex",
    agent: "subagent",
    summary: `Task event ${event}.`,
    evidence: {
      commands: [
        {
          command: "npm test -- plan-validator.test.ts",
          exit_code: event === "red_recorded" ? 1 : 0,
          output_excerpt: `Output for ${event}`
        }
      ],
      files_changed: ["tests/validators/plan-validator.test.ts"]
    },
    next_action: `Next action after ${event}.`
  };
}
