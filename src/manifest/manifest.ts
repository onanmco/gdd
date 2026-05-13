import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { sha256 } from "../utils/hash.js";
import { validatePlanFile, type ValidatedPlan } from "../validators/planValidator.js";

const manifestFileSchema = z
  .object({
    path: z.string().trim().min(1).refine((value) => {
      return !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
    }, "path must be a plan-relative path"),
    sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/)
  })
  .strict();

const lockManifestSchema = z
  .object({
    gdd_schema: z.literal("manifest.v1"),
    artifact: z.literal("manifest"),
    plan_name: z.string().trim().min(1),
    plan_slug: z.string().trim().min(1),
    created_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
    locked: z.literal(true),
    files: z.array(manifestFileSchema).min(1)
  })
  .strict();

export type LockManifest = z.infer<typeof lockManifestSchema>;

export interface PlanLockState {
  locked: boolean;
  valid: boolean;
  reason?: string;
}

export async function writeLockManifest(plan: ValidatedPlan, planPath: string): Promise<LockManifest> {
  const planDir = dirname(planPath);
  const files = lockFilePaths(plan);

  const manifest: LockManifest = {
    gdd_schema: "manifest.v1",
    artifact: "manifest",
    plan_name: plan.frontmatter.plan_name,
    plan_slug: plan.frontmatter.plan_slug,
    created_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    locked: true,
    files: []
  };

  for (const relativePath of files) {
    const content = await readFile(join(planDir, relativePath), "utf8");
    manifest.files.push({
      path: relativePath,
      sha256: sha256(content)
    });
  }

  await writeFile(join(planDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: "wx"
  });

  return manifest;
}

export async function readLockManifest(planPath: string): Promise<LockManifest> {
  const manifestPath = join(dirname(planPath), "manifest.json");
  const rawManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return lockManifestSchema.parse(rawManifest);
}

export async function validateLockManifest(planPath: string): Promise<LockManifest> {
  const [plan, manifest] = await Promise.all([
    validatePlanFile(planPath),
    readLockManifest(planPath)
  ]);
  const planDir = dirname(planPath);

  if (manifest.plan_name !== plan.frontmatter.plan_name) {
    throw new Error("manifest.json plan_name does not match plan.md.");
  }
  if (manifest.plan_slug !== plan.frontmatter.plan_slug) {
    throw new Error("manifest.json plan_slug does not match plan.md.");
  }

  const expectedFiles = lockFilePaths(plan);
  const actualFiles = manifest.files.map((file) => file.path);
  assertSameFiles(expectedFiles, actualFiles);

  for (const file of manifest.files) {
    const content = await readFile(join(planDir, file.path), "utf8");
    const actualHash = sha256(content);
    if (actualHash !== file.sha256) {
      throw new Error(`manifest hash mismatch for ${file.path}.`);
    }
  }

  return manifest;
}

export async function getPlanLockState(planDir: string): Promise<PlanLockState> {
  const planPath = join(planDir, "plan.md");
  const manifestPath = join(planDir, "manifest.json");
  if (!(await exists(manifestPath))) {
    return { locked: false, valid: false };
  }

  try {
    await validateLockManifest(planPath);
    return { locked: true, valid: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { locked: true, valid: false, reason };
  }
}

function lockFilePaths(plan: ValidatedPlan): string[] {
  return [
    "plan.md",
    plan.frontmatter.diagrams.flowchart,
    plan.frontmatter.diagrams.sequence
  ];
}

function assertSameFiles(expectedFiles: string[], actualFiles: string[]): void {
  const expected = new Set(expectedFiles);
  const actual = new Set(actualFiles);

  if (expected.size !== expectedFiles.length || actual.size !== actualFiles.length) {
    throw new Error("manifest contains duplicate files.");
  }

  if (expected.size !== actual.size) {
    throw new Error("manifest file list does not match locked plan files.");
  }

  for (const file of expected) {
    if (!actual.has(file)) {
      throw new Error(`manifest is missing ${file}.`);
    }
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
