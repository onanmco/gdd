import { describe, expect, it } from "vitest";
import { validatePlanMarkdown } from "../../src/validators/planValidator.js";

describe("plan validator", () => {
  it("accepts a valid locked plan with confirmed task contracts", () => {
    const plan = validatePlanMarkdown(validPlanMarkdown());
    expect(plan.frontmatter.plan_slug).toBe("validator-plan");
    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0]?.user_confirmed.acceptance_criteria).toBe(true);
    expect(plan.tasks[0]?.user_confirmed.testing_method).toBe(true);
  });

  it("rejects plans where acceptance criteria confirmation is missing", () => {
    expect(() =>
      validatePlanMarkdown(
        validPlanMarkdown().replace("acceptance_criteria: true", "acceptance_criteria: false")
      )
    ).toThrow(/Invalid task block/);
  });

  it("rejects automated tasks that use manual exception tests", () => {
    expect(() =>
      validatePlanMarkdown(validPlanMarkdown().replace("type: unit", "type: manual_exception"))
    ).toThrow(/manual_exception/);
  });
});

export function validPlanMarkdown(): string {
  return `---
gdd_schema: plan.v1
artifact: plan
plan_name: Validator Plan
plan_slug: validator-plan
created_at: 2026-05-13T18:12:00Z
status: locked
lock_manifest: manifest.json
tdd_policy: automated_tests_required
testing_exception_policy: user_approved_per_task_only
diagrams:
  flowchart: diagrams/flowchart.mmd
  sequence: diagrams/sequence.mmd
---

# Validator Plan

## Goal

Validate GDD plans.

## Research Summary

Local schema validation is required.

## Tech Stack

TypeScript and Vitest.

## Clarified Requirements

All task contracts are explicit.

## Diagrams

- Flowchart: diagrams/flowchart.mmd
- Sequence: diagrams/sequence.mmd

## Task Index

- TASK-001: Add locked plan validator

## Tasks

### TASK-001: Add locked plan validator

\`\`\`yaml
task:
  id: TASK-001
  title: Add locked plan validator
  status: planned
  dependencies: []
  description: Validate plan.md before implementation starts.
  requirements:
    - id: REQ-001
      text: Reject plans when a task lacks user-confirmed acceptance criteria.
  acceptance_criteria:
    - id: AC-001
      text: Invalid plans fail validation before implementation begins.
      verified_by: TEST-001
  testing:
    mode: automated
    exception_reason: null
    tests:
      - id: TEST-001
        type: unit
        command: npm test -- plan-validator.test.ts
        files:
          - tests/validators/plan-validator.test.ts
        expected_red: Validator currently accepts an invalid fixture.
        expected_green: Validator rejects the invalid fixture with a schema error.
        refactor_verification: npm test -- plan-validator.test.ts
  allowed_scope:
    files:
      - src/validators/**
      - tests/validators/**
    forbidden:
      - gdd/plans/*/plan.md
  user_confirmed:
    acceptance_criteria: true
    testing_method: true
\`\`\`
`;
}
