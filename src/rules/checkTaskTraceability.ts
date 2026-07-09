import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

const TASK_FILE = "tasks.md";
const TASK_ID = /(PLAN|IMPL|VAL)-API-(\d+)/gu;
const KINDS = ["PLAN", "IMPL", "VAL"] as const;

// tasks.md가 있으면 각 API 번호가 PLAN/IMPL/VAL 세 종류 task로 모두 연결되는지 검사한다.
// tasks.md가 validation root 밖이면(스캔 안 되면) 조용히 넘어간다.
export function checkTaskTraceability(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== TASK_FILE) {
      continue;
    }

    const kindsByNumber = new Map<string, Set<string>>();
    for (const match of file.content.matchAll(TASK_ID)) {
      const kind = match[1] ?? "";
      const number = match[2] ?? "";
      const kinds = kindsByNumber.get(number) ?? new Set<string>();
      kinds.add(kind);
      kindsByNumber.set(number, kinds);
    }

    for (const [number, kinds] of [...kindsByNumber.entries()].sort()) {
      const missing = KINDS.filter((kind) => !kinds.has(kind));
      if (missing.length === 0) {
        continue;
      }

      issues.push({
        severity: "error",
        ruleId: "TASK_ID_TRIAD",
        message: `API-${number} task가 불완전합니다. 누락: ${missing
          .map((kind) => `${kind}-API-${number}`)
          .join(", ")}`,
        file: file.relativePath,
        details: "각 API는 PLAN/IMPL/VAL task를 모두 가져야 합니다.",
      });
    }
  }

  return issues;
}
