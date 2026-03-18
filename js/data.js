/* ============================================
   data.js - 공지 데이터 (API 연동 v2)
   Campus Smart Hub v2
   
   변경사항:
   - 가짜 마감일(deadline) 제거: API 데이터는 deadline 없음
   - 공지 본문+이미지 Worker에서 가져오기 (상세 API)
   - 학사일정 데이터 추가
   ============================================ */

/* ─── API 설정 ─── */
const API_BASE_URL = 'https://campus-smart-hub-api.lsch4435.workers.dev';

const CACHE_KEY = 'csh_notices_cache_v2';
const CACHE_DURATION = 10 * 60 * 1000; // 10분

/* ─── 상태 관리 ─── */
let notices = [];
let isLiveData = false;
let dataLoadPromise = null;
let dataReady = false;

/* ─── 공지 상세 캐시 ─── */
const detailCache = {};

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

/* ─── 학사일정 데이터 (2026학년도 1학기) ─── */
const ACADEMIC_CALENDAR = [
  { title: '수업 시작', date: '2026-03-02', type: 'academic' },
  { title: '수강신청 정정 기간 시작', date: '2026-03-09', type: 'academic' },
  { title: '수강신청 정정 마감', date: '2026-03-13', type: 'deadline' },
  { title: '1/4선 (등록금 3/4 환불)', date: '2026-03-27', type: 'deadline' },
  { title: '중간고사 시작', date: '2026-04-20', type: 'exam' },
  { title: '중간고사 종료', date: '2026-04-25', type: 'exam' },
  { title: '2/4선 (등록금 2/4 환불)', date: '2026-04-27', type: 'deadline' },
  { title: '수업일수 2/3선', date: '2026-05-22', type: 'deadline' },
  { title: '기말고사 시작', date: '2026-06-15', type: 'exam' },
  { title: '기말고사 종료', date: '2026-06-20', type: 'exam' },
  { title: '성적 입력 마감', date: '2026-06-27', type: 'deadline' },
  { title: '여름방학 시작', date: '2026-06-28', type: 'academic' },
  { title: '성적 열람 및 이의신청', date: '2026-07-01', type: 'academic' },
  { title: '계절학기 시작', date: '2026-07-06', type: 'academic' },
];

/* ─── 셔틀버스 시간표 ─── */
const SHUTTLE_SCHEDULE = {
  '수원역 → 학교': {
    icon: '🚌',
    times: [
      { time: '07:50', note: '첫차' },
      { time: '08:10', note: '' },
      { time: '08:30', note: '' },
      { time: '08:50', note: '' },
      { time: '09:10', note: '' },
      { time: '09:50', note: '' },
      { time: '10:30', note: '' },
      { time: '11:10', note: '' },
      { time: '12:30', note: '' },
      { time: '13:10', note: '' },
      { time: '13:50', note: '' },
      { time: '14:30', note: '' },
    ]
  },
  '학교 → 수원역': {
    icon: '🏫',
    times: [
      { time: '12:10', note: '' },
      { time: '13:00', note: '' },
      { time: '14:00', note: '' },
      { time: '15:00', note: '' },
      { time: '15:40', note: '' },
      { time: '16:20', note: '' },
      { time: '17:00', note: '' },
      { time: '17:40', note: '' },
      { time: '18:20', note: '' },
      { time: '19:10', note: '막차' },
    ]
  },
  '오산역/병점역 → 학교': {
    icon: '🚍',
    times: [
      { time: '08:00', note: '오산역 출발' },
      { time: '08:30', note: '병점역 출발' },
      { time: '09:00', note: '오산역 출발' },
      { time: '10:00', note: '오산역 출발' },
      { time: '13:00', note: '오산역 출발' },
    ]
  },
  '학교 → 오산역/병점역': {
    icon: '🏠',
    times: [
      { time: '15:00', note: '' },
      { time: '17:00', note: '' },
      { time: '18:30', note: '' },
      { time: '19:30', note: '막차' },
    ]
  }
};

/* ─── 샘플 데이터 (오프라인 폴백용) ─── */
const SAMPLE_NOTICES = [
  {
    id: "sample-1",
    title: "2026학년도 1학기 수강신청 정정 안내",
    category: "학사",
    date: "2026-03-10",
    pinned: true,
    summary: "수강신청 정정 기간은 3월 9일(월) ~ 3월 13일(금)입니다.",
    content: "수강신청 정정 기간: 2026년 3월 9일(월) ~ 3월 13일(금)\n\n정정 가능 시간: 09:00 ~ 18:00\n\n정정 방법:\n1. 학사정보시스템 접속\n2. 수강신청 메뉴 선택\n3. 과목 추가 또는 삭제\n\n유의사항:\n- 학점 제한: 최대 21학점\n- 폐강 과목 확인 필수\n\n문의: 학사지원팀 (031-379-0114)",
    keywords: ["수강신청", "정정", "학사"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-2",
    title: "2026학년도 1학기 국가장학금 신청 안내",
    category: "장학",
    date: "2026-03-05",
    pinned: true,
    summary: "한국장학재단 국가장학금 신청 기간입니다.",
    content: "2026학년도 1학기 국가장학금 신청\n\n신청 기간: 2026년 3월 5일 ~ 3월 20일\n대상: 재학생 전원 (휴학생 제외)\n\n신청 방법: 한국장학재단 홈페이지\n\n문의: 장학팀 (031-379-0114)",
    keywords: ["장학금", "국가장학금", "장학"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-3",
    title: "2026학년도 기숙사 입사 안내",
    category: "일반",
    date: "2026-02-28",
    pinned: false,
    summary: "1학기 기숙사 입사 일정입니다.",
    content: "기숙사 입사 안내\n\n입사 기간: 2026년 3월 1일 ~ 3월 2일\n배정 확인: 기숙사 홈페이지\n\n문의: 기숙사 관리팀 (031-379-0114)",
    keywords: ["기숙사", "입사", "생활관"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-4",
    title: "2026학년도 1학기 학사일정 안내",
    category: "학사",
    date: "2026-02-25",
    pinned: true,
    summary: "2026학년도 1학기 주요 학사일정을 안내합니다.",
    content: "수업 시작: 3월 2일\n중간고사: 4월 20일~25일\n기말고사: 6월 15일~20일\n여름방학: 6월 28일\n\n문의: 학사지원팀 (031-379-0114)",
    keywords: ["학사일정", "일정", "중간고사", "기말고사"],
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
    // v2: deadline 제거 - API 데이터에는 실제 마감일 정보 없음
    pinned: false,
    summary: apiNotice.title,
    content: apiNotice.title, // 본문은 상세 API에서 별도 로드
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
    '셔틀': ['셔틀', '통학'],
    '버스': ['셔틀버스', '통학'],
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
    const cached = getCachedNotices();
    if (cached) {
      notices = cached;
      isLiveData = true;
      dataReady = true;
      updateDataSourceIndicator(true, '캐시');
      console.log('[CSH] 캐시된 공지 로드:', notices.length, '건');
      return notices;
    }

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

/* ─── 공지 상세 본문+이미지 가져오기 ─── */
async function fetchNoticeDetail(noticeUrl) {
  if (!noticeUrl || noticeUrl === '#') return null;
  if (detailCache[noticeUrl]) return detailCache[noticeUrl];

  try {
    const response = await fetch(API_BASE_URL + '/api/notice-detail?url=' + encodeURIComponent(noticeUrl), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error('HTTP ' + response.status);

    const result = await response.json();
    if (result.success) {
      detailCache[noticeUrl] = result;
      return result;
    }
    return null;
  } catch (error) {
    console.warn('[CSH] 상세 로드 실패:', error.message);
    return null;
  }
}

/* ─── 데이터 소스 표시 뱃지 ─── */
function updateDataSourceIndicator(isLive, mode) {
  const existing = document.getElementById('dataSourceBadge');
  if (existing) existing.remove();

  const badge = document.createElement('span');
  badge.id = 'dataSourceBadge';
  badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:0.7rem;font-weight:600;margin-left:8px;letter-spacing:0.02em;vertical-align:middle;';

  if (isLive) {
    badge.style.background = 'var(--color-primary-light)';
    badge.style.color = 'var(--color-primary)';
    badge.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:var(--color-primary);display:inline-block;"></span> LIVE' + (mode ? ' (' + mode + ')' : '');
  } else {
    badge.style.background = '#fef3e2';
    badge.style.color = '#e67e22';
    badge.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#e67e22;display:inline-block;"></span> 샘플 데이터';
  }

  const logo = document.querySelector('.nav-logo');
  if (logo) logo.appendChild(badge);
}

/* ─── 새 공지 알림 체크 ─── */
const LAST_SEEN_KEY = 'csh_last_seen_ids';

function getLastSeenIds() {
  try { return JSON.parse(localStorage.getItem(LAST_SEEN_KEY)) || []; }
  catch { return []; }
}

function setLastSeenIds(ids) {
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(ids));
}

function checkForNewNotices(currentNotices) {
  const lastSeen = getLastSeenIds();
  if (lastSeen.length === 0) {
    // 첫 방문 시 현재 ID 저장만
    setLastSeenIds(currentNotices.map(n => String(n.id)));
    return [];
  }

  const newNotices = currentNotices.filter(n => !lastSeen.includes(String(n.id)));
  if (newNotices.length > 0) {
    setLastSeenIds(currentNotices.map(n => String(n.id)));
  }
  return newNotices;
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
