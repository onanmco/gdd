# GDD Schemas

GDD artifacts are Markdown files with strict YAML frontmatter and strict fenced YAML blocks. The Markdown headings are fixed so humans can read the files; the YAML blocks are the machine contract.

## `plan.md`

`plan.md` uses `plan.v1` frontmatter and one fenced YAML block per task.

Required heading order:

```md
# <Plan Name>
## Goal
## Research Summary
## Tech Stack
## Clarified Requirements
## Diagrams
## Task Index
## Tasks
```

`## Research Summary` must contain:

```md
### Comparable Project/Product Research
### Tooling Research
```

Comparable research must describe similar projects, products, workflows, libraries, or repos in the same problem domain. Tooling research is separate and cannot satisfy the comparable research requirement by itself.

Plan-level fields:

| Field | Type | Required | Allowed values | Example |
|---|---|---:|---|---|
| `gdd_schema` | string | yes | `plan.v1` | `plan.v1` |
| `artifact` | string | yes | `plan` | `plan` |
| `plan_name` | string | yes | exact user-confirmed name | `Stripe Billing Refactor` |
| `plan_slug` | string | yes | lowercase kebab-case | `stripe-billing-refactor` |
| `created_at` | string | yes | `YYYY-MM-DDTHH:mm:ssZ` | `2026-05-13T18:12:00Z` |
| `status` | string | yes | `locked` | `locked` |
| `lock_manifest` | string | yes | `manifest.json` | `manifest.json` |
| `tdd_policy` | string | yes | `automated_tests_required` | `automated_tests_required` |
| `testing_exception_policy` | string | yes | `user_approved_per_task_only` | `user_approved_per_task_only` |
| `diagrams.flowchart` | string | yes | `diagrams/*.mmd` | `diagrams/flowchart.mmd` |
| `diagrams.sequence` | string | yes | `diagrams/*.mmd` | `diagrams/sequence.mmd` |

Task block fields:

| Field | Type | Required | Allowed values | Example |
|---|---|---:|---|---|
| `task.id` | string | yes | `TASK-000` pattern | `TASK-001` |
| `task.title` | string | yes | 1-120 chars | `Add locked plan validator` |
| `task.status` | string | yes | `planned` | `planned` |
| `task.dependencies` | array<string> | yes | task IDs or `[]` | `[TASK-001]` |
| `task.description` | string | yes | non-empty | `Validate plan.md before implementation starts.` |
| `task.requirements` | array<object> | yes | at least 1 item | see template |
| `requirements[].id` | string | yes | `REQ-000` pattern | `REQ-001` |
| `requirements[].text` | string | yes | non-empty, testable | `Reject missing acceptance criteria.` |
| `task.acceptance_criteria` | array<object> | yes | at least 1 item | see template |
| `acceptance_criteria[].id` | string | yes | `AC-000` pattern | `AC-001` |
| `acceptance_criteria[].text` | string | yes | observable condition | `Invalid plans fail validation.` |
| `acceptance_criteria[].verified_by` | string | yes | existing `TEST-*` in same task | `TEST-001` |
| `testing.mode` | string | yes | `automated`, `exception` | `automated` |
| `testing.exception_reason` | string/null | yes | null for automated, non-empty for exception | `null` |
| `testing.tests` | array<object> | yes | at least 1 item | see template |
| `tests[].id` | string | yes | `TEST-000` pattern | `TEST-001` |
| `tests[].type` | string | yes | `unit`, `integration`, `e2e`, `visual`, `contract`, `smoke`, `migration`, `lint`, `manual_exception` | `unit` |
| `tests[].command` | string | yes | executable command, or `N/A` only with exception | `npm test -- validator.test.ts` |
| `tests[].files` | array<string> | yes | repo-relative test file globs | `[tests/validators/**]` |
| `tests[].expected_red` | string | yes | exact failing behavior before implementation | `Fixture is incorrectly accepted.` |
| `tests[].expected_green` | string | yes | exact passing behavior after implementation | `Fixture is rejected.` |
| `tests[].refactor_verification` | string | yes | command to rerun after refactor | `npm test -- validator.test.ts` |
| `allowed_scope.files` | array<string> | yes | repo-relative globs | `[src/validators/**]` |
| `allowed_scope.forbidden` | array<string> | yes | repo-relative globs or `[]` | `[gdd/plans/*/plan.md]` |
| `user_confirmed.acceptance_criteria` | boolean | yes | must be `true` | `true` |
| `user_confirmed.testing_method` | boolean | yes | must be `true` | `true` |

Cross-field rules enforced by the TypeScript validator:

- no unknown fields anywhere;
- task IDs, requirement IDs, acceptance IDs, and test IDs are unique in their scopes;
- every acceptance criterion references an existing test;
- automated mode cannot use `manual_exception` or `N/A`;
- exception mode requires a non-empty user-approved reason and `manual_exception` test entries;
- dependencies must reference existing tasks and cannot self-reference;
- each test file must be writable by the task itself or by one of its dependencies.

## `memory.md`

`memory.md` uses `memory.v1` frontmatter and append-only ledger entries.

Required heading order:

```md
# GDD Memory: <Plan Name>
## Ledger
```

Memory-level fields:

| Field | Type | Required | Allowed values | Example |
|---|---|---:|---|---|
| `gdd_schema` | string | yes | `memory.v1` | `memory.v1` |
| `artifact` | string | yes | `memory` | `memory` |
| `plan_name` | string | yes | must match plan | `Stripe Billing Refactor` |
| `plan_slug` | string | yes | must match plan | `stripe-billing-refactor` |
| `created_at` | string | yes | `YYYY-MM-DDTHH:mm:ssZ` | `2026-05-13T18:20:00Z` |
| `plan_hash` | string | yes | `sha256:<64 hex>` | `sha256:...` |
| `append_only` | boolean | yes | `true` | `true` |
| `hash_chain` | string | yes | `sha256` | `sha256` |

Ledger entry fields:

| Field | Type | Required | Allowed values | Example |
|---|---|---:|---|---|
| `entry.id` | string | yes | increasing `ENTRY-000000` pattern | `ENTRY-000001` |
| `entry.timestamp` | string | yes | `YYYY-MM-DDTHH:mm:ssZ` | `2026-05-13T18:25:00Z` |
| `entry.task_id` | string | yes | `plan` or `TASK-*` | `TASK-001` |
| `entry.event` | string | yes | fixed enum | `red_recorded` |
| `entry.actor.harness` | string | yes | `codex`, `claude`, `opencode`, `other` | `codex` |
| `entry.actor.agent` | string | yes | `main`, `subagent`, `reviewer`, `debugger`, `guard` | `subagent` |
| `entry.previous_hash` | string | yes | `genesis` or previous `entry_hash` | `genesis` |
| `entry.entry_hash` | string | yes | `sha256:<64 hex>` over canonical entry without `entry_hash` | `sha256:...` |
| `entry.summary` | string | yes | non-empty | `Added failing validator fixture.` |
| `entry.evidence.commands` | array<object> | yes | empty only for `memory_created` | see template |
| `commands[].command` | string | yes | exact command run | `npm test` |
| `commands[].exit_code` | integer | yes | process exit code | `1` |
| `commands[].output_excerpt` | string | yes | bounded relevant output | `1 failing test` |
| `entry.evidence.files_changed` | array<string> | yes | repo-relative paths | `[src/validator.ts]` |
| `entry.next_action` | string | yes | non-empty | `Run GREEN implementation.` |

Allowed ledger events:

```yaml
- memory_created
- task_started
- red_recorded
- green_recorded
- refactor_recorded
- acceptance_verified
- task_completed
- blocker_recorded
- retry_recorded
- implementer_spawned
- reviewer_spawned
- debugger_spawned
```

Completion replay rule:

```text
task_started -> red_recorded -> green_recorded -> refactor_recorded -> acceptance_verified -> task_completed
```

The validator rejects completion if any required event is missing or out of order.

When a harness supports subagents, `implementer_spawned` records delegation to `gdd-implementer` before task work starts. If present for a task, it must appear before `task_started`.
