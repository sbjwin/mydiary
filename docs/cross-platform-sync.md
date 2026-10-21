# 🔄 크로스플랫폼(모바일 ↔ 데스크톱) 상호 동기화 거버넌스 규칙 (Cross-Platform Sync)

> **문서 목적**: 스마트폰 앱(`mydiary`)과 데스크톱 앱(`mydiary-desktop`) 간의 기능 연동 시 준수해야 하는 **양방향 동기화 및 플랫폼 고유 영역 보호 규칙**입니다.  
> **최종 갱신일**: 2026-10-21  
> **총괄 관리자**: 성백진 (`Sung Baekjin` / `sbjwin4271@gmail.com`)

---

## 1. 기본 원칙 (Core Principles)

1. **양방향 상호 전파 (Bi-directional Propagation)**:
   - 스마트폰(`mydiary`)에서 공통 비즈니스 로직을 개선하면, 데스크톱(`mydiary-desktop`)에도 동일한 논리와 정책이 누락 없이 반영되어야 합니다.
   - 데스크톱(`mydiary-desktop`)에서 개선이 발생한 경우에도 스마트폰(`mydiary`)에 해당 비즈니스 로직이 동등하게 이식되어야 합니다.

2. **플랫폼 고유 영역의 엄격한 독립성 보존 (Strict Platform Boundary)**:
   - 두 플랫폼의 구조적 차이를 절대 훼손하지 않으며, 한 플랫폼의 고유 I/O나 UI 메커니즘을 상대 플랫폼에 강제로 이식하는 행위를 엄격히 금지합니다.

3. **작업 완료 시 한국어 Git 커밋 & 푸시 강제**:
   - 연동 작업 및 개별 작업 완료 보고 시 반드시 한국어 커밋 메시지가 포함된 Git 명령어를 제공하고, 요청 시 실행합니다.

---

## 2. 동기화 필수 대상 (공통 코어 비즈니스 영역)

다음 영역에 변경이 발생하면 상대 프로젝트에 반드시 연동을 검토하고 반영해야 합니다:

| 파일 / 영역 | 공통 동기화 내용 |
| :--- | :--- |
| **`Database.js` 비즈니스 로직** | • 주간시간표(WeeklyPlan) 주차별 독립 저장 및 중복 방지 알고리즘<br>• 학생 등록 차수(Terms) 정규화 및 수강일 계산 로직<br>• 데이터 스키마 속성명 및 백업 JSON 호환성 규격 |
| **`PrintService.js`** | • 주간 보고서 및 수업 일지 HTML 마크업 템플릿 구조<br>• 표 서식, 레이아웃 규격, 폰트 및 스타일 토큰 |
| **`HwpxExportService.js`** | • 한글 2020 OWPML 표준 XML 태그 구조 (`secPr`, `colPr`, `subList` 등)<br>• 표 속성, 셀 여백, 글자 모양 ID 매핑 |
| **`DocxExportService.js`** | • MS Word OpenXML 구조, 표 테이블 셀 스타일, 단락 간격 |

---

## 3. 동기화 절대 금지 대상 (플랫폼 고유 영역)

### 📱 스마트폰 (`mydiary`) 고유 영역 (침범 금지)
- **UI 렌더링**: React Native 컴포넌트 (`<View>`, `<Text>`, `<ScrollView>`, `<TouchableOpacity>` 등)
- **로컬 저장소**: `@react-native-async-storage/async-storage` (앱 샌드박스 내부 저장)
- **파일 내보내기/공유**: `expo-sharing` (OS 모바일 공유창 팝업), `expo-print`
- **인증 및 네이티브**: React Native Google Sign-In SDK, SafeAreaView, 모바일 터치 인터랙션
- **파일 I/O**: 모바일 환경에서는 사용자가 임의의 PC 폴더 경로를 지정할 수 없으므로, 로컬 파일 탐색기 저장 방식을 모바일에 강제하지 않음.

### 💻 데스크톱 (`mydiary-desktop`) 고유 영역 (침범 금지)
- **UI 렌더링**: React Web DOM (표준 HTML `<div>`, `<table>`, `<input>`, 일반 CSS)
- **로컬 저장소 / 설정**: `LocalStorage`, Electron 설정 스토리지
- **파일 내보내기/저장**: Electron IPC 기반 파일 시스템 I/O (`fs`), Windows 탐색기 직접 저장 다이얼로그 (`dialog.showSaveDialog`)
- **윈도우 제어**: 창 최소화/최대화/닫기, 시스템 트레이, 단축키, SmartScreen 서명
- **대화면 UX**: 마우스 호버 효과, 넓은 데스크톱 모니터용 그리드/테이블 레이아웃
