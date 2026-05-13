import { z } from "zod";
import { type ValidatedPlan } from "../validators/planValidator.js";
declare const lockManifestSchema: z.ZodObject<{
    gdd_schema: z.ZodLiteral<"manifest.v1">;
    artifact: z.ZodLiteral<"manifest">;
    plan_name: z.ZodString;
    plan_slug: z.ZodString;
    created_at: z.ZodString;
    locked: z.ZodLiteral<true>;
    files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        sha256: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type LockManifest = z.infer<typeof lockManifestSchema>;
export interface PlanLockState {
    locked: boolean;
    valid: boolean;
    reason?: string;
}
export declare function writeLockManifest(plan: ValidatedPlan, planPath: string): Promise<LockManifest>;
export declare function readLockManifest(planPath: string): Promise<LockManifest>;
export declare function validateLockManifest(planPath: string): Promise<LockManifest>;
export declare function getPlanLockState(planDir: string): Promise<PlanLockState>;
export {};
