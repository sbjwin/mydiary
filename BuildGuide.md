# MyDiary React Native 앱 개발 및 빌드 가이드 (Build Guide)

이 문서는 **MyDiary** 프로젝트의 분석 내용, 로컬 실행 방법, APK 빌드 절차, 그리고 현재 프로젝트에서 발생할 수 있는 잠재적 문제점 및 개선 방향을 정리한 가이드입니다. 

---

## 1. 프로젝트 분석 요약

이 프로젝트는 **React Native CLI (v0.86.0)** 기반으로 작성된 하이브리드 앱 프로젝트입니다.

*   **핵심 스택**: React 19.2.3, React Native 0.86.0, React Navigation 7, AsyncStorage, React Native Calendars.
*   **아키텍처 특징**:
    *   **New Architecture (Fabric & TurboModules)** 가 활성화되어 있습니다 (`android/gradle.properties` 내 `newArchEnabled=true`).
    *   **AsyncStorage**를 이용해 로컬 데이터를 저장 및 관리하고 있으며, 학생 정보 삭제 시 해당 학생의 수업 일지 기록도 연쇄 삭제(Cascade)되는 안전한 헬퍼 함수가 구축되어 있습니다.
    *   ESLint 설정이 정상 작동 중이며, `npm run lint` 수행 시 코드 문법 오류나 어긋나는 부분 없이 깨끗한 상태(無 오류)입니다.

---

## 2. 로컬 개발 환경 실행 방법

앱을 로컬 에뮬레이터나 실제 기기에서 실행하기 위해서는 아래의 개발 환경이 사전 구성되어 있어야 합니다.

### ① 사전 필수 요구사항
1.  **Node.js**: `v22.11.0` 이상 (LTS 버전 권장)
2.  **JDK (Java Development Kit)**: **JDK 17** 또는 **JDK 21** (React Native 0.86 버전은 JDK 17 이상이 필수적입니다. 환경 변수 `JAVA_HOME`이 정상 설정되었는지 확인하세요.)
3.  **Android Studio & SDK**:
    *   Android SDK Platform 36 (Android 15) 및 Build-Tools 36.0.0 설치 권장 (`android/build.gradle`의 `compileSdkVersion = 36` 설정 기준)
    *   에뮬레이터(AVD) 또는 USB 디버깅이 활성화된 실제 Android 기기 준비
    *   환경 변수 `ANDROID_HOME` 설정 필수

### ② 실행 명령어
터미널을 열고 아래 명령어를 차례대로 실행합니다.

```bash
# 1. 의존성 패키지 설치 (설치되어 있지 않은 경우)
npm install

# 2. Metro 번들러 서버 시작 (다른 터미널 창에서 켜두기)
npm run start

# 3. Android 디바이스/에뮬레이터에 앱 실행
npm run android
```

---

## 3. APK 빌드 방법 (Android Package)

실제 기기에 직접 설치하여 테스트하거나 배포하기 위해 APK 파일로 빌드하는 방법입니다.

### ① 디버그용 APK 빌드 (단순 설치/테스트용)
서명 키 설정 없이 빠르게 APK를 생성하여 폰에 직접 넣어서 설치해 보고 싶을 때 사용합니다.

```bash
# android 폴더로 이동하여 빌드 명령어 수행
cd android
./gradlew assembleDebug
```
*   **결과물 경로**: `android/app/build/outputs/apk/debug/app-debug.apk`
*   이 APK는 디버그 서명이 되어 있어, USB 전송 등으로 기기에 넣어서 바로 설치 및 실행할 수 있습니다.

### ② 배포/릴리즈용 APK 빌드 (배포 및 프로덕션용)
구글 플레이스토어에 업로드하거나 실제 서비스 형태로 배포하기 위한 최적화 빌드입니다.

현재 `android/app/build.gradle` 설정 상 `release` 빌드 타입도 임시로 디버그 서명 키(`signingConfigs.debug`)를 사용하도록 매핑되어 있어, 바로 빌드가 가능합니다.

```bash
cd android
./gradlew assembleRelease
```
*   **결과물 경로**: `android/app/build/outputs/apk/release/app-release.apk`
*   **주의**: 임시 디버그 서명 키로 생성된 릴리즈 APK이므로 내부 테스트용으로 실제 기기에서 구동은 가능하지만, **구글 플레이스토어 등록은 불가능**합니다. 실제 배포를 위해서는 아래 4장의 **정식 서명 키 설정**이 필요합니다.

---

## 4. 잠재적인 문제점 분석 및 개선 가이드

프로젝트 초기 단계에서 인지하고 있어야 할 중요한 기술적 검토 사항들입니다.

### ⚠️ 문제점 1: `react-native-vector-icons` 미설정 및 폰트 깨짐 우려
*   **현황**: `package.json`에는 `react-native-vector-icons` 패키지가 포함되어 있지만, 실제 코드(`StudentListScreen.js`, `CalendarScreen.js` 등)에서는 라이브러리를 임포트하지 않고 이모지(`📱`, `▶`, `✕`)를 사용해 디자인되어 있습니다.
*   **이유 및 문제**: React Native에서 vector-icons를 정상적으로 사용하려면 Android Native 레이어에 폰트 복사 과정이 세팅되어야 합니다. 그렇지 않고 라이브러리 사용 시 아이콘이 엑스박스(`[?]`)로 깨집니다.
*   **해결 및 조치**:
    *   **사용하지 않을 경우**: 패키지를 삭제하여 앱 용량을 줄입니다. (`npm uninstall react-native-vector-icons`)
    *   **사용할 경우**: `android/app/build.gradle` 파일의 맨 아래에 다음 코드를 추가해야 합니다.
        ```groovy
        apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
        ```

### ⚠️ 문제점 2: AsyncStorage의 6MB 용량 제한 문제 (Android)
*   **현황**: DB로 `AsyncStorage`를 사용하고 있습니다. Android 환경에서 AsyncStorage는 기본적으로 **6MB**의 용량 제한이 적용됩니다.
*   **문제**: 학생이 늘어나고 수개월 치의 수업 기록 일지 텍스트가 누적되면, 어느 순간 6MB 용량을 초과하여 더 이상 수업 기록이 저장되지 않고 앱 에러가 발생할 수 있습니다.
*   **해결 및 조치**:
    *   **임시 조치**: `android/gradle.properties` 파일에 아래 설정을 추가하여 기본 용량을 늘려줍니다. (예: 50MB로 확장)
        ```properties
        AsyncStorage_db_size_in_MB=50
        ```
    *   **장기 조치**: 데이터가 대규모로 확장될 예정이라면 `react-native-quick-sqlite`나 `react-native-mmkv` 등 고성능 로컬 데이터베이스 또는 서버 DB(Firebase, Supabase 등)로 마이그레이션하는 것을 권장합니다.

### ⚠️ 문제점 3: 구글 플레이 배포를 위한 서명 키(Keystore) 설정 부재
*   **현황**: `build.gradle`에서 `release` 빌드가 여전히 `debug` 키를 참조하고 있습니다.
*   **해결 및 조치**:
    1.  JDK가 제공하는 `keytool`을 통해 개인 서명 키(`.keystore` 또는 `.jks`)를 생성합니다.
        ```bash
        keytool -genkeypair -v -storetype JKS -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
        ```
    2.  생성한 `my-upload-key.keystore` 파일을 `android/app/` 폴더 아래로 복사합니다.
    3.  `android/gradle.properties`에 비밀번호 및 별칭(Alias) 변수를 지정합니다.
    4.  `android/app/build.gradle`의 `signingConfigs`와 `buildTypes.release` 부분에 해당 설정 변수를 바인딩합니다.

### ⚠️ 문제점 4: New Architecture와 라이브러리 간 호환성 검토
*   **현황**: 최신 React Native 버전인 `0.86.0`을 사용 중이며 New Architecture가 적용되어 있습니다.
*   **주의점**: 향후 추가할 외부 Native 라이브러리 중 일부 구버전 패키지는 New Architecture 하에서 빌드 에러를 유발할 수 있습니다. 추가적인 Native 라이브러리를 설치할 때 꼭 해당 라이브러리가 React Native New Architecture를 지원하는지 문서를 먼저 확인해야 합니다. 만약 빌드가 계속 깨진다면 `gradle.properties`에서 `newArchEnabled=false`로 잠시 끄는 것도 방안이 될 수 있습니다.
