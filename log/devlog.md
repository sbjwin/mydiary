# 🪵 MyDiary 모바일 개발 로그 및 세션 인계장 (DevLog)

> **문서 목적**: 다중 AI 모델(Claude, Cursor, Copilot, Gemini 등) 및 개발자 간의 원활한 협업과 세션 단절 방지를 위해 작업 반영 내역, 검증 수치, 미해결 과제를 기록하는 단일 진실 인계장입니다.  
> **규칙**: 작업을 완료하거나 세션을 종료하기 전, 반드시 본 문서의 상단에 최신 작업 엔트리를 간결하게 추가합니다.

---

## 2026-11-13: 전체 UI/UX 5단계 순차 개선 (동적 테마 반응성, 시간 피커 통합, 주간시간표·학생상세 UX, 공통 모달 2종 분리) (by Antigravity)

* **반영 내역 (What landed)**:
  * **Phase 1 (동적 테마 전환 반응성 복구)**:
    * 8개 화면([HomeScreen.js](../src/screens/HomeScreen.js), [WeeklyPlanScreen.js](../src/screens/WeeklyPlanScreen.js), [CalendarScreen.js](../src/screens/CalendarScreen.js), [StudentListScreen.js](../src/screens/StudentListScreen.js), [SettingsScreen.js](../src/screens/SettingsScreen.js), [StudentDetailScreen.js](../src/screens/StudentDetailScreen.js), [ClassRecordScreen.js](../src/screens/ClassRecordScreen.js), [HelpScreen.js](../src/screens/HelpScreen.js)) 및 공용 컴포넌트([Separator.js](../src/components/Separator.js), [ConfirmModal.js](../src/components/ConfirmModal.js))의 정적 `StyleSheet.create`를 `useMemo(() => createStyles(theme), [theme])` 구조로 전환하여 설정 화면 프리셋 전환 시 즉시 반영되도록 개선.
  * **Phase 2 (시간 피커 통합 및 오전 12시 버그 수정)**:
    * [ClassRecordScreen.js](../src/screens/ClassRecordScreen.js)의 중복 인라인 시간 피커(~180줄)를 제거하고 공용 [TimePickerModal.js](../src/components/modals/TimePickerModal.js)로 통합.
  * **Phase 3 (주간시간표 모바일 UX 강화)**:
    * [WeeklyPlanScreen.js](../src/screens/WeeklyPlanScreen.js)의 타임라인 `selectedDayOffset` 초기값을 오늘 요일(월=0~일=6)로 자동 포커스하고, 표 헤더 및 타임라인 요일 탭에 오늘 날짜 강조(`dayHeaderCellToday`, `dayTabPillToday`) 적용.
    * 주간 표 열 너비(`68 -> 76`, `tableInner.minWidth: 500`) 및 셀 폰트(`cellItemTitle: 10.5`, `cellItemSubject: 9.5`, `cellItemNote: 9`) 확대.
    * `handleMakeCall`이 다중 연락처 매칭 시 `Alert.alert('통화할 번호 선택', ...)` 선택창을 표시하도록 개선.
  * **Phase 4 (학생 상세 입력 안정성 및 오프라인 배너)**:
    * [StudentDetailScreen.js](../src/screens/StudentDetailScreen.js)에 `beforeRemove` + `ConfirmModal` 기반 미저장 변경사항 이탈 방지 가드 추가(저장/삭제 완료 및 휴회/재수강 즉시 저장 시 정상 이탈 허용).
    * 외부 URL `ImageBackground` 배너를 오프라인 테마 반응형 배너 카드(`styles.bannerCard`)로 교체하고, 신규 등록 모드에서도 초기 수강 상태(`active`/`paused`) 전환 지원.
  * **Phase 5 (공통 모달 분리 및 단위 테스트)**:
    * [RecordPrintModal.js](../src/components/modals/RecordPrintModal.js) 신규 분리 후 [StudentListScreen.js](../src/screens/StudentListScreen.js), [ClassRecordScreen.js](../src/screens/ClassRecordScreen.js), [StudentDetailScreen.js](../src/screens/StudentDetailScreen.js) 연동.
    * [ScheduleEditModal.js](../src/components/modals/ScheduleEditModal.js) 신규 분리(이름·학교·전화번호 확장 검색 포함) 후 [WeeklyPlanScreen.js](../src/screens/WeeklyPlanScreen.js) 경량화(2,765줄 -> 2,097줄).
    * [__tests__/Components.test.js](../__tests__/Components.test.js)에 `RecordPrintModal`, `ScheduleEditModal` 렌더링 단위 테스트 2건 추가.

* **검증 수치 (Numbers)**:
  * 올인원 품질 게이트 (`cmd /c npm run gate`): 100% 통과
  * ESLint 무결성: 에러 0건, 경고 0건
  * Jest 단위 테스트: 6개 스위트, 33개 테스트 전체 통과 (100% PASS)
  * 정기 프로젝트 건전성 정밀 감사: **100점 / 100점** 달성 (초거대 위험 파일 0건, 공통 컴포넌트 11개)

* **미해결 과제 (Still open)**:
  * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md)의 `[G1]` HWPX 복수 표 서식 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 다변화 작업 대기 중.
  * [StudentDetailScreen.js](../src/screens/StudentDetailScreen.js)(1,587줄) 및 [WeeklyPlanScreen.js](../src/screens/WeeklyPlanScreen.js)(2,097줄) 추가 세부 섹션 분리 선택 사항.

---

## 2026-11-02: v2.5.0 공식 마이너 릴리즈 마일스톤 버전 5개 파일 동기화 및 릴리즈 태깅 (by Antigravity)

* **반영 내역 (What landed)**:
  * **5개 파일 버전 동기화 완료 (`v2.5.0`, Android `versionCode: 9`)**:
    * [package.json](../package.json): `"version": "2.5.0"`
    * [app.json](../app.json): `version: "2.5.0"`, `versionCode: 9`
    * [android/app/build.gradle](../android/app/build.gradle): `versionName "2.5.0"`, `versionCode 9`
    * [README.md](../README.md): 상단 헤더, 릴리즈 배지 및 v2.5.0 주요 기능 요약 섹션 반영
    * [src/screens/HelpScreen.js](../src/screens/HelpScreen.js): 버전 동적 바인딩 확인, 주간시간표 팁 보강 및 시간/날짜 피커 관련 신규 FAQ 추가
  * **릴리즈 주요 핵심 변경사항**:
    * 신규 공통 모달 [TimePickerModal.js](../src/components/modals/TimePickerModal.js) 분리 구축 및 GUI 시간 피커 전면 도입
    * 학생 상세 입회일 및 학생 상태 관리 모달 휴회/재수강 일자 인라인 달력(`Calendar`) 피커 적용
    * 주간시간표 전체 표 뷰의 동일 시간대 다중 학생 개별 터치 인터랙션 지원
    * 하단 탭바 자동 숨김(`tabBarHideOnKeyboard`) 및 5개 핵심 모달/화면 키보드 가림 완전 해결
    * [mydiary-build-release/SKILL.md](../.agents/skills/mydiary-build-release/SKILL.md) 릴리즈 빌드 및 서명 검증 공식 스킬 가이드 구축
  * **Git 태그 및 GitHub Actions CI/CD 트리거**:
    * `v2.5.0` 태그 생성 및 푸시를 통해 `android-release.yml` 자동 릴리즈 빌드 연동.

* **검증 수치 (Numbers)**:
  * 올인원 품질 게이트 (`npm run gate`): 100% 통과
  * ESLint 무결성: 에러 0건, 경고 0건
  * Jest 단위 테스트: 6개 스위트, 31개 테스트 전체 통과 (100% PASS)
  * 정기 프로젝트 건전성 정밀 감사: 96점 / 100점 달성

* **미해결 과제 (Still open)**:
  * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md)의 `[G1]` HWPX 복수 표 서식 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 다변화 작업 대기 중.

---

## 2026-11-01: 전체 화면/모달 키보드 가림 방지 및 날짜·시간 피커 / 주간표 다중 학생 터치 UX 개선 (by Antigravity)

* **반영 내역 (What landed)**:
  * **공통 시간 선택 모달([src/components/modals/TimePickerModal.js](../src/components/modals/TimePickerModal.js)) 분리 신설**:
    * 주간 시간표에 내장되어 있던 시작 시간 GUI 선택 팝업(빠른 프리셋, 오전/오후 탭, 시/분 그리드)을 재사용 가능한 공통 모달로 모듈화하여 [WeeklyPlanScreen.js](file:///d:/development/mydiary/src/screens/WeeklyPlanScreen.js) 라인 수를 3,089줄에서 2,760줄로 329줄 감축.
  * **1번 과제 — 키보드 가림 현상 5곳 및 하단 탭바 자동 숨김 완비**:
    * [App.js](file:///d:/development/mydiary/App.js): 하단 탭 네비게이터에 `tabBarHideOnKeyboard: true`를 적용하여 키보드 노출 시 하단 탭바가 입력 영역을 침범하지 않도록 개선.
    * [src/screens/WeeklyPlanScreen.js](file:///d:/development/mydiary/src/screens/WeeklyPlanScreen.js): 하단 부가 업무(금주 주요사항, 전주 결석, 특이사항) 멀티라인 입력창 및 수업 추가/편집 모달의 하단 입력창(주소, 연락처, 변동 메모) 포커스 시 키보드 높이 연동 패딩 및 자동 스크롤(`scrollToEnd`) 적용.
    * [src/screens/StudentDetailScreen.js](file:///d:/development/mydiary/src/screens/StudentDetailScreen.js): 키보드 노출 시 하단 고정 저장 바(`bottomFixedBar`)를 자동 숨김 처리하여 가용 화면을 확보하고, 정규 수업 과목 및 기타 사항(`notesInput`) 포커스 시 자동 스크롤 연동.
    * [src/screens/CalendarScreen.js](file:///d:/development/mydiary/src/screens/CalendarScreen.js): 학생 선택 검색 모달에서 키보드 노출 시 모달을 화면 상단으로 배치하고 키보드 위쪽까지 가용 높이를 동적 계산하도록 개선.
    * [src/components/modals/CallManageModal.js](file:///d:/development/mydiary/src/components/modals/CallManageModal.js) & [src/components/modals/StudentStatusModal.js](file:///d:/development/mydiary/src/components/modals/StudentStatusModal.js): 중앙 정렬 다이얼로그가 안드로이드 키보드에 가려지지 않도록 키보드 노출 시 상단 배치 전환.
  * **2번 과제 — 날짜/시간 GUI 피커 일원화 및 주간 전체 표 다중 학생 터치 개선**:
    * [src/screens/StudentDetailScreen.js](file:///d:/development/mydiary/src/screens/StudentDetailScreen.js): 수동 타이핑하던 '최초 수강 시작일(입회일)'에 인라인 달력(`Calendar`) 피커를 적용하고, '정규 수업 일정 시작 시간'에 공통 [`TimePickerModal`](../src/components/modals/TimePickerModal.js)을 연동하여 오타 원천 방지.
    * [src/components/modals/StudentStatusModal.js](file:///d:/development/mydiary/src/components/modals/StudentStatusModal.js): 휴회 종료일 및 재수강 시작일 입력란을 인라인 달력(`Calendar`) 피커로 전환.
    * [src/screens/WeeklyPlanScreen.js](file:///d:/development/mydiary/src/screens/WeeklyPlanScreen.js): 주간 전체 표(Table 뷰)의 동일 시간대 셀에 2명 이상 학생이 배정된 경우 각 학생 카드(`cellItemBox`)를 개별 터치하여 해당 학생의 일정을 바로 편집할 수 있도록 분리하고, 셀 빈 영역 터치 시 새 수업 추가 모달이 열리도록 개선.
  * **단위 테스트 추가**:
    * [__tests__/Components.test.js](file:///d:/development/mydiary/__tests__/Components.test.js): [`TimePickerModal`](../src/components/modals/TimePickerModal.js) 렌더링 검증 테스트 추가 (총 31개 테스트).

* **검증 수치 (Numbers)**:
  * 올인원 품질 게이트 (`npm run gate`): 100% 통과
  * ESLint 무결성: 에러 0건, 경고 0건
  * Jest 단위 테스트: 6개 스위트, 31개 테스트 전체 통과 (100% PASS)
  * 정기 프로젝트 건전성 정밀 감사: 96점 / 100점 달성

* **미해결 과제 (Still open)**:
  * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md)의 `[G1]` HWPX 복수 표 서식 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 다변화 작업 대기 중.

---

## 2026-10-27: Antigravity 결정론적 라이프사이클 훅(hooks.json) 구축 및 토큰 소모 최적화 (by Antigravity)

* **반영 내역 (What landed)**:
  * **[.agents/hooks.json](file:///d:/development/mydiary/.agents/hooks.json) 및 [.agents/scripts/pre-tool-guard.js](file:///d:/development/mydiary/.agents/scripts/pre-tool-guard.js) 구축**:
    * Antigravity `PreToolUse` 수명주기 훅을 통해 AI 에이전트의 도구 실행을 로컬 스크립트로 사전에 가로채 검증 및 보정하는 결정론적(Deterministic) 강제 아키텍처 도입.
    * **Windows 터미널 자동 보정 (`overwrite`)**: `run_command` 실행 시 `cmd /c ` 접두사가 누락되어 있어도 훅이 런타임에서 자동으로 `cmd /c `를 보정하여 무결점 실행 보장.
    * **Git 커밋 메시지 100% 한국어 강제 (`deny`)**: `git commit` 및 업적 스크립트 실행 시 메시지에 한국어(`[ㄱ-ㅎㅏ-ㅣ가-힣]`)가 없으면 시스템 레벨에서 실행을 물리적으로 즉시 차단.
    * **고위험 파괴적 명령어 사전 차단 (`deny`)**: `git reset --hard`, `git clean -f`, 주요 디렉토리 강제 삭제 등 실수로 인한 데이터 유실을 유발하는 명령어를 원천 차단.
  * **[scripts/git-achievement.js](file:///d:/development/mydiary/scripts/git-achievement.js) 2중 방어벽 구축**:
    * 업적 달성 스크립트 내부에서도 커밋 메시지의 한국어 포함 여부를 직접 검사하여 비한국어 커밋을 차단.
  * **[.agents/AGENTS.md](file:///d:/development/mydiary/.agents/AGENTS.md) 헌장 갱신**:
    * 결정론적 훅 가드레일 항목을 추가하고, 에이전트가 기계적 제약에 토큰을 낭비하지 않고 비즈니스 로직과 데이터 무결성에 집중할 수 있도록 역할 분담 명시.
  * **단위 테스트 및 게이트 검증 완료**:
    * 4가지 시나리오(cmd/c 보정, 영문 차단, 한글 통과, 위험 명령어 차단) 단위 테스트 100% 통과 확인.
    * `npm run gate` 올인원 품질 게이트(ESLint 0건 + Jest 30개 + 프로젝트 감사 96점) 100% 통과.

* **검증 수치 (Numbers)**:
  * 올인원 품질 게이트 (`npm run gate`): 100% 통과
  * ESLint 무결성: 에러 0건, 경고 0건
  * Jest 단위 테스트: 6개 스위트, 30개 테스트 전체 통과 (100% PASS)
  * 정기 프로젝트 건전성 정밀 감사: 96점 / 100점 달성

* **미해결 과제 (Still open)**:
  * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md)의 `[G1]` HWPX 복수 표 서식 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 다변화 작업 대기 중.

---

## 2026-10-27: 공통 UI 컴포넌트화(src/components/) 및 화면 간 중복 스타일/데드 코드 전면 정리 (by Antigravity)

* **반영 내역 (What landed)**:
  * **신규 재사용 공통 컴포넌트 3종 구축**:
    * [src/components/ActionMenuItem.js](file:///d:/development/mydiary/src/components/ActionMenuItem.js): 바텀시트 및 모달에서 쓰이는 리스트 아이템 UI(아이콘 뱃지, 타이틀, 설명, chevron) 통합.
    * [src/components/StatusBadge.js](file:///d:/development/mydiary/src/components/StatusBadge.js): 수업 상태(예정/완료) 및 학생 재원 상태(재원/휴원)를 일관되게 표현하는 시맨틱 토큰 기반 뱃지 컴포넌트.
    * [src/components/FloatingActionButton.js](file:///d:/development/mydiary/src/components/FloatingActionButton.js): 우측 하단 플로팅 버튼으로, 56×56 원형 및 라벨 텍스트가 포함된 확장형(Extended) FAB를 모두 지원.
  * **스크린 컴포넌트 리팩토링 및 중복 스타일 제거**:
    * [src/screens/StudentDetailScreen.js](file:///d:/development/mydiary/src/screens/StudentDetailScreen.js): 인쇄/공유 메뉴에 `ActionMenuItem` 적용, 기존 컴포넌트 분리 후 잔존하던 미사용 데드 스타일(`dialogCard`, `centerModalOverlay` 등 93줄) 완전 제거 (총 라인 수 1,509줄 → 1,378줄로 대폭 감축).
    * [src/screens/StudentListScreen.js](file:///d:/development/mydiary/src/screens/StudentListScreen.js): 학생 관리 6종 액션 메뉴에 `ActionMenuItem` 적용, 새 학생 등록에 `FloatingActionButton` 적용, 학생 상태 표시에 `StatusBadge` 적용 및 미사용 데드 스타일 100여 줄 제거 (총 라인 수 1,332줄 → 1,118줄로 대폭 감축).
    * [src/screens/ClassRecordScreen.js](file:///d:/development/mydiary/src/screens/ClassRecordScreen.js): 인쇄/공유 메뉴에 `ActionMenuItem` 적용, 플로팅 버튼에 `FloatingActionButton` 적용 및 중복 스타일 제거 (총 라인 수 1,729줄 → 1,662줄로 감축).
    * [src/screens/CalendarScreen.js](file:///d:/development/mydiary/src/screens/CalendarScreen.js): 플로팅 버튼에 `FloatingActionButton` 적용 및 중복 `fabButton` 스타일 제거.
    * [src/screens/HomeScreen.js](file:///d:/development/mydiary/src/screens/HomeScreen.js): 미사용 `statusBadge` 잔여 데드 스타일 21줄 정리.
  * **단위 테스트 스위트 확장**:
    * [__tests__/Components.test.js](file:///d:/development/mydiary/__tests__/Components.test.js): 신규 컴포넌트 3종에 대한 단위 테스트 추가 (총 테스트 수 27개 → 30개로 확장).

* **검증 수치 (Numbers)**:
  * 올인원 품질 게이트 (`npm run gate`): 100% 통과
  * ESLint 무결성: 에러 0건, 경고 0건
  * Jest 단위 테스트: 6개 스위트, 30개 테스트 전체 통과 (100% PASS)
  * 정기 프로젝트 건전성 정밀 감사: 96점 / 100점 달성 (StudentDetailScreen 대형 화면 경고 해제, 하드코딩 색상 287건 → 270건으로 감소)

* **미해결 과제 (Still open)**:
  * [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md)의 `[G1]` HWPX 복수 표 서식 레이아웃 프리셋(표준형, 서술형, 결재란 포함형) 다변화 작업 대기 중.

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
