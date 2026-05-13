import { describe, expect, it } from "vitest";
import { guardHarnessEvent } from "../../src/guards/hookGuard.js";

describe("hook guard", () => {
  it("blocks direct edits to locked plans", async () => {
    const decision = await guardHarnessEvent("claude", {
      tool_input: {
        file_path: "gdd/plans/example/plan.md"
      }
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toMatch(/immutable/);
  });

  it("allows unrelated tool events when no active task is configured", async () => {
    const decision = await guardHarnessEvent("opencode", {
      output: {
        args: {
          filePath: "src/index.ts"
        }
      }
    });

    expect(decision.allow).toBe(true);
  });
});
