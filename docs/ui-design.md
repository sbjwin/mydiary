# 🎨 MyDiary 모바일 UI 디자인 시스템 및 컴포넌트 표준 (UI Design)

> **문서 목적**: MyDiary 모바일 앱의 시각적 일관성과 사용자 경험(UX) 품질을 보장하기 위한 디자인 시스템 가이드라인입니다.  
> **최종 갱신일**: 2026-10-21  
> **총괄 관리자**: 성백진 (`Sung Baekjin` / `sbjwin4271@gmail.com`)

---

## 1. 디자인 토큰 준수 (`src/theme.js`)

* 컴포넌트 내에 임의의 색상 코드(예: `#4a7c92` 직접 작성)나 마진/패딩 수치를 하드코딩하지 않고, 반드시 `src/theme.js`의 `theme` 객체를 임포트하여 사용합니다.
* **주요 색상 팔레트**:
  * `primary`: `#4a7c92` (메인 테마 블루)
  * `surface`: `#f7fafd` (화면 기본 배경색)
  * `surfaceVariant`: `#f1f4f7` (카드 및 컨테이너 배경색)
  * `outline`: `#d7dade` (구분선 및 테두리 보더)
  * `textPrimary`: `#1a1c1e` (본문 기본 텍스트)
  * `textSecondary`: `#44474e` (보조 설명 텍스트)
  * `error`: `#ba1a1a` (에러 및 삭제 경고 색상)
* **둥근 모서리(Roundness)**: 카드는 기본 `roundness: 12` 기준을 통일되게 적용합니다.

---

## 2. 타이포그래피 및 레이아웃 표준

* **폰트/텍스트 계층**: 헤더(Title 18~20pt, Bold), 카드 제목(16pt, Semi-bold), 본문(14pt), 부가정보(12pt)의 시각적 위계를 유지합니다.
* **Safe Area 준수**: 상단 노치 및 하단 제스처 바와의 겹침을 방지하기 위해 `SafeAreaView` 또는 `react-native-safe-area-context`를 적절히 활용합니다.
* **터치 영역**: 모든 버튼과 터치 가능한 컴포넌트는 최소 44x44 dp 이상의 터치 영역을 확보하여 모바일 터치 편의성을 보장합니다.

---

## 3. 모달 및 다이얼로그 디자인

* 화면을 덮는 모달은 반투명 배경(Backdrop: `rgba(0,0,0,0.5)`)과 중앙/하단 시트 형태를 유지합니다.
* '확인/저장' 버튼은 `theme.colors.primary`, '취소/닫기' 버튼은 `theme.colors.textSecondary` 또는 outline 스타일을 적용하여 직관성을 확보합니다.
