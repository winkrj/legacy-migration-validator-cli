import { requiredFields } from "../config/requiredFields.js";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

export function checkRequiredFields(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const fields = requiredFields[file.fileName];
    if (fields === undefined) {
      continue;
    }

    const contentLines = withoutYamlFrontmatter(file.content);
    for (const field of fields) {
      const fieldPattern = new RegExp(
        `^\\s*${escapeRegExp(field)}:\\s*.*$`,
        "u",
      );
      if (contentLines.some((line) => fieldPattern.test(line.text))) {
        continue;
      }

      issues.push({
        severity: "error",
        ruleId: "REQUIRED_FIELD",
        message: `Required field is missing: ${field}:`,
        file: file.relativePath,
        details: `Expected single-line field: ${field}: <value>`,
      });
    }
  }

  return issues;
}

interface ContentLine {
  text: string;
  line: number;
}

export function withoutYamlFrontmatter(content: string): ContentLine[] {
  const lines = content.split(/\r?\n/u);
  let startIndex = 0;

  if (lines[0]?.trim() === "---") {
    const closingIndex = lines.findIndex(
      (line, index) => index > 0 && line.trim() === "---",
    );
    if (closingIndex !== -1) {
      startIndex = closingIndex + 1;
    }
  }

  return lines.slice(startIndex).map((text, index) => ({
    text,
    line: startIndex + index + 1,
  }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
