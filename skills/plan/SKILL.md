---
name: plan
description: Use for `/gdd:plan` or `$gdd:plan` when the user has an idea and wants a locked Goal Driven Development plan before implementation.
---

# GDD Plan

This skill turns a user idea into a locked GDD plan under `gdd/plans/{plan_slug}/`.

## Non-Negotiable Rules

- Always ask the user for the plan name. Never infer it.
- Planning is interactive. Ask until the goal, constraints, current state, stack, risks, task list, acceptance criteria, and testing method are all clear.
- Research comparable projects, products, workflows, libraries, or repos in the same problem domain when network access exists. Tooling research is supplemental and cannot satisfy this requirement by itself. If comparable-domain research fails, discuss the limitation with the user before continuing.
- Decide the tech stack with the user. Do not silently choose stack, framework, test runner, or verification method.
- If UI work is involved, offer a plan-local visual companion under `gdd/plans/{plan_slug}/visual/`.
- Always produce Mermaid flowchart and sequence diagrams, save them under `gdd/plans/{plan_slug}/diagrams/`, run `prepare-diagrams`, and confirm the browser-ready diagram view with the user before writing `plan.md`.
- Before writing `plan.md`, confirm every task contract with the user. A task contract is invalid unless acceptance criteria and exact testing method are user-confirmed.
- Automated tests are mandatory for every task unless the user explicitly approves a testing exception for that task during planning.
- Once `plan.md` is written and `manifest.json` is created, the plan, diagrams, and manifest are immutable.
- Guard errors are hard failures. Do not treat guard errors as warnings and do not bypass them with shell writes.

## Required Flow

1. Ask for the explicit plan name.
2. Inspect the target project without mutating files.
3. Interview the user about goal, audience, constraints, non-goals, current state, risks, stack, deployment, and testing expectations.
4. Research comparable-domain projects and tooling separately. Record both under `## Research Summary` using:
   - `### Comparable Project/Product Research` for similar end-user products, workflows, apps, libraries, or repos in the same problem domain;
   - `### Tooling Research` for test runners, browser automation, frameworks, APIs, or implementation tools.
   Each plan must include at least one concrete planning insight from comparable-domain research.
5. For UI work, ask whether to create a visual companion. If accepted, create non-functional mockups in `visual/`, run `prepare-visual`, give the user the printed `file://` URL, and use it to clarify requirements. Do not ask the user to serve files manually.
6. Draft Mermaid diagrams:
   - `diagrams/flowchart.mmd`
   - `diagrams/sequence.mmd`
7. Run `prepare-diagrams`, give the user the printed `file://` URL, and confirm the rendered diagrams with the user.
8. Draft atomic task contracts. For each task, explicitly confirm:
   - requirements array;
   - acceptance criteria array;
   - test files;
   - RED expected failure;
   - GREEN pass command;
   - REFACTOR verification command;
   - allowed files/scope;
   - any user-approved testing exception.
9. Write `plan.md` using the strict `plan.v1` schema from `schemas/README.md`.
10. Run:

```bash
node <plugin-root>/dist/internal.js validate-plan gdd/plans/<plan_slug>/plan.md
node <plugin-root>/dist/internal.js write-manifest gdd/plans/<plan_slug>/plan.md
node <plugin-root>/dist/internal.js validate-lock gdd/plans/<plan_slug>/plan.md
```

If validation fails, fix the draft with more user clarification before locking.

## Plan File Requirements

Use Markdown headings exactly as defined in `schemas/README.md`. Each task must be a fenced YAML block with:

- `requirements`: array of `{id, text}`;
- `acceptance_criteria`: array of `{id, text, verified_by}`;
- `testing.tests`: array of `{id, type, command, files, expected_red, expected_green, refactor_verification}`;
- `user_confirmed.acceptance_criteria: true`;
- `user_confirmed.testing_method: true`.

Do not write a plan if any task has vague criteria, missing tests, or unconfirmed testing.
