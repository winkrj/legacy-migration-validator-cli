# Legacy Migration Validator CLI

> 스펙 기반 레거시 마이그레이션 과정에서 Markdown 문서의 구조와 기본 일관성을 검사하는 read-only CLI PoC

## 왜 만들었는가

레거시 기능을 이관할 때는 코드 작성 전에 Discover, Specify, Plan, Implement, Validate, Archive 문서를 순서대로 남기는 것이 중요합니다. 그러나 문서가 많아지면 다음 문제가 반복됩니다.

- 필수 문서나 section이 누락된다.
- 같은 상태를 서로 다른 표현으로 기록한다.
- 구현 권한이나 단계 경계와 본문 설명이 충돌한다.
- 공개하면 안 되는 값이 문서에 섞일 수 있다.
- 사람이 모든 Markdown 파일을 매번 수동 검토해야 한다.

이 프로젝트는 이런 문제를 조기에 찾기 위한 로컬 CLI 실험입니다. 문서의 의미를 대신 판단하지 않고, deterministic rule로 확인할 수 있는 구조·표현·안전성 후보만 검사합니다.

## 현재 상태

- CLI v1 PoC 구현 및 local acceptance 완료
- Node.js + TypeScript 기반
- Input root에 대한 read-only 동작
- Public-safe fixture로 검증
- Production-ready 도구가 아님

이 도구는 domain rule의 정확성, 실제 migration 성공 여부 또는 runtime behavior를 보장하지 않습니다.

## 검사 기준

### 필수 문서

스캔 대상 어디에서든 다음 basename의 문서가 존재하는지 확인합니다.

- `00_Index.md`
- `01_Discover.md`
- `02_Specify.md`
- `03_Plan.md`
- `04_Implement.md`
- `05_Validate.md`
- `06_Archive.md`
- `99_Open-Questions.md`

### 문서 구조

문서별로 정해진 Markdown heading과 field를 검사합니다. 예:

- Index: `Status`, `Scope`
- Discover: `Status`, `Sources`, `Findings`, `Open Questions`
- Plan: `Status`, `Implementation Plan`, `Test Plan`, `Risks`
- Archive: `Status`, `Decision`, `Archived Knowledge`, `Carry-forward`
- Index/Archive field: `Status:`, `Implementation:`, `Automation:`, `MCP/Plugin:`

전체 baseline은 [`src/config`](./src/config)에서 확인할 수 있습니다.

필수 heading은 한글/영어 alias를 함께 허용합니다. 예를 들어 `02_Specify.md`의 API 스펙 섹션은 `API 상세 스펙`(한글) 또는 `API Map`/`API Spec`(영어) 중 하나면 통과합니다. Status 값, Given/When/Then 같은 고정 토큰은 영어를 유지합니다.

### API 단위 스펙과 task 추적

- `02_Specify.md`에 API 상세 스펙 표(`API ID`, `Task` 열 포함)가 없으면 error(`API_SPEC_TABLE`)입니다.
- 표의 각 API 행에 API ID(`API-NNN`)나 연결 task ID(`PLAN|IMPL|VAL-API-NNN`)가 없으면 error(`API_TASK_LINK`)입니다.
- `tasks.md`가 스캔되면 각 API 번호가 `PLAN`/`IMPL`/`VAL` task를 모두 갖는지 검사합니다(`TASK_ID_TRIAD`). `tasks.md`가 root 밖이면 조용히 넘어갑니다.
- 레거시 근거 열에 `파일:라인` 인용 패턴이 없으면 warning(`EVIDENCE_CITATION`)입니다 — 형식만 검사하며 인용의 진실성은 사람이 발췌 확인합니다.
- 외부 연동이 있는 API가 있는데 `External Route Matrix`(또는 `외부 연동 경로`) 섹션이 없으면 error(`EXTERNAL_ROUTE_MATRIX`)입니다.

### 승인 게이트

- 어디에도 Implementation Permission이 `Granted`되지 않았는데 IMPL task가 완료(`- [x]`)로 표시되면 error(`PERMISSION_COMPLETION`)입니다.
- 미해결(`Open`) Open Question이 있는데 Implementation Permission이 `Granted`이면 error(`PERMISSION_OPEN_QUESTION`)입니다.

### Vocabulary와 boundary

- 승인된 status vocabulary가 아닌 값은 error로 기록합니다.
- Canonical term 대신 alias가 사용되면 warning을 기록합니다.
- `Implementation: Not Started` 같은 명시적 field와 구현 완료를 암시하는 본문이 충돌하면 warning을 기록합니다.
- 민감정보일 가능성이 있는 pattern은 값을 수정하지 않고 warning candidate로만 기록합니다.

### Severity

- `error`: 필수 문서·section·field, vocabulary, API 스펙 표/task 연결, 승인 게이트 위반
- `warning`: alias, 단계 경계 충돌 또는 민감정보 후보

Warning만 존재하면 CLI exit code는 `0`입니다.

## 어떻게 동작하는가

```text
CLI argument/path validation
  → read-only Markdown scan
  → deterministic rule execution
  → Markdown report 생성
  → stdout summary와 exit code 반환
```

Scanner는 다음 원칙을 따릅니다.

- `.md` 파일만 재귀적으로 읽습니다.
- `.MD` 파일은 포함하지 않습니다.
- `.git`, `node_modules`, `dist`, `reports`와 hidden directory를 제외합니다.
- File/directory symlink를 따라가지 않습니다.
- Input root의 파일을 생성·수정·삭제하지 않습니다.

## 요구 환경

- Node.js 20 이상
- npm

## 설치

바로 실행(GitHub에서 설치):

```sh
npx --yes github:winkrj/legacy-migration-validator-cli validate \
  --root ./docs/migration/<case> \
  --report ./reports/<case>-report.md
```

git 설치 시 `prepare` 스크립트가 `dist/`를 자동 빌드하므로 별도 빌드 없이 실행됩니다.

로컬 개발:

```sh
git clone <private-or-approved-repository-url>
cd legacy-migration-validator-cli
npm install
npm run typecheck
npm test
```

Repository visibility와 URL은 소유자의 승인 범위를 따라야 합니다.

## 사용법

Command contract:

```text
legacy-validator validate --root <path> [--root <path> ...] --report <path>
```

`--root`는 반복 지정할 수 있습니다. 케이스 문서(`docs/migration/<case>`)와 OpenSpec change(`changes/<change>`)를 함께 검사하면 tasks.md 기반 룰(`TASK_ID_TRIAD` 등)이 동작합니다. report 경로는 모든 root 밖이어야 합니다.

빌드한 CLI 실행:

```sh
npm run build
node dist/index.js validate \
  --root ./fixtures/valid-vault \
  --report ./reports/valid-report.md
```

개발 모드:

```sh
npm run dev -- validate \
  --root ./fixtures/valid-vault \
  --report ./reports/valid-report.md
```

`--report`는 반드시 input root 밖의 경로여야 합니다. Input root 내부 또는 root와 동일한 report 경로는 exit code `2`로 거부됩니다.

## 출력

stdout 예:

```text
Legacy Migration Validator CLI
Root: /path/to/input
Markdown files scanned: 8
Errors: 0
Warnings: 0
Report written: /path/to/report.md
```

Markdown report에는 Summary, issue table, read-only guarantee와 scope note가 포함됩니다.

### Exit codes

- `0`: validation error 없음
- `1`: validation error 존재
- `2`: CLI usage error 또는 잘못된 root/report path
- `3`: 예상하지 못한 runtime failure

## Public-safe fixtures

- `fixtures/valid-vault`: error/warning 없이 통과
- `fixtures/invalid-vault`: 의도적인 validation error 포함
- `fixtures/boundary-vault`: error 없이 warning candidate 포함

Fixture는 모두 가짜 공개용 예시입니다. 실제 회사 코드, API, DB, account, credential 또는 운영 데이터를 포함하지 않습니다.

## 주요 npm scripts

- `npm run dev`: TypeScript source로 CLI 실행
- `npm run typecheck`: TypeScript type 검사
- `npm run build`: `dist/` 빌드
- `npm test`: 전체 test 실행

## 프로젝트 구조

```text
src/
├── cli/       # argument parsing과 summary
├── scanner/   # read-only Markdown/path scan
├── rules/     # validation rules
├── config/    # hardcoded PoC baseline
├── model/     # issue/result model
└── report/    # Markdown report
tests/         # unit/integration/E2E tests
fixtures/      # public-safe acceptance fixtures
reports/       # generated report output (Git ignored)
```

## 지원하지 않는 범위

- JSON output
- Configurable alias/rule configuration
- LLM-assisted review
- Auto-fix 또는 source mutation
- CI integration
- MCP/Plugin integration
- Domain meaning judgement
- 실제 회사 repository 또는 fixture 검증 사례 제공
- Production readiness claim

## Public safety

- Generated report, `node_modules/`, `dist/`는 Git에서 제외됩니다.
- 민감정보 검사는 conservative warning이며 실제 값을 자동 masking하지 않습니다.
- Public 전환 전에는 repository history와 fixture를 별도로 검토해야 합니다.
- 이 repository를 회사 공식 도구나 production migration validator로 표현하지 않습니다.

## 변경 이력

### 0.5.0
- **`--root` 다중 지정 지원** — 케이스 문서와 OpenSpec change(tasks.md)를 한 번에 검사. tasks.md가 검사에 포함돼야 `TASK_ID_TRIAD`·권한 게이트 룰이 실제로 동작한다
- `AC_COVERAGE`(warning): 02_Specify에 정의된 Acceptance Criteria가 같은 케이스의 05_Validate에 전부 기록됐는지 대조 — 커버 안 된 AC를 보이게 한다
- `EVIDENCE_CITATION` 확장: API별 상세 섹션의 "레거시 호출 흐름" 블록에도 인용(파일:라인) 요구
- GitHub Actions CI 추가, 테스트 117 → 123

### 0.4.0
- `API_DETAIL_SECTION`(error): SDD 구조 검사 — API 목록 표의 모든 API ID마다 `### API-NNN` 상세 섹션과 필수 하위 섹션(시나리오/Request/Response/오류·빈 결과/Acceptance Criteria/연결 Task) 존재 확인. "표 한 행은 색인일 뿐 계약이 아니다"
- `02_Specify.md` 필수 섹션 개편: 공통 규칙 / API 목록 / API별 상세 스펙 (기존 영어 alias 유지)
- 테스트 113 → 117

### 0.3.0
- `EVIDENCE_CITATION`(warning): API 스펙 표의 레거시 근거에 `파일:라인` 인용 패턴이 없으면 경고 — "인용 없는 근거는 근거가 아니다" (형식만 검사, 진실성은 사람이 확인)
- `EXTERNAL_ROUTE_MATRIX`(error): 외부 연동이 있는 API가 있는데 `External Route Matrix`(또는 `외부 연동 경로`) 섹션이 없으면 실패 — 직접 vs 프록시, 환경별 host를 스펙 단계에서 확정
- 테스트 106 → 113

### 0.2.0
- heading **alias 지원**: 한글 heading(primary) + 영어(fallback) — 한글 이관 문서 통과, 기존 영어 문서도 그대로 검증
- 신규 룰: `API_SPEC_TABLE`/`API_TASK_LINK`(02_Specify의 API 표·연결 task), `TASK_ID_TRIAD`(tasks.md의 API별 PLAN/IMPL/VAL), `PERMISSION_COMPLETION`/`PERMISSION_OPEN_QUESTION`(승인 게이트)
- `prepare` 스크립트 추가 → `npx github:` 설치 시 dist 자동 빌드
- 테스트 95 → 106

## License

현재 별도 license가 정의되지 않았습니다. 재배포 또는 공개 사용 범위는 repository 소유자 결정이 필요합니다.
