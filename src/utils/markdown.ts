export interface MarkdownSection {
  heading: string;
  content: string;
}

export function assertRequiredHeadings(body: string, headings: string[]): void {
  let cursor = 0;

  for (const heading of headings) {
    const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const remainder = body.slice(cursor);
    const match = pattern.exec(remainder);

    if (!match || match.index < 0) {
      throw new Error(`Missing required heading in order: ${heading}`);
    }

    cursor += match.index + match[0].length;
  }
}

export function extractHeadingBlocks(body: string, headingPrefix: string): MarkdownSection[] {
  const escapedPrefix = escapeRegExp(headingPrefix);
  const headingRegex = new RegExp(`^(${escapedPrefix}[^\\n]+)\\n`, "gm");
  const matches = [...body.matchAll(headingRegex)];
  const sections: MarkdownSection[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]!;
    const next = matches[index + 1];
    const start = (match.index ?? 0) + match[0].length;
    const end = next?.index ?? body.length;

    sections.push({
      heading: match[1] ?? "",
      content: body.slice(start, end).trim()
    });
  }

  return sections;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
