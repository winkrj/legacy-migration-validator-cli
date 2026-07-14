import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { findColumnIndex, parseMarkdownTables } from "./markdownTable.js";

const SPEC_FILE = "02_Specify.md";
const API_ID_HEADER = /api\s*[- ]?\s*id|api\s*식별자/iu;
const EXTERNAL_HEADER = /외부\s*연동|external/iu;
const MATRIX_HEADINGS = ["External Route Matrix", "외부 연동 경로"];

// 외부 연동 "없음" 취급 값. placeholder(<...>)도 미정으로 보고 요구하지 않는다.
function hasExternalIntegration(cell: string): boolean {
  const value = cell.trim();
  if (value === "" || value.startsWith("<")) {
    return false;
  }
  return !/^(없음|없다|none|n\/a|-)$/iu.test(value);
}

// 외부 연동이 있는 API가 하나라도 있으면 External Route Matrix 섹션을 요구한다.
// (환경별 host / 직접 vs 프록시를 스펙 단계에서 확정시키기 위한 게이트 — 마찰은 위험에 비례)
export function checkExternalRouteMatrix(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== SPEC_FILE) {
      continue;
    }

    const externalRows: number[] = [];
    for (const table of parseMarkdownTables(file.content)) {
      const apiIdColumn = findColumnIndex(table.headerCells, API_ID_HEADER);
      const externalColumn = findColumnIndex(
        table.headerCells,
        EXTERNAL_HEADER,
      );
      if (apiIdColumn === -1 || externalColumn === -1) {
        continue;
      }

      for (const row of table.dataRows) {
        if (hasExternalIntegration(row.cells[externalColumn] ?? "")) {
          externalRows.push(row.line);
        }
      }
    }

    if (externalRows.length === 0) {
      continue;
    }

    const headings = extractHeadings(file.content);
    if (MATRIX_HEADINGS.some((heading) => headings.has(heading))) {
      continue;
    }

    const issue: ValidationIssue = {
      severity: "error",
      ruleId: "EXTERNAL_ROUTE_MATRIX",
      message:
        "외부 연동이 있는 API가 있는데 External Route Matrix 섹션이 없습니다.",
      file: file.relativePath,
      details: `외부 연동 행 ${externalRows.length}건. 필요한 heading (하나): ${MATRIX_HEADINGS.join(" | ")} — 직접/프록시, 환경별 host, base path, 인증을 환경설정 인용과 함께 적으세요.`,
    };
    const firstLine = externalRows[0];
    if (firstLine !== undefined) {
      issue.line = firstLine;
    }
    issues.push(issue);
  }

  return issues;
}

function extractHeadings(content: string): Set<string> {
  const headings = new Set<string>();
  for (const line of content.split(/\r?\n/u)) {
    const match = /^#+\s+(.+?)\s*$/u.exec(line);
    if (match?.[1] !== undefined) {
      headings.add(match[1]);
    }
  }
  return headings;
}
