import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("workflow prompts", () => {
  it("requires implement orchestration through gdd-implementer", async () => {
    const skill = await readFile("skills/implement/SKILL.md", "utf8");

    expect(skill).toContain("invoke `gdd-implementer`");
    expect(skill).toContain("must not implement task code itself");
    expect(skill).toContain("implementer_spawned");
    expect(skill).toContain("If the harness cannot spawn subagents");
  });

  it("requires continue orchestration through gdd-implementer", async () => {
    const skill = await readFile("skills/continue/SKILL.md", "utf8");

    expect(skill).toContain("Delegate the incomplete task to `gdd-implementer`");
    expect(skill).toContain("implementer_spawned");
    expect(skill).toContain("If the harness cannot spawn subagents");
  });

  it("runs OpenCode implementation commands through the orchestrator agent", async () => {
    for (const command of [
      ".opencode/commands/gdd:implement.md",
      ".opencode/commands/gdd:continue.md",
      ".opencode/commands/gdd-implement.md",
      ".opencode/commands/gdd-continue.md"
    ]) {
      const markdown = await readFile(command, "utf8");

      expect(markdown).toContain("agent: gdd-orchestrator");
    }
  });

  it("defines cross-harness GDD agents for orchestration and subagent task work", async () => {
    const orchestrator = await readFile("agents/gdd-orchestrator.md", "utf8");
    const implementer = await readFile("agents/gdd-implementer.md", "utf8");
    const reviewer = await readFile("agents/gdd-reviewer.md", "utf8");
    const debuggerAgent = await readFile("agents/gdd-debugger.md", "utf8");

    expect(orchestrator).toContain("mode: primary");
    expect(orchestrator).toContain("gdd-implementer: allow");
    expect(implementer).toContain("mode: subagent");
    expect(implementer).toContain("actor.agent: subagent");
    expect(reviewer).toContain("mode: subagent");
    expect(debuggerAgent).toContain("mode: subagent");
  });
});
