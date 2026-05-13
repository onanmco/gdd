import { canonicalHash } from "../utils/hash.js";
export function hashMemoryEntry(entry) {
    return canonicalHash({ entry });
}
export function entryWithoutHash(entry) {
    const { entry_hash: _entryHash, ...withoutHash } = entry;
    return withoutHash;
}
//# sourceMappingURL=hash.js.map