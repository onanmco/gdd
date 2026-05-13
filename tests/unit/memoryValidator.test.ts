import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { stringify as stringifyYaml } from "yaml";
import { appendMemoryEntry, initMemoryFile } from "../../src/ledger/memoryWriter.js";
import { hashMemoryEntry } from "../../src/ledger/hash.js";
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

  it("accepts implementer delegation before task work starts", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);

    await appendMemoryEntry(planPath, memoryPath, implementerSpawnDraft());
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
    expect(memory.entries[1]?.event).toBe("implementer_spawned");
    expect(memory.entries[2]?.event).toBe("task_started");
    expect(memory.entries.at(-1)?.event).toBe("task_completed");
  });

  it("rejects implementer delegation recorded after task work starts", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);
    await appendMemoryEntry(planPath, memoryPath, draft("task_started"));

    await expect(
      appendMemoryEntry(planPath, memoryPath, implementerSpawnDraft())
    ).rejects.toThrow(/after task_started/);
  });

  it("rejects historical memory where implementer delegation follows task_started", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);
    await appendMemoryEntry(planPath, memoryPath, draft("task_started"));

    const memory = await validateMemoryFiles(planPath, memoryPath);
    const previous = memory.entries.at(-1);
    if (!previous) {
      throw new Error("expected memory entry");
    }
    const entryWithoutEntryHash = {
      id: "ENTRY-000003",
      timestamp: "2026-05-13T20:00:00Z",
      task_id: "TASK-001",
      event: "implementer_spawned",
      actor: {
        harness: "opencode",
        agent: "main"
      },
      previous_hash: previous.entry_hash,
      summary: "Delegated TASK-001 after task work already started.",
      evidence: {
        commands: [
          {
            command: "spawn subagent gdd-implementer TASK-001",
            exit_code: 0,
            output_excerpt: "gdd-implementer accepted TASK-001."
          }
        ],
        files_changed: []
      },
      next_action: "Continue task work."
    } as const;
    const entry = {
      ...entryWithoutEntryHash,
      entry_hash: hashMemoryEntry(entryWithoutEntryHash)
    };

    await appendFile(
      memoryPath,
      [
        "",
        "### ENTRY-000003",
        "",
        "```yaml",
        stringifyYaml({ entry }).trimEnd(),
        "```",
        ""
      ].join("\n")
    );

    await expect(validateMemoryFiles(planPath, memoryPath)).rejects.toThrow(
      /implementer_spawned must be recorded before task_started/
    );
  });

  it("detects historical memory edits through the hash chain", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);
    await appendMemoryEntry(planPath, memoryPath, draft("task_started"));

    const original = await readFile(memoryPath, "utf8");
    await writeFile(memoryPath, original.replace("Task event task_started.", "Tampered."));

    await expect(validateMemoryFiles(planPath, memoryPath)).rejects.toThrow(/entry_hash/);
  });

  it("rejects invalid append drafts without corrupting existing memory", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);
    const before = await readFile(memoryPath, "utf8");

    await expect(
      appendMemoryEntry(planPath, memoryPath, {
        ...draft("task_started"),
        evidence: {
          commands: [],
          files_changed: []
        }
      })
    ).rejects.toThrow(/commands evidence/);

    await expect(readFile(memoryPath, "utf8")).resolves.toBe(before);
    await expect(validateMemoryFiles(planPath, memoryPath)).resolves.toMatchObject({
      entries: [{ event: "memory_created" }]
    });
  });

  it("rejects red evidence unless at least one command fails", async () => {
    const { planPath, memoryPath } = await setupPlan();
    await initMemoryFile(planPath, memoryPath);
    await appendMemoryEntry(planPath, memoryPath, draft("task_started"));
    const before = await readFile(memoryPath, "utf8");

    await expect(
      appendMemoryEntry(planPath, memoryPath, {
        ...draft("red_recorded"),
        evidence: {
          commands: [
            {
              command: "npm test",
              exit_code: 0,
              output_excerpt: "passed"
            }
          ],
          files_changed: ["tests/validators/plan-validator.test.ts"]
        }
      })
    ).rejects.toThrow(/red_recorded/);

    await expect(readFile(memoryPath, "utf8")).resolves.toBe(before);
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

function implementerSpawnDraft() {
  return {
    task_id: "TASK-001",
    event: "implementer_spawned",
    harness: "opencode",
    agent: "main",
    summary: "Delegated TASK-001 to gdd-implementer.",
    evidence: {
      commands: [
        {
          command: "spawn subagent gdd-implementer TASK-001",
          exit_code: 0,
          output_excerpt: "gdd-implementer accepted TASK-001."
        }
      ],
      files_changed: []
    },
    next_action: "Subagent will append task_started and prove RED."
  };
}
