# Specify

## 상태
## 공통 규칙
## 도메인 규칙

## API 목록

| API ID | Method/Path | 기능명 | 레거시 근거 | 외부 연동 | 미결(OQ) | 연결 Task |
|---|---|---|---|---|---|---|
| API-001 | GET /example | 예시 조회 | mapper reference without citation | 없음 | 없음 | PLAN-API-001, IMPL-API-001, VAL-API-001 |

## API별 상세 스펙

### API-001 예시 조회

#### 시나리오

- **Given** 예시 데이터가 있고 **When** 조회하면 **Then** 결과를 반환한다

#### Request

- page

#### Response

- id

#### 오류·빈 결과

빈 배열 반환.

#### Acceptance Criteria

- AC-001-1: 유효 조회 시 결과 반환

#### 연결 Task

PLAN-API-001 / IMPL-API-001 / VAL-API-001

## 미결 질문
