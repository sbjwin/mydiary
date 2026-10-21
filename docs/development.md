# 💻 MyDiary 모바일 개발 & 디버깅 가이드 (Development Guide)

> **문서 목적**: 로컬 개발 환경 셋업, Expo 및 React Native 구동, Android 에뮬레이터/실기기 연동, 테스트 및 디버깅 요령을 설명하는 개발자 가이드입니다.  
> **최종 갱신일**: 2026-10-21  
> **총괄 관리자**: 성백진 (`Sung Baekjin` / `sbjwin4271@gmail.com`)

---

## 1. 개발 환경 요구사항 (Prerequisites)

* **Node.js**: v22.11.0 이상 LTS (Windows / macOS / Linux 지원)
* **패키지 매니저**: `npm` (프로젝트 루트의 `package-lock.json` 엄격 준수)
* **Java Development Kit (JDK)**: OpenJDK 17 (Android 빌드 필수)
* **Android SDK**: API 레벨 34 / 35 (Android 14 / 15 대응)
* **터미널 실행 규칙 (Windows)**:
  * Windows 환경에서 AI 에이전트 및 스크립트 실행 시 **반드시 `cmd /c`** 프리픽스를 적용하여 실행합니다.

---

## 2. 로컬 실행 및 번들러 구동

```bash
# 1. 의존성 설치 (필요시)
npm install

# 2. Metro 번들러 구동 (개발 모드)
npm start

# 3. Expo 개발 서버 직접 실행
npm run expo-start

# 4. Android 에뮬레이터 또는 연결된 실기기로 직접 빌드 및 실행
npm run android
```

---

## 3. 테스트 및 품질 검증 실행 (Quality Loop)

작업 중 빠른 피드백을 얻기 위해 다음 명령어를 활용합니다:

```bash
# 전체 단위 테스트 실행 (Jest 27개 테스트)
npm test

# 특정 테스트 파일만 빠르게 단독 실행
npm test -- __tests__/WeeklyPlanIndependence.test.js

# 코드 문법 및 ESLint 검증
npm run lint

# 9대 프로젝트 정기 코드 감사 실행
npm run audit

# 🚀 [필수] 작업 완료 전 올인원 게이트 검증
npm run gate
```

---

## 4. 디버깅 및 트러블슈팅 팁

1. **Metro 캐시 클린업**:
   - 코드 변경 사항이 반영되지 않거나 번들링 에러 발생 시 캐시를 초기화합니다:
     ```bash
     cmd /c npx react-native start --reset-cache
     ```
2. **Android adb 기기 연결 확인**:
   - PC에 USB 디버깅으로 연결된 기기 상태 확인:
     ```bash
     cmd /c adb devices
     ```
3. **AsyncStorage 초기화(리셋) 디버깅**:
   - 테스트 데이터 오염으로 앱을 초기화하고 싶을 경우:
     - Android 설정 > 애플리케이션 > MyDiary > 저장공간 > '데이터 삭제' 수행.
