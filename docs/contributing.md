# 🤝 MyDiary 모바일 기여 및 기능 추가 가이드 (Contributing Guide)

> **문서 목적**: MyDiary 모바일 프로젝트에 새로운 화면, 모달 컴포넌트, 비즈니스 서비스를 추가할 때 준수해야 하는 표준 기여 절차 및 7단계 체크리스트입니다.  
> **최종 갱신일**: 2026-10-21  
> **총괄 관리자**: 성백진 (`Sung Baekjin` / `sbjwin4271@gmail.com`)

---

## 1. 기본 기여 원칙

* **언어 및 스타일**: 순수 JavaScript (ES6+ / React Hooks) 기반을 유지합니다. 임의로 TypeScript(`.ts`/`.tsx`)로 전면 마이그레이션하지 않습니다.
* **최소 침습적 수정 (Minimal-Diff)**: 불필요한 파일 리네이밍이나 대규모 디렉터리 재배치를 금지하며, 목적한 기능에 필요한 코드만 정밀하게 수정합니다.
* **절대 크래시 금지 (Never Crash)**: 외부 입력 데이터(백업 JSON, 파싱된 날짜 등)는 반드시 안전한 fallback 기본값을 두고 처리합니다.
* **100% 한국어 커밋**: 모든 Git 커밋 메시지는 한국어로만 작성합니다.

---

## 2. 신규 화면/컴포넌트 추가 7단계 체크리스트 (Adding a Feature Checklist)

새로운 기능을 추가할 때 AI 에이전트와 기여자는 다음 7단계를 순서대로 완료해야 합니다:

1. **[설계 & 토큰] 테마 객체 임포트**:
   - 하드코딩된 색상(`#4a7c92` 등) 대신 반드시 `src/theme.js`의 `useTheme()` 훅을 사용하여 `theme.colors` 토큰을 연결합니다.
2. **[DRY 원칙] 공용 유틸리티 우선 사용**:
   - 날짜 포맷은 [src/utils/dateUtils.js](file:///d:/development/mydiary/src/utils/dateUtils.js), 문자열 정규화는 [src/utils/stringUtils.js](file:///d:/development/mydiary/src/utils/stringUtils.js)의 검증된 함수를 재사용합니다 (자체 중복 함수 정의 금지).
3. **[스토리지] Database.js 경유**:
   - 화면에서 `AsyncStorage`를 직접 호출하지 않고, [src/database/Database.js](file:///d:/development/mydiary/src/database/Database.js)에 선언된 공용 함수를 호출합니다.
4. **[데이터 무결성] 연쇄 삭제 검증**:
   - 학생 또는 주요 엔터티를 삭제하는 로직이 포함될 경우, 연결된 일지와 시간표 데이터가 함께 삭제되는지 확인합니다.
5. **[터치 UX] 터치 영역 44dp 확보**:
   - 버튼 및 터치 가능한 모든 요소는 최소 44x44 dp 크기를 확보하여 모바일 터치 편의성을 준수합니다.
6. **[단위 테스트] 회귀 테스트 작성**:
   - 비즈니스 로직이나 유틸리티가 추가된 경우 `__tests__/*.test.js`에 테스트 케이스를 추가하여 테스트 커버리지를 보존합니다.
7. **[게이트 통과] 올인원 검증 완료**:
   - `npm run gate`를 실행하여 린트 오류 0건, 테스트 전원 통과, 감사 85점 이상을 확인하고 [log/devlog.md](file:///d:/development/mydiary/log/devlog.md)에 기록합니다.
