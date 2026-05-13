import { readFile } from "node:fs/promises";
import { extractYamlFence, parseMarkdownFrontmatter } from "../utils/frontmatter.js";
import { assertRequiredHeadings, extractHeadingBlocks } from "../utils/markdown.js";
import { formatZodError } from "../schemas/common.js";
import { planFrontmatterSchema, taskSchema } from "../schemas/plan.js";
const requiredPlanHeadings = [
    "# ",
    "## Goal",
    "## Research Summary",
    "## Tech Stack",
    "## Clarified Requirements",
    "## Diagrams",
    "## Task Index",
    "## Tasks"
];
export async function validatePlanFile(path) {
    const markdown = await readFile(path, "utf8");
    return validatePlanMarkdown(markdown, path);
}
export function validatePlanMarkdown(markdown, path = "<memory>") {
    const parsed = parseMarkdownFrontmatter(markdown);
    const frontmatterResult = planFrontmatterSchema.safeParse(parsed.frontmatter);
    if (!frontmatterResult.success) {
        throw new Error(`Invalid plan frontmatter:\n${formatZodError(frontmatterResult.error)}`);
    }
    const firstHeading = `# ${frontmatterResult.data.plan_name}`;
    assertRequiredHeadings(parsed.body, [firstHeading, ...requiredPlanHeadings.slice(1)]);
    const taskSections = extractHeadingBlocks(parsed.body, "### TASK-");
    if (taskSections.length === 0) {
        throw new Error("Plan must contain at least one task block.");
    }
    const tasks = taskSections.map((section) => {
        const yaml = extractYamlFence(section.content);
        const result = taskSchema.safeParse(yaml);
        if (!result.success) {
            throw new Error(`Invalid task block ${section.heading}:\n${formatZodError(result.error)}`);
        }
        if (!section.heading.startsWith(`### ${result.data.task.id}: ${result.data.task.title}`)) {
            throw new Error(`Task heading must match task.id and task.title for ${result.data.task.id}.`);
        }
        return result.data.task;
    });
    assertTaskGraph(tasks);
    return {
        path,
        frontmatter: frontmatterResult.data,
        tasks
    };
}
function assertTaskGraph(tasks) {
    const taskIds = new Set();
    for (const task of tasks) {
        if (taskIds.has(task.id)) {
            throw new Error(`Duplicate task id ${task.id}.`);
        }
        taskIds.add(task.id);
    }
    for (const task of tasks) {
        for (const dependency of task.dependencies) {
            if (!taskIds.has(dependency)) {
                throw new Error(`Task ${task.id} depends on missing task ${dependency}.`);
            }
            if (dependency === task.id) {
                throw new Error(`Task ${task.id} cannot depend on itself.`);
            }
        }
    }
}
//# sourceMappingURL=planValidator.js.map