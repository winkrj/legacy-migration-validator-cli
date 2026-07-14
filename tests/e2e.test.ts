import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runCli, type CliIo } from "../src/index.js";

const fixturesRoot = fileURLToPath(new URL("../fixtures", import.meta.url));
const temporaryPaths: string[] = [];

afterEach(() => {
  for (const path of temporaryPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

function temporaryDirectory(): string {
  const path = mkdtempSync(join(tmpdir(), "legacy-e2e-"));
  temporaryPaths.push(path);
  return path;
}

function fixturePath(name: string): string {
  return join(fixturesRoot, name);
}

function readFixtureState(root: string): Readonly<Record<string, string>> {
  const state: Record<string, string> = {};

  function visit(directory: string): void {
    for (const name of readdirSync(directory)) {
      const absolutePath = join(directory, name);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        visit(absolutePath);
      } else {
        state[absolutePath.slice(root.length + 1)] = readFileSync(
          absolutePath,
          "utf8",
        );
      }
    }
  }

  visit(root);
  return state;
}

function executeFixture(name: string) {
  const root = fixturePath(name);
  const output = temporaryDirectory();
  const report = join(output, `${name}-report.md`);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = {
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
  };
  const before = readFixtureState(root);
  const exitCode = runCli(
    ["validate", "--root", root, "--report", report],
    io,
  );

  return {
    exitCode,
    stdout,
    stderr,
    report,
    reportContent: readFileSync(report, "utf8"),
    before,
    after: readFixtureState(root),
  };
}

describe("public-safe fixture acceptance", () => {
  it("accepts valid-vault with no issues", () => {
    const result = executeFixture("valid-vault");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Errors: 0");
    expect(result.stdout).toContain("Warnings: 0");
    expect(result.reportContent).toContain("## Summary");
    expect(result.reportContent).toContain("- Result: Passed");
    expect(result.reportContent).toContain("## Issues");
    expect(result.reportContent).toContain("No issues found.");
    expect(result.after).toEqual(result.before);
  });

  it("rejects invalid-vault and still writes a failed report", () => {
    const result = executeFixture("invalid-vault");

    expect(result.exitCode).toBe(1);
    expect(
      result.stdout.some(
        (line) => /^Errors: [1-9]\d*$/u.test(line),
      ),
    ).toBe(true);
    expect(result.reportContent).toContain("- Result: Failed");
    expect(result.reportContent).toContain("## Issues");
    expect(result.reportContent).toContain("| error |");
    expect(result.after).toEqual(result.before);
  });

  it("accepts boundary-vault with warnings", () => {
    const result = executeFixture("boundary-vault");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Errors: 0");
    expect(
      result.stdout.some(
        (line) => /^Warnings: [1-9]\d*$/u.test(line),
      ),
    ).toBe(true);
    expect(result.reportContent).toContain("- Result: Passed");
    expect(result.reportContent).toContain("CANONICAL_TERM");
    expect(result.reportContent).toContain("IMPLEMENTATION_BOUNDARY");
    expect(result.reportContent).toContain("SENSITIVE_PATTERN");
    expect(result.reportContent).toContain("EVIDENCE_CITATION");
    expect(result.after).toEqual(result.before);
  });
});
