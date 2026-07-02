import { requiredSections } from "../config/requiredSections.js";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

export function checkRequiredSections(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const sections = requiredSections[file.fileName];
    if (sections === undefined) {
      continue;
    }

    const headings = extractHeadings(file.content);
    for (const section of sections) {
      if (headings.has(section)) {
        continue;
      }

      issues.push({
        severity: "error",
        ruleId: "REQUIRED_SECTION",
        message: `Required section is missing: ${section}`,
        file: file.relativePath,
        details: `Expected Markdown heading: ${section}`,
      });
    }
  }

  return issues;
}

function extractHeadings(content: string): Set<string> {
  const headings = new Set<string>();

  for (const line of content.split(/\r?\n/u)) {
    const match = /^#+\s+(.+?)\s*$/u.exec(line);
    if (match?.[1] !== undefined) {
      headings.add(match[1]);
    }
  }

  return headings;
}
