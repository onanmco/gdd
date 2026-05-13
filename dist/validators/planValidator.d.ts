import { type PlanFrontmatter, type PlanTask } from "../schemas/plan.js";
export interface ValidatedPlan {
    path: string;
    frontmatter: PlanFrontmatter;
    tasks: PlanTask[];
}
export declare function validatePlanFile(path: string): Promise<ValidatedPlan>;
export declare function validatePlanMarkdown(markdown: string, path?: string): ValidatedPlan;
