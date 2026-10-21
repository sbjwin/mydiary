# 🚀 MyDiary 모바일 공식 릴리즈 플레이북 (Release Playbook)

> **문서 목적**: MyDiary 스마트폰 앱의 시맨틱 버저닝, 버전 동기화 5개 파일, GitHub Actions CI/CD 기반 자동 릴리즈 파이프라인 표준을 규정합니다.  
> **최종 갱신일**: 2026-10-21  
> **총괄 관리자**: 성백진 (`Sung Baekjin` / `sbjwin4271@gmail.com`)

---

## 1. 버전 관리 정책

* **일상 개발 단계**: 개별 기능 추가, UI 수정, 버그 수정 등 일상 작업 커밋마다 버전을 올리지 않습니다.
* **공식 릴리즈 단계**: 개발자가 릴리즈(배포/빌드)를 명시적으로 요청하거나 마일스톤이 완료되었을 때만 누적된 변경 사항을 종합하여 **1회 버전 업**을 제안/수행합니다.

---

## 2. 버전 동기화 필수 파일 (5곳 동시 업데이트)

공식 릴리즈 시 다음 5개 파일의 버전을 반드시 일치시킵니다:
1. `package.json` -> `"version": "X.Y.Z"`
2. `app.json` -> `expo.version: "X.Y.Z"`, `expo.android.versionCode: N`
3. `android/app/build.gradle` -> `versionName "X.Y.Z"`, `versionCode N`
4. `README.md` -> 타이틀 및 주요 버전 표기(`vX.Y.Z`) 동기화 (또는 `npm run sync-version` 실행)
5. `src/screens/HelpScreen.js` -> 버전 표기 동적 연동 확인 및 신규 기능 가이드/FAQ 동기화

---

## 3. Semantic Versioning (vX.Y.Z) 원칙

* **Patch (vX.Y.Z+1)**: 버그 수정(`fix`), UI/스타일 미세 조정(`style`), 내부 리팩토링(`refactor`) 위주의 릴리즈
* **Minor (vX.Y+1.0)**: 새로운 화면/기능 추가(`feat`), 기존 데이터와 호환되는 주요 기능 확장이 포함된 릴리즈
* **Major (vX+1.0.0)**: 하위 호환되지 않는 AsyncStorage DB 스키마 변경, 앱 구조 전면 개편(`BREAKING CHANGE`)이 포함된 릴리즈

---

## 4. GitHub Actions CI/CD 기반 자동 배포 워크플로우

1. **품질 검증 통과**: `npm run gate` (린트 오류 0건, 테스트 27개 통과, 9대 감사 통과 확인)
2. **5개 파일 버전 동기화**: 위 2번 항목 동기화
3. **한국어 커밋 및 푸시**:
   ```bash
   cmd /c git add .
   cmd /c git commit -m "chore: vX.Y.Z 릴리즈 마일스톤 동기화"
   cmd /c git push origin main
   ```
4. **Git 태그 생성 및 푸시 (자동 릴리즈 트리거)**:
   ```bash
   cmd /c git tag vX.Y.Z
   cmd /c git push origin vX.Y.Z
   ```
5. **결과 확인**: GitHub Actions의 `android-release.yml`이 실행되어 서명된 릴리즈 APK를 자동 빌드하고 [GitHub Releases](https://github.com/sbjwin/mydiary/releases)에 등록 완료됨을 확인합니다.
