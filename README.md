# 🎓 Campus Smart Hub - 대학생 생활 도우미

대학생들이 학교 공지를 확인하고, 질문을 통해 필요한 정보를 찾고, 중요한 일정을 캘린더에 추가하여 관리할 수 있는 웹 애플리케이션입니다.

## 📸 스크린샷

| 홈 | 공지사항 | 질문하기 | 캘린더 |
|---|---|---|---|
| 마감 임박 공지, 오늘 일정 미리보기 | 카테고리 필터, 검색, D-day 표시 | 키워드 기반 공지 검색 | 월간 캘린더, 일정 추가/삭제 |

## ✨ 주요 기능

### 1. 학교 공지 목록
- 카드 기반 UI로 공지 표시
- 카테고리 필터 (학사 / 장학 / 기숙사 / 취업)
- 키워드 검색
- 중요 공지 상단 고정 (📌)
- 공지 클릭 시 상세 모달

### 2. 질문 기반 공지 검색
- 자연어 질문 입력 → 관련 공지 추천
- 키워드 추출 및 매칭 알고리즘
- 추천 질문 버튼 제공

### 3. 캘린더 일정 관리
- 월간 캘린더 UI
- 날짜 클릭 → 일정 추가/삭제
- LocalStorage 저장

### 4. 공지 → 캘린더 연동
- 공지 카드의 📅 버튼 클릭 → 캘린더 자동 등록
- 모달에서도 캘린더 추가 가능

### 5. D-day 표시
- 마감일 기준 D-day 자동 계산
- 긴급(D-3 이내), 임박(D-7 이내) 표시

### 6. 북마크
- ☆ 버튼으로 공지 저장
- 북마크 페이지에서 목록 확인
- LocalStorage 저장

## 🛠 기술 스택

- **HTML5** - 시맨틱 마크업
- **CSS3** - 반응형 디자인, CSS 변수, 트랜지션/애니메이션
- **Vanilla JavaScript** - 프레임워크 없이 순수 JS로 구현
- **LocalStorage** - 클라이언트 사이드 데이터 저장

## 📁 프로젝트 구조

```
campus-smart-hub/
│
├── index.html          # 홈 페이지
├── notices.html        # 공지사항 페이지
├── ask.html            # 질문하기 페이지
├── calendar.html       # 캘린더 페이지
├── bookmarks.html      # 북마크 페이지
│
├── css/
│   └── style.css       # 전체 스타일시트
│
├── js/
│   ├── data.js         # 공지 데이터 및 추천 질문
│   ├── common.js       # 공통 유틸리티 (네비게이션, 토스트, 북마크, 캘린더 API)
│   ├── notices.js      # 공지 목록 페이지 로직
│   ├── search.js       # 질문 검색 페이지 로직
│   ├── calendar.js     # 캘린더 페이지 로직
│   ├── bookmark.js     # 북마크 페이지 로직
│   └── home.js         # 홈 페이지 로직
│
└── README.md           # 프로젝트 설명
```

### 파일별 역할

| 파일 | 역할 |
|---|---|
| `css/style.css` | 전체 디자인, 반응형 레이아웃, 애니메이션 |
| `js/data.js` | 공지 데이터 배열, 추천 질문 목록 |
| `js/common.js` | 네비게이션, 토스트 알림, D-day 계산, 북마크/캘린더 LocalStorage 관리, 모달 |
| `js/notices.js` | 공지 필터링, 검색, 정렬 로직 |
| `js/search.js` | 키워드 추출, 매칭 점수 계산, 검색 결과 표시 |
| `js/calendar.js` | 월간 캘린더 렌더링, 일정 CRUD |
| `js/bookmark.js` | 북마크 목록 표시, 실시간 동기화 |
| `js/home.js` | 마감 임박 공지, 오늘 일정 미리보기 |

## 🚀 실행 방법

### 로컬 실행
1. 저장소를 클론합니다:
   ```bash
   git clone https://github.com/YOUR_USERNAME/campus-smart-hub.git
   ```
2. 프로젝트 폴더에서 `index.html`을 브라우저로 엽니다.

### GitHub Pages 배포
1. GitHub에 저장소를 생성합니다.
2. 프로젝트 파일을 push합니다:
   ```bash
   cd campus-smart-hub
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/campus-smart-hub.git
   git push -u origin main
   ```
3. GitHub 저장소 → **Settings** → **Pages**
4. Source를 **Deploy from a branch** → **main** / **/(root)** 선택
5. Save 클릭 → 몇 분 후 `https://YOUR_USERNAME.github.io/campus-smart-hub/` 에서 확인

## 📱 반응형 디자인

- 데스크톱 (1120px+): 2~3열 그리드
- 태블릿 (768px~): 2열 그리드
- 모바일 (~768px): 1열 + 햄버거 메뉴

## 🎨 디자인 컨셉

- **Notion / Medium 스타일**의 클린한 UI
- 따뜻한 오프화이트 배경 + 그린 계열 포인트 컬러
- Outfit + Noto Sans KR 폰트 조합
- 카드 기반 레이아웃, 부드러운 hover 트랜지션

## 📄 라이선스

이 프로젝트는 학습 목적으로 제작되었습니다.
