/* ============================================
   data.js - 공지 데이터 (API 연동 버전)
   Campus Smart Hub
   
   동작 방식:
   1. Cloudflare Worker API에서 실제 한신대 공지를 fetchㄹ
   2. 성공 → 실시간 공지 데이터 사용
   3. 실패 → 로컬 샘플 데이터로 폴백
   4. 캐시: sessionStorage에 10분간 캐시
   ============================================ */

/* ─── API 설정 ─── */
// ⚠️ 배포 후 아래 URL을 실제 Cloudflare Worker URL로 변경하세요!
// 예: https://campus-smart-hub-api.lsch4435.workers.dev
const API_BASE_URL = 'https://github.com/cloudflare/workers-sdk/issues/new/choose';

const CACHE_KEY = 'csh_notices_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10분 (밀리초)

/* ─── 상태 관리 ─── */
let notices = [];            // 현재 활성 공지 데이터
let isLiveData = false;      // API 데이터 사용 중인지 여부
let dataLoadPromise = null;  // 데이터 로딩 Promise
let dataReady = false;       // 데이터 준비 완료 여부

/* ─── 추천 질문 데이터 ─── */
const suggestedQuestions = [
  "장학금 신청 언제야?",
  "수강신청 정정 기간 알려줘",
  "기숙사 입사 절차가 어떻게 돼?",
  "채용박람회 일정 알려줘",
  "도서관 운영시간이 어떻게 돼?",
  "동아리 모집 언제까지야?",
  "근로장학생 지원 방법 알려줘",
  "학사일정 알려줘"
];

/* ─── 샘플 데이터 (오프라인 폴백용) ─── */
const SAMPLE_NOTICES = [
  {
    id: "sample-1",
    title: "2026학년도 1학기 수강신청 정정 안내",
    category: "학사",
    date: "2026-03-10",
    deadline: "2026-03-15",
    pinned: true,
    summary: "수강신청 정정 기간은 3월 14일(토) ~ 3월 15일(일)입니다. 정정 기간에는 수강 취소 및 추가가 가능합니다.",
    content: "수강신청 정정 기간: 2026년 3월 14일(토) ~ 3월 15일(일)\n\n정정 가능 시간: 09:00 ~ 18:00\n\n정정 방법:\n1. 학사정보시스템 접속\n2. 수강신청 메뉴 선택\n3. 과목 추가 또는 삭제\n\n유의사항:\n- 학점 제한: 최대 21학점\n- 폐강 과목 확인 필수\n\n문의: 학사지원팀 (031-379-0114)",
    keywords: ["수강신청", "정정", "학사", "수강", "과목변경", "학점"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-2",
    title: "2026학년도 1학기 국가장학금 신청 안내",
    category: "장학",
    date: "2026-03-05",
    deadline: "2026-03-20",
    pinned: true,
    summary: "한국장학재단 국가장학금 신청 기간입니다. 기한 내 반드시 신청해주세요.",
    content: "2026학년도 1학기 국가장학금 신청\n\n신청 기간: 2026년 3월 5일 ~ 3월 20일\n대상: 재학생 전원 (휴학생 제외)\n\n신청 방법: 한국장학재단 홈페이지\n\n문의: 장학팀 (031-379-0114)",
    keywords: ["장학금", "국가장학금", "신청", "장학", "등록금"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-3",
    title: "2026학년도 기숙사 입사 안내",
    category: "일반",
    date: "2026-02-28",
    deadline: "2026-03-12",
    pinned: false,
    summary: "1학기 기숙사 입사 일정입니다. 배정 결과를 확인하시고 기간 내 입사 절차를 완료해주세요.",
    content: "기숙사 입사 안내\n\n입사 기간: 2026년 3월 1일 ~ 3월 2일\n배정 확인: 기숙사 홈페이지\n\n문의: 기숙사 관리팀 (031-379-0114)",
    keywords: ["기숙사", "입사", "생활관", "입실"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-4",
    title: "2026년 상반기 채용박람회 개최 안내",
    category: "일반",
    date: "2026-03-08",
    deadline: "2026-03-25",
    pinned: false,
    summary: "교내 채용박람회가 개최됩니다. 다양한 기업이 참가합니다.",
    content: "2026년 상반기 교내 채용박람회\n\n일시: 2026년 3월 25일(수) 10:00 ~ 17:00\n장소: 학생회관 대강당\n\n문의: 취업지원센터 (031-379-0114)",
    keywords: ["취업", "채용", "박람회", "면접", "기업"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-5",
    title: "중간고사 기간 도서관 연장 운영 안내",
    category: "학사",
    date: "2026-03-12",
    deadline: "2026-04-20",
    pinned: false,
    summary: "중간고사 기간 동안 중앙도서관 운영 시간이 연장됩니다.",
    content: "중간고사 기간 도서관 연장 운영\n\n기간: 4월 13일 ~ 4월 20일\n운영 시간: 06:00~24:00\n\n문의: 도서관 (031-379-0114)",
    keywords: ["도서관", "중간고사", "열람실", "시험", "연장"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-6",
    title: "교내 동아리 신규 모집 안내",
    category: "일반",
    date: "2026-03-07",
    deadline: "2026-03-18",
    pinned: false,
    summary: "2026학년도 1학기 동아리 신규 회원 모집 안내입니다.",
    content: "2026학년도 1학기 동아리 모집\n\n모집 기간: 3월 7일 ~ 3월 18일\n총 45개 동아리\n\n문의: 동아리연합회",
    keywords: ["동아리", "모집", "신규", "가입", "활동"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-7",
    title: "교내 근로장학생 추가 모집",
    category: "장학",
    date: "2026-03-11",
    deadline: "2026-03-22",
    pinned: false,
    summary: "교내 근로장학생을 추가 모집합니다.",
    content: "교내 근로장학생 추가 모집\n\n모집 기간: 3월 11일 ~ 3월 22일\n모집 인원: 50명\n시급: 10,030원\n\n문의: 장학팀 (031-379-0114)",
    keywords: ["근로장학", "장학", "근로", "아르바이트"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-8",
    title: "2026학년도 1학기 학사일정 안내",
    category: "학사",
    date: "2026-02-25",
    deadline: "2026-06-20",
    pinned: true,
    summary: "2026학년도 1학기 주요 학사일정을 안내합니다.",
    content: "수업 시작: 3월 2일\n중간고사: 4월 13일~20일\n기말고사: 6월 8일~15일\n여름방학: 6월 20일\n\n문의: 학사지원팀 (031-379-0114)",
    keywords: ["학사일정", "일정", "중간고사", "기말고사", "방학"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
];

/* ─── API 데이터 → 프론트엔드 형식 변환 ─── */
function transformApiNotice(apiNotice, index) {
  const keywords = extractKeywordsFromTitle(apiNotice.title);

  const categoryMap = { '학사': '학사', '일반': '일반', '장학': '장학', '혁신': '혁신' };
  const category = categoryMap[apiNotice.category] || '일반';

  return {
    id: apiNotice.id || ('api-' + index),
    title: apiNotice.title,
    category: category,
    date: apiNotice.date || new Date().toISOString().slice(0, 10),
    deadline: apiNotice.date || new Date().toISOString().slice(0, 10),
    pinned: false,
    summary: apiNotice.title,
    content: apiNotice.title,
    keywords: keywords,
    url: apiNotice.url || '#',
    source: apiNotice.source || 'api',
  };
}

/* ─── 제목에서 키워드 자동 추출 ─── */
function extractKeywordsFromTitle(title) {
  const keywords = [];
  const keywordMap = {
    '수강': ['수강신청', '수강', '학사'],
    '정정': ['정정', '수강신청'],
    '장학': ['장학금', '장학'],
    '국가장학': ['국가장학금', '장학금'],
    '기숙사': ['기숙사', '생활관'],
    '생활관': ['기숙사', '생활관'],
    '도서관': ['도서관', '열람실'],
    '취업': ['취업', '채용'],
    '채용': ['채용', '취업'],
    '면접': ['면접', '취업'],
    '동아리': ['동아리', '모집'],
    '근로': ['근로장학', '장학'],
    '등록금': ['등록금', '납부'],
    '성적': ['성적', '학사'],
    '졸업': ['졸업', '학사'],
    '중간고사': ['중간고사', '시험'],
    '기말고사': ['기말고사', '시험'],
    '시험': ['시험', '학사'],
    '휴학': ['휴학', '학사'],
    '복학': ['복학', '학사'],
    '학사일정': ['학사일정', '일정'],
    '방학': ['방학', '학사일정'],
    '인턴': ['인턴', '취업'],
    '공모전': ['공모전', '대외활동'],
    '특강': ['특강', '프로그램'],
    '워크숍': ['워크숍', '프로그램'],
    '스터디': ['스터디', '학습'],
    '튜터링': ['튜터링', '학습'],
    '프로그램': ['프로그램'],
  };

  const titleLower = title.toLowerCase();
  for (const [key, vals] of Object.entries(keywordMap)) {
    if (titleLower.includes(key)) {
      vals.forEach(v => { if (!keywords.includes(v)) keywords.push(v); });
    }
  }

  if (keywords.length === 0) {
    const words = title.replace(/[\[\]()]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
    keywords.push(...words.slice(0, 3));
  }

  return keywords;
}

/* ─── 캐시 관리 ─── */
function getCachedNotices() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCachedNotices(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* 무시 */ }
}

/* ─── 메인: 공지 데이터 로드 ─── */
async function loadNotices() {
  if (dataLoadPromise) return dataLoadPromise;

  dataLoadPromise = (async () => {
    // 1. 캐시 확인
    const cached = getCachedNotices();
    if (cached) {
      notices = cached;
      isLiveData = true;
      dataReady = true;
      updateDataSourceIndicator(true, '캐시');
      console.log('[CSH] 캐시된 공지 로드:', notices.length, '건');
      return notices;
    }

    // 2. API 호출 시도
    try {
      console.log('[CSH] API에서 공지 가져오는 중...');
      const response = await fetch(API_BASE_URL + '/api/notices?category=all', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);

      const result = await response.json();
      if (result.success && result.notices && result.notices.length > 0) {
        notices = result.notices.map((n, i) => transformApiNotice(n, i));
        isLiveData = true;
        dataReady = true;
        setCachedNotices(notices);
        updateDataSourceIndicator(true, '실시간');
        console.log('[CSH] ✅ 실시간 공지 로드 성공:', notices.length, '건');
        return notices;
      } else {
        throw new Error('빈 데이터');
      }
    } catch (error) {
      console.warn('[CSH] ⚠️ API 실패, 샘플 데이터 사용:', error.message);
      notices = [...SAMPLE_NOTICES];
      isLiveData = false;
      dataReady = true;
      updateDataSourceIndicator(false);
      return notices;
    }
  })();

  return dataLoadPromise;
}

/* ─── 데이터 소스 표시 뱃지 ─── */
function updateDataSourceIndicator(isLive, mode) {
  const existing = document.getElementById('dataSourceBadge');
  if (existing) existing.remove();

  const badge = document.createElement('span');
  badge.id = 'dataSourceBadge';
  badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:0.7rem;font-weight:600;margin-left:8px;letter-spacing:0.02em;vertical-align:middle;';

  if (isLive) {
    badge.style.background = '#e8f0e7';
    badge.style.color = '#2d5a27';
    badge.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#2d5a27;display:inline-block;"></span> LIVE' + (mode ? ' (' + mode + ')' : '');
  } else {
    badge.style.background = '#fef3e2';
    badge.style.color = '#e67e22';
    badge.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#e67e22;display:inline-block;"></span> 샘플 데이터';
  }

  const logo = document.querySelector('.nav-logo');
  if (logo) logo.appendChild(badge);
}

/* ─── 캐시 무시하고 새로고침 ─── */
async function refreshNotices() {
  sessionStorage.removeItem(CACHE_KEY);
  dataLoadPromise = null;
  dataReady = false;
  return await loadNotices();
}

/* ─── 초기화 ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadNotices().then(() => {
    window.dispatchEvent(new CustomEvent('noticesLoaded', {
      detail: { count: notices.length, isLive: isLiveData }
    }));
  });
});
