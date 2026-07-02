import { canonicalTerms } from "../config/canonicalTerms.js";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

export function checkCanonicalTerms(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    for (const term of canonicalTerms) {
      for (const alias of term.aliases) {
        const index = file.content.indexOf(alias);
        if (index === -1) {
          continue;
        }

        issues.push({
          severity: "warning",
          ruleId: "CANONICAL_TERM",
          message: `Use canonical term "${term.canonical}" instead of alias "${alias}".`,
          file: file.relativePath,
          line: lineNumberAt(file.content, index),
          details: `Canonical replacement: ${term.canonical}`,
        });
      }
    }
  }

  return issues;
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}
