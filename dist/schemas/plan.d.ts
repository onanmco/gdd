import { z } from "zod";
export declare const planFrontmatterSchema: z.ZodObject<{
    gdd_schema: z.ZodLiteral<"plan.v1">;
    artifact: z.ZodLiteral<"plan">;
    plan_name: z.ZodString;
    plan_slug: z.ZodString;
    created_at: z.ZodString;
    status: z.ZodLiteral<"locked">;
    lock_manifest: z.ZodLiteral<"manifest.json">;
    tdd_policy: z.ZodLiteral<"automated_tests_required">;
    testing_exception_policy: z.ZodLiteral<"user_approved_per_task_only">;
    diagrams: z.ZodObject<{
        flowchart: z.ZodString;
        sequence: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const requirementSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
}, z.core.$strict>;
export declare const acceptanceCriterionSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    verified_by: z.ZodString;
}, z.core.$strict>;
export declare const testMethodSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        unit: "unit";
        integration: "integration";
        e2e: "e2e";
        visual: "visual";
        contract: "contract";
        smoke: "smoke";
        migration: "migration";
        lint: "lint";
        manual_exception: "manual_exception";
    }>;
    command: z.ZodString;
    files: z.ZodArray<z.ZodString>;
    expected_red: z.ZodString;
    expected_green: z.ZodString;
    refactor_verification: z.ZodString;
}, z.core.$strict>;
export declare const taskSchema: z.ZodObject<{
    task: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        status: z.ZodLiteral<"planned">;
        dependencies: z.ZodArray<z.ZodString>;
        description: z.ZodString;
        requirements: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
        }, z.core.$strict>>;
        acceptance_criteria: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
            verified_by: z.ZodString;
        }, z.core.$strict>>;
        testing: z.ZodObject<{
            mode: z.ZodEnum<{
                automated: "automated";
                exception: "exception";
            }>;
            exception_reason: z.ZodNullable<z.ZodString>;
            tests: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodEnum<{
                    unit: "unit";
                    integration: "integration";
                    e2e: "e2e";
                    visual: "visual";
                    contract: "contract";
                    smoke: "smoke";
                    migration: "migration";
                    lint: "lint";
                    manual_exception: "manual_exception";
                }>;
                command: z.ZodString;
                files: z.ZodArray<z.ZodString>;
                expected_red: z.ZodString;
                expected_green: z.ZodString;
                refactor_verification: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        allowed_scope: z.ZodObject<{
            files: z.ZodArray<z.ZodString>;
            forbidden: z.ZodArray<z.ZodString>;
        }, z.core.$strict>;
        user_confirmed: z.ZodObject<{
            acceptance_criteria: z.ZodLiteral<true>;
            testing_method: z.ZodLiteral<true>;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type PlanFrontmatter = z.infer<typeof planFrontmatterSchema>;
export type PlanTaskBlock = z.infer<typeof taskSchema>;
export type PlanTask = PlanTaskBlock["task"];
