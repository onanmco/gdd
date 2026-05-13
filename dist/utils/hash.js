import { createHash } from "node:crypto";
export function sha256(value) {
    return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}
export function stableStringify(value) {
    return JSON.stringify(sortValue(value));
}
function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, nested]) => [key, sortValue(nested)]);
        return Object.fromEntries(entries);
    }
    return value;
}
export function canonicalHash(value) {
    return sha256(stableStringify(value));
}
//# sourceMappingURL=hash.js.map