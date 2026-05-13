import { canonicalHash } from "../utils/hash.js";
import type { MemoryEntry } from "../schemas/memory.js";

export function hashMemoryEntry(entry: Omit<MemoryEntry, "entry_hash">): string {
  return canonicalHash({ entry });
}

export function entryWithoutHash(entry: MemoryEntry): Omit<MemoryEntry, "entry_hash"> {
  const { entry_hash: _entryHash, ...withoutHash } = entry;
  return withoutHash;
}
