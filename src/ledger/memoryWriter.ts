import { appendFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import { validatePlanFile } from "../validators/planValidator.js";
import { validateMemoryFiles } from "../validators/memoryValidator.js";
import {
  type LedgerEvent,
  type MemoryEntry,
  actorSchema,
  evidenceSchema,
  ledgerEventSchema,
  memoryEntrySchema
} from "../schemas/memory.js";
import { taskIdString } from "../schemas/common.js";
import { entryWithoutHash, hashMemoryEntry } from "./hash.js";
import { sha256 } from "../utils/hash.js";

const memoryDraftSchema = actorSchema.extend({
  task_id: taskIdString.or(z.literal("plan")),
  event: ledgerEventSchema,
  summary: z.string().trim().min(1),
  evidence: evidenceSchema,
  next_action: z.string().trim().min(1)
});

export type MemoryDraft = z.infer<typeof memoryDraftSchema>;

export async function initMemoryFile(planPath: string, memoryPath?: string): Promise<string> {
  const plan = await validatePlanFile(planPath);
  const planMarkdown = await readFile(planPath, "utf8");
  const target = memoryPath ?? join(dirname(planPath), "memory.md");
  const createdAt = utcNow();

  const entryWithoutEntryHash = {
    id: "ENTRY-000001",
    timestamp: createdAt,
    task_id: "plan" as const,
    event: "memory_created" as LedgerEvent,
    actor: {
      harness: "other" as const,
      agent: "guard" as const
    },
    previous_hash: "genesis" as const,
    summary: "Created GDD append-only memory ledger.",
    evidence: {
      commands: [],
      files_changed: []
    },
    next_action: "Start the first planned task."
  };

  const entry: MemoryEntry = {
    ...entryWithoutEntryHash,
    entry_hash: hashMemoryEntry(entryWithoutEntryHash)
  };

  const markdown = [
    "---",
    stringifyYaml({
      gdd_schema: "memory.v1",
      artifact: "memory",
      plan_name: plan.frontmatter.plan_name,
      plan_slug: plan.frontmatter.plan_slug,
      created_at: createdAt,
      plan_hash: sha256(planMarkdown),
      append_only: true,
      hash_chain: "sha256"
    }).trimEnd(),
    "---",
    "",
    `# GDD Memory: ${plan.frontmatter.plan_name}`,
    "",
    "## Ledger",
    "",
    "### ENTRY-000001",
    "",
    "```yaml",
    stringifyYaml({ entry }).trimEnd(),
    "```",
    ""
  ].join("\n");

  await writeFile(target, markdown, { flag: "wx" });
  return target;
}

export async function appendMemoryEntry(
  planPath: string,
  memoryPath: string,
  draft: unknown
): Promise<MemoryEntry> {
  const result = memoryDraftSchema.safeParse(draft);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join("\n"));
  }

  const memory = await validateMemoryFiles(planPath, memoryPath);
  const previous = memory.entries.at(-1);
  if (!previous) {
    throw new Error("Cannot append to empty memory ledger.");
  }
  assertTddTransition(memory.entries, result.data.task_id, result.data.event);

  const nextNumber = memory.entries.length + 1;
  const entryWithoutEntryHash = {
    id: `ENTRY-${String(nextNumber).padStart(6, "0")}`,
    timestamp: utcNow(),
    task_id: result.data.task_id,
    event: result.data.event,
    actor: {
      harness: result.data.harness,
      agent: result.data.agent
    },
    previous_hash: previous.entry_hash,
    summary: result.data.summary,
    evidence: result.data.evidence,
    next_action: result.data.next_action
  };

  const entry: MemoryEntry = {
    ...entryWithoutEntryHash,
    entry_hash: hashMemoryEntry(entryWithoutEntryHash)
  };
  const entryResult = memoryEntrySchema.safeParse({ entry });
  if (!entryResult.success) {
    throw new Error(entryResult.error.issues.map((issue) => issue.message).join("\n"));
  }

  const block = [
    "",
    `### ${entry.id}`,
    "",
    "```yaml",
    stringifyYaml({ entry }).trimEnd(),
    "```",
    ""
  ].join("\n");

  await appendFile(memoryPath, block);
  return entry;
}

export function getCompletedTaskIds(entries: MemoryEntry[]): Set<string> {
  return new Set(
    entries
      .filter((entry) => entry.task_id !== "plan" && entry.event === "task_completed")
      .map((entry) => entry.task_id)
  );
}

export function hasTaskEvent(entries: MemoryEntry[], taskId: string, event: LedgerEvent): boolean {
  return entries.some((entry) => entry.task_id === taskId && entry.event === event);
}

function assertTddTransition(
  entries: MemoryEntry[],
  taskId: string,
  event: LedgerEvent
): void {
  if (taskId === "plan") {
    return;
  }

  const requires: Partial<Record<LedgerEvent, LedgerEvent>> = {
    red_recorded: "task_started",
    green_recorded: "red_recorded",
    refactor_recorded: "green_recorded",
    acceptance_verified: "refactor_recorded",
    task_completed: "acceptance_verified"
  };
  const requiredEvent = requires[event];

  if (requiredEvent && !hasTaskEvent(entries, taskId, requiredEvent)) {
    throw new Error(`${taskId} cannot append ${event} before ${requiredEvent}.`);
  }

  if (event === "task_started" && hasTaskEvent(entries, taskId, "task_started")) {
    throw new Error(`${taskId} already has task_started.`);
  }

  if (event === "implementer_spawned" && hasTaskEvent(entries, taskId, "task_started")) {
    throw new Error(`${taskId} cannot append implementer_spawned after task_started.`);
  }

  if (event === "implementer_spawned" && hasTaskEvent(entries, taskId, "implementer_spawned")) {
    throw new Error(`${taskId} already has implementer_spawned.`);
  }

  if (event === "task_completed" && hasTaskEvent(entries, taskId, "task_completed")) {
    throw new Error(`${taskId} is already completed.`);
  }
}

function utcNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
