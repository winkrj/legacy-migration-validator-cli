import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { findColumnIndex, parseMarkdownTables } from "./markdownTable.js";

const SPEC_FILE = "02_Specify.md";
const API_ID_HEADER = /api\s*[- ]?\s*id|api\s*식별자/iu;
const TASK_HEADER = /task|task\s*id|연결\s*task/iu;
const API_ID_VALUE = /API-\d+/u;
const TASK_ID_VALUE = /(?:PLAN|IMPL|VAL)-API-\d+/u;

// 02_Specify.md에 API 단위 상세 스펙 표가 있고, 각 API row에 API ID와 연결 task ID가 있는지 검사한다.
export function checkApiSpecTable(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== SPEC_FILE) {
      continue;
    }

    const tables = parseMarkdownTables(file.content);
    const specTable = tables.find((table) => {
      const apiIdColumn = findColumnIndex(table.headerCells, API_ID_HEADER);
      const taskColumn = findColumnIndex(table.headerCells, TASK_HEADER);
      return apiIdColumn !== -1 && taskColumn !== -1;
    });

    if (specTable === undefined) {
      issues.push({
        severity: "error",
        ruleId: "API_SPEC_TABLE",
        message:
          "API 상세 스펙 표가 없습니다. 'API ID'와 'Task' 열을 가진 표가 필요합니다.",
        file: file.relativePath,
        details:
          "02_Specify.md에는 API별 상세 스펙 표가 있어야 하며 각 행에 API ID와 연결 task ID가 필요합니다.",
      });
      continue;
    }

    if (specTable.dataRows.length === 0) {
      issues.push({
        severity: "error",
        ruleId: "API_SPEC_TABLE",
        message: "API 상세 스펙 표에 데이터 행이 없습니다.",
        file: file.relativePath,
        line: specTable.headerLine,
      });
      continue;
    }

    const apiIdColumn = findColumnIndex(specTable.headerCells, API_ID_HEADER);
    const taskColumn = findColumnIndex(specTable.headerCells, TASK_HEADER);

    for (const row of specTable.dataRows) {
      const apiId = row.cells[apiIdColumn] ?? "";
      const task = row.cells[taskColumn] ?? "";

      if (!API_ID_VALUE.test(apiId)) {
        issues.push({
          severity: "error",
          ruleId: "API_TASK_LINK",
          message: "API 스펙 행에 API ID(API-NNN)가 없습니다.",
          file: file.relativePath,
          line: row.line,
        });
        continue;
      }

      if (!TASK_ID_VALUE.test(task)) {
        issues.push({
          severity: "error",
          ruleId: "API_TASK_LINK",
          message: `API ${apiId.trim()} 행에 연결 task ID(PLAN/IMPL/VAL-API-NNN)가 없습니다.`,
          file: file.relativePath,
          line: row.line,
        });
      }
    }
  }

  return issues;
}
