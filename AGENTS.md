# 🤖 AGENTS.md: AI 에이전트 & 기여자를 위한 가이드 (Guide for AI Agents & Contributors)

MyDiary 스마트폰 앱은 학생 성장 일지, 수업 평가, 주간 시간표 관리를 위한 **React Native 0.86 + Expo 57** 기반 모바일 애플리케이션입니다.

본 리포지토리는 특정 AI 모델이나 전용 IDE에 종속되지 않는 **도구 중립적(Tool-Agnostic) 협력 하네스**로 운영됩니다. Claude Code, Cursor, GitHub Copilot, Gemini, Antigravity, Windsurf 등 어떤 AI 에이전트와 인간 기여자든 동등한 엔지니어로서 본 가이드와 `docs/`의 엔지니어링 표준을 준수해야 합니다.

작업 전 본 파일(`AGENTS.md`)을 가장 먼저 읽고, 세부 표준은 [docs/INDEX.md](file:///d:/development/mydiary/docs/INDEX.md)를 참조하십시오.

---

## 1. 5분 오리엔테이션 (5-Minute Orientation)

| 문서 | 목적 및 핵심 내용 |
|---|---|
| [docs/INDEX.md](file:///d:/development/mydiary/docs/INDEX.md) | 전체 문서 허브, 계층도 및 네비게이션 가이드 |
| [docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md) | 잔여 기능 격차 랭킹(G1~G5), 정량적 스코어카드 및 작업 우선순위 매트릭스 |
| [docs/architecture.md](file:///d:/development/mydiary/docs/architecture.md) | 런타임 아키텍처, 컴포넌트 계층도, 스토리지 모델 및 HWPX 생성 파이프라인 |
| [docs/development.md](file:///d:/development/mydiary/docs/development.md) | 개발 환경 셋업, Expo/Android 구동, 테스트 및 디버깅 요령 |
| [docs/contributing.md](file:///d:/development/mydiary/docs/contributing.md) | 신규 화면/컴포넌트 추가 7단계 체크리스트 및 품질 게이트 통과 절차 |
| [docs/coding-standards.md](file:///d:/development/mydiary/docs/coding-standards.md) | 순수 JS + @types, 변수명 일관성, 최소 침습적 수정(Minimal-Diff) |
| [docs/database-integrity.md](file:///d:/development/mydiary/docs/database-integrity.md) | AsyncStorage 스키마, 학생-일지 연쇄 삭제(Cascade Delete), 백업 JSON 호환 |
| [docs/ui-design.md](file:///d:/development/mydiary/docs/ui-design.md) | `src/theme.js` 디자인 토큰, 색상 팔레트, Safe Area 및 터치 표준 |
| [docs/decisions.md](file:///d:/development/mydiary/docs/decisions.md) | 주요 아키텍처 결정 기록 (ADR) 및 대안 분석 |
| [docs/cross-platform-sync.md](file:///d:/development/mydiary/docs/cross-platform-sync.md) | 스마트폰(`mydiary`) ↔ 데스크톱(`mydiary-desktop`) 상호 동기화 규칙 |
| [docs/release-playbook.md](file:///d:/development/mydiary/docs/release-playbook.md) | 시맨틱 버저닝, 버전 5개 파일 동기화 및 GitHub Actions 배포 절차 |

---

## 2. 워크스페이스 맵 (Workspace Map)

```text
src/
  components/       재사용 공용 UI 컴포넌트 (ConfirmModal, Separator 등)
  database/         AsyncStorage 중앙 접근 단일 진입점 (Database.js)
  screens/          6대 핵심 화면 (WeeklyPlan, ClassRecord, StudentList 등)
  services/         내보내기 & 외부 연동 서비스 (HwpxExportService, BackupService 등)
  theme.js          공식 디자인 토큰 (theme 객체)
  utils/            날짜/문자열 순수 유틸리티 (dateUtils.js, stringUtils.js)
__tests__/          Jest 단위/통합 테스트 스위트 (27개 테스트)
docs/               [공용 SSOT] 엔지니어링 지식 허브 & 하네스
log/                [공용 세션 인계장] devlog.md
scripts/            하네스 자동화 도구 (git-achievement.js, audit-project.js)
.agents/            [성백진 개발자 전용] 1:1 개인 하네스 및 6대 메타 스킬
```

---

## 3. 골든 룰 (Golden Rules - 절대 타협 불가)

### 1) 절대 크래시 금지 (Never Crash)
사용자의 소중한 일지 데이터가 유실되지 않도록 어떤 예외 상황에서도 앱이 비정상 종료(Panic/Crash)되어서는 안 됩니다.
- 파싱되지 않는 날짜, 손상된 백업 JSON, 누락된 필드가 유입되어도 앱이 튕기지 않고 방어적 fallback 기본값을 제공해야 합니다.
- 외부 라이브러리 I/O 호출부(HWPX 저장, Google Drive 인증 등)는 반드시 `try-catch`로 감싸고, 실패 시 사용자 친화적인 에러 다이얼로그를 표시합니다.

### 2) 데이터 무결성 최우선 & 연쇄 삭제 (Cascade Delete)
- 학생 정보를 삭제할 때 연결된 모든 수업 일지(`@class_records`)와 시간표 배정 데이터는 반드시 함께 삭제(연쇄 삭제)되어야 합니다. 고아 데이터(Orphan Data)를 방치하지 마십시오.
- 모든 스토리지 쓰기는 [src/database/Database.js](file:///d:/development/mydiary/src/database/Database.js)를 통해서만 수행합니다.

### 3) 100% 한국어 커밋 & 실행 가이드
- **모든 Git 커밋 메시지는 100% 한국어로만 작성합니다.** (영문 커밋 메시지 엄격 금지)
- 작업 완료 시 사용자가 즉시 복사하여 실행하거나 AI에게 지시할 수 있는 Git 명령어 예시를 제공합니다.

### 4) 국가 표준 KS X 6101 HWPX 무결성
- HWPX 한글 문서는 한컴오피스 2020+ 및 공공기관 뷰어에서 경고 창 없이 열려야 합니다.
- OWPML XML 마크업(`section0.xml`, `header.xml`) 작성 시 닫는 태그 누락이나 유효하지 않은 속성값을 삽입하지 마십시오.

---

## 4. 작업 선정 기준 (Picking Work)

새로운 개발 과제를 선정할 때 다음 우선순위를 엄격히 따릅니다:

1. **[docs/gaps.md](file:///d:/development/mydiary/docs/gaps.md) 최상위 랭킹 과제**:
   - `G1`부터 시작하여 아직 미완료(`Partial` 또는 `Missing`) 상태인 과제를 순차적으로 선택합니다.
2. **[log/devlog.md](file:///d:/development/mydiary/log/devlog.md)의 "미해결 과제(Still open)"**:
   - 이전 AI 세션이나 개발자가 남겨둔 잔여 태스크가 있는지 먼저 확인하고 이어받습니다.
3. **사용자의 명시적 요청**:
   - 사용자가 특정한 버그 수정이나 기능 구현을 지정한 경우 이를 최우선 처리합니다.

---

## 5. 작업 완료 전 필수 게이트 (Before You Finish a Task)

코드 수정을 마친 후에는 반드시 다음 올인원 게이트 명령어를 실행하여 통과를 증명해야 합니다:

```bash
# 올인원 품질 게이트 (ESLint 0건 + Jest 27개 테스트 + 9대 감사)
npm run gate
```

게이트가 100% 통과하면, [log/devlog.md](file:///d:/development/mydiary/log/devlog.md)에 작업 내역(반영 사항, 검증 수치, 잔여 과제)을 기록하고 사용자에게 보고합니다.

---

## 6. 다중 에이전트 동시 작업 규칙 (Parallel Agents)

여러 AI 모델이나 도구가 동시에 작업할 경우:
- [src/database/Database.js](file:///d:/development/mydiary/src/database/Database.js)와 [App.js](file:///d:/development/mydiary/App.js) 같은 핵심 공유 파일은 최소 침습적(Minimal-Diff)으로 수정하며, 대규모 코드 리포맷팅을 금지합니다.
- 새로운 모달이나 기능 화면은 기존 파일에 수백 줄을 누적하지 말고, [src/components/](file:///d:/development/mydiary/src/components/) 하위 모듈로 분리하여 파일 충돌을 방지합니다.
- 세션 종료 전 반드시 [log/devlog.md](file:///d:/development/mydiary/log/devlog.md)를 작성하여 다음 AI 모델로의 인계를 보장합니다.
