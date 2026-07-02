import { describe, expect, it } from "vitest";
import { requiredDocuments } from "../src/config/requiredDocuments.js";
import { requiredFields } from "../src/config/requiredFields.js";
import { requiredSections } from "../src/config/requiredSections.js";
import { checkCanonicalTerms } from "../src/rules/checkCanonicalTerms.js";
import { checkImplementationBoundary } from "../src/rules/checkImplementationBoundary.js";
import { checkRequiredDocuments } from "../src/rules/checkRequiredDocuments.js";
import { checkRequiredFields } from "../src/rules/checkRequiredFields.js";
import { checkRequiredSections } from "../src/rules/checkRequiredSections.js";
import { checkSensitivePatterns } from "../src/rules/checkSensitivePatterns.js";
import { checkStatusVocabulary } from "../src/rules/checkStatusVocabulary.js";
import { runRules } from "../src/rules/runRules.js";
import type { ScannedMarkdownFile } from "../src/scanner/scanMarkdownFiles.js";

function scannedFile(
  fileName: string,
  content = "# Public-safe example",
  relativePath = fileName,
): ScannedMarkdownFile {
  return {
    absolutePath: `/tmp/public-safe/${relativePath}`,
    relativePath,
    fileName,
    content,
  };
}

function completeDocumentSet(): ScannedMarkdownFile[] {
  return requiredDocuments.map((fileName) =>
    scannedFile(fileName, compliantContent(fileName)),
  );
}

function compliantContent(fileName: string): string {
  const sections = requiredSections[fileName] ?? [];
  const fields = requiredFields[fileName] ?? [];

  return [
    ...sections.map((section, index) => `${"#".repeat(index % 3 + 1)} ${section}`),
    ...fields.map((field) => `${field}: Not Started`),
    "# Public-safe example",
  ].join("\n");
}

describe("required document rule", () => {
  it("passes when every required document exists", () => {
    expect(checkRequiredDocuments(completeDocumentSet())).toEqual([]);
  });

  it("returns one error for each missing document", () => {
    const files = completeDocumentSet().slice(0, 2);
    const issues = checkRequiredDocuments(files);

    expect(issues).toHaveLength(requiredDocuments.length - 2);
    expect(issues.every((issue) => issue.severity === "error")).toBe(
      true,
    );
    expect(
      issues.every((issue) => issue.ruleId === "REQUIRED_DOCUMENT"),
    ).toBe(true);
  });

  it("accepts required documents at any folder depth", () => {
    const files = requiredDocuments.map((fileName, index) =>
      scannedFile(
        fileName,
        "# Public-safe example",
        `nested-${index}/${fileName}`,
      ),
    );

    expect(checkRequiredDocuments(files)).toEqual([]);
  });
});

describe("canonical term rule", () => {
  it("returns a warning with a canonical replacement for an alias", () => {
    const issues = checkCanonicalTerms([
      scannedFile("example.md", "Status: Conditional Archive"),
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "warning",
      ruleId: "CANONICAL_TERM",
      file: "example.md",
      line: 1,
      details: "Canonical replacement: Archive with Conditions",
    });
  });

  it("does not warn for the canonical term itself", () => {
    expect(
      checkCanonicalTerms([
        scannedFile("example.md", "Status: Archive with Conditions"),
      ]),
    ).toEqual([]);
  });

  it("returns a deterministic warning for each distinct alias", () => {
    const issues = checkCanonicalTerms([
      scannedFile(
        "example.md",
        "Runtime Proof\nPermission to Implement\nRuntime Proof",
      ),
    ]);

    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.line)).toEqual([2, 1]);
  });
});

describe("required section rule", () => {
  it("passes when all configured sections exist", () => {
    expect(
      checkRequiredSections([
        scannedFile(
          "03_Plan.md",
          "# Status\n## Implementation Plan\n### Test Plan\n# Risks",
        ),
      ]),
    ).toEqual([]);
  });

  it("returns file-specific errors for missing sections", () => {
    const issues = checkRequiredSections([
      scannedFile("01_Discover.md", "# Status\n## Sources"),
    ]);

    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({
      severity: "error",
      ruleId: "REQUIRED_SECTION",
      file: "01_Discover.md",
    });
  });

  it.each(["#", "##", "###"])(
    "accepts heading level %s",
    (heading) => {
      const issues = checkRequiredSections([
        scannedFile(
          "00_Index.md",
          `${heading} Status\n${heading} Scope`,
        ),
      ]);
      expect(issues).toEqual([]);
    },
  );

  it("checks duplicate basenames independently", () => {
    const issues = checkRequiredSections([
      scannedFile(
        "00_Index.md",
        "# Status\n# Scope",
        "one/00_Index.md",
      ),
      scannedFile("00_Index.md", "# Status", "two/00_Index.md"),
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toBe("two/00_Index.md");
  });
});

describe("required field rule", () => {
  it("passes with optional whitespace before all required fields", () => {
    expect(
      checkRequiredFields([
        scannedFile(
          "00_Index.md",
          " Status: Not Started\n  Implementation: Not Started\nAutomation: Not Started\nMCP/Plugin: Deferred",
        ),
      ]),
    ).toEqual([]);
  });

  it("returns one error per missing field", () => {
    const issues = checkRequiredFields([
      scannedFile("06_Archive.md", "Status: Archived"),
    ]);

    expect(issues).toHaveLength(4);
    expect(issues.every((issue) => issue.file === "06_Archive.md")).toBe(
      true,
    );
  });

  it("does not use YAML frontmatter as a required field", () => {
    const issues = checkRequiredFields([
      scannedFile(
        "00_Index.md",
        "---\nStatus: Not Started\nImplementation: Not Started\nAutomation: Not Started\nMCP/Plugin: Deferred\n---\n# Status",
      ),
    ]);

    expect(issues).toHaveLength(4);
  });
});

describe("status vocabulary rule", () => {
  it.each([
    "Not Started",
    "Archive with Conditions",
    "Granted for Phase 12 Only",
    "Completed / Passed",
  ])("accepts allowed value %s", (value) => {
    expect(
      checkStatusVocabulary([
        scannedFile("example.md", `Status: ${value}`),
      ]),
    ).toEqual([]);
  });

  it("rejects an unknown value", () => {
    const issues = checkStatusVocabulary([
      scannedFile("example.md", "Status: Almost Done"),
    ]);

    expect(issues[0]).toMatchObject({
      severity: "error",
      ruleId: "STATUS_VOCABULARY",
      file: "example.md",
      line: 1,
    });
  });

  it("is case-sensitive", () => {
    expect(
      checkStatusVocabulary([
        scannedFile("example.md", "Status: not started"),
      ]),
    ).toHaveLength(1);
  });

  it("rejects an empty status-like field", () => {
    const issues = checkStatusVocabulary([
      scannedFile("example.md", "Implementation:   "),
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("empty value");
  });

  it("does not parse YAML frontmatter", () => {
    expect(
      checkStatusVocabulary([
        scannedFile(
          "example.md",
          "---\nStatus: Unknown\n---\nStatus: Approved",
        ),
      ]),
    ).toEqual([]);
  });
});

describe("implementation and automation boundary rule", () => {
  it.each([
    {
      field: "Implementation: Not Started",
      phrase: "The validator was implemented.",
      expected: "implemented",
    },
    {
      field: "Automation: Not Started",
      phrase: "Automation enabled for the public-safe example.",
      expected: "automation enabled",
    },
    {
      field: "MCP/Plugin: Deferred",
      phrase: "MCP integrated for the example.",
      expected: "MCP integrated",
    },
    {
      field: "Implementation Permission: Not Granted",
      phrase: "Execution approved in the example.",
      expected: "execution approved",
    },
  ])(
    "warns when $field conflicts with surface wording",
    ({ field, phrase, expected }) => {
      const issues = checkImplementationBoundary([
        scannedFile("example.md", `${field}\n${phrase}`),
      ]);

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        severity: "warning",
        ruleId: "IMPLEMENTATION_BOUNDARY",
        file: "example.md",
        line: 2,
        details: `Matched phrase: ${expected}`,
      });
    },
  );

  it("does not warn when suspicious wording is absent", () => {
    expect(
      checkImplementationBoundary([
        scannedFile(
          "example.md",
          "Implementation: Not Started\nPlanning remains open.",
        ),
      ]),
    ).toEqual([]);
  });

  it("does not use status fields as suspicious body text", () => {
    expect(
      checkImplementationBoundary([
        scannedFile(
          "example.md",
          "Implementation Permission: Not Granted\nImplementation: Not Started",
        ),
      ]),
    ).toEqual([]);
  });
});

describe("sensitive pattern rule", () => {
  it.each([
    ["token", "token=public-safe-placeholder"],
    ["password", "password=public-safe-placeholder"],
    ["secret", "secret=public-safe-placeholder"],
    ["api_key", "api_key=public-safe-placeholder"],
    ["apikey", "apikey=public-safe-placeholder"],
    ["JDBC URL", "jdbc:example"],
    ["private IPv4 (10/8)", "10.1.2.3"],
    ["private IPv4 (172.16/12)", "172.20.1.2"],
    ["private IPv4 (192.168/16)", "192.168.1.2"],
    [".internal domain", "example.internal"],
    [".local domain", "example.local"],
    ["corp marker", "corp"],
    ["localhost with port", "localhost:8080"],
  ])("warns for %s without exposing its value", (label, content) => {
    const issues = checkSensitivePatterns([
      scannedFile("example.md", `Example: ${content}`),
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "warning",
      ruleId: "SENSITIVE_PATTERN",
      file: "example.md",
      line: 1,
      details: `Pattern label: ${label}`,
    });
    expect(issues[0]?.message).not.toContain(
      "public-safe-placeholder",
    );
  });

  it("does not warn beyond the configured baseline", () => {
    expect(
      checkSensitivePatterns([
        scannedFile(
          "example.md",
          "Public-safe example with no configured candidate.",
        ),
      ]),
    ).toEqual([]);
  });
});

describe("rule runner", () => {
  it("aggregates errors, warnings, and hasErrors", () => {
    const files = completeDocumentSet().slice(1);
    files.push(
      scannedFile("note.md", "Review outcome: Conditional Archive"),
    );

    expect(runRules(files)).toMatchObject({
      errorCount: 1,
      warningCount: 1,
      hasErrors: true,
    });
  });

  it("aggregates every implemented error rule type", () => {
    const files = completeDocumentSet();
    files[0] = scannedFile(
      "00_Index.md",
      "# Status\nStatus: Unknown",
    );

    const result = runRules(files);
    expect(new Set(result.issues.map((issue) => issue.ruleId))).toEqual(
      new Set([
        "REQUIRED_SECTION",
        "REQUIRED_FIELD",
        "STATUS_VOCABULARY",
      ]),
    );
  });
});
