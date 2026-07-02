import {
  allowedStatuses,
  statusFieldNames,
} from "../config/allowedStatuses.js";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { withoutYamlFrontmatter } from "./checkRequiredFields.js";

export function checkStatusVocabulary(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allowed = new Set(allowedStatuses);
  const fieldPattern = new RegExp(
    `^\\s*(${statusFieldNames.map(escapeRegExp).join("|")}):\\s*(.*?)\\s*$`,
    "u",
  );

  for (const file of files) {
    for (const contentLine of withoutYamlFrontmatter(file.content)) {
      const match = fieldPattern.exec(contentLine.text);
      if (match === null) {
        continue;
      }

      const field = match[1] ?? "";
      const value = match[2] ?? "";
      if (value !== "" && allowed.has(value)) {
        continue;
      }

      issues.push({
        severity: "error",
        ruleId: "STATUS_VOCABULARY",
        message:
          value === ""
            ? `Status-like field has an empty value: ${field}:`
            : `Unknown value for ${field}: ${value}`,
        file: file.relativePath,
        line: contentLine.line,
        details: `Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }
  }

  return issues;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
