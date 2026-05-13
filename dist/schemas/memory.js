import { z } from "zod";
import { entryIdString, isoUtcString, relativePathString, sha256String, slugString, taskIdString } from "./common.js";
export const memoryFrontmatterSchema = z
    .object({
    gdd_schema: z.literal("memory.v1"),
    artifact: z.literal("memory"),
    plan_name: z.string().trim().min(1),
    plan_slug: slugString,
    created_at: isoUtcString,
    plan_hash: sha256String,
    append_only: z.literal(true),
    hash_chain: z.literal("sha256")
})
    .strict();
export const ledgerEventSchema = z.enum([
    "memory_created",
    "task_started",
    "red_recorded",
    "green_recorded",
    "refactor_recorded",
    "acceptance_verified",
    "task_completed",
    "blocker_recorded",
    "retry_recorded",
    "implementer_spawned",
    "reviewer_spawned",
    "debugger_spawned"
]);
export const actorSchema = z
    .object({
    harness: z.enum(["codex", "claude", "opencode", "other"]),
    agent: z.enum(["main", "subagent", "reviewer", "debugger", "guard"])
})
    .strict();
export const commandEvidenceSchema = z
    .object({
    command: z.string().trim().min(1),
    exit_code: z.number().int(),
    output_excerpt: z.string()
})
    .strict();
export const evidenceSchema = z
    .object({
    commands: z.array(commandEvidenceSchema),
    files_changed: z.array(relativePathString)
})
    .strict();
export const memoryEntrySchema = z
    .object({
    entry: z
        .object({
        id: entryIdString,
        timestamp: isoUtcString,
        task_id: z.union([taskIdString, z.literal("plan")]),
        event: ledgerEventSchema,
        actor: actorSchema,
        previous_hash: z.union([z.literal("genesis"), sha256String]),
        entry_hash: sha256String,
        summary: z.string().trim().min(1),
        evidence: evidenceSchema,
        next_action: z.string().trim().min(1)
    })
        .strict()
})
    .strict()
    .superRefine(({ entry }, ctx) => {
    if (entry.event !== "memory_created" && entry.evidence.commands.length === 0) {
        ctx.addIssue({
            code: "custom",
            path: ["entry", "evidence", "commands"],
            message: "commands evidence is required except for memory_created"
        });
    }
    if (entry.event === "red_recorded" &&
        !entry.evidence.commands.some((command) => command.exit_code !== 0)) {
        ctx.addIssue({
            code: "custom",
            path: ["entry", "evidence", "commands"],
            message: "red_recorded requires at least one failing command"
        });
    }
});
export const tddCompletionOrder = [
    "task_started",
    "red_recorded",
    "green_recorded",
    "refactor_recorded",
    "acceptance_verified",
    "task_completed"
];
//# sourceMappingURL=memory.js.map