export interface ParsedMarkdown {
    frontmatter: unknown;
    body: string;
}
export declare function parseMarkdownFrontmatter(markdown: string): ParsedMarkdown;
export declare function extractYamlFence(markdown: string): unknown;
