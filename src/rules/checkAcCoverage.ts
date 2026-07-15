import { dirname } from "node:path";
import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";

const SPEC_FILE = "02_Specify.md";
const VALIDATE_FILE = "05_Validate.md";
const AC_ID = /AC-\d+-\d+/gu;

// 02_Specify에 정의된 Acceptance Criteria가 같은 케이스의 05_Validate에
// 전부 나타나는지 대조한다. 커버 안 된 AC가 "보이게" 하는 것이 목적이므로
// warning으로 남긴다 — 테스트 통과가 아니라 AC 커버리지가 완료 기준이다.
export function checkAcCoverage(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const casesByDirectory = new Map<
    string,
    { spec?: ScannedMarkdownFile; validate?: ScannedMarkdownFile }
  >();

  for (const file of files) {
    if (file.fileName !== SPEC_FILE && file.fileName !== VALIDATE_FILE) {
      continue;
    }
    const directory = dirname(file.relativePath);
    const entry = casesByDirectory.get(directory) ?? {};
    if (file.fileName === SPEC_FILE) {
      entry.spec = file;
    } else {
      entry.validate = file;
    }
    casesByDirectory.set(directory, entry);
  }

  for (const [, { spec, validate }] of [...casesByDirectory.entries()].sort()) {
    if (spec === undefined || validate === undefined) {
      continue;
    }

    const definedAcIds = [...new Set(spec.content.match(AC_ID) ?? [])].sort();
    if (definedAcIds.length === 0) {
      continue;
    }

    const covered = new Set(validate.content.match(AC_ID) ?? []);
    const missing = definedAcIds.filter((acId) => !covered.has(acId));

    if (missing.length > 0) {
      issues.push({
        severity: "warning",
        ruleId: "AC_COVERAGE",
        message: `05_Validate에 기록되지 않은 Acceptance Criteria가 있습니다: ${missing.join(", ")}`,
        file: validate.relativePath,
        details:
          "AC 커버리지가 완료 기준입니다. 커버 안 된 AC는 빈 행으로라도 표에 남겨 보이게 하세요.",
      });
    }
  }

  return issues;
}
