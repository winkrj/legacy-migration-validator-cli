import type { ValidationIssue } from "./ValidationIssue.js";

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  hasErrors: boolean;
}

export function createValidationResult(
  issues: ValidationIssue[],
): ValidationResult {
  const errorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;

  return {
    issues,
    errorCount,
    warningCount,
    hasErrors: errorCount > 0,
  };
}
