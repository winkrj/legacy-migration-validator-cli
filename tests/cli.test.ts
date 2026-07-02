import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { requiredDocuments } from "../src/config/requiredDocuments.js";
import { requiredFields } from "../src/config/requiredFields.js";
import { requiredSections } from "../src/config/requiredSections.js";
import { runCli, type CliIo } from "../src/index.js";

const temporaryPaths: string[] = [];

afterEach(() => {
  for (const path of temporaryPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

function temporaryDirectory(): string {
  const path = mkdtempSync(join(tmpdir(), "legacy-validator-"));
  temporaryPaths.push(path);
  return path;
}

function execute(args: readonly string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = {
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
  };

  return { exitCode: runCli(args, io), stdout, stderr };
}

function validArguments(root: string, report: string): string[] {
  return ["validate", "--root", root, "--report", report];
}

function createRequiredDocuments(root: string): void {
  for (const fileName of requiredDocuments) {
    const sections = requiredSections[fileName] ?? [];
    const fields = requiredFields[fileName] ?? [];
    writeFileSync(
      join(root, fileName),
      [
        ...sections.map((section) => `## ${section}`),
        ...fields.map((field) => `${field}: Not Started`),
        "# Public-safe example",
      ].join("\n"),
    );
  }
}

describe("CLI argument and read-only path boundary", () => {
  it("accepts the valid command with a report outside root", () => {
    const workspace = temporaryDirectory();
    const root = temporaryDirectory();
    const report = join(workspace, "validation-report.md");
    createRequiredDocuments(root);

    const result = execute(validArguments(root, report));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Legacy Migration Validator CLI");
    expect(result.stdout).toContain(`Root: ${realpathSync(root)}`);
    expect(result.stdout).toContain("Markdown files scanned: 8");
    expect(result.stdout).toContain("Errors: 0");
    expect(result.stdout).toContain("Warnings: 0");
    expect(result.stdout).toContain(
      `Report written: ${realpathSync(report)}`,
    );
    expect(readFileSync(report, "utf8")).toContain("- Result: Passed");
    expect(result.stderr).toEqual([]);
  });

  it.each([
    { name: "missing command", args: [] },
    { name: "unknown command", args: ["inspect"] },
  ])("rejects $name", ({ args }) => {
    const result = execute(args);

    expect(result.exitCode).toBe(2);
    expect(result.stderr.at(-1)).toMatch(/^Usage:/);
  });

  it("rejects missing --root", () => {
    const result = execute(["validate", "--report", "/tmp/report.md"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr.join("\n")).toContain("--root");
  });

  it("rejects missing --report", () => {
    const root = temporaryDirectory();
    const result = execute(["validate", "--root", root]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr.join("\n")).toContain("--report");
  });

  it.each(["--root", "--report"])(
    "rejects a missing value after %s",
    (option) => {
      const result = execute(["validate", option]);
      expect(result.exitCode).toBe(2);
      expect(result.stderr.join("\n")).toContain(
        `Missing value after ${option}`,
      );
    },
  );

  it.each([
    "--json",
    "--config",
    "--alias",
    "--fix",
    "--write",
    "--llm",
    "--mcp",
    "--strict",
  ])("rejects deferred or unknown option %s", (option) => {
    const root = temporaryDirectory();
    const result = execute([
      "validate",
      "--root",
      root,
      "--report",
      join(tmpdir(), "report.md"),
      option,
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr.join("\n")).toContain(`Unknown option: ${option}`);
  });

  it("rejects a root path that does not exist", () => {
    const workspace = temporaryDirectory();
    const missingRoot = join(workspace, "missing");
    const result = execute(
      validArguments(missingRoot, join(workspace, "report.md")),
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr.join("\n")).toContain("does not exist");
  });

  it("rejects a root path that is a file", () => {
    const workspace = temporaryDirectory();
    const rootFile = join(workspace, "root.md");
    writeFileSync(rootFile, "public-safe test input");

    const result = execute(
      validArguments(rootFile, join(workspace, "report.md")),
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr.join("\n")).toContain("not a directory");
  });

  it("rejects a report path inside root", () => {
    const root = temporaryDirectory();
    const report = join(root, "reports", "report.md");
    const result = execute(
      validArguments(root, report),
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr.join("\n")).toContain(
      "outside the input root",
    );
    expect(existsSync(report)).toBe(false);
  });

  it("rejects a report path equal to root", () => {
    const root = temporaryDirectory();
    const result = execute(validArguments(root, root));

    expect(result.exitCode).toBe(2);
    expect(result.stderr.join("\n")).toContain(
      "outside the input root",
    );
  });

  it("accepts a report path outside root", () => {
    const root = temporaryDirectory();
    const output = temporaryDirectory();
    createRequiredDocuments(root);
    const result = execute(
      validArguments(root, join(output, "report.md")),
    );

    expect(result.exitCode).toBe(0);
  });

  it("returns exit code 1 when required documents are missing", () => {
    const root = temporaryDirectory();
    const output = temporaryDirectory();
    const report = join(output, "report.md");

    const result = execute(
      validArguments(root, report),
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Markdown files scanned: 0");
    expect(result.stdout).toContain("Errors: 8");
    expect(result.stdout).toContain("Warnings: 0");
    expect(readFileSync(report, "utf8")).toContain("- Result: Failed");
  });

  it("returns exit code 0 and reports warnings separately", () => {
    const root = temporaryDirectory();
    const output = temporaryDirectory();
    createRequiredDocuments(root);
    writeFileSync(
      join(root, "note.md"),
      "Review outcome: Conditional Archive",
    );

    const result = execute(
      validArguments(root, join(output, "report.md")),
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Markdown files scanned: 9");
    expect(result.stdout).toContain("Errors: 0");
    expect(result.stdout).toContain("Warnings: 1");
  });

  it.each([
    {
      name: "required section",
      fileName: "01_Discover.md",
      content: "# Status",
    },
    {
      name: "required field",
      fileName: "00_Index.md",
      content: "# Status\n# Scope\nStatus: Not Started",
    },
    {
      name: "status vocabulary",
      fileName: "99_Open-Questions.md",
      content: "# Open Questions\nStatus: Unknown",
    },
  ])("returns exit code 1 for a $name error", ({ fileName, content }) => {
    const root = temporaryDirectory();
    const output = temporaryDirectory();
    createRequiredDocuments(root);
    writeFileSync(join(root, fileName), content);

    const result = execute(
      validArguments(root, join(output, "report.md")),
    );

    expect(result.exitCode).toBe(1);
    expect(
      result.stdout.some((line) => line.startsWith("Errors:")),
    ).toBe(true);
  });

  it("keeps exit code 0 for sensitive-pattern warnings only", () => {
    const root = temporaryDirectory();
    const output = temporaryDirectory();
    createRequiredDocuments(root);
    writeFileSync(
      join(root, "public-example.md"),
      "Example token=public-safe-placeholder",
    );

    const result = execute(
      validArguments(root, join(output, "report.md")),
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Errors: 0");
    expect(result.stdout).toContain("Warnings: 1");
  });

  it("creates a nested report and does not mutate source files", () => {
    const root = temporaryDirectory();
    const output = temporaryDirectory();
    createRequiredDocuments(root);
    const sourcePath = join(root, "00_Index.md");
    const sourceBefore = readFileSync(sourcePath, "utf8");
    const report = join(output, "nested", "validation.md");

    const result = execute(validArguments(root, report));

    expect(result.exitCode).toBe(0);
    expect(existsSync(report)).toBe(true);
    expect(readFileSync(sourcePath, "utf8")).toBe(sourceBefore);
    expect(readFileSync(report, "utf8")).toContain(
      "## Read-only Guarantee",
    );
  });

  it("does not write a report when CLI validation fails", () => {
    const output = temporaryDirectory();
    const report = join(output, "validation.md");

    const result = execute([
      "unknown-command",
      "--root",
      output,
      "--report",
      report,
    ]);

    expect(result.exitCode).toBe(2);
    expect(existsSync(report)).toBe(false);
  });

  it("returns exit code 3 when report writing fails unexpectedly", () => {
    const root = temporaryDirectory();
    const reportDirectory = temporaryDirectory();
    createRequiredDocuments(root);

    const result = execute(
      validArguments(root, reportDirectory),
    );

    expect(result.exitCode).toBe(3);
    expect(result.stderr.join("\n")).toContain("Unexpected error:");
  });
});
