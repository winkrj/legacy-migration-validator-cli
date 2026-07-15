import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { findColumnIndex, parseMarkdownTables } from "./markdownTable.js";

const SPEC_FILE = "02_Specify.md";
const API_ID_HEADER = /api\s*[- ]?\s*id|api\s*식별자/iu;
const EVIDENCE_HEADER = /레거시\s*근거|legacy\s*(evidence|source)|근거/iu;
// 파일경로:라인 형태 인용 (예: SiteController.java:120, config.properties:15)
const CITATION = /[\w\-./]+\.[A-Za-z]{1,10}:\d+/u;

const CALL_FLOW_HEADING = /레거시\s*호출\s*흐름|legacy\s*call\s*(flow|chain)/iu;

// "인용 없는 근거는 근거가 아니다" — API 스펙 표의 레거시 근거 열과
// API별 상세 섹션의 "레거시 호출 흐름" 블록에 파일:라인 인용 패턴이 있는지
// 검사한다. 형식만 검사하며 인용의 진실성은 사람이 확인한다.
export function checkEvidenceCitation(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== SPEC_FILE) {
      continue;
    }

    issues.push(...checkCallFlowBlocks(file));

    for (const table of parseMarkdownTables(file.content)) {
      const apiIdColumn = findColumnIndex(table.headerCells, API_ID_HEADER);
      const evidenceColumn = findColumnIndex(
        table.headerCells,
        EVIDENCE_HEADER,
      );
      if (apiIdColumn === -1 || evidenceColumn === -1) {
        continue;
      }

      for (const row of table.dataRows) {
        const evidence = row.cells[evidenceColumn] ?? "";
        // 템플릿 placeholder(<...>)는 다른 룰이 잡는다.
        if (evidence.startsWith("<") || CITATION.test(evidence)) {
          continue;
        }

        issues.push({
          severity: "warning",
          ruleId: "EVIDENCE_CITATION",
          message:
            "레거시 근거에 인용(파일경로:라인)이 없습니다. 인용 없는 근거는 근거가 아닙니다.",
          file: file.relativePath,
          line: row.line,
          details: "기대 형식: `XxxController.java:120` + 코드 1~3줄 인용",
        });
      }
    }
  }

  return issues;
}

interface HeadingLine {
  level: number;
  text: string;
  line: number;
}

// "#### 레거시 호출 흐름" 블록마다 인용 패턴이 최소 하나 있는지 검사한다.
function checkCallFlowBlocks(file: ScannedMarkdownFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = file.content.split(/\r?\n/u);
  const headings: HeadingLine[] = [];

  lines.forEach((text, index) => {
    const match = /^(#+)\s+(.+?)\s*$/u.exec(text);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      headings.push({
        level: match[1].length,
        text: match[2],
        line: index + 1,
      });
    }
  });

  headings.forEach((heading, headingIndex) => {
    if (!CALL_FLOW_HEADING.test(heading.text)) {
      return;
    }

    const next = headings
      .slice(headingIndex + 1)
      .find((candidate) => candidate.level <= heading.level);
    const blockEnd = next === undefined ? lines.length : next.line - 1;
    const block = lines.slice(heading.line, blockEnd).join("\n");

    // 템플릿 placeholder(<...>)만 있는 블록은 다른 룰이 잡는다.
    if (CITATION.test(block)) {
      return;
    }

    issues.push({
      severity: "warning",
      ruleId: "EVIDENCE_CITATION",
      message:
        "레거시 호출 흐름에 인용(파일경로:라인)이 없습니다. 각 hop을 직접 열어 확인하고 인용을 남기세요.",
      file: file.relativePath,
      line: heading.line,
      details: "기대 형식: `XxxController.java:120` → `XxxService.java:88`",
    });
  });

  return issues;
}
