import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { findColumnIndex, parseMarkdownTables } from "./markdownTable.js";

const SPEC_FILE = "02_Specify.md";
const API_ID_HEADER = /api\s*[- ]?\s*id|api\s*식별자/iu;
const TASK_HEADER = /task|task\s*id|연결\s*task/iu;
const API_ID_VALUE = /API-\d+/u;

// API별 상세 SDD 섹션에서 반드시 있어야 하는 하위 heading.
// 각 항목은 alias 목록 — 하나라도 heading 텍스트에 포함되면 통과.
const REQUIRED_SUBSECTIONS: readonly (readonly string[])[] = [
  ["시나리오", "Given/When/Then", "Scenarios"],
  ["Request", "요청"],
  ["Response", "응답"],
  ["오류·빈 결과", "오류/빈 결과", "Error", "빈 결과"],
  ["Acceptance Criteria", "인수 기준"],
  ["연결 Task", "Task"],
];

interface Heading {
  level: number;
  text: string;
  line: number;
}

// 표 한 행은 색인일 뿐 계약이 아니다 — API 목록 표의 모든 API ID마다
// `### API-NNN ...` 상세 섹션과 필수 하위 섹션(시나리오/Request/Response/
// 오류/Acceptance Criteria/연결 Task)이 있는지 검사한다.
export function checkApiDetailSections(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== SPEC_FILE) {
      continue;
    }

    const apiIds = collectIndexedApiIds(file.content);
    if (apiIds.length === 0) {
      continue;
    }

    const headings = extractHeadings(file.content);
    for (const apiId of apiIds) {
      const sectionIndex = headings.findIndex(
        (heading) => heading.level >= 3 && heading.text.includes(apiId),
      );

      if (sectionIndex === -1) {
        issues.push({
          severity: "error",
          ruleId: "API_DETAIL_SECTION",
          message: `${apiId}의 상세 스펙 섹션(### ${apiId} ...)이 없습니다. 표 한 행은 색인일 뿐 계약이 아닙니다.`,
          file: file.relativePath,
        });
        continue;
      }

      const section = headings[sectionIndex];
      if (section === undefined) {
        continue;
      }

      const subheadings: string[] = [];
      for (const heading of headings.slice(sectionIndex + 1)) {
        if (heading.level <= section.level) {
          break;
        }
        subheadings.push(heading.text);
      }

      const missing = REQUIRED_SUBSECTIONS.filter(
        (aliases) =>
          !subheadings.some((text) =>
            aliases.some((alias) => text.includes(alias)),
          ),
      ).map((aliases) => aliases[0] ?? "");

      if (missing.length > 0) {
        issues.push({
          severity: "error",
          ruleId: "API_DETAIL_SECTION",
          message: `${apiId} 상세 섹션에 필수 하위 섹션이 없습니다: ${missing.join(", ")}`,
          file: file.relativePath,
          line: section.line,
          details:
            "필수 하위 heading: 시나리오 / Request / Response / 오류·빈 결과 / Acceptance Criteria / 연결 Task",
        });
      }
    }
  }

  return issues;
}

function collectIndexedApiIds(content: string): string[] {
  const ids = new Set<string>();

  for (const table of parseMarkdownTables(content)) {
    const apiIdColumn = findColumnIndex(table.headerCells, API_ID_HEADER);
    const taskColumn = findColumnIndex(table.headerCells, TASK_HEADER);
    if (apiIdColumn === -1 || taskColumn === -1) {
      continue;
    }

    for (const row of table.dataRows) {
      const match = API_ID_VALUE.exec(row.cells[apiIdColumn] ?? "");
      if (match !== null) {
        ids.add(match[0]);
      }
    }
  }

  return [...ids].sort();
}

function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];

  content.split(/\r?\n/u).forEach((line, index) => {
    const match = /^(#+)\s+(.+?)\s*$/u.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      headings.push({
        level: match[1].length,
        text: match[2],
        line: index + 1,
      });
    }
  });

  return headings;
}
