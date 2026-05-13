import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { hasTaskEvent } from "../ledger/memoryWriter.js";
import { matchesAnyGlob, normalizePath } from "../utils/glob.js";
import { validateMemoryFiles } from "../validators/memoryValidator.js";
import { validatePlanFile } from "../validators/planValidator.js";
export async function guardHarnessEvent(harness, input, env = process.env) {
    const paths = extractPaths(input).map((path) => normalizePath(path));
    if (paths.length === 0) {
        return { allow: true };
    }
    for (const path of paths) {
        const lockedReason = lockedArtifactReason(path);
        if (lockedReason) {
            return {
                allow: false,
                reason: lockedReason
            };
        }
    }
    const activePlan = env.GDD_ACTIVE_PLAN;
    const activeTask = env.GDD_ACTIVE_TASK;
    if (!activePlan || !activeTask) {
        return { allow: true };
    }
    const planPath = resolve(activePlan);
    const memoryPath = env.GDD_ACTIVE_MEMORY
        ? resolve(env.GDD_ACTIVE_MEMORY)
        : resolve(dirname(planPath), "memory.md");
    if (!existsSync(planPath) || !existsSync(memoryPath)) {
        return {
            allow: false,
            reason: "GDD_ACTIVE_PLAN/GDD_ACTIVE_MEMORY points to missing plan or memory file."
        };
    }
    const plan = await validatePlanFile(planPath);
    const memory = await validateMemoryFiles(planPath, memoryPath);
    const task = plan.tasks.find((candidate) => candidate.id === activeTask);
    if (!task) {
        return {
            allow: false,
            reason: `GDD_ACTIVE_TASK ${activeTask} is not present in the active plan.`
        };
    }
    const planRoot = env.GDD_REPO_ROOT
        ? resolve(env.GDD_REPO_ROOT)
        : dirname(dirname(dirname(dirname(resolve(planPath)))));
    for (const changedPath of paths) {
        const repoRelative = normalizePath(isAbsolute(changedPath) ? relative(planRoot, resolve(changedPath)) : changedPath);
        if (matchesAnyGlob(repoRelative, task.allowed_scope.forbidden)) {
            return {
                allow: false,
                reason: `${repoRelative} is forbidden by ${activeTask} allowed_scope.forbidden.`
            };
        }
        if (!matchesAnyGlob(repoRelative, task.allowed_scope.files)) {
            return {
                allow: false,
                reason: `${repoRelative} is outside ${activeTask} allowed_scope.files.`
            };
        }
        const plannedTestFiles = task.testing.tests.flatMap((test) => test.files);
        const isTestFile = matchesAnyGlob(repoRelative, plannedTestFiles);
        const redRecorded = hasTaskEvent(memory.entries, activeTask, "red_recorded");
        if (!redRecorded && !isTestFile) {
            return {
                allow: false,
                reason: `${activeTask} has no red_recorded memory entry yet. Add the planned failing test first.`
            };
        }
    }
    return {
        allow: true
    };
}
export function extractPaths(value) {
    const paths = new Set();
    collectPaths(value, paths);
    return [...paths];
}
export function readJsonFromStdin() {
    const input = readFileSync(0, "utf8").trim();
    if (!input) {
        return {};
    }
    return JSON.parse(input);
}
export function readYamlFromStdin() {
    const input = readFileSync(0, "utf8").trim();
    if (!input) {
        throw new Error("Expected YAML on stdin.");
    }
    return parseYaml(input);
}
function collectPaths(value, paths) {
    if (typeof value === "string") {
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectPaths(item, paths);
        }
        return;
    }
    if (!value || typeof value !== "object") {
        return;
    }
    const record = value;
    for (const [key, nested] of Object.entries(record)) {
        const normalizedKey = key.toLowerCase();
        if (typeof nested === "string" &&
            ["file_path", "filepath", "file", "path", "target_file", "target"].includes(normalizedKey)) {
            paths.add(nested);
        }
        if (Array.isArray(nested) &&
            ["files", "paths", "file_paths"].includes(normalizedKey)) {
            for (const item of nested) {
                if (typeof item === "string") {
                    paths.add(item);
                }
            }
        }
        collectPaths(nested, paths);
    }
}
function lockedArtifactReason(path) {
    const normalized = normalizePath(path);
    const gddIndex = normalized.indexOf("gdd/plans/");
    const artifactPath = gddIndex >= 0 ? normalized.slice(gddIndex) : normalized;
    if (/^gdd\/plans\/[^/]+\/plan\.md$/.test(artifactPath)) {
        return "GDD plan.md is immutable after lock. Create a new plan instead.";
    }
    if (/^gdd\/plans\/[^/]+\/manifest\.json$/.test(artifactPath)) {
        return "GDD manifest.json is immutable after lock.";
    }
    if (/^gdd\/plans\/[^/]+\/diagrams\/.+\.mmd$/.test(artifactPath)) {
        return "GDD diagrams are immutable after plan lock. Create a new plan instead.";
    }
    if (/^gdd\/plans\/[^/]+\/memory\.md$/.test(artifactPath)) {
        return "GDD memory.md is append-only. Use the internal append-memory guard.";
    }
    return undefined;
}
//# sourceMappingURL=hookGuard.js.map