import { readFile } from "node:fs/promises";
import { validatePlanFile } from "./planValidator.js";
import { extractYamlFence, parseMarkdownFrontmatter } from "../utils/frontmatter.js";
import { extractHeadingBlocks } from "../utils/markdown.js";
import { formatZodError } from "../schemas/common.js";
import { memoryEntrySchema, memoryFrontmatterSchema, tddCompletionOrder } from "../schemas/memory.js";
import { entryWithoutHash, hashMemoryEntry } from "../ledger/hash.js";
import { sha256 } from "../utils/hash.js";
export async function validateMemoryFiles(planPath, memoryPath) {
    const [plan, memoryMarkdown, planMarkdown] = await Promise.all([
        validatePlanFile(planPath),
        readFile(memoryPath, "utf8"),
        readFile(planPath, "utf8")
    ]);
    return validateMemoryMarkdown(memoryMarkdown, plan, sha256(planMarkdown), memoryPath);
}
export function validateMemoryMarkdown(markdown, plan, planHash, path = "<memory>") {
    const parsed = parseMarkdownFrontmatter(markdown);
    const frontmatterResult = memoryFrontmatterSchema.safeParse(parsed.frontmatter);
    if (!frontmatterResult.success) {
        throw new Error(`Invalid memory frontmatter:\n${formatZodError(frontmatterResult.error)}`);
    }
    const frontmatter = frontmatterResult.data;
    if (frontmatter.plan_name !== plan.frontmatter.plan_name) {
        throw new Error("memory.md plan_name must match plan.md.");
    }
    if (frontmatter.plan_slug !== plan.frontmatter.plan_slug) {
        throw new Error("memory.md plan_slug must match plan.md.");
    }
    if (frontmatter.plan_hash !== planHash) {
        throw new Error("memory.md plan_hash does not match locked plan.md.");
    }
    if (!parsed.body.trimStart().startsWith(`# GDD Memory: ${plan.frontmatter.plan_name}\n\n## Ledger`)) {
        throw new Error("memory.md headings must be '# GDD Memory: <Plan Name>' then '## Ledger'.");
    }
    const sections = extractHeadingBlocks(parsed.body, "### ENTRY-");
    if (sections.length === 0) {
        throw new Error("memory.md must contain at least one ledger entry.");
    }
    const entries = sections.map((section, index) => {
        const yaml = extractYamlFence(section.content);
        const result = memoryEntrySchema.safeParse(yaml);
        if (!result.success) {
            throw new Error(`Invalid ledger entry ${section.heading}:\n${formatZodError(result.error)}`);
        }
        const expectedId = `ENTRY-${String(index + 1).padStart(6, "0")}`;
        if (result.data.entry.id !== expectedId || section.heading !== `### ${expectedId}`) {
            throw new Error(`Ledger entry ${index + 1} must be ${expectedId}.`);
        }
        const expectedHash = hashMemoryEntry(entryWithoutHash(result.data.entry));
        if (result.data.entry.entry_hash !== expectedHash) {
            throw new Error(`${expectedId} entry_hash is invalid.`);
        }
        return result.data.entry;
    });
    assertHashChain(entries);
    assertTaskCompletionOrder(entries);
    return {
        path,
        frontmatter,
        entries
    };
}
function assertHashChain(entries) {
    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const previous = entries[index - 1];
        const expectedPreviousHash = previous ? previous.entry_hash : "genesis";
        if (entry.previous_hash !== expectedPreviousHash) {
            throw new Error(`${entry.id} previous_hash must be ${expectedPreviousHash}.`);
        }
    }
}
function assertTaskCompletionOrder(entries) {
    const positions = new Map();
    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (entry.task_id === "plan") {
            continue;
        }
        if (!positions.has(entry.task_id)) {
            positions.set(entry.task_id, new Map());
        }
        positions.get(entry.task_id)?.set(entry.event, index);
        if (entry.event === "task_completed") {
            const taskPositions = positions.get(entry.task_id);
            let previousPosition = -1;
            for (const event of tddCompletionOrder) {
                const eventPosition = taskPositions?.get(event);
                if (eventPosition === undefined) {
                    throw new Error(`${entry.task_id} cannot complete before ${event}.`);
                }
                if (eventPosition < previousPosition) {
                    throw new Error(`${entry.task_id} has invalid TDD event order.`);
                }
                previousPosition = eventPosition;
            }
        }
    }
}
//# sourceMappingURL=memoryValidator.js.map