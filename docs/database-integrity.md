# 🗄️ MyDiary 데이터베이스 무결성 및 보존 규칙 (Database Integrity)

> **문서 목적**: MyDiary의 로컬 데이터베이스(`AsyncStorage`) 무결성 보호, 연쇄 삭제 정책, 백업 및 복원 호환성 표준을 규정합니다.  
> **최종 갱신일**: 2026-10-21  
> **총괄 관리자**: 성백진 (`Sung Baekjin` / `sbjwin4271@gmail.com`)

---

## 1. AsyncStorage 키 네이밍 및 중앙 집중 관리

* 데이터 저장을 위한 AsyncStorage 키는 [src/database/Database.js](file:///d:/development/mydiary/src/database/Database.js)에 중앙 집중화하여 관리합니다.
* 기존 키 명칭을 엄격히 유지합니다:
  * 학생 목록: `@students`
  * 수업 일지: `@class_records`
  * 시간표 설정: `@weekly_schedule`
  * 기타 시스템 설정: `@settings_*`

---

## 2. 연쇄 삭제(Cascade Delete) 원칙 필수 유지

* **고아 데이터(Orphan Data) 방지**: 학생 정보를 삭제할 때는 해당 학생에게 연결된 모든 수업 일지(`@class_records`) 및 시간표 배정 데이터도 반드시 함께 삭제(연쇄 삭제)되어야 합니다.
* 삭제 작업 시 `Database.js`의 공용 헬퍼 함수를 경유하여 원자적(Atomic)으로 처리되도록 작성합니다.
* 학생 삭제 로직 변경 시 반드시 `__tests__/DatabaseTerms.test.js` 또는 연쇄 삭제 검증 테스트를 통과해야 합니다.

---

## 3. 구글 드라이브 백업/복원 포맷 호환성

* **백업 파일명**: `mydiary_backup.json`
* **하위 호환성 보장**: 스키마가 변경되거나 새 필드가 추가되더라도, **기존 백업 파일 복원 시 구버전 데이터가 깨지지 않도록 기본값(Fallback/Default value) 처리**를 반드시 포함해야 합니다.
* **복원 시 사전 검증**: 전체 덮어쓰기 전 기존 데이터의 유효성(JSON 구조, 필수 키 존재 여부)을 반드시 선검증합니다.
