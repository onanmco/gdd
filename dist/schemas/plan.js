import { z } from "zod";
import { isoUtcString, relativePathString, slugString, taskIdString } from "./common.js";
export const planFrontmatterSchema = z
    .object({
    gdd_schema: z.literal("plan.v1"),
    artifact: z.literal("plan"),
    plan_name: z.string().trim().min(1),
    plan_slug: slugString,
    created_at: isoUtcString,
    status: z.literal("locked"),
    lock_manifest: z.literal("manifest.json"),
    tdd_policy: z.literal("automated_tests_required"),
    testing_exception_policy: z.literal("user_approved_per_task_only"),
    diagrams: z
        .object({
        flowchart: z.string().regex(/^diagrams\/.+\.mmd$/),
        sequence: z.string().regex(/^diagrams\/.+\.mmd$/)
    })
        .strict()
})
    .strict();
export const requirementSchema = z
    .object({
    id: z.string().regex(/^REQ-\d{3}$/),
    text: z.string().trim().min(1)
})
    .strict();
export const acceptanceCriterionSchema = z
    .object({
    id: z.string().regex(/^AC-\d{3}$/),
    text: z.string().trim().min(1),
    verified_by: z.string().regex(/^TEST-\d{3}$/)
})
    .strict();
export const testMethodSchema = z
    .object({
    id: z.string().regex(/^TEST-\d{3}$/),
    type: z.enum([
        "unit",
        "integration",
        "e2e",
        "visual",
        "contract",
        "smoke",
        "migration",
        "lint",
        "manual_exception"
    ]),
    command: z.string().trim().min(1),
    files: z.array(relativePathString).min(1),
    expected_red: z.string().trim().min(1),
    expected_green: z.string().trim().min(1),
    refactor_verification: z.string().trim().min(1)
})
    .strict();
export const taskSchema = z
    .object({
    task: z
        .object({
        id: taskIdString,
        title: z.string().trim().min(1).max(120),
        status: z.literal("planned"),
        dependencies: z.array(taskIdString),
        description: z.string().trim().min(1),
        requirements: z.array(requirementSchema).min(1),
        acceptance_criteria: z.array(acceptanceCriterionSchema).min(1),
        testing: z
            .object({
            mode: z.enum(["automated", "exception"]),
            exception_reason: z.string().trim().min(1).nullable(),
            tests: z.array(testMethodSchema).min(1)
        })
            .strict(),
        allowed_scope: z
            .object({
            files: z.array(relativePathString).min(1),
            forbidden: z.array(relativePathString)
        })
            .strict(),
        user_confirmed: z
            .object({
            acceptance_criteria: z.literal(true),
            testing_method: z.literal(true)
        })
            .strict()
    })
        .strict()
})
    .strict()
    .superRefine(({ task }, ctx) => {
    assertUniqueIds(task.requirements.map((item) => item.id), "requirements", ctx);
    assertUniqueIds(task.acceptance_criteria.map((item) => item.id), "acceptance_criteria", ctx);
    assertUniqueIds(task.testing.tests.map((item) => item.id), "testing.tests", ctx);
    const testIds = new Set(task.testing.tests.map((item) => item.id));
    for (const criterion of task.acceptance_criteria) {
        if (!testIds.has(criterion.verified_by)) {
            ctx.addIssue({
                code: "custom",
                path: ["task", "acceptance_criteria", criterion.id, "verified_by"],
                message: `references missing test ${criterion.verified_by}`
            });
        }
    }
    if (task.testing.mode === "automated") {
        if (task.testing.exception_reason !== null) {
            ctx.addIssue({
                code: "custom",
                path: ["task", "testing", "exception_reason"],
                message: "must be null when testing.mode is automated"
            });
        }
        for (const test of task.testing.tests) {
            if (test.type === "manual_exception" || test.command === "N/A") {
                ctx.addIssue({
                    code: "custom",
                    path: ["task", "testing", "tests", test.id],
                    message: "automated tests must use an executable command and cannot be manual_exception"
                });
            }
        }
    }
    if (task.testing.mode === "exception") {
        if (!task.testing.exception_reason) {
            ctx.addIssue({
                code: "custom",
                path: ["task", "testing", "exception_reason"],
                message: "must contain the user-approved exception reason"
            });
        }
        for (const test of task.testing.tests) {
            if (test.type !== "manual_exception") {
                ctx.addIssue({
                    code: "custom",
                    path: ["task", "testing", "tests", test.id],
                    message: "exception mode tests must use type manual_exception"
                });
            }
        }
    }
});
function assertUniqueIds(ids, label, ctx) {
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id)) {
            ctx.addIssue({
                code: "custom",
                path: [label],
                message: `duplicate id ${id}`
            });
        }
        seen.add(id);
    }
}
//# sourceMappingURL=plan.js.map