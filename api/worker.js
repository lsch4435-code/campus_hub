/* ============================================
   Cloudflare Worker - 한신대 공지 스크래퍼 API v2.1
   
   엔드포인트:
   - /api/notices - 공지 목록
   - /api/notice-detail - 공지 본문+이미지
   - /api/meal - 식단 메뉴 (식단 관련 공지 자동 탐색)
   - /api/health
   ============================================ */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

const BOARD_CONFIG = {
  '학사': { listUrl: 'https://www.hs.ac.kr/bbs/kor/274/artclList.do', bbsId: '274', site: 'kor' },
  '일반': { listUrl: 'https://www.hs.ac.kr/bbs/kor/24/artclList.do', bbsId: '24', site: 'kor' },
  '장학': { listUrl: 'https://www.hs.ac.kr/bbs/kor/275/artclList.do', bbsId: '275', site: 'kor' },
  '혁신': { listUrl: 'https://www.hs.ac.kr/bbs/platform/2015/artclList.do', bbsId: '2015', site: 'platform' },
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/notices' || path === '/api/notices/') {
        const category = url.searchParams.get('category') || 'all';
        const page = parseInt(url.searchParams.get('page')) || 1;
        return jsonResponse(await fetchNotices(category, page));
      }

      if (path === '/api/notice-detail' || path === '/api/notice-detail/') {
        const noticeUrl = url.searchParams.get('url');
        if (!noticeUrl) return jsonResponse({ success: false, error: 'url 파라미터 필요' }, 400);
        return jsonResponse(await fetchNoticeDetail(noticeUrl));
      }

      if (path === '/api/meal' || path === '/api/meal/') {
        return jsonResponse(await fetchMealNotice());
      }

      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', version: 'v2.1', timestamp: new Date().toISOString() });
      }

      return jsonResponse({
        message: 'Campus Smart Hub API v2.1',
        endpoints: [
          'GET /api/notices?category=all',
          'GET /api/notice-detail?url=<URL>',
          'GET /api/meal',
          'GET /api/health',
        ],
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  },
};

// ─── 공지 목록 ───
async function fetchNotices(category, page) {
  if (category === 'all') {
    const results = await Promise.allSettled([
      fetchBoardList('학사', 1), fetchBoardList('일반', 1), fetchBoardList('장학', 1),
    ]);
    let allNotices = [];
    const errors = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') allNotices = allNotices.concat(r.value);
      else errors.push({ board: ['학사','일반','장학'][i], error: r.reason.message });
    });
    allNotices.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, count: allNotices.length, notices: allNotices, errors: errors.length > 0 ? errors : undefined, fetchedAt: new Date().toISOString() };
  }
  const notices = await fetchBoardList(category, page);
  return { success: true, count: notices.length, category, page, notices, fetchedAt: new Date().toISOString() };
}

// ─── 공지 상세 ───
async function fetchNoticeDetail(noticeUrl) {
  try {
    const parsed = new URL(noticeUrl);
    if (!parsed.hostname.endsWith('hs.ac.kr')) return { success: false, error: '한신대 URL만 지원' };

    const response = await fetch(noticeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'ko-KR,ko;q=0.9' },
    });
    if (!response.ok) return { success: false, error: 'HTTP ' + response.status };

    const html = await response.text();
    let content = '';
    let images = [];

    // 본문 추출 패턴들
    const patterns = [
      /<div[^>]*class="[^"]*artclView[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*artclBtn|<div[^>]*class="[^"]*file)/i,
      /<td[^>]*class="[^"]*artclView[^"]*"[^>]*>([\s\S]*?)<\/td>/i,
      /<div[^>]*class="[^"]*view[_-]?con(?:tent)?[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*board[_-]?view[_-]?con(?:tent)?[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*artclBody[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const p of patterns) {
      const m = html.match(p);
      if (m && m[1] && m[1].trim().length > 10) { content = m[1]; break; }
    }

    // 이미지 추출
    if (content) {
      const imgRe = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
      let im;
      while ((im = imgRe.exec(content)) !== null) {
        let u = im[1];
        if (u.startsWith('/')) u = 'https://www.hs.ac.kr' + u;
        if (!u.includes('icon') && !u.includes('btn') && !u.includes('bg_')) images.push(u);
      }
    }

    // 첨부 이미지
    const fileRe = /href=["']([^"']*\.(?:jpg|jpeg|png|gif|webp)[^"']*)["']/gi;
    let fm;
    while ((fm = fileRe.exec(html)) !== null) {
      let u = fm[1];
      if (u.startsWith('/')) u = 'https://www.hs.ac.kr' + u;
      if (!images.includes(u)) images.push(u);
    }

    let textContent = content
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n').trim();

    return { success: true, content: textContent || null, images, url: noticeUrl, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── 학식 메뉴: 일반 게시판에서 식단 관련 공지 찾기 ───
async function fetchMealNotice() {
  try {
    // 일반 게시판에서 식단 관련 공지 검색
    const notices = await fetchBoardList('일반', 1);
    const mealKeywords = ['식단', '학식', '급식', '메뉴', '식당'];
    
    const mealNotice = notices.find(n => {
      return mealKeywords.some(k => n.title.includes(k));
    });

    if (!mealNotice) {
      // 학사 게시판도 시도
      const haksa = await fetchBoardList('학사', 1);
      const haksaMeal = haksa.find(n => mealKeywords.some(k => n.title.includes(k)));
      if (!haksaMeal) return { success: false, error: '식단 공지를 찾을 수 없습니다' };
      
      const detail = await fetchNoticeDetail(haksaMeal.url);
      return { success: true, title: haksaMeal.title, date: haksaMeal.date, ...detail };
    }

    const detail = await fetchNoticeDetail(mealNotice.url);
    return { success: true, title: mealNotice.title, date: mealNotice.date, content: detail?.content || null, images: detail?.images || [], url: mealNotice.url };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── 게시판 파싱 ───
async function fetchBoardList(category, page) {
  const config = BOARD_CONFIG[category];
  if (!config) throw new Error(`Unknown category: ${category}`);
  const response = await fetch(`${config.listUrl}?page=${page}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'ko-KR,ko;q=0.9' },
  });
  if (!response.ok) throw new Error(`Failed: HTTP ${response.status}`);
  return parseNoticeList(await response.text(), category, config);
}

function parseNoticeList(html, category, config) {
  const notices = [];
  const re = new RegExp(`href=["']([^"']*?\\/${config.bbsId}\\/(\\d+)\\/artclView\\.do[^"']*)["'][^>]*>\\s*(?:<[^>]+>\\s*)*([^<]+)`, 'gi');
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const [, href, id, raw] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    const title = cleanText(raw);
    if (!title || title.length < 2) continue;
    const date = findNearbyDate(html, m.index) || '';
    let fullUrl = href.startsWith('/') ? `https://www.hs.ac.kr${href}` : href.startsWith('http') ? href : `https://www.hs.ac.kr/${href}`;
    notices.push({ id: `${config.bbsId}-${id}`, numericId: parseInt(id), title, category, date, url: fullUrl, source: 'hs.ac.kr' });
  }
  if (notices.length === 0) {
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(html)) !== null) {
      const aMatch = tr[1].match(/href=["']([^"']*artclView\.do[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!aMatch) continue;
      const title = cleanText(aMatch[2]);
      if (!title || title.length < 2) continue;
      const idM = aMatch[1].match(/\/(\d+)\/artclView\.do/);
      const id = idM ? idM[1] : Date.now().toString();
      if (seen.has(id)) continue;
      seen.add(id);
      const dateM = tr[1].match(/(\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2})/);
      const date = dateM ? dateM[1].replace(/\./g, '-') : '';
      let fullUrl = aMatch[1].startsWith('/') ? `https://www.hs.ac.kr${aMatch[1]}` : aMatch[1];
      notices.push({ id: `${config.bbsId}-${id}`, numericId: parseInt(id)||0, title, category, date, url: fullUrl, source: 'hs.ac.kr' });
    }
  }
  return notices;
}

function cleanText(t) {
  return t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/새글/g, '').trim();
}
function findNearbyDate(html, pos) {
  const ctx = html.substring(Math.max(0, pos - 200), Math.min(html.length, pos + 800));
  const m = ctx.match(/(\d{4})[\.\-\/](\d{2})[\.\-\/](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: CORS_HEADERS });
}
