import { z } from "zod";
import { type LedgerEvent, type MemoryEntry } from "../schemas/memory.js";
declare const memoryDraftSchema: z.ZodObject<{
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
    task_id: z.ZodUnion<[z.ZodString, z.ZodLiteral<"plan">]>;
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
export type MemoryDraft = z.infer<typeof memoryDraftSchema>;
export declare function initMemoryFile(planPath: string, memoryPath?: string): Promise<string>;
export declare function appendMemoryEntry(planPath: string, memoryPath: string, draft: unknown): Promise<MemoryEntry>;
export declare function getCompletedTaskIds(entries: MemoryEntry[]): Set<string>;
export declare function hasTaskEvent(entries: MemoryEntry[], taskId: string, event: LedgerEvent): boolean;
export {};
