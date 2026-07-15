// 각 문서에 필요한 섹션 heading.
// 항목이 배열이면 그 중 하나만 있으면 통과한다(한글 heading + 영어 fallback 허용).
export type RequiredSection = string | readonly string[];

export const requiredSections: Readonly<
  Record<string, readonly RequiredSection[]>
> = {
  "00_Index.md": [
    ["상태", "Status"],
    ["범위", "Scope"],
  ],
  "01_Discover.md": [
    ["상태", "Status"],
    ["출처", "Sources"],
    ["발견", "Findings"],
    ["미결 질문", "Open Questions"],
  ],
  "02_Specify.md": [
    ["상태", "Status"],
    ["공통 규칙", "Common Rules"],
    ["도메인 규칙", "Domain Rules"],
    ["API 목록", "API 상세 스펙", "API 계약", "API Spec", "API Map"],
    ["API별 상세 스펙", "API Details"],
    ["미결 질문", "Open Questions"],
  ],
  "03_Plan.md": [
    ["상태", "Status"],
    ["구현 계획", "Implementation Plan"],
    ["테스트 계획", "Test Plan"],
    ["리스크", "Risks"],
  ],
  "04_Implement.md": [
    ["상태", "Status"],
    ["구현 메모", "Implementation Notes"],
    ["변경 파일", "Changed Files"],
  ],
  "05_Validate.md": [
    ["상태", "Status"],
    ["검증 결과", "Validation Results"],
    ["호환성 점검", "Compatibility Check"],
  ],
  "06_Archive.md": [
    ["상태", "Status"],
    ["결정", "Decision"],
    ["보관 지식", "Archived Knowledge"],
    ["이월", "Carry-forward"],
  ],
  "99_Open-Questions.md": [["미결 질문", "Open Questions"]],
};

export function sectionAliases(section: RequiredSection): readonly string[] {
  return typeof section === "string" ? [section] : section;
}

export function sectionLabel(section: RequiredSection): string {
  const aliases = sectionAliases(section);
  return aliases[0] ?? "";
}
