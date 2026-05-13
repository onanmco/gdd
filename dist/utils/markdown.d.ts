export interface MarkdownSection {
    heading: string;
    content: string;
}
export declare function assertRequiredHeadings(body: string, headings: string[]): void;
export declare function extractHeadingBlocks(body: string, headingPrefix: string): MarkdownSection[];
export declare function escapeRegExp(value: string): string;
