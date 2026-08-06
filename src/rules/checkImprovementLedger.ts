import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { findColumnIndex, parseMarkdownTables } from "./markdownTable.js";

const IMPROVEMENTS_FILE = "07_Improvements.md";
const ID_HEADER = /^\s*(id|번호)\s*$/iu;
const EVIDENCE_HEADER = /근거|evidence/iu;
const APPROVAL_HEADER = /승인/iu;
const TASK_HEADER = /task/iu;
const CITATION = /[\w\-./]+\.[A-Za-z]{1,10}:\d+/u;
const IMPROVEMENT_ID = /IMP-\d+/u;
const APPROVED = /(?<!Not\s)\bApproved\b/u;

// 개선 후보 대장: "이관은 동작 보존, 개선은 별도 승인".
// 파일이 있을 때만 검사한다(선택 문서). 하위 호환을 위해 warning으로 보고한다.
export function checkImprovementLedger(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== IMPROVEMENTS_FILE) {
      continue;
    }

    for (const table of parseMarkdownTables(file.content)) {
      const idColumn = findColumnIndex(table.headerCells, ID_HEADER);
      const evidenceColumn = findColumnIndex(table.headerCells, EVIDENCE_HEADER);
      if (idColumn === -1 || evidenceColumn === -1) {
        continue;
      }

      const approvalColumn = findColumnIndex(table.headerCells, APPROVAL_HEADER);
      const taskColumn = findColumnIndex(table.headerCells, TASK_HEADER);

      for (const row of table.dataRows) {
        const id = (row.cells[idColumn] ?? "").trim();
        if (!IMPROVEMENT_ID.test(id)) {
          continue;
        }

        const evidence = row.cells[evidenceColumn] ?? "";
        if (!evidence.startsWith("<") && !CITATION.test(evidence)) {
          issues.push({
            severity: "warning",
            ruleId: "IMPROVEMENT_LEDGER",
            message: `${id}에 근거 인용(파일:라인)이 없습니다. 근거 없는 개선 제안은 기록하지 않습니다.`,
            file: file.relativePath,
            line: row.line,
          });
        }

        // 승인된 개선은 이관 task와 분리된 자체 task를 가져야 한다.
        if (approvalColumn === -1 || taskColumn === -1) {
          continue;
        }
        const approval = row.cells[approvalColumn] ?? "";
        const task = row.cells[taskColumn] ?? "";
        if (APPROVED.test(approval) && task.trim() === "") {
          issues.push({
            severity: "warning",
            ruleId: "IMPROVEMENT_LEDGER",
            message: `${id}이 Approved인데 연결 task가 없습니다. 승인된 개선은 이관 task와 분리된 task로 구현합니다.`,
            file: file.relativePath,
            line: row.line,
          });
        }
      }
    }
  }

  return issues;
}
