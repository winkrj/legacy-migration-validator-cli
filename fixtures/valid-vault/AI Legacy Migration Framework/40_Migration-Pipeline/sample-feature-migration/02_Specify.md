# Specify

## 상태

Status: Completed

## 공통 규칙

Approved 컨벤션 문서를 참조한다. 이 케이스의 예외 없음.

## 도메인 규칙

Only structural example rules are included.

## API 목록

| API ID | Method/Path | 기능명 | 레거시 근거 | 외부 연동 | 미결(OQ) | 연결 Task |
|---|---|---|---|---|---|---|
| API-001 | GET /example | 예시 조회 | `ExampleMapper.xml:12` "select" | 없음 | 없음 | PLAN-API-001, IMPL-API-001, VAL-API-001 |

## API별 상세 스펙

### API-001 예시 조회

#### 목적

구조 예시를 위한 조회.

#### 시나리오

- **Given** 예시 데이터가 있고
- **When** 유효한 조회가 들어오면
- **Then** 조건에 맞는 결과를 반환한다

#### Request

- page (선택)

#### Response

- id, title

#### 레거시 호출 흐름

`ExampleController.java:10` → `ExampleService.java:20` → `ExampleMapper.xml:12`

#### 오류·빈 결과

빈 배열 반환, 에러 없음.

#### Acceptance Criteria

- AC-001-1: 유효 조회 시 결과 반환

#### 연결 Task

PLAN-API-001 / IMPL-API-001 / VAL-API-001

## 미결 질문

No open questions.
