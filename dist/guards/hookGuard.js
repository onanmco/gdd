import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { hasTaskEvent } from "../ledger/memoryWriter.js";
import { getPlanLockState } from "../manifest/manifest.js";
import { matchesAnyGlob, normalizePath } from "../utils/glob.js";
import { validateMemoryFiles } from "../validators/memoryValidator.js";
import { validatePlanFile } from "../validators/planValidator.js";
export async function guardHarnessEvent(harness, input, env = process.env) {
    const cwd = extractWorkingDirectory(input, env);
    for (const command of extractShellCommands(input)) {
        const blockedReason = await shellMutationReason(command, cwd);
        if (blockedReason) {
            return {
                allow: false,
                reason: blockedReason
            };
        }
    }
    const paths = extractPaths(input).map((path) => normalizePath(path));
    if (paths.length === 0) {
        return { allow: true };
    }
    for (const path of paths) {
        const lockedReason = await protectedArtifactReason(path, cwd);
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
export function extractShellCommands(value) {
    const commands = new Set();
    collectShellCommands(value, commands);
    return [...commands];
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
function collectShellCommands(value, commands) {
    if (typeof value === "string" || !value || typeof value !== "object") {
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectShellCommands(item, commands);
        }
        return;
    }
    const record = value;
    for (const [key, nested] of Object.entries(record)) {
        const normalizedKey = key.toLowerCase();
        if (typeof nested === "string" &&
            ["command", "cmd", "script", "shell", "shell_command"].includes(normalizedKey)) {
            commands.add(nested);
        }
        collectShellCommands(nested, commands);
    }
}
function extractWorkingDirectory(value, env) {
    if (env.GDD_REPO_ROOT) {
        return resolve(env.GDD_REPO_ROOT);
    }
    const discovered = findWorkingDirectory(value);
    return discovered ? resolve(discovered) : process.cwd();
}
function findWorkingDirectory(value) {
    if (typeof value === "string" || !value || typeof value !== "object") {
        return undefined;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            const discovered = findWorkingDirectory(item);
            if (discovered) {
                return discovered;
            }
        }
        return undefined;
    }
    const record = value;
    for (const [key, nested] of Object.entries(record)) {
        const normalizedKey = key.toLowerCase();
        if (typeof nested === "string" &&
            ["cwd", "workdir", "working_directory", "workingdirectory"].includes(normalizedKey)) {
            return nested;
        }
        const discovered = findWorkingDirectory(nested);
        if (discovered) {
            return discovered;
        }
    }
    return undefined;
}
async function shellMutationReason(command, cwd) {
    if (!isMutatingShellCommand(command) || isAllowedInternalCommand(command)) {
        return undefined;
    }
    for (const path of extractGddPathsFromCommand(command)) {
        const reason = await protectedArtifactReason(path, cwd);
        if (reason) {
            return `Shell command would modify a protected GDD artifact: ${reason}`;
        }
    }
    return undefined;
}
function isAllowedInternalCommand(command) {
    return /(?:^|\s)internal\.js['"]?\s+(?:validate-plan|validate-lock|validate-memory|init-memory|append-memory|write-manifest|prepare-visual|prepare-diagrams|visual-server|check-append-only)\b/.test(command);
}
function isMutatingShellCommand(command) {
    return [
        /(^|[\s;&|])(?:cat\s+)?>{1,2}\s*/,
        /(^|[\s;&|])tee(?:\s+-a)?\s+/,
        /(^|[\s;&|])(?:mv|cp|rm|touch)\s+/,
        /(^|[\s;&|])sed\s+.*(?:^|\s)-i(?:\s|$)/,
        /(^|[\s;&|])perl\s+.*(?:^|\s)-i(?:\s|$)/,
        /(^|[\s;&|])node\s+-e\b/,
        /(^|[\s;&|])python3?\s+-c\b/
    ].some((pattern) => pattern.test(command));
}
function extractGddPathsFromCommand(command) {
    const paths = new Set();
    const pathRegex = /(?:"([^"\s<>;|&]*gdd\/plans\/[^"\s<>;|&]+)"|'([^'\s<>;|&]*gdd\/plans\/[^'\s<>;|&]+)'|([^\s"'<>;|&]*gdd\/plans\/[^\s"'<>;|&]+))/g;
    for (const match of command.matchAll(pathRegex)) {
        const path = match[1] ?? match[2] ?? match[3];
        if (path) {
            paths.add(path);
        }
    }
    return [...paths];
}
async function protectedArtifactReason(path, cwd) {
    const artifact = gddArtifact(path, cwd);
    if (!artifact) {
        return undefined;
    }
    if (artifact.relativePath === "manifest.json") {
        return "GDD manifest.json is immutable. Use the internal write-manifest command.";
    }
    if (artifact.relativePath === "memory.md") {
        return "GDD memory.md is append-only. Use the internal append-memory guard.";
    }
    if (artifact.relativePath === "plan.md" ||
        /^diagrams\/.+\.mmd$/.test(artifact.relativePath)) {
        const state = await getPlanLockState(artifact.planDir);
        if (state.locked) {
            if (!state.valid) {
                return `GDD plan artifacts are protected because manifest.json exists but validate-lock fails: ${state.reason}`;
            }
            return artifact.relativePath === "plan.md"
                ? "GDD plan.md is immutable after lock. Create a new plan instead."
                : "GDD diagrams are immutable after plan lock. Create a new plan instead.";
        }
    }
    return undefined;
}
function gddArtifact(path, cwd) {
    const normalized = normalizePath(path);
    const gddIndex = normalized.indexOf("gdd/plans/");
    if (gddIndex < 0) {
        return undefined;
    }
    const artifactPath = normalized.slice(gddIndex);
    const parts = artifactPath.split("/");
    const slug = parts[2];
    if (parts[0] !== "gdd" || parts[1] !== "plans" || !slug || parts.length < 4) {
        return undefined;
    }
    const relativePath = parts.slice(3).join("/");
    const absolutePath = isAbsolute(path) ? resolve(path) : resolve(cwd, path);
    const normalizedAbsolute = normalizePath(absolutePath);
    const marker = `gdd/plans/${slug}`;
    const markerIndex = normalizedAbsolute.indexOf(marker);
    const planDir = markerIndex >= 0
        ? normalizedAbsolute.slice(0, markerIndex + marker.length)
        : normalizePath(join(cwd, "gdd", "plans", slug));
    return {
        planDir,
        relativePath
    };
}
//# sourceMappingURL=hookGuard.js.map