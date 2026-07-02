# MyDiary (내 일상 수업 다이어리)

**MyDiary**는 React Native를 기반으로 제작된 모바일 애플리케이션으로, 학생들의 수업 일지와 일상 기록을 체계적으로 관리하기 위해 만들어졌습니다. 
학생별 정보 관리부터 날짜별 수업 기록 연동까지, 강사나 교사가 편리하게 사용할 수 있는 기능들을 제공합니다.

---

## 주요 기능 취지 및 특징

*   **학생 및 클래스 관리**: 학생 정보를 등록하고, 해당 학생과 관련된 수업 기록을 독립적으로 관리할 수 있습니다.
*   **캘린더 기반 일지**: 날짜별로 직관적인 달력(Calendar) 인터페이스를 통해 그날의 수업 내용이나 일상을 기록하고 조회합니다.
*   **로컬 데이터 저장 (안전성)**: AsyncStorage를 활용하여 사용자의 기기 내부에 데이터를 안전하게 보관합니다. 외부 서버 의존 없이 오프라인에서도 빠른 동작을 보장합니다.
*   **데이터 연쇄 삭제(Cascade)**: 학생 정보를 삭제하면 해당 학생과 연결된 모든 수업 기록도 깔끔하게 지워져 스토리지 낭비를 방지합니다.

---

## 개발 환경 및 npm 활용법

이 프로젝트는 **React Native CLI**를 기반으로 구성되어 있습니다. `npm` 명령어를 사용하여 패키지를 관리하고 앱을 실행합니다.

### 1. 필수 사전 준비
*   **Node.js**: v22 이상 권장
*   **JDK**: v17 이상 (안드로이드 빌드용)
*   **Ruby**: v2.7 이상 (iOS 빌드 및 CocoaPods용)

### 2. 패키지 설치
프로젝트를 처음 클론(Clone) 받거나 새로운 의존성 패키지가 추가되었을 때 실행합니다.
```bash
npm install
```

### 3. 메트로 번들러(Metro Bundler) 실행
React Native 앱을 구동하기 위한 로컬 JavaScript 서버를 켭니다. 앱을 실행할 때 항상 백그라운드에 켜져 있어야 합니다.
```bash
npm run start
```
> **Tip**: 캐시로 인해 오류가 발생한다면 `npm run start -- --reset-cache` 명령어를 사용하여 캐시를 초기화하며 시작할 수 있습니다.

---

## Android 빌드 및 실행 요령

Android 환경에서 앱을 구동하고 빌드하는 가이드입니다. (Android Studio 및 Android SDK가 설치되어 있어야 합니다.)

### 1. 로컬 에뮬레이터/기기에서 실행
기기가 USB로 연결되어 있거나 에뮬레이터가 켜져 있는 상태에서 아래 명령어를 실행하면 앱이 설치되고 구동됩니다.
```bash
npm run android
```

### 2. 안드로이드 APK 빌드 (테스트용)
기기에 직접 넣어서 테스트해볼 수 있는 디버그용 `.apk` 파일을 추출하는 방법입니다.
```bash
cd android
./gradlew assembleDebug
```
*   **결과물 경로**: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. 안드로이드 AAB/APK 릴리즈 빌드 (배포용)
구글 플레이스토어에 배포하기 위해서는 정식 서명 키(Keystore) 설정이 필요합니다. 서명 키가 적용된 후 아래 명령어로 릴리즈 빌드를 진행합니다.
```bash
cd android
./gradlew bundleRelease   # AAB 포맷 (플레이스토어 업로드용 권장)
./gradlew assembleRelease # APK 포맷 (직접 배포용)
```

---

## iOS 빌드 및 실행 요령

iOS 환경은 반드시 **macOS** 운영체제와 **Xcode**가 설치되어 있어야 빌드가 가능합니다.

### 1. iOS 전용 패키지(CocoaPods) 설치
iOS 네이티브 모듈을 연동하기 위해 `ios` 폴더 내부에서 Pod을 설치해야 합니다. 최초 실행 전이나 새로운 패키지를 설치했을 때 필수입니다.
```bash
cd ios
pod install
cd ..
```
> **Tip**: M1/M2 등 Apple Silicon 칩 맥을 사용 중이고 pod install에 에러가 난다면 `arch -x86_64 pod install`을 시도하거나 Ruby 버전을 점검해 보세요.

### 2. 로컬 시뮬레이터/기기에서 실행
아래 명령어를 통해 iOS 시뮬레이터에서 앱을 바로 실행할 수 있습니다.
```bash
npm run ios
```
*   특정 기기에서 실행하고 싶다면: `npm run ios -- --simulator="iPhone 15"`

### 3. iOS 릴리즈 빌드 (TestFlight 및 App Store 배포용)
iOS는 터미널 명령어보다는 **Xcode**를 직접 사용하는 것이 안정적이고 관리가 수월합니다.
1.  `ios/mydiary.xcworkspace` (주의: `.xcodeproj`가 아닙니다) 파일을 Xcode로 엽니다.
2.  Xcode 상단 메뉴바에서 **Product > Scheme > Edit Scheme**으로 이동 후 Build Configuration을 **Release**로 변경합니다.
3.  상단 메뉴바에서 타겟 기기를 **Any iOS Device (arm64)** 로 설정합니다.
4.  **Product > Archive** 메뉴를 클릭하여 빌드를 진행합니다.
5.  아카이빙이 완료되면 Organizer 창이 뜨며, 여기서 **Distribute App** 버튼을 눌러 App Store Connect로 업로드할 수 있습니다.

---

> 참고: 더 자세한 트러블슈팅 및 팁은 프로젝트 내 [BuildGuide.md](./BuildGuide.md) 문서를 확인해 주세요.
