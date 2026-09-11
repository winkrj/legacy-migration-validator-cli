import { dirname, join } from "node:path";
import { requiredDocuments } from "../config/requiredDocuments.js";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

export function checkRequiredDocuments(files: readonly ScannedMarkdownFile[]): ValidationIssue[] {
  const cases = new Map<string, Set<string>>();
  for (const file of files) {
    if (!(requiredDocuments as readonly string[]).includes(file.fileName)) continue;
    const directory = dirname(file.relativePath);
    const names = cases.get(directory) ?? new Set<string>();
    names.add(file.fileName);
    cases.set(directory, names);
  }
  if (cases.size === 0) cases.set(".", new Set());
  return [...cases.entries()].sort().flatMap(([directory, names]) =>
    requiredDocuments.filter((name) => !names.has(name)).map((name) => ({
      severity: "error" as const,
      ruleId: "REQUIRED_DOCUMENT" as const,
      message: `Required document is missing: ${name}`,
      file: join(directory, name),
      details: "Each legacy case directory must contain its own document set.",
    })),
  );
}
