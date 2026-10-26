# 🪵 MyDiary 모바일 개발 로그 및 세션 인계장 (DevLog)

> **문서 목적**: 다중 AI 모델(Claude, Cursor, Copilot, Gemini 등) 및 개발자 간의 원활한 협업과 세션 단절 방지를 위해 작업 반영 내역, 검증 수치, 미해결 과제를 기록하는 단일 진실 인계장입니다.  
> **규칙**: 작업을 완료하거나 세션을 종료하기 전, 반드시 본 문서의 상단에 최신 작업 엔트리를 간결하게 추가합니다.

---

## 2026-10-27: 주간시간표 학생 선택 모달 키보드 가림 및 검색 UX 전면 개선 (by Antigravity)

* **반영 내역 (What landed)**:
  * **[src/screens/WeeklyPlanScreen.js](file:///d:/development/mydiary/src/screens/WeeklyPlanScreen.js) 학생 선택 모달 반응형 레이아웃 전환**:
    * 기존 바텀시트(`justifyContent: 'flex-end'`)로 고정되어 키보드가 올라올 때 검색창과 학생 목록 전체가 가려지던 문제를 해결.
    * `useWindowDimensions` 및 안드로이드/iOS 실시간 키보드 높이 추적(`keyboardHeight`)을 도입하여, 키보드 노출 시 화면 상단으로 안정적으로 위치하고 키보드 바로 위까지 남은 화면 전체를 학생 목록 스크롤 영역으로 동적 확보.
    * 비노출 시에는 화면 중앙 정렬 팝업 카드 다이얼로그(`borderRadius: 16`, 가로 여백 18dp)로 표시하여 시각적 위계 확립.
    * 검색창 내 검색어 즉시 삭제(원클릭 초기화) 버튼(`x-circle`) 추가 및 검색 결과 0건 시 안내 메시지 제공.
    * 학생 선택 모달 열릴 때 이전 검색어 자동 초기화 및 학생 선택 시 키보드 자동 닫기(`Keyboard.dismiss()`) 적용.

* **검증 수치 (Numbers)**:
  * 올인원 품질 게이트 (`npm run gate`): 100% 통과
  * ESLint 무결성: 에러 0건, 경고 0건
  * Jest 단위 테스트: 6개 스위트, 27개 테스트 전체 통과 (100% PASS)
  * 정기 프로젝트 건전성 정밀 감사: 96점 / 100점 달성

* **미해결 과제 (Still open)**:
  * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md)의 `[G1]` HWPX 복수 표 서식 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 다변화 작업 대기 중.

---

## 2026-10-21: AI 중립적 전체 하네스 구축 및 .agents/ 개인화 분리 (by Gemini / Antigravity)

* **반영 내역 (What landed)**:
  * **루트 [AGENTS.md](file:///d:/development/mydiary/AGENTS.md) 신설**: Photocraft를 벤치마킹한 도구 중립적 최상위 마스터 헌장, 5분 오리엔테이션, 골든 룰, 작업 완료 게이트 명시.
  * **[docs/](file:///d:/development/mydiary/docs) 공용 엔지니어링 문서 허브 구축**:
    * [docs/INDEX.md](file:///d:/development/mydiary/docs/INDEX.md): 공식 통합 문서 허브 및 계층도
    * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md): 잔여 기능 격차(G1~G5) 랭킹 및 스코어카드
    * [docs/architecture.md](file:///d:/development/mydiary/docs/architecture.md): 런타임 아키텍처, 스토리지 및 HWPX 파이프라인
    * [docs/development.md](file:///d:/development/mydiary/docs/development.md): 개발 환경 셋업, 구동 및 테스트 가이드
    * [docs/contributing.md](file:///d:/development/mydiary/docs/contributing.md): 신규 기능 추가 7단계 체크리스트
    * [docs/coding-standards.md](file:///d:/development/mydiary/docs/coding-standards.md): 순수 JS + @types, 코딩 표준
    * [docs/database-integrity.md](file:///d:/development/mydiary/docs/database-integrity.md): AsyncStorage 무결성, Cascade Delete
    * [docs/ui-design.md](file:///d:/development/mydiary/docs/ui-design.md): theme.js 디자인 토큰 및 UI 표준
    * [docs/decisions.md](file:///d:/development/mydiary/docs/decisions.md): 주요 아키텍처 결정 기록(ADR)
    * [docs/cross-platform-sync.md](file:///d:/development/mydiary/docs/cross-platform-sync.md): 모바일 ↔ 데스크톱 상호 동기화 표준
    * [docs/release-playbook.md](file:///d:/development/mydiary/docs/release-playbook.md): 버전 동기화 5개 파일 및 릴리즈 파이프라인
  * **[.coderabbit.yaml](file:///d:/development/mydiary/.coderabbit.yaml) AI PR 코드 리뷰 하네스 도입**: 한국어 전문 리뷰어 톤, AsyncStorage 데이터 무결성/Cascade Delete, HWPX KS X 6101 XML 유효성, theme.js 디자인 토큰 준수 여부 정밀 감사 지침 설정.
  * **[package.json](file:///d:/development/mydiary/package.json) 올인원 게이트 스크립트 추가**: `"gate": "npm run lint && npm test && npm run audit"`
  * **[.agents/AGENTS.md](file:///d:/development/mydiary/.agents/AGENTS.md) 개인 하네스 슬림화**: 루트 공용 하네스 상속 선언 및 성백진 개발자님 전용 1:1 페어 프로그래밍 규칙 집중.

* **검증 수치 (Numbers)**:
  * Jest 단위 테스트: 6개 스위트, 27개 테스트 전체 통과 (PASS)
  * ESLint 무결성: 에러 0건 유지
  * 프로젝트 정기 코드 감사: 통과 (Score >= 85)

* **미해결 과제 (Still open)**:
  * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md)의 `[G1]` HWPX 복수 표 서식 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 다변화 작업 대기 중.
