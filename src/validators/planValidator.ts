import { readFile } from "node:fs/promises";
import { extractYamlFence, parseMarkdownFrontmatter } from "../utils/frontmatter.js";
import { assertRequiredHeadings, extractHeadingBlocks } from "../utils/markdown.js";
import { formatZodError } from "../schemas/common.js";
import { matchesAnyGlob } from "../utils/glob.js";
import {
  type PlanFrontmatter,
  type PlanTask,
  planFrontmatterSchema,
  taskSchema
} from "../schemas/plan.js";

export interface ValidatedPlan {
  path: string;
  frontmatter: PlanFrontmatter;
  tasks: PlanTask[];
}

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

export async function validatePlanFile(path: string): Promise<ValidatedPlan> {
  const markdown = await readFile(path, "utf8");
  return validatePlanMarkdown(markdown, path);
}

export function validatePlanMarkdown(markdown: string, path = "<memory>"): ValidatedPlan {
  const parsed = parseMarkdownFrontmatter(markdown);
  const frontmatterResult = planFrontmatterSchema.safeParse(parsed.frontmatter);

  if (!frontmatterResult.success) {
    throw new Error(`Invalid plan frontmatter:\n${formatZodError(frontmatterResult.error)}`);
  }

  const firstHeading = `# ${frontmatterResult.data.plan_name}`;
  assertRequiredHeadings(parsed.body, [firstHeading, ...requiredPlanHeadings.slice(1)]);
  assertResearchSummary(parsed.body);

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
      throw new Error(
        `Task heading must match task.id and task.title for ${result.data.task.id}.`
      );
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

function assertTaskGraph(tasks: PlanTask[]): void {
  const taskIds = new Set<string>();

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

  assertTaskTestScopes(tasks);
}

function assertResearchSummary(body: string): void {
  const research = extractHeadingContent(body, "## Research Summary", "## ");
  if (!research) {
    throw new Error("Research Summary must include comparable-domain and tooling research.");
  }

  const comparable = extractHeadingContent(
    research,
    "### Comparable Project/Product Research",
    "### "
  );
  if (!comparable || !hasSubstantiveContent(comparable)) {
    throw new Error("Research Summary must include substantive Comparable Project/Product Research.");
  }

  const tooling = extractHeadingContent(research, "### Tooling Research", "### ");
  if (!tooling || !hasSubstantiveContent(tooling)) {
    throw new Error("Research Summary must include Tooling Research separately from comparable-domain research.");
  }
}

function extractHeadingContent(
  body: string,
  heading: string,
  nextHeadingPrefix: string
): string | undefined {
  const escapedHeading = escapeRegExp(heading);
  const headingPattern = new RegExp(`^${escapedHeading}\\s*$`, "m");
  const headingMatch = headingPattern.exec(body);
  if (!headingMatch) {
    return undefined;
  }

  const start = (headingMatch.index ?? 0) + headingMatch[0].length;
  const remainder = body.slice(start);
  const nextPattern = new RegExp(`^${escapeRegExp(nextHeadingPrefix)}`, "m");
  const nextMatch = nextPattern.exec(remainder);
  return remainder.slice(0, nextMatch?.index ?? remainder.length).trim();
}

function hasSubstantiveContent(value: string): boolean {
  const normalized = value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/[`*_#>\-\s]/g, "")
    .trim()
    .toLowerCase();
  return normalized.length > 0 && !["na", "n/a", "none", "tbd"].includes(normalized);
}

function assertTaskTestScopes(tasks: PlanTask[]): void {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  for (const task of tasks) {
    const availableScope = [
      ...collectDependencyScopes(task, tasksById),
      ...task.allowed_scope.files
    ];

    for (const test of task.testing.tests) {
      for (const file of test.files) {
        if (!matchesAnyGlob(file, availableScope)) {
          throw new Error(
            `${task.id} test ${test.id} references ${file}, which is not writable by the task or its dependencies.`
          );
        }
      }
    }
  }
}

function collectDependencyScopes(
  task: PlanTask,
  tasksById: Map<string, PlanTask>,
  seen = new Set<string>()
): string[] {
  const scopes: string[] = [];
  for (const dependencyId of task.dependencies) {
    if (seen.has(dependencyId)) {
      continue;
    }
    seen.add(dependencyId);
    const dependency = tasksById.get(dependencyId);
    if (!dependency) {
      continue;
    }
    scopes.push(...collectDependencyScopes(dependency, tasksById, seen));
    scopes.push(...dependency.allowed_scope.files);
  }

  return scopes;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
