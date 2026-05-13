import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { sha256 } from "../utils/hash.js";
import type { ValidatedPlan } from "../validators/planValidator.js";

export interface LockManifest {
  gdd_schema: "manifest.v1";
  artifact: "manifest";
  plan_name: string;
  plan_slug: string;
  created_at: string;
  locked: true;
  files: Array<{
    path: string;
    sha256: string;
  }>;
}

export async function writeLockManifest(plan: ValidatedPlan, planPath: string): Promise<LockManifest> {
  const planDir = dirname(planPath);
  const files = [
    "plan.md",
    plan.frontmatter.diagrams.flowchart,
    plan.frontmatter.diagrams.sequence
  ];

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
