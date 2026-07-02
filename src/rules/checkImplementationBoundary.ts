import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { withoutYamlFrontmatter } from "./checkRequiredFields.js";

interface BoundaryCondition {
  field: string;
  value: string;
  phrases: readonly string[];
}

const boundaryConditions: readonly BoundaryCondition[] = [
  {
    field: "Implementation",
    value: "Not Started",
    phrases: [
      "implemented",
      "implementation completed",
      "created CLI",
      "validator built",
      "package initialized",
      "tests passed",
      "deployed",
    ],
  },
  {
    field: "Automation",
    value: "Not Started",
    phrases: [
      "automation enabled",
      "automated",
      "scheduled",
      "CI enabled",
      "pipeline enabled",
    ],
  },
  {
    field: "MCP/Plugin",
    value: "Deferred",
    phrases: [
      "MCP integrated",
      "plugin integrated",
      "Obsidian plugin implemented",
      "MCP server implemented",
    ],
  },
  {
    field: "Implementation Permission",
    value: "Not Granted",
    phrases: [
      "implementation approved",
      "execution approved",
      "implementation started",
      "coding started",
    ],
  },
];

export function checkImplementationBoundary(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const lines = withoutYamlFrontmatter(file.content);
    for (const condition of boundaryConditions) {
      if (!hasExactFieldValue(lines, condition.field, condition.value)) {
        continue;
      }

      for (const contentLine of lines) {
        if (isStatusLikeField(contentLine.text)) {
          continue;
        }

        for (const phrase of condition.phrases) {
          if (
            !contentLine.text.toLocaleLowerCase().includes(
              phrase.toLocaleLowerCase(),
            )
          ) {
            continue;
          }

          issues.push({
            severity: "warning",
            ruleId: "IMPLEMENTATION_BOUNDARY",
            message: `Possible conflict with ${condition.field}: ${condition.value}.`,
            file: file.relativePath,
            line: contentLine.line,
            details: `Matched phrase: ${phrase}`,
          });
        }
      }
    }
  }

  return issues;
}

interface ContentLine {
  text: string;
  line: number;
}

function hasExactFieldValue(
  lines: readonly ContentLine[],
  field: string,
  value: string,
): boolean {
  return lines.some(
    ({ text }) => text.trim() === `${field}: ${value}`,
  );
}

function isStatusLikeField(line: string): boolean {
  return /^\s*(?:Status|Decision|Implementation|Automation|MCP\/Plugin|Implementation Permission):/u.test(
    line,
  );
}
