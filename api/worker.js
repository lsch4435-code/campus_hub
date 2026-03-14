/* ============================================
   Cloudflare Worker - 한신대학교 공지 스크래퍼 API
   
   이 Worker는 한신대학교 홈페이지에서 공지사항을 
   가져와 JSON 형태로 프론트엔드에 제공합니다.
   
   배포: Cloudflare Workers (무료 플랜)
   ============================================ */

// ─── 설정 ───
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

// 한신대학교 게시판 URL 패턴
// 학사공지: bbs ID = 143, 일반공지: bbs ID = 24, 장학: bbs ID = 273
const BOARD_CONFIG = {
  '학사': {
    listUrl: 'https://www.hs.ac.kr/bbs/kor/143/artclList.do',
    bbsId: '143',
    site: 'kor',
  },
  '일반': {
    listUrl: 'https://www.hs.ac.kr/bbs/kor/24/artclList.do',
    bbsId: '24',
    site: 'kor',
  },
  '장학': {
    listUrl: 'https://www.hs.ac.kr/bbs/kor/273/artclList.do',
    bbsId: '273',
    site: 'kor',
  },
  '혁신': {
    listUrl: 'https://www.hs.ac.kr/bbs/platform/2015/artclList.do',
    bbsId: '2015',
    site: 'platform',
  },
};

// ─── 메인 핸들러 ───
export default {
  async fetch(request) {
    // CORS preflight 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // /api/notices - 전체 공지 (여러 게시판 통합)
      if (path === '/api/notices' || path === '/api/notices/') {
        const category = url.searchParams.get('category') || 'all';
        const page = parseInt(url.searchParams.get('page')) || 1;
        const data = await fetchNotices(category, page);
        return jsonResponse(data);
      }

      // /api/health - 헬스체크
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // 기본 응답
      return jsonResponse({
        message: 'Campus Smart Hub API',
        endpoints: [
          'GET /api/notices?category=학사&page=1',
          'GET /api/notices?category=all',
          'GET /api/health',
        ],
      });

    } catch (error) {
      return jsonResponse(
        { error: error.message, stack: error.stack },
        500
      );
    }
  },
};

// ─── 공지 가져오기 ───
async function fetchNotices(category, page) {
  // 'all'이면 학사 + 일반 + 장학 모두 가져오기
  if (category === 'all') {
    const results = await Promise.allSettled([
      fetchBoardList('학사', 1),
      fetchBoardList('일반', 1),
      fetchBoardList('장학', 1),
    ]);

    let allNotices = [];
    const errors = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allNotices = allNotices.concat(result.value);
      } else {
        errors.push({ board: ['학사', '일반', '장학'][idx], error: result.reason.message });
      }
    });

    // 날짜 기준 내림차순 정렬
    allNotices.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      success: true,
      count: allNotices.length,
      notices: allNotices,
      errors: errors.length > 0 ? errors : undefined,
      fetchedAt: new Date().toISOString(),
    };
  }

  // 특정 카테고리
  const notices = await fetchBoardList(category, page);
  return {
    success: true,
    count: notices.length,
    category: category,
    page: page,
    notices: notices,
    fetchedAt: new Date().toISOString(),
  };
}

// ─── 게시판 목록 HTML을 파싱하여 공지 배열 반환 ───
async function fetchBoardList(category, page) {
  const config = BOARD_CONFIG[category];
  if (!config) {
    throw new Error(`Unknown category: ${category}. Available: ${Object.keys(BOARD_CONFIG).join(', ')}`);
  }

  // 페이지 파라미터 포함 URL 구성
  const fetchUrl = `${config.listUrl}?page=${page}`;

  const response = await fetch(fetchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${category} board: HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseNoticeList(html, category, config);
}

// ─── HTML 파싱 (정규식 기반) ───
function parseNoticeList(html, category, config) {
  const notices = [];

  /*
    한신대 게시판 HTML 구조 (K2Web 기반):
    <tr> 또는 <td> 안에 게시물 정보가 들어있음
    
    일반적인 패턴:
    - <td class="td-num">번호</td>
    - <td class="td-subject"><a href="...">제목</a></td>
    - <td class="td-write">작성자</td>
    - <td class="td-date">날짜</td>
    - <td class="td-access">조회수</td>
    
    또는 artclView.do URL 패턴으로 링크 추출
  */

  // 방법 1: <a href="...artclView.do">제목</a> 패턴으로 추출
  // URL 패턴: /bbs/{site}/{bbsId}/{artclId}/artclView.do
  const linkPattern = new RegExp(
    `<a[^>]*href=["']([^"']*?\\/${config.site}\\/${config.bbsId}\\/(\\d+)\\/artclView\\.do[^"']*)["'][^>]*>([^<]*(?:<[^/a][^>]*>[^<]*)*)<\\/a>`,
    'gi'
  );

  // 보다 단순한 패턴도 시도
  const simpleLinkPattern = new RegExp(
    `href=["']([^"']*?\\/${config.bbsId}\\/(\\d+)\\/artclView\\.do[^"']*)["'][^>]*>\\s*(?:<[^>]+>\\s*)*([^<]+)`,
    'gi'
  );

  let match;
  const seenIds = new Set();

  // 먼저 단순 패턴으로 시도
  while ((match = simpleLinkPattern.exec(html)) !== null) {
    const [, href, artclId, rawTitle] = match;
    
    if (seenIds.has(artclId)) continue;
    seenIds.add(artclId);

    const title = cleanText(rawTitle);
    if (!title || title.length < 2) continue;

    // 날짜 추출: artclId 주변에서 날짜 패턴 찾기
    const dateMatch = findNearbyDate(html, match.index);
    const date = dateMatch || '';

    // 전체 URL 구성
    let fullUrl = href;
    if (href.startsWith('/')) {
      fullUrl = `https://www.hs.ac.kr${href}`;
    } else if (!href.startsWith('http')) {
      fullUrl = `https://www.hs.ac.kr/${href}`;
    }

    notices.push({
      id: `${config.bbsId}-${artclId}`,
      numericId: parseInt(artclId),
      title: title,
      category: category,
      date: date,
      url: fullUrl,
      source: 'hs.ac.kr',
    });
  }

  // 테이블 행 기반 파싱도 시도 (notices가 비어있을 경우)
  if (notices.length === 0) {
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;

    while ((trMatch = trPattern.exec(html)) !== null) {
      const rowHtml = trMatch[1];

      // 링크 추출
      const aMatch = rowHtml.match(/href=["']([^"']*artclView\.do[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!aMatch) continue;

      const href = aMatch[1];
      const rawTitle = aMatch[2];
      const title = cleanText(rawTitle);
      if (!title || title.length < 2) continue;

      // 게시글 ID 추출
      const idMatch = href.match(/\/(\d+)\/artclView\.do/);
      const artclId = idMatch ? idMatch[1] : Date.now().toString();

      if (seenIds.has(artclId)) continue;
      seenIds.add(artclId);

      // 날짜 추출 (td-date 클래스 또는 날짜 패턴)
      const dateInRow = rowHtml.match(/(\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2})/);
      const date = dateInRow ? dateInRow[1].replace(/\./g, '-') : '';

      let fullUrl = href.startsWith('/') ? `https://www.hs.ac.kr${href}` : href;

      notices.push({
        id: `${config.bbsId}-${artclId}`,
        numericId: parseInt(artclId) || 0,
        title: title,
        category: category,
        date: date,
        url: fullUrl,
        source: 'hs.ac.kr',
      });
    }
  }

  return notices;
}

// ─── 유틸리티 함수 ───

// HTML 태그 제거 및 텍스트 정리
function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '')      // HTML 태그 제거
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')         // 연속 공백 정리
    .replace(/새글/g, '')          // '새글' 라벨 제거
    .trim();
}

// 특정 위치 주변에서 날짜 패턴 찾기
function findNearbyDate(html, position) {
  // 해당 위치 전후 500자 범위에서 날짜 탐색
  const start = Math.max(0, position - 200);
  const end = Math.min(html.length, position + 800);
  const context = html.substring(start, end);

  const dateMatch = context.match(/(\d{4})[\.\-\/](\d{2})[\.\-\/](\d{2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  return '';
}

// JSON 응답 생성
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: CORS_HEADERS,
  });
}
