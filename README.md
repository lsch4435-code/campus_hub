[README.md](https://github.com/user-attachments/files/26075568/README.md)
# Campus Smart Hub v2.1 🎓

한신대학교 캠퍼스 생활 도우미 웹사이트

## 주요 기능

- **보라색 테마 + 다크모드**: 한신대 아이덴티티 컬러, 시스템 연동 + 수동 전환
- **실시간 공지**: Worker API에서 한신대 공지 스크래핑, 모달에서 본문+이미지 바로 표시
- **시간표**: 과목 등록/관리, 시각적 그리드, 겹침 체크
- **셔틀버스**: 병점역/청명역/고색역/수원역/동탄역 5개 노선, 요일별 시간, 다음 버스 하이라이트
- **학식 메뉴**: 공지에서 식단 관련 공지를 자동 탐색, 본문+이미지 표시
- **학사일정 캘린더 등록**: 중간/기말고사 등 주요 일정 개별/일괄 등록
- **브라우저 알림**: Web Notification API로 새 공지 푸시 알림
- **질문 검색**: 키워드 기반 공지 검색
- **북마크**: 중요 공지 저장

## 파일 구조

```
├── index.html          # 홈
├── notices.html        # 공지사항
├── calendar.html       # 캘린더 + 학사일정
├── timetable.html      # 시간표
├── shuttle.html        # 셔틀버스
├── meal.html           # 학식 메뉴
├── ask.html            # 질문하기
├── bookmarks.html      # 북마크
├── css/style.css
├── js/ (data, common, home, notices, calendar, timetable, shuttle, meal, search, bookmark)
├── api/worker.js       # Cloudflare Worker
└── wrangler.toml
```

## API 엔드포인트

| 엔드포인트 | 설명 |
|---|---|
| `GET /api/notices?category=all` | 전체 공지 목록 |
| `GET /api/notice-detail?url=<URL>` | 공지 본문+이미지 |
| `GET /api/meal` | 학식 메뉴 (식단 공지 자동 탐색) |
| `GET /api/health` | 헬스체크 |

## 배포

```bash
# Worker 배포
npx wrangler deploy

# 프론트엔드: GitHub Pages 또는 정적 호스팅
```

Worker URL: `https://campus-smart-hub-api.lsch4435.workers.dev`
GitHub: `https://github.com/lsch4435-code/campus_hub`
