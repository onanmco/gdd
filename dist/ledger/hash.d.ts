import type { MemoryEntry } from "../schemas/memory.js";
export declare function hashMemoryEntry(entry: Omit<MemoryEntry, "entry_hash">): string;
export declare function entryWithoutHash(entry: MemoryEntry): Omit<MemoryEntry, "entry_hash">;
