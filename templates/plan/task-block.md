### TASK-001: Add locked plan validator

```yaml
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
```
