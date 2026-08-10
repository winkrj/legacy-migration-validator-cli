import type { ValidationIssue } from "../model/ValidationIssue.js";
import type { ScannedMarkdownFile } from "../scanner/scanMarkdownFiles.js";
import { withoutYamlFrontmatter } from "./checkRequiredFields.js";

const IMPLEMENT_FILE = "04_Implement.md";
const REPORT_REFERENCE = /reports\/verify-[\w.-]+/u;
const PLACEHOLDER = /verify-<|<타임스탬프>/u;
const FAILED = /\bFAIL(ED)?\b/u;
const PASSED = /\bPASS(ED)?\b/u;
// 구현이 실제로 수행됐다고 볼 수 있는 신호
const PERFORMED = /^\s*Implementation:\s*(In Progress|Completed|Ready for Review)\s*$/u;

// "완료했다"는 서술이 아니라 실행 결과가 완료를 증명해야 한다.
// 04_Implement.md가 구현 수행 상태인데 verify 리포트 참조가 없거나
// FAIL이면 지적한다. 하위 호환을 위해 누락은 warning, FAIL 주장은 error다.
export function checkVerifyReport(
  files: readonly ScannedMarkdownFile[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.fileName !== IMPLEMENT_FILE) {
      continue;
    }

    const lines = withoutYamlFrontmatter(file.content);
    const performed = lines.some(({ text }) => PERFORMED.test(text));

    const referenceLine = lines.find(
      ({ text }) => REPORT_REFERENCE.test(text) && !PLACEHOLDER.test(text),
    );

    if (referenceLine === undefined) {
      if (performed) {
        issues.push({
          severity: "warning",
          ruleId: "VERIFY_REPORT",
          message:
            "구현이 진행된 상태인데 verify 리포트 참조가 없습니다. `./scripts/verify.sh` 실행 결과로 완료를 증명하세요.",
          file: file.relativePath,
          details: "기대 형식: `reports/verify-20260810-090000.txt` (PASS)",
        });
      }
      continue;
    }

    // 리포트를 인용했는데 실패를 적어둔 채로 두면 완료가 아니다.
    if (FAILED.test(referenceLine.text) && !PASSED.test(referenceLine.text)) {
      issues.push({
        severity: "error",
        ruleId: "VERIFY_REPORT",
        message:
          "verify 리포트가 FAIL 상태입니다. 실패한 채로 구현을 완료로 표시하지 않습니다.",
        file: file.relativePath,
        line: referenceLine.line,
      });
    }
  }

  return issues;
}
