import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { findColumnIndex, parseMarkdownTables } from "./markdownTable.js";

const DISCOVER_FILE = "01_Discover.md";
const QUESTION_HEADER = /질문|question/iu;
const ANSWER_HEADER = /답변|answer/iu;
const CITATION = /[\w\-./]+\.[A-Za-z]{1,10}:\d+/u;
const UNKNOWN = /미확인|unknown|OQ-/iu;

// 심문 체크리스트: 빈 칸은 "안 물어봤다"는 뜻이다.
// 각 행은 답변 + 인용을 갖거나, 미확인(OQ 연결)으로 표시돼야 한다.
// 하위 호환을 위해 warning으로 보고한다 — 기존 케이스 문서를 깨지 않는다.
export function checkDiscoveryChecklist(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== DISCOVER_FILE) {
      continue;
    }

    const checklists = parseMarkdownTables(file.content).filter((table) => {
      const questionColumn = findColumnIndex(table.headerCells, QUESTION_HEADER);
      const answerColumn = findColumnIndex(table.headerCells, ANSWER_HEADER);
      return questionColumn !== -1 && answerColumn !== -1;
    });

    if (checklists.length === 0) {
      issues.push({
        severity: "warning",
        ruleId: "DISCOVERY_CHECKLIST",
        message:
          "심문 체크리스트 표가 없습니다. API마다 질문/답변 표를 채워야 분석 깊이를 확인할 수 있습니다.",
        file: file.relativePath,
        details: "기대 열: 질문 / 답변 / 근거(파일:라인) / 상태",
      });
      continue;
    }

    for (const checklist of checklists) {
      const answerColumn = findColumnIndex(checklist.headerCells, ANSWER_HEADER);
      const unanswered: number[] = [];

      for (const row of checklist.dataRows) {
        // 답변 열 이후(근거·상태 포함)를 함께 본다 — 인용이나 미확인 표시가 어느 칸에 있어도 인정한다.
        const rest = row.cells.slice(answerColumn).join(" ").trim();
        if (rest === "" || rest.startsWith("<")) {
          unanswered.push(row.line);
          continue;
        }
        if (!CITATION.test(rest) && !UNKNOWN.test(rest)) {
          unanswered.push(row.line);
        }
      }

      const firstUnanswered = unanswered[0];
      if (firstUnanswered !== undefined) {
        issues.push({
          severity: "warning",
          ruleId: "DISCOVERY_CHECKLIST",
          message: `심문 체크리스트에 답변·근거가 없는 항목이 ${unanswered.length}건 있습니다.`,
          file: file.relativePath,
          line: firstUnanswered,
          details:
            "각 행은 답변 + `파일:라인` 인용을 갖거나, 미확인으로 표시하고 OQ-ID를 연결하세요.",
        });
      }
    }
  }

  return issues;
}
