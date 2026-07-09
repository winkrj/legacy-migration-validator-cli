import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { parseMarkdownTables } from "./markdownTable.js";

const OPEN_QUESTIONS_FILE = "99_Open-Questions.md";
const PERMISSION_LINE = /^\s*Implementation Permission:\s*(.+?)\s*$/u;
const CHECKED_IMPL_TASK = /^\s*[-*]\s*\[x\]\s*.*IMPL-API-\d+/iu;

interface Location {
  file: string;
  line: number;
}

// 승인 게이트 검사:
// 1) Implementation Permission이 어디에도 Granted되지 않았는데 IMPL task가 완료(- [x])로 표시되면 실패.
// 2) 미해결(Open) Open Question이 있는데 Implementation Permission이 Granted면 실패.
export function checkPermissionGate(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const grants: Location[] = [];
  const checkedImplTasks: Location[] = [];
  let hasUnresolvedOpenQuestion = false;

  for (const file of files) {
    const lines = file.content.split(/\r?\n/u);
    lines.forEach((text, index) => {
      const permissionMatch = PERMISSION_LINE.exec(text);
      if (permissionMatch && (permissionMatch[1] ?? "").startsWith("Granted")) {
        grants.push({ file: file.relativePath, line: index + 1 });
      }
      if (CHECKED_IMPL_TASK.test(text)) {
        checkedImplTasks.push({ file: file.relativePath, line: index + 1 });
      }
    });

    if (file.fileName === OPEN_QUESTIONS_FILE) {
      for (const table of parseMarkdownTables(file.content)) {
        for (const row of table.dataRows) {
          if (row.cells.some((cell) => cell === "Open")) {
            hasUnresolvedOpenQuestion = true;
          }
        }
      }
    }
  }

  if (grants.length === 0) {
    for (const task of checkedImplTasks) {
      issues.push({
        severity: "error",
        ruleId: "PERMISSION_COMPLETION",
        message:
          "Implementation Permission이 Granted되지 않았는데 IMPL task가 완료로 표시되었습니다.",
        file: task.file,
        line: task.line,
      });
    }
  }

  if (hasUnresolvedOpenQuestion) {
    for (const grant of grants) {
      issues.push({
        severity: "error",
        ruleId: "PERMISSION_OPEN_QUESTION",
        message:
          "미해결(Open) Open Question이 있는 동안에는 Implementation Permission을 Granted할 수 없습니다.",
        file: grant.file,
        line: grant.line,
      });
    }
  }

  return issues;
}
