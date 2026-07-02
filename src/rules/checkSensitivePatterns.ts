import { sensitivePatterns } from "../config/sensitivePatterns.js";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

export function checkSensitivePatterns(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/u);
    lines.forEach((line, index) => {
      for (const sensitivePattern of sensitivePatterns) {
        sensitivePattern.pattern.lastIndex = 0;
        if (!sensitivePattern.pattern.test(line)) {
          continue;
        }

        issues.push({
          severity: "warning",
          ruleId: "SENSITIVE_PATTERN",
          message: `Possible sensitive pattern detected: ${sensitivePattern.label}.`,
          file: file.relativePath,
          line: index + 1,
          details: `Pattern label: ${sensitivePattern.label}`,
        });
      }
    });
  }

  return issues;
}
