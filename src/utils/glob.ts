export function matchesAnyGlob(path: string, patterns: string[]): boolean {
  const normalized = normalizePath(path);
  return patterns.some((pattern) => globToRegExp(normalizePath(pattern)).test(normalized));
}

export function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function globToRegExp(pattern: string): RegExp {
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
