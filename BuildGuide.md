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
# 1. 의존성 패키지 설치
npm install

# 2. Metro 번들러 서버 시작 (다른 터미널 창에서 켜두기)
npm run start
# 캐시 오류 시: npm run start -- --reset-cache

# 3. Android 실제 기기 연결 확인 (선택 사항)
adb devices

# 4. Android 디바이스/에뮬레이터에 앱 실행
npm run android
# 릴리즈 환경으로 로컬 테스트 시: npm run android -- --variant release
```

---

## 3. Android APK 및 AAB 빌드 방법

실제 기기에 직접 설치하여 테스트하거나 스토어 배포용 패키지를 추출하는 방법입니다.

### ① 디버그용 APK 빌드 (단순 설치/테스트용)
서명 키 설정 없이 빠르게 APK를 생성하여 스마트폰에 직접 넣어서 설치해 보고 싶을 때 사용합니다.

```bash
cd android
./gradlew assembleDebug
```
*   **결과물 경로**: `android/app/build/outputs/apk/debug/app-debug.apk`

### ② 릴리즈용 APK 및 AAB 빌드 (배포 및 프로덕션용)
구글 플레이스토어 업로드용(AAB) 또는 수동 배포용 서명 APK를 빌드하는 방법입니다.

```bash
cd android
./gradlew bundleRelease   # AAB 포맷 (구글 플레이스토어 업로드 권장)
./gradlew assembleRelease # APK 포맷 (직접 설치 및 배포용)
```
*   **결과물 경로**:
    *   AAB: `android/app/build/outputs/bundle/release/app-release.aab`
    *   APK: `android/app/build/outputs/apk/release/app-release.apk`
*   **주의**: 공식 배포를 위해서는 아래 5장의 **정식 서명 키(Keystore) 설정** 또는 8장의 **GitHub Actions CI/CD 파이프라인**을 활용하세요.

---

## 4. iOS 개발 및 빌드 요령 (macOS 전용)

iOS 환경은 반드시 **macOS** 운영체제와 **Xcode**가 설치되어 있어야 빌드가 가능합니다.

### ① iOS 전용 패키지(CocoaPods) 설치
iOS 네이티브 모듈 연동을 위해 최초 1회 또는 네이티브 라이브러리 추가 시 Pod을 설치합니다.
```bash
cd ios
pod install
cd ..
```
> **Tip**: Apple Silicon (M1/M2/M3) 맥에서 에러 발생 시 `arch -x86_64 pod install`을 시도합니다.

### ② 로컬 시뮬레이터에서 실행
```bash
npm run ios
# 특정 기기 지정: npm run ios -- --simulator="iPhone 15"
```

### ③ iOS 릴리즈 빌드 (TestFlight 및 App Store 배포)
1. `ios/mydiary.xcworkspace` (주의: `.xcodeproj`가 아닙니다) 파일을 Xcode로 엽니다.
2. Xcode 상단 메뉴 **Product > Scheme > Edit Scheme**에서 Build Configuration을 **Release**로 변경합니다.
3. 타겟 기기를 **Any iOS Device (arm64)** 로 설정합니다.
4. **Product > Archive** 메뉴를 클릭하여 아카이빙을 진행합니다.
5. 빌드 완료 후 Organizer 창에서 **Distribute App** 버튼을 통해 App Store Connect에 업로드합니다.

---

## 5. 잠재적인 문제점 분석 및 개선 가이드

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

---

## 6. Git 관련 주의사항 (.gitignore 및 캐시 정리)

`.gitignore`에 뒤늦게 무거운 빌드 파일이나 캐시 폴더를 추가한 경우, 이전에 이미 커밋되어 원격 저장소에 올라가버린 파일들은 Git이 계속 추적하게 됩니다.
이러한 파일들의 추적 기록(캐시)을 일괄적으로 지우고 `.gitignore`를 제대로 적용하려면 터미널에서 아래 명령어를 순서대로 실행하세요.

```bash
# 1. 원격 및 로컬의 모든 Git 추적 캐시를 삭제 (실제 파일은 삭제되지 않음)
git rm -r --cached .

# 2. .gitignore 규칙을 적용하여 다시 파일들을 스테이징
git add .

# 3. 캐시 삭제 내용을 커밋
git commit -m "chore: .gitignore 설정 업데이트 및 캐시 정리"

# 4. 원격 저장소에 적용
git push origin main
# (또는 현재 브랜치 이름에 맞게: git push)
```

---

## 7. 보안 점검 및 강화 가이드 (Security Guide)

프로젝트를 안전하게 유지하기 위해 주기적인 보안 취약점 점검 및 강화가 필수적입니다. 아래의 모범 사례를 참고하여 프로젝트 보안을 관리하세요.

### ① NPM 의존성 패키지 취약점 관리
외부 오픈소스 라이브러리에서 발견된 보안 취약점을 점검하고 안전한 버전으로 주기적으로 업데이트합니다.

*   **취약점 스캔**: 현재 설치된 패키지들의 취약점 리포트를 확인합니다.
    ```bash
    npm audit
    ```
*   **자동 취약점 패치**: 호환성이 깨지지 않는 선에서 안전한 버전으로 패키지를 일괄 업데이트합니다.
    ```bash
    npm audit fix
    ```
*   **강제 취약점 패치 (주의 요망)**:
    의존성 버전 규칙(Peer Dependencies 등)을 무시하고라도 취약점이 해결된 버전으로 강제 업데이트를 진행합니다. 이 명령어 실행 후에는 앱의 빌드 및 동작(호환성)에 문제가 없는지 반드시 전체적인 테스트를 거쳐야 합니다.
    ```bash
    npm audit fix --force
    ```

### ② 소스 코드 정적 보안 분석 (Static Analysis)
코드 레벨에서의 보안 위협(예: 안전하지 않은 정규식 처리로 인한 DoS 공격, Eval 등)을 사전에 막아야 합니다.
*   `eslint-plugin-security`와 같은 보안 전문 린터(Linter) 플러그인을 프로젝트에 추가하여, 코드 작성과 동시에 잠재적인 보안 위험을 에디터에서 경고받도록 설정하는 것을 권장합니다.

### ③ 시크릿 정보 보호 (환경 변수 분리)
*   외부 API 연동 키, 데이터베이스 암호, 빌드 서명 키 등의 민감 정보는 절대로 소스코드 내에 직접 작성(Hard-coding)하지 마세요.
*   `react-native-config` 또는 `react-native-dotenv` 같은 패키지를 이용해 `.env` 파일로 환경 변수를 분리하여 관리해야 합니다.
*   생성된 환경 변수 파일이나 키스토어 파일 등은 **반드시 6장에서 설명된 `.gitignore`를 통해 Git 추적에서 제외**되어야 원격 코드 저장소 해킹이나 유출을 막을 수 있습니다.

---

## 8. GitHub Actions 기반 Android CI/CD 자동 배포 가이드

`mydiary` 프로젝트는 GitHub Actions를 통해 **코드 품질 자동 검증(CI)** 및 **서명된 릴리즈 APK 자동 배포(CD)** 파이프라인이 구축되어 있습니다.

### ① 워크플로우 구성
1. **코드 품질 검증 (`quality-check.yml`)**:
   * **트리거**: `main` 브랜치 푸시 및 PR 생성 시 자동 실행.
   * **보안 격리**: 시크릿(Secrets)을 전혀 주입하지 않아 악의적인 PR로부터 암호 유출 공격을 원천 차단.
   * **동작**: `npm ci` → ESLint 검증(`npm run lint`) → 단위 테스트(`npm test`) 실행.
2. **Android 릴리즈 빌드 & 배포 (`android-release.yml`)**:
   * **트리거**: 버전 태그 푸시 (`git push origin v2.3.1`) 또는 Actions 탭에서 수동 실행(`workflow_dispatch`).
   * **보안 강화**:
     * GitHub Secrets에서 Keystore 및 비밀번호를 가져와 러너 메모리 상에서 안전하게 복원 (특수문자 및 줄바꿈 보존).
     * 빌드 후 성공/실패 여부와 무관하게 러너 내의 Keystore 및 프로퍼티 파일을 즉시 영구 파기(`rm -f`).
   * **배포**: 서명된 최적화 APK(`MyDiary-v2.3.1.apk`)를 GitHub Releases에 자동 등록.

### ② 필수 GitHub Repository Secrets 등록 안내
GitHub 저장소 (`Settings` → `Secrets and variables` → `Actions` → `New repository secret`)에 다음 5개 시크릿을 등록합니다:

| 시크릿 이름 | 설명 | 확인/추출 방법 |
| :--- | :--- | :--- |
| `ANDROID_KEYSTORE_BASE64` | `android/app/mydiary-release-key.keystore`의 Base64 인코딩 값 | 아래 PowerShell 명령어로 클립보드에 즉시 복사 |
| `MYDIARY_RELEASE_STORE_PASSWORD` | Keystore 저장소 비밀번호 | 로컬 `~/.gradle/gradle.properties` 참조 |
| `MYDIARY_RELEASE_KEY_ALIAS` | 키 별칭 (`mydiary-key-alias`) | 로컬 `~/.gradle/gradle.properties` 참조 |
| `MYDIARY_RELEASE_KEY_PASSWORD` | 키 비밀번호 | 로컬 `~/.gradle/gradle.properties` 참조 |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | 구글 로그인 웹 클라이언트 ID | `.env` 파일의 값 참조 |

#### 📋 Keystore Base64 원클릭 복사 명령어 (Windows PowerShell)
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android/app/mydiary-release-key.keystore")) | Set-Clipboard
```
*(실행 후 GitHub Secrets의 `ANDROID_KEYSTORE_BASE64` 값 입력창에 `Ctrl + V`로 바로 붙여넣기 하시면 됩니다.)*

### ③ 검증된 CI/CD 빌드 성공 아키텍처 (Troubleshooting & Reliability)
1. **React Native New Architecture C++ Codegen 의존성 보장**:
   - 루트 앱의 `configureCMake` 태스크가 네이티브 모듈의 `generateCodegenArtifactsFromSchema`보다 먼저 실행되어 디렉토리 누락 에러가 발생하는 것을 방지하기 위해 `android/app/build.gradle`에 `afterEvaluate` 블록으로 명시적 `dependsOn`을 선언하고 CI 빌드 스텝에서 사전 실행합니다.
2. **Linux 호스트 링커 오염(`ld.gold`) 차단**:
   - NDK 27에서 제거된 gold 링커를 호스트 우분투의 `/usr/bin/ld.gold`가 가로채어 ELF 불일치 에러를 유발하는 문제를 `sudo rm -f /usr/bin/ld.gold` 스텝으로 원천 차단했습니다.
3. **결정론적 순차 빌드**:
   - 클라우드 러너의 멀티코어 환경에서 레이스 컨디션을 방지하기 위해 `-Dorg.gradle.parallel=false -Dorg.gradle.configureondemand=false`를 적용했습니다.

