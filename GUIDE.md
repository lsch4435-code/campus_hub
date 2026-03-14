[GUIDE.md](https://github.com/user-attachments/files/25977817/GUIDE.md)
# 🏗️ Campus Smart Hub - 실시간 한신대 공지 연동 가이드

## 📌 1. 왜 현재 방식이 안 되는가?

### CORS (Cross-Origin Resource Sharing) 문제

브라우저에는 **동일 출처 정책(Same-Origin Policy)**이라는 보안 규칙이 있습니다.

```
너의 GitHub Pages 사이트:  https://username.github.io
한신대 사이트:              https://www.hs.ac.kr
```

이 두 도메인은 **출처(origin)가 다르므로**, 브라우저는 `fetch()`로 한신대 사이트의 HTML을 직접 가져오는 것을 차단합니다.

한신대 서버가 응답 헤더에 `Access-Control-Allow-Origin: *`를 포함하지 않기 때문에, **프론트엔드(JavaScript)에서 직접 한신대 공지를 가져오는 것은 불가능**합니다. 이것은 해킹이나 버그가 아니라, 웹 보안의 정상적인 동작입니다.


## 📌 2. 가능한 대안 비교

| 방식 | 난이도 | 비용 | 실시간성 | 추천도 |
|------|--------|------|----------|--------|
| ① **Cloudflare Workers** | ⭐⭐ | 무료 (일 10만 요청) | ⬆ 실시간 | ⭐⭐⭐ **최추천** |
| ② GitHub Actions + 정적 JSON | ⭐⭐ | 무료 | 🔄 주기적 (1시간~) | ⭐⭐ |
| ③ Vercel Serverless Functions | ⭐⭐⭐ | 무료 (제한적) | ⬆ 실시간 | ⭐⭐ |

### ① Cloudflare Workers (최추천)

**작동 원리:**
```
[사용자 브라우저] → [Cloudflare Worker] → [한신대 서버]
                 ←  JSON 응답 반환    ←  HTML 가져옴
```

브라우저 → Worker: CORS 문제 없음 (Worker가 CORS 헤더를 추가)
Worker → 한신대: 서버-서버 통신이므로 CORS 제한 없음

**장점:** 실시간, 무료, 빠름 (전세계 CDN), 설정 간단
**단점:** Cloudflare 계정 필요

### ② GitHub Actions + 정적 JSON

**작동 원리:**
1. GitHub Actions가 매시간 자동 실행
2. Python 스크립트로 한신대 공지 스크래핑
3. 결과를 `notices.json`으로 저장 → GitHub Pages에서 제공

**장점:** GitHub만으로 완결, 별도 서비스 불필요
**단점:** 실시간이 아님 (최소 1시간 간격), Actions 무료 시간 제한

### ③ Vercel Serverless Functions

Cloudflare Workers와 유사하지만 Vercel 플랫폼 사용.

**단점:** 프로젝트를 Vercel에 배포해야 해서 구조 변경이 큼.


## 📌 3. 추천 방식: Cloudflare Workers

## 📁 전체 프로젝트 구조

```
campus-smart-hub/
│
├── index.html              # 홈 (변경: 한신대 언급)
├── notices.html            # 공지 (변경: 필터 카테고리 추가)
├── ask.html                # 질문하기
├── calendar.html           # 캘린더
├── bookmarks.html          # 북마크
│
├── css/
│   └── style.css           # 스타일 (변경: 새 카테고리 추가)
│
├── js/
│   ├── data.js             # ⭐ 핵심 변경: API fetch + 폴백 로직
│   ├── common.js           # ⭐ 변경: async 대기, 외부 링크 지원
│   ├── notices.js          # 변경: async 대기
│   ├── search.js           # 변경: async 대기
│   ├── calendar.js         # (변경 없음)
│   ├── bookmark.js         # 변경: async 대기
│   └── home.js             # 변경: async 대기
│
├── api/
│   └── worker.js           # ⭐ 새파일: Cloudflare Worker 코드
│
├── wrangler.toml            # ⭐ 새파일: Worker 배포 설정
├── GUIDE.md                 # ⭐ 이 문서
└── README.md
```


## 📌 4. 배포 단계별 가이드

### Step 1: Cloudflare 계정 생성

1. https://dash.cloudflare.com/sign-up 접속
2. 이메일, 비밀번호로 가입 (무료)
3. 이메일 인증 완료

### Step 2: Wrangler CLI 설치

터미널(명령 프롬프트)에서:

```bash
# Node.js가 설치되어 있어야 합니다 (https://nodejs.org)
npm install -g wrangler
```

### Step 3: Cloudflare 로그인

```bash
wrangler login
```
브라우저가 열리면 Cloudflare 계정으로 로그인합니다.

### Step 4: Worker 배포

프로젝트 폴더에서:

```bash
cd campus-smart-hub
wrangler deploy
```

배포 성공 시 URL이 출력됩니다:
```
Published campus-smart-hub-api (1.2 sec)
  https://campus-smart-hub-api.YOUR_NAME.workers.dev
```

**이 URL을 기억하세요!** 다음 단계에서 사용합니다.

### Step 5: 프론트엔드에 API URL 설정

`js/data.js` 파일을 열고, 맨 위의 API URL을 수정합니다:

```javascript
// 변경 전:
const API_BASE_URL = 'https://campus-smart-hub-api.YOUR_NAME.workers.dev';

// 변경 후 (실제 URL로 교체):
const API_BASE_URL = 'https://campus-smart-hub-api.홍길동.workers.dev';
```

### Step 6: GitHub에 Push

```bash
git add .
git commit -m "feat: 한신대 실시간 공지 API 연동"
git push
```

### Step 7: 동작 확인

1. GitHub Pages URL 접속
2. 네비게이션 바에 **🟢 LIVE (실시간)** 뱃지가 보이면 성공!
3. **🟠 샘플 데이터** 뱃지가 보이면 API 연결 실패 → API URL 확인


## 📌 5. 핵심 변경 파일 설명

### `js/data.js` — 가장 중요한 변경

**기존:** `const notices = [...]` (하드코딩된 샘플 데이터)

**변경 후:**
1. `loadNotices()` 비동기 함수가 API에서 데이터를 가져옴
2. 성공하면 실시간 데이터 사용 → sessionStorage에 10분간 캐시
3. 실패하면 내장된 샘플 데이터로 폴백
4. 데이터 소스를 UI 뱃지(LIVE/샘플)로 표시
5. 로드 완료 시 `noticesLoaded` 커스텀 이벤트 발생

### `js/common.js` — 비동기 대기 + 외부 링크

**추가된 것:**
- `waitForNotices()`: 데이터 로드가 끝날 때까지 기다리는 Promise
- 모달에 **"한신대학교 원문 공지 보기"** 링크 추가
- 문자열 ID 지원 (API 데이터의 id는 `"143-12345"` 형식)

### `api/worker.js` — Cloudflare Worker

한신대 공지사항 페이지의 HTML을 가져와서 파싱합니다:
- 학사공지 (bbs ID: 143)
- 일반공지 (bbs ID: 24)  
- 장학공지 (bbs ID: 273)
- 혁신공지 (bbs ID: 2015)


## 📌 6. API 사용법

### 전체 공지 가져오기
```
GET https://campus-smart-hub-api.YOUR_NAME.workers.dev/api/notices?category=all
```

### 특정 카테고리만
```
GET .../api/notices?category=학사
GET .../api/notices?category=장학
```

### 응답 형식
```json
{
  "success": true,
  "count": 30,
  "notices": [
    {
      "id": "143-212237",
      "title": "[대학행정팀] 다전공길잡이 배부안내",
      "category": "학사",
      "date": "2026-03-12",
      "url": "https://www.hs.ac.kr/bbs/kor/143/212237/artclView.do"
    }
  ],
  "fetchedAt": "2026-03-12T10:30:00.000Z"
}
```


## 📌 7. 프론트엔드 데이터 흐름도

```
페이지 로드
    │
    ▼
data.js: loadNotices()
    │
    ├── sessionStorage 캐시 있음? ──→ 캐시 데이터 사용
    │                                     │
    ├── API fetch 시도 ────────────→ 성공 → 데이터 변환 + 캐시 저장
    │                                     │
    └── API 실패 ──────────────────→ 샘플 데이터 폴백
                                          │
                                          ▼
                              notices 배열에 데이터 저장
                                          │
                                          ▼
                           'noticesLoaded' 이벤트 발생
                                          │
                    ┌───────────┬──────────┼──────────┐
                    ▼           ▼          ▼          ▼
              home.js     notices.js   search.js  bookmark.js
              렌더링        렌더링       대기        렌더링
```


## 📌 8. 질문형 검색이 실제 데이터에서 작동하는 방식

`search.js`의 키워드 매칭 로직은 변경 없이 그대로 동작합니다.

**비결:** `data.js`의 `extractKeywordsFromTitle()` 함수가 API에서 가져온 실제 공지 제목을 분석하여 자동으로 키워드를 생성합니다.

예를 들어 실제 공지 제목이:
```
[대학혁신지원사업/교수학습지원센터] 2026-1학기 스터디그룹, 튜터링 모집
```

이면 자동으로 다음 키워드가 생성됩니다:
```
["스터디", "학습", "튜터링"]
```

이후 사용자가 "스터디 어떻게 신청해?" 라고 질문하면, `search.js`가 "스터디"와 "신청" 키워드를 추출하고, 위 공지와 매칭시킵니다.


## 📌 9. 자주 묻는 질문

**Q: Worker 배포 후에도 "샘플 데이터"가 표시됩니다.**
A: `js/data.js`의 `API_BASE_URL`을 실제 Worker URL로 변경했는지 확인하세요.

**Q: 한신대 사이트 구조가 바뀌면 어떻게 되나요?**
A: `api/worker.js`의 HTML 파싱 로직을 수정해야 합니다. 하지만 한신대는 K2Web 플랫폼을 사용하므로, 기본 URL 패턴(`/bbs/{site}/{bbsId}/{artclId}/artclView.do`)은 쉽게 바뀌지 않습니다.

**Q: Cloudflare Workers 무료 플랜 한도가 있나요?**
A: 일 10만 요청까지 무료입니다. 개인 프로젝트로는 충분합니다.

**Q: API가 다운되면 사이트가 멈추나요?**
A: 아닙니다. 샘플 데이터로 자동 폴백되며, 사이트는 정상 작동합니다. 네비게이션 바의 뱃지가 "샘플 데이터"로 바뀝니다.


## 📌 10. GitHub Pages + Cloudflare Workers 최종 구조

```
GitHub Pages (프론트엔드)          Cloudflare Workers (API)
─────────────────────              ────────────────────────
username.github.io/                campus-smart-hub-api.xxx.workers.dev
  ├── index.html                     └── /api/notices?category=all
  ├── notices.html                        ↓
  ├── ask.html                    한신대 서버에서 HTML 가져옴
  ├── calendar.html                       ↓
  ├── bookmarks.html              HTML 파싱 → JSON 변환
  ├── css/style.css                       ↓
  └── js/                         프론트엔드에 JSON 응답
      ├── data.js  ──fetch──→
      ├── common.js
      └── ...
```

**두 서비스 모두 무료**이며, 별도 서버 관리가 필요 없습니다.
