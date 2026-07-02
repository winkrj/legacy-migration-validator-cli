import { requiredDocuments } from "../config/requiredDocuments.js";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

export function checkRequiredDocuments(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const existingFileNames = new Set(files.map((file) => file.fileName));

  return requiredDocuments
    .filter((requiredDocument) => !existingFileNames.has(requiredDocument))
    .map((requiredDocument) => ({
      severity: "error",
      ruleId: "REQUIRED_DOCUMENT",
      message: `Required document is missing: ${requiredDocument}`,
      details: "The document may exist at any folder depth.",
    }));
}
