import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  prepareDiagramCompanion,
  prepareVisualCompanion
} from "../../src/visual/server.js";

describe("browser-ready planning artifacts", () => {
  it("prepares a file-url visual companion", async () => {
    const planDir = await tempPlanDir("gdd-visual-test");
    const url = await prepareVisualCompanion(planDir);

    expect(url).toMatch(/^file:\/\//);
    await expect(readFile(join(planDir, "visual", "index.html"), "utf8")).resolves.toContain(
      "GDD Visual Companion"
    );
  });

  it("prepares a self-contained diagram viewer", async () => {
    const planDir = await tempPlanDir("gdd-diagram-test");
    const url = await prepareDiagramCompanion(planDir);
    const html = await readFile(join(planDir, "diagrams", "index.html"), "utf8");

    expect(url).toMatch(/^file:\/\//);
    expect(html).toContain("mermaid");
    expect(html).toContain("Flowchart");
    expect(html).toContain("Sequence");
  });
});

async function tempPlanDir(prefix: string): Promise<string> {
  const dir = await mkdir(join(tmpdir(), `${prefix}-${Date.now()}-${Math.random()}`), {
    recursive: true
  });
  if (!dir) {
    throw new Error("failed to create temp dir");
  }
  return dir;
}
