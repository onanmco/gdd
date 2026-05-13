import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("OpenCode installer", () => {
  it("installs GDD agents without deleting existing user agents", async () => {
    const target = await mkdir(join(tmpdir(), `gdd-opencode-test-${Date.now()}-${Math.random()}`), {
      recursive: true
    });
    if (!target) {
      throw new Error("failed to create temp dir");
    }

    const binDir = join(target, "bin");
    await mkdir(binDir);
    await writeFakeNpm(binDir);
    await mkdir(join(target, "agents"));
    await writeFile(
      join(target, "agents", "custom-agent.md"),
      "# Custom agent\n\nskills/implement/SKILL.md\n"
    );

    await execFileAsync(process.execPath, ["scripts/install-opencode-adapter.mjs", target], {
      env: {
        ...process.env,
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`
      }
    });

    await expect(readFile(join(target, "agents", "custom-agent.md"), "utf8")).resolves.toContain(
      "skills/implement/SKILL.md"
    );
    await expect(
      readFile(join(target, "agents", "gdd-orchestrator.md"), "utf8")
    ).resolves.toContain("mode: primary");
    await expect(
      readFile(join(target, "agents", "gdd-implementer.md"), "utf8")
    ).resolves.toContain("mode: subagent");
    await expect(
      readFile(join(target, "agents", "gdd-reviewer.md"), "utf8")
    ).resolves.toContain("mode: subagent");
    await expect(
      readFile(join(target, "agents", "gdd-debugger.md"), "utf8")
    ).resolves.toContain("mode: subagent");
    await expect(
      readFile(join(target, "commands", "gdd:implement.md"), "utf8")
    ).resolves.toContain("agent: gdd-orchestrator");
  });
});

async function writeFakeNpm(binDir: string): Promise<void> {
  const npmPath = join(binDir, process.platform === "win32" ? "npm.cmd" : "npm");
  const script =
    process.platform === "win32"
      ? "@echo off\r\nexit /b 0\r\n"
      : "#!/bin/sh\nexit 0\n";

  await writeFile(npmPath, script);
  await chmod(npmPath, 0o755);
}
