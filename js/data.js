/* ============================================
   data.js - 공지 데이터 (v2.1)
   Campus Smart Hub v2
   
   수정사항:
   - deadline 필드 완전 제거
   - 셔틀버스 시간표: 실제 한신대 운행표 반영
     (병점역/청명역/고색역/수원역/동탄역 5개 노선)
   - 학식 메뉴 API 연동 준비
   ============================================ */

const API_BASE_URL = 'https://campus-smart-hub-api.lsch4435.workers.dev';
const CACHE_KEY = 'csh_notices_cache_v2';
const CACHE_DURATION = 10 * 60 * 1000;

let notices = [];
let isLiveData = false;
let dataLoadPromise = null;
let dataReady = false;
const detailCache = {};

const suggestedQuestions = [
  "장학금 신청 언제야?",
  "수강신청 정정 기간 알려줘",
  "기숙사 입사 절차가 어떻게 돼?",
  "채용박람회 일정 알려줘",
  "도서관 운영시간이 어떻게 돼?",
  "동아리 모집 언제까지야?",
  "근로장학생 지원 방법 알려줘",
  "오늘 학식 메뉴 뭐야?"
];

/* ─── 학사일정 (2026학년도 1학기) ─── */
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
];

/* ─── 셔틀버스 시간표 (실제 한신대 운행표 기준, 적용일: 2025.04.14) ─── */
const SHUTTLE_SCHEDULE = {
  '병점역 → 한신대': {
    icon: '🚌',
    note: '승차: 병점역 2번 출구 육교 건너편 주머니차선 / 탑승객이 많은 시간에 운행되므로 시간이 달라질 수 있습니다',
    schedule: [
      { days: '월·수', times: ['08:45','09:05','09:10','10:30','12:15','12:30','12:40'] },
      { days: '화', times: ['08:45','09:10','10:30','12:15','12:30','12:40'] },
      { days: '목', times: ['08:45','09:10','10:30','12:15'] },
      { days: '금', times: ['09:10','10:30','12:30'] },
    ]
  },
  '청명역 → 한신대': {
    icon: '🚍',
    note: '승차: 청명역 4, 5번 출구 사이 / 정시 출발 예정이므로 미리 탑승 부탁드립니다',
    schedule: [
      { days: '월~목', times: ['08:40','10:20','12:10'] },
      { days: '금', times: ['08:40'] },
    ]
  },
  '고색역 → 한신대': {
    icon: '🚐',
    note: '승차: 고색역 4번 출구 건너편 육교 아래 / 정시 출발 예정이므로 미리 탑승 부탁드립니다',
    schedule: [
      { days: '월~목', times: ['08:40','12:10'] },
      { days: '금', times: ['08:40'] },
    ]
  },
  '수원역 → 한신대': {
    icon: '🚌',
    note: '승차: 수원역 2번 출구 환승센터 지나서 롯데몰 입구 건너 / 정시 출발 예정이므로 미리 탑승 부탁드립니다',
    schedule: [
      { days: '월~목', times: ['08:40','10:20','12:10'] },
      { days: '금', times: ['08:40'] },
    ]
  },
  '동탄역 → 한신대': {
    icon: '🚎',
    note: '동탄역 4번 출구 앞 → (경유) 모아미래도 우림필유 평생학습관 중앙 버스정류장 → 한신대',
    schedule: [
      { days: '월~금', times: ['08:40 (동탄역)', '08:50 (모아미래도)'] },
    ]
  },
};

/* ─── 샘플 데이터 (오프라인 폴백) ─── */
const SAMPLE_NOTICES = [
  {
    id: "sample-1",
    title: "2026학년도 1학기 수강신청 정정 안내",
    category: "학사",
    date: "2026-03-10",
    pinned: true,
    summary: "수강신청 정정 기간은 3월 9일(월) ~ 3월 13일(금)입니다.",
    content: "수강신청 정정 기간: 2026년 3월 9일(월) ~ 3월 13일(금)\n\n정정 가능 시간: 09:00 ~ 18:00\n\n문의: 학사지원팀 (031-379-0114)",
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
    content: "2026학년도 1학기 국가장학금 신청\n\n신청 기간: 2026년 3월 5일 ~ 3월 20일\n\n문의: 장학팀 (031-379-0114)",
    keywords: ["장학금", "국가장학금", "장학"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
  {
    id: "sample-3",
    title: "2026학년도 1학기 학사일정 안내",
    category: "학사",
    date: "2026-02-25",
    pinned: true,
    summary: "2026학년도 1학기 주요 학사일정을 안내합니다.",
    content: "수업 시작: 3월 2일\n중간고사: 4월 20일~25일\n기말고사: 6월 15일~20일\n여름방학: 6월 28일\n\n문의: 학사지원팀",
    keywords: ["학사일정", "일정", "중간고사", "기말고사"],
    url: "https://www.hs.ac.kr/kor/4956/subview.do",
    source: "sample"
  },
];

/* ─── API → 프론트엔드 형식 변환 (deadline 없음) ─── */
function transformApiNotice(apiNotice, index) {
  const keywords = extractKeywordsFromTitle(apiNotice.title);
  const categoryMap = { '학사': '학사', '일반': '일반', '장학': '장학', '혁신': '혁신' };
  return {
    id: apiNotice.id || ('api-' + index),
    title: apiNotice.title,
    category: categoryMap[apiNotice.category] || '일반',
    date: apiNotice.date || new Date().toISOString().slice(0, 10),
    pinned: false,
    summary: apiNotice.title,
    content: apiNotice.title,
    keywords: keywords,
    url: apiNotice.url || '#',
    source: apiNotice.source || 'api',
  };
}

function extractKeywordsFromTitle(title) {
  const keywords = [];
  const keywordMap = {
    '수강': ['수강신청', '수강', '학사'], '정정': ['정정', '수강신청'],
    '장학': ['장학금', '장학'], '국가장학': ['국가장학금', '장학금'],
    '기숙사': ['기숙사', '생활관'], '생활관': ['기숙사', '생활관'],
    '도서관': ['도서관', '열람실'], '취업': ['취업', '채용'],
    '채용': ['채용', '취업'], '동아리': ['동아리', '모집'],
    '근로': ['근로장학', '장학'], '등록금': ['등록금', '납부'],
    '성적': ['성적', '학사'], '졸업': ['졸업', '학사'],
    '중간고사': ['중간고사', '시험'], '기말고사': ['기말고사', '시험'],
    '학사일정': ['학사일정', '일정'], '방학': ['방학', '학사일정'],
    '셔틀': ['셔틀', '통학'], '버스': ['셔틀버스', '통학'],
    '식단': ['식단', '학식', '급식'], '학식': ['학식', '식단'],
    '급식': ['급식', '식단'],
  };
  const titleLower = title.toLowerCase();
  for (const [key, vals] of Object.entries(keywordMap)) {
    if (titleLower.includes(key)) vals.forEach(v => { if (!keywords.includes(v)) keywords.push(v); });
  }
  if (keywords.length === 0) {
    keywords.push(...title.replace(/[\[\]()]/g, ' ').split(/\s+/).filter(w => w.length >= 2).slice(0, 3));
  }
  return keywords;
}

/* ─── 캐시 ─── */
function getCachedNotices() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) { sessionStorage.removeItem(CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}
function setCachedNotices(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch {}
}

/* ─── 메인: 공지 로드 ─── */
async function loadNotices() {
  if (dataLoadPromise) return dataLoadPromise;
  dataLoadPromise = (async () => {
    const cached = getCachedNotices();
    if (cached) {
      notices = cached; isLiveData = true; dataReady = true;
      updateDataSourceIndicator(true, '캐시');
      return notices;
    }
    try {
      const response = await fetch(API_BASE_URL + '/api/notices?category=all', {
        method: 'GET', headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      if (result.success && result.notices && result.notices.length > 0) {
        notices = result.notices.map((n, i) => transformApiNotice(n, i));
        isLiveData = true; dataReady = true;
        setCachedNotices(notices);
        updateDataSourceIndicator(true, '실시간');
        return notices;
      } else throw new Error('빈 데이터');
    } catch (error) {
      notices = [...SAMPLE_NOTICES]; isLiveData = false; dataReady = true;
      updateDataSourceIndicator(false);
      return notices;
    }
  })();
  return dataLoadPromise;
}

/* ─── 공지 상세 (본문+이미지) ─── */
async function fetchNoticeDetail(noticeUrl) {
  if (!noticeUrl || noticeUrl === '#') return null;
  if (detailCache[noticeUrl]) return detailCache[noticeUrl];
  try {
    const response = await fetch(API_BASE_URL + '/api/notice-detail?url=' + encodeURIComponent(noticeUrl), {
      method: 'GET', headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (result.success) { detailCache[noticeUrl] = result; return result; }
    return null;
  } catch (error) { console.warn('[CSH] 상세 로드 실패:', error.message); return null; }
}

/* ─── 학식 메뉴 가져오기 ─── */
async function fetchMealMenu() {
  try {
    const response = await fetch(API_BASE_URL + '/api/meal', {
      method: 'GET', headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) { console.warn('[CSH] 학식 로드 실패:', error.message); return null; }
}

/* ─── 데이터 소스 뱃지 ─── */
function updateDataSourceIndicator(isLive, mode) {
  const existing = document.getElementById('dataSourceBadge');
  if (existing) existing.remove();
  const badge = document.createElement('span');
  badge.id = 'dataSourceBadge';
  badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:0.7rem;font-weight:600;margin-left:8px;letter-spacing:0.02em;vertical-align:middle;';
  if (isLive) {
    badge.style.background = 'var(--color-primary-light)'; badge.style.color = 'var(--color-primary)';
    badge.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:var(--color-primary);display:inline-block;"></span> LIVE' + (mode ? ' (' + mode + ')' : '');
  } else {
    badge.style.background = '#fef3e2'; badge.style.color = '#e67e22';
    badge.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#e67e22;display:inline-block;"></span> 샘플 데이터';
  }
  const logo = document.querySelector('.nav-logo');
  if (logo) logo.appendChild(badge);
}

/* ─── 새 공지 알림 체크 ─── */
const LAST_SEEN_KEY = 'csh_last_seen_ids';
function getLastSeenIds() { try { return JSON.parse(localStorage.getItem(LAST_SEEN_KEY)) || []; } catch { return []; } }
function setLastSeenIds(ids) { localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(ids)); }
function checkForNewNotices(currentNotices) {
  const lastSeen = getLastSeenIds();
  if (lastSeen.length === 0) { setLastSeenIds(currentNotices.map(n => String(n.id))); return []; }
  const newOnes = currentNotices.filter(n => !lastSeen.includes(String(n.id)));
  if (newOnes.length > 0) setLastSeenIds(currentNotices.map(n => String(n.id)));
  return newOnes;
}

async function refreshNotices() {
  sessionStorage.removeItem(CACHE_KEY); dataLoadPromise = null; dataReady = false;
  return await loadNotices();
}

document.addEventListener('DOMContentLoaded', () => {
  loadNotices().then(() => {
    window.dispatchEvent(new CustomEvent('noticesLoaded', { detail: { count: notices.length, isLive: isLiveData } }));
  });
});
