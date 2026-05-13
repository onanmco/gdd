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
export declare function writeLockManifest(plan: ValidatedPlan, planPath: string): Promise<LockManifest>;
