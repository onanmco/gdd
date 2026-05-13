import type { ValidatedPlan } from "./planValidator.js";
import { type MemoryEntry, type MemoryFrontmatter } from "../schemas/memory.js";
export interface ValidatedMemory {
    path: string;
    frontmatter: MemoryFrontmatter;
    entries: MemoryEntry[];
}
export declare function validateMemoryFiles(planPath: string, memoryPath: string): Promise<ValidatedMemory>;
export declare function validateMemoryMarkdown(markdown: string, plan: ValidatedPlan, planHash: string, path?: string): ValidatedMemory;
