import { parse as parseYaml } from "yaml";
export function parseMarkdownFrontmatter(markdown) {
    if (!markdown.startsWith("---\n")) {
        throw new Error("Markdown must start with YAML frontmatter.");
    }
    const end = markdown.indexOf("\n---\n", 4);
    if (end === -1) {
        throw new Error("Markdown frontmatter closing marker is missing.");
    }
    const rawFrontmatter = markdown.slice(4, end);
    const body = markdown.slice(end + "\n---\n".length);
    return {
        frontmatter: parseYaml(rawFrontmatter),
        body
    };
}
export function extractYamlFence(markdown) {
    const match = markdown.match(/```ya?ml\s*\n([\s\S]*?)\n```/);
    if (!match?.[1]) {
        throw new Error("Expected a fenced YAML block.");
    }
    return parseYaml(match[1]);
}
//# sourceMappingURL=frontmatter.js.map