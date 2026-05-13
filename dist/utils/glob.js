export function matchesAnyGlob(path, patterns) {
    const normalized = normalizePath(path);
    return patterns.some((pattern) => globToRegExp(normalizePath(pattern)).test(normalized));
}
export function normalizePath(path) {
    return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
function globToRegExp(pattern) {
    const escaped = pattern
        .split(/(\*\*)/g)
        .map((part) => {
        if (part === "**") {
            return ".*";
        }
        return part
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replaceAll("*", "[^/]*")
            .replaceAll("?", "[^/]");
    })
        .join("");
    return new RegExp(`^${escaped}$`);
}
//# sourceMappingURL=glob.js.map