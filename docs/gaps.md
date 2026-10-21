# 🎯 MyDiary 모바일 기능 격차 및 작업 우선순위 (Gaps & Parity Matrix)

> **문서 목적**: MyDiary 스마트폰 앱의 완성도 극대화 및 프로덕션 안정성을 위한 세부 기능 격차(Gaps)와 작업 우선순위를 정량적으로 추적하는 단일 진실 공급원(SSOT)입니다.  
> **최종 갱신일**: 2026-10-21  
> **총괄 관리자**: 성백진 (`Sung Baekjin` / `sbjwin4271@gmail.com`)  
> **규칙**: 모든 AI 에이전트와 기여자는 새로운 작업을 선택할 때 본 문서의 랭킹(G1, G2...)을 최우선으로 참고하며, 기능 완료 시 상태(Status)를 갱신합니다.

---

## 1. 정량적 기능 스코어카드 (Summary Scorecard)

| 영역 (Area) | 완료 (Done) | 진행/부분 (Partial) | 미구현 (Missing) | 달성률 | 핵심 현황 |
|---|---:|---:|---:|---:|---|
| **1. 학생 관리 & 주소록** | 10 | 0 | 0 | **100.0%** | 학생 등록, 프로필, 차수 관리, 연락처 연동, 연쇄 삭제 무결성 완비 |
| **2. 주간 시간표 (WeeklyPlan)** | 8 | 1 | 0 | **88.9%** | 요일별 시간표 배정, 차수 연동 완료, 드래그앤드롭 편의 인터랙션 필요 |
| **3. 수업 일지 & 평가 (ClassRecord)** | 12 | 1 | 0 | **92.3%** | 일지 작성, 캘린더 뷰, 학생별 필터링 완료, 대규모 일지 가상화 렌더링 필요 |
| **4. 국가 표준 HWPX / 서식 엔진** | 6 | 2 | 0 | **75.0%** | KS X 6101 OWPML 생성 및 공유 완비, 템플릿 레이아웃 프리셋 다변화 필요 |
| **5. 백업 & 클라우드 동기화** | 5 | 1 | 0 | **83.3%** | Google Drive 백업/복원 완료, 백업 JSON 체크섬(SHA-256) 검증 레이어 필요 |
| **6. 하네스 & 품질 게이트** | 6 | 0 | 0 | **100.0%** | Jest 27개 테스트, 9대 정기 코드 감사, 100% 한국어 커밋 하네스 완비 |

---

## 2. 작업 우선순위 랭킹 (Ranked Gaps)

AI 에이전트가 새로운 자율 작업을 선택할 때 위에서부터 아래로 순차적으로 착수합니다:

### [G1] HWPX 복수 표 서식 템플릿 프리셋 다변화
- **우선순위**: `P1 (Critical)` | **상태**: `Partial`
- **목표**: 교육청 보고용, 복지관 제출용, 개인 교습용 등 수요처별 요구 양식에 맞춘 2~3종의 HWPX 출력 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 선택 지원.
- **관련 파일**: [src/services/HwpxExportService.js](file:///d:/development/mydiary/src/services/HwpxExportService.js), [src/screens/ClassRecordScreen.js](file:///d:/development/mydiary/src/screens/ClassRecordScreen.js)
- **작업 내용**:
  1. KS X 6101 표준 OWPML 기반 결재란(상단 4칸) 표 섹션 추가.
  2. 일지 내보내기 팝업에 '서식 프리셋 선택' UI 연동.
  3. 회귀 테스트(`__tests__/HwpxExportService.test.js`) 템플릿 생성 검증 보강.

### [G2] 캘린더 및 대규모 수업 일지(1,000건+) 가상화 렌더링 최적화
- **우선순위**: `P2 (High)` | **상태**: `Partial`
- **목표**: 수개월~수년간 누적된 수천 건의 수업 일지 로드 시 프레임 드랍(Jank) 없는 부드러운 60fps 스크롤 보장.
- **관련 파일**: [src/screens/ClassRecordScreen.js](file:///d:/development/mydiary/src/screens/ClassRecordScreen.js), [src/screens/WeeklyPlanScreen.js](file:///d:/development/mydiary/src/screens/WeeklyPlanScreen.js)
- **작업 내용**:
  1. `getItemLayout` 및 `windowSize` 조정을 통한 FlatList 렌더링 최적화.
  2. 메모이제이션(`useMemo`, `useCallback`) 적용으로 리스트 갱신 시 불필요한 하위 아이템 리렌더링 차단.

### [G3] 태블릿 가로 모드 및 대화면 반응형 UI 대응
- **우선순위**: `P2 (High)` | **상태**: `Missing`
- **목표**: 갤럭시 탭, 아이패드 등 태블릿 환경에서 단일 열 목록 대신 좌측 학생 목록 / 우측 일지 작성의 2단 분할(Split Master-Detail) 화면 지원.
- **관련 파일**: [src/screens/StudentListScreen.js](file:///d:/development/mydiary/src/screens/StudentListScreen.js), [src/screens/ClassRecordScreen.js](file:///d:/development/mydiary/src/screens/ClassRecordScreen.js)
- **작업 내용**:
  1. `useWindowDimensions` 기반 태블릿 화면 폭(width >= 768) 감지 훅 도입.
  2. 2열 반응형 레이아웃 스타일 분기 적용.

### [G4] 백업 데이터 무결성 체크섬(SHA-256) 검증 레이어
- **우선순위**: `P3 (Medium)` | **상태**: `Partial`
- **목표**: Google Drive 백업 파일(`mydiary_backup.json`) 복원 시 파일 손상이나 악의적 변조를 방지하는 체크섬 검증 추가.
- **관련 파일**: [src/services/BackupService.js](file:///d:/development/mydiary/src/services/BackupService.js), [src/database/Database.js](file:///d:/development/mydiary/src/database/Database.js)
- **작업 내용**:
  1. 백업 JSON 생성 시 메타데이터 필드에 `checksum` 기록.
  2. 복원 시 구조 유효성 검증 단계에서 체크섬 일치 여부 선확인.

### [G5] 주간 시간표 수업 알림 로컬 푸시 연동
- **우선순위**: `P3 (Medium)` | **상태**: `Missing`
- **목표**: 배정된 수업 시작 10분 전 교사에게 수업 준비 안내 로컬 알림 전송.
- **관련 파일**: [src/screens/WeeklyPlanScreen.js](file:///d:/development/mydiary/src/screens/WeeklyPlanScreen.js), [src/services/NotificationService.js](file:///d:/development/mydiary/src/services/NotificationService.js)
- **작업 내용**:
  1. Expo Notifications 로컬 스케줄링 연동.
  2. 설정 화면에 '수업 알림 받기' 토글 스위치 추가.
