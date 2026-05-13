import { z } from "zod";
export declare const memoryFrontmatterSchema: z.ZodObject<{
    gdd_schema: z.ZodLiteral<"memory.v1">;
    artifact: z.ZodLiteral<"memory">;
    plan_name: z.ZodString;
    plan_slug: z.ZodString;
    created_at: z.ZodString;
    plan_hash: z.ZodString;
    append_only: z.ZodLiteral<true>;
    hash_chain: z.ZodLiteral<"sha256">;
}, z.core.$strict>;
export declare const ledgerEventSchema: z.ZodEnum<{
    memory_created: "memory_created";
    task_started: "task_started";
    red_recorded: "red_recorded";
    green_recorded: "green_recorded";
    refactor_recorded: "refactor_recorded";
    acceptance_verified: "acceptance_verified";
    task_completed: "task_completed";
    blocker_recorded: "blocker_recorded";
    retry_recorded: "retry_recorded";
    reviewer_spawned: "reviewer_spawned";
    debugger_spawned: "debugger_spawned";
}>;
export declare const actorSchema: z.ZodObject<{
    harness: z.ZodEnum<{
        codex: "codex";
        claude: "claude";
        opencode: "opencode";
        other: "other";
    }>;
    agent: z.ZodEnum<{
        main: "main";
        subagent: "subagent";
        reviewer: "reviewer";
        debugger: "debugger";
        guard: "guard";
    }>;
}, z.core.$strict>;
export declare const commandEvidenceSchema: z.ZodObject<{
    command: z.ZodString;
    exit_code: z.ZodNumber;
    output_excerpt: z.ZodString;
}, z.core.$strict>;
export declare const evidenceSchema: z.ZodObject<{
    commands: z.ZodArray<z.ZodObject<{
        command: z.ZodString;
        exit_code: z.ZodNumber;
        output_excerpt: z.ZodString;
    }, z.core.$strict>>;
    files_changed: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const memoryEntrySchema: z.ZodObject<{
    entry: z.ZodObject<{
        id: z.ZodString;
        timestamp: z.ZodString;
        task_id: z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"plan">]>;
        event: z.ZodEnum<{
            memory_created: "memory_created";
            task_started: "task_started";
            red_recorded: "red_recorded";
            green_recorded: "green_recorded";
            refactor_recorded: "refactor_recorded";
            acceptance_verified: "acceptance_verified";
            task_completed: "task_completed";
            blocker_recorded: "blocker_recorded";
            retry_recorded: "retry_recorded";
            reviewer_spawned: "reviewer_spawned";
            debugger_spawned: "debugger_spawned";
        }>;
        actor: z.ZodObject<{
            harness: z.ZodEnum<{
                codex: "codex";
                claude: "claude";
                opencode: "opencode";
                other: "other";
            }>;
            agent: z.ZodEnum<{
                main: "main";
                subagent: "subagent";
                reviewer: "reviewer";
                debugger: "debugger";
                guard: "guard";
            }>;
        }, z.core.$strict>;
        previous_hash: z.ZodUnion<readonly [z.ZodLiteral<"genesis">, z.ZodString]>;
        entry_hash: z.ZodString;
        summary: z.ZodString;
        evidence: z.ZodObject<{
            commands: z.ZodArray<z.ZodObject<{
                command: z.ZodString;
                exit_code: z.ZodNumber;
                output_excerpt: z.ZodString;
            }, z.core.$strict>>;
            files_changed: z.ZodArray<z.ZodString>;
        }, z.core.$strict>;
        next_action: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export type MemoryFrontmatter = z.infer<typeof memoryFrontmatterSchema>;
export type MemoryEntryBlock = z.infer<typeof memoryEntrySchema>;
export type MemoryEntry = MemoryEntryBlock["entry"];
export type LedgerEvent = z.infer<typeof ledgerEventSchema>;
export declare const tddCompletionOrder: LedgerEvent[];
