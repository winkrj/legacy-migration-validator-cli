import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ValidationIssue } from "../src/model/ValidationIssue.js";
import { createValidationResult } from "../src/model/ValidationResult.js";
import { buildMarkdownReport } from "../src/report/buildMarkdownReport.js";
import { writeReport } from "../src/report/writeReport.js";

const temporaryPaths: string[] = [];

afterEach(() => {
  for (const path of temporaryPaths.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

function temporaryDirectory(): string {
  const path = mkdtempSync(join(tmpdir(), "legacy-report-"));
  temporaryPaths.push(path);
  return path;
}

function build(issues: ValidationIssue[] = []): string {
  return buildMarkdownReport({
    root: "/public-safe/example",
    markdownFileCount: 3,
    validationResult: createValidationResult(issues),
  });
}

describe("Markdown report builder", () => {
  it("builds a passed report with no issues", () => {
    const report = build();

    expect(report).toContain("# Validation Report");
    expect(report).toContain("- Result: Passed");
    expect(report).toContain("No issues found.");
    expect(report).toContain(
      "No source files under the input root were modified.",
    );
  });

  it("builds a failed report with errors and warnings", () => {
    const report = build([
      {
        severity: "warning",
        ruleId: "CANONICAL_TERM",
        message: "Use the canonical term.",
      },
      {
        severity: "error",
        ruleId: "REQUIRED_DOCUMENT",
        message: "Required document is missing.",
      },
    ]);

    expect(report).toContain("- Errors: 1");
    expect(report).toContain("- Warnings: 1");
    expect(report).toContain("- Result: Failed");
    expect(report).toContain(
      "| Severity | Rule | File | Line | Message |",
    );
  });

  it("sorts issues deterministically without mutating input", () => {
    const issues: ValidationIssue[] = [
      {
        severity: "warning",
        ruleId: "SENSITIVE_PATTERN",
        message: "Zulu",
      },
      {
        severity: "error",
        ruleId: "REQUIRED_FIELD",
        file: "b.md",
        line: 2,
        message: "Beta",
      },
      {
        severity: "error",
        ruleId: "REQUIRED_FIELD",
        file: "a.md",
        line: 3,
        message: "Alpha",
      },
    ];
    const originalOrder = [...issues];

    const report = build(issues);

    expect(report.indexOf("a.md")).toBeLessThan(report.indexOf("b.md"));
    expect(report.indexOf("b.md")).toBeLessThan(
      report.indexOf("SENSITIVE_PATTERN"),
    );
    expect(issues).toEqual(originalOrder);
  });

  it("escapes pipes and newlines in table cells", () => {
    const report = build([
      {
        severity: "warning",
        ruleId: "CANONICAL_TERM",
        file: "folder|name.md",
        message: "First line\nSecond | value",
      },
    ]);

    expect(report).toContain("folder\\|name.md");
    expect(report).toContain("First line Second \\| value");
  });
});

describe("report writer", () => {
  it("creates the parent directory and writes requested content", () => {
    const workspace = temporaryDirectory();
    const reportPath = join(workspace, "nested", "validation.md");

    writeReport(reportPath, "# Public-safe report\n");

    expect(readFileSync(reportPath, "utf8")).toBe(
      "# Public-safe report\n",
    );
  });

  it("writes no additional files", () => {
    const workspace = temporaryDirectory();
    const reportPath = join(workspace, "validation.md");

    writeReport(reportPath, "# Public-safe report\n");

    expect(existsSync(reportPath)).toBe(true);
    expect(readdirSync(workspace)).toEqual(["validation.md"]);
  });
});
