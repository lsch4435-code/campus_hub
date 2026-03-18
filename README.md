[README.md](https://github.com/user-attachments/files/26074453/README.md)
# Campus Smart Hub v2 🎓

한신대학교 캠퍼스 생활 도우미 웹사이트 (업그레이드 버전)

## v2 변경사항

### 🎨 한신대 보라색 테마 + 다크모드
- 한신대학교 아이덴티티 컬러(보라색) 기반 테마
- 다크모드 지원 (시스템 설정 자동 감지 + 수동 전환)
- 모든 페이지에서 통일된 보라색 테마 적용

### 📄 공지 본문+이미지 상세 보기
- Worker API에 `/api/notice-detail` 엔드포인트 추가
- 공지 클릭 시 모달에서 본문 전체 텍스트 + 첨부 이미지 표시
- 로딩 스피너 → 콘텐츠 표시 UX

### 🚫 가짜 마감일 제거
- API 데이터에 실제 마감일 정보가 없으므로 가짜 deadline 제거
- deadline이 있는 공지만 D-day 표시
- 홈 화면: "마감 임박" → "최신 공지"로 변경

### 📅 시간표 등록 기능 (신규)
- `/timetable.html` 페이지 신규
- 과목명, 교수명, 강의실, 요일, 시간 입력
- 시각적 시간표 그리드 (색상 자동 배정)
- 수업 클릭으로 삭제 (localStorage 저장)

### 🎓 학사일정 캘린더 자동등록
- 캘린더 페이지에 2026학년도 1학기 학사일정 섹션
- 개별 등록 또는 "전체 일괄 등록" 버튼
- 중간고사, 기말고사, 수강정정 등 주요 일정 포함

### 🚌 셔틀버스 시간표 (신규)
- `/shuttle.html` 페이지 신규
- 수원역, 오산역/병점역 노선 시간표
- "다음 버스" 자동 하이라이트 (잔여 시간 표시)
- 1분마다 자동 갱신

### 🔔 브라우저 새 공지 알림
- Web Notification API 활용
- "알림 받기" 버튼으로 권한 요청
- 새 공지 감지 시 브라우저 푸시 알림
- 페이지 내 알림 배너도 표시
- 카카오톡 등 모바일 알림보다 브라우저 알림이 웹앱에 적합

## 기술 스택

- **프론트엔드**: 순수 HTML/CSS/JS (프레임워크 없음)
- **백엔드**: Cloudflare Workers
- **데이터**: 한신대학교 홈페이지 실시간 스크래핑
- **저장소**: localStorage (시간표, 북마크, 일정, 알림설정)
- **배포**: GitHub Pages (프론트) + Cloudflare Workers (API)

## 파일 구조

```
├── index.html          # 홈
├── notices.html        # 공지사항
├── calendar.html       # 캘린더 + 학사일정
├── timetable.html      # 시간표 (v2 신규)
├── shuttle.html        # 셔틀버스 (v2 신규)
├── ask.html            # 질문하기
├── bookmarks.html      # 북마크
├── css/
│   └── style.css       # 보라색 테마 + 다크모드
├── js/
│   ├── data.js         # API 연동 + 학사일정/셔틀 데이터
│   ├── common.js       # 공통 유틸 + 다크모드 + 알림
│   ├── home.js         # 홈페이지
│   ├── notices.js      # 공지 목록
│   ├── calendar.js     # 캘린더 + 학사일정 등록
│   ├── timetable.js    # 시간표 관리 (v2 신규)
│   ├── shuttle.js      # 셔틀버스 (v2 신규)
│   ├── search.js       # 질문 검색
│   └── bookmark.js     # 북마크
├── api/
│   └── worker.js       # Cloudflare Worker (v2: notice-detail 추가)
└── wrangler.toml
```

## Worker 배포

```bash
npx wrangler deploy
```

## API 엔드포인트

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/notices?category=all` | 전체 공지 목록 |
| `GET /api/notices?category=학사` | 카테고리별 공지 |
| `GET /api/notice-detail?url=<URL>` | 공지 본문+이미지 (v2) |
| `GET /api/health` | 헬스체크 |

## Worker URL
`https://campus-smart-hub-api.lsch4435.workers.dev`

## GitHub
`https://github.com/lsch4435-code/campus_hub`
