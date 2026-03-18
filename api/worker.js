/* ============================================
   Cloudflare Worker - 한신대학교 공지 스크래퍼 API v2
   
   변경사항:
   - /api/notice-detail 엔드포인트 추가 (본문+이미지)
   - 장학 URL 수정
   ============================================ */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

const BOARD_CONFIG = {
  '학사': {
    listUrl: 'https://www.hs.ac.kr/bbs/kor/274/artclList.do',
    bbsId: '274',
    site: 'kor',
  },
  '일반': {
    listUrl: 'https://www.hs.ac.kr/bbs/kor/24/artclList.do',
    bbsId: '24',
    site: 'kor',
  },
  '장학': {
    listUrl: 'https://www.hs.ac.kr/bbs/kor/275/artclList.do',
    bbsId: '275',
    site: 'kor',
  },
  '혁신': {
    listUrl: 'https://www.hs.ac.kr/bbs/platform/2015/artclList.do',
    bbsId: '2015',
    site: 'platform',
  },
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 전체 공지 목록
      if (path === '/api/notices' || path === '/api/notices/') {
        const category = url.searchParams.get('category') || 'all';
        const page = parseInt(url.searchParams.get('page')) || 1;
        const data = await fetchNotices(category, page);
        return jsonResponse(data);
      }

      // v2: 공지 상세 (본문 + 이미지)
      if (path === '/api/notice-detail' || path === '/api/notice-detail/') {
        const noticeUrl = url.searchParams.get('url');
        if (!noticeUrl) {
          return jsonResponse({ success: false, error: 'url 파라미터가 필요합니다' }, 400);
        }
        const data = await fetchNoticeDetail(noticeUrl);
        return jsonResponse(data);
      }

      // 헬스체크
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', version: 'v2', timestamp: new Date().toISOString() });
      }

      return jsonResponse({
        message: 'Campus Smart Hub API v2',
        endpoints: [
          'GET /api/notices?category=학사&page=1',
          'GET /api/notices?category=all',
          'GET /api/notice-detail?url=<공지URL>',
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

    allNotices.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      success: true,
      count: allNotices.length,
      notices: allNotices,
      errors: errors.length > 0 ? errors : undefined,
      fetchedAt: new Date().toISOString(),
    };
  }

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

// ─── v2: 공지 상세 본문 + 이미지 가져오기 ───
async function fetchNoticeDetail(noticeUrl) {
  try {
    // URL 유효성 검사: 한신대 도메인만 허용
    const parsed = new URL(noticeUrl);
    if (!parsed.hostname.endsWith('hs.ac.kr')) {
      return { success: false, error: '한신대학교 URL만 지원합니다' };
    }

    const response = await fetch(noticeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!response.ok) {
      return { success: false, error: 'HTTP ' + response.status };
    }

    const html = await response.text();

    // 본문 영역 추출 (K2Web 기반 게시판 공통 패턴)
    let content = '';
    let images = [];

    // 방법 1: artclView 본문 영역
    const viewBodyPatterns = [
      /<div[^>]*class="[^"]*artclView[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*artclBtn|<div[^>]*class="[^"]*file)/i,
      /<div[^>]*id="[^"]*artclView[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div/i,
      /<td[^>]*class="[^"]*artclView[^"]*"[^>]*>([\s\S]*?)<\/td>/i,
      // 일반적인 본문 영역
      /<div[^>]*class="[^"]*view[_-]?con(?:tent)?[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*board[_-]?view[_-]?con(?:tent)?[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // 더 넓은 범위
      /<div[^>]*class="[^"]*artclBody[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of viewBodyPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        content = match[1];
        break;
      }
    }

    // 본문에서 이미지 URL 추출
    if (content) {
      const imgPattern = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
      let imgMatch;
      while ((imgMatch = imgPattern.exec(content)) !== null) {
        let imgUrl = imgMatch[1];
        if (imgUrl.startsWith('/')) {
          imgUrl = 'https://www.hs.ac.kr' + imgUrl;
        }
        if (!imgUrl.includes('icon') && !imgUrl.includes('btn') && !imgUrl.includes('bg_')) {
          images.push(imgUrl);
        }
      }
    }

    // 첨부파일 이미지도 찾기
    const fileImgPattern = /href=["']([^"']*\.(?:jpg|jpeg|png|gif|webp)[^"']*)["']/gi;
    let fileMatch;
    while ((fileMatch = fileImgPattern.exec(html)) !== null) {
      let fileUrl = fileMatch[1];
      if (fileUrl.startsWith('/')) {
        fileUrl = 'https://www.hs.ac.kr' + fileUrl;
      }
      if (!images.includes(fileUrl)) {
        images.push(fileUrl);
      }
    }

    // HTML → 텍스트 변환
    let textContent = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      success: true,
      content: textContent || null,
      contentHtml: content || null,
      images: images,
      url: noticeUrl,
      fetchedAt: new Date().toISOString(),
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── 게시판 목록 파싱 ───
async function fetchBoardList(category, page) {
  const config = BOARD_CONFIG[category];
  if (!config) {
    throw new Error(`Unknown category: ${category}`);
  }

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

function parseNoticeList(html, category, config) {
  const notices = [];

  const simpleLinkPattern = new RegExp(
    `href=["']([^"']*?\\/${config.bbsId}\\/(\\d+)\\/artclView\\.do[^"']*)["'][^>]*>\\s*(?:<[^>]+>\\s*)*([^<]+)`,
    'gi'
  );

  let match;
  const seenIds = new Set();

  while ((match = simpleLinkPattern.exec(html)) !== null) {
    const [, href, artclId, rawTitle] = match;
    
    if (seenIds.has(artclId)) continue;
    seenIds.add(artclId);

    const title = cleanText(rawTitle);
    if (!title || title.length < 2) continue;

    const dateMatch = findNearbyDate(html, match.index);
    const date = dateMatch || '';

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

  // Fallback: table row parsing
  if (notices.length === 0) {
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;

    while ((trMatch = trPattern.exec(html)) !== null) {
      const rowHtml = trMatch[1];
      const aMatch = rowHtml.match(/href=["']([^"']*artclView\.do[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!aMatch) continue;

      const href = aMatch[1];
      const rawTitle = aMatch[2];
      const title = cleanText(rawTitle);
      if (!title || title.length < 2) continue;

      const idMatch = href.match(/\/(\d+)\/artclView\.do/);
      const artclId = idMatch ? idMatch[1] : Date.now().toString();

      if (seenIds.has(artclId)) continue;
      seenIds.add(artclId);

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

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/새글/g, '')
    .trim();
}

function findNearbyDate(html, position) {
  const start = Math.max(0, position - 200);
  const end = Math.min(html.length, position + 800);
  const context = html.substring(start, end);
  const dateMatch = context.match(/(\d{4})[\.\-\/](\d{2})[\.\-\/](\d{2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  return '';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: CORS_HEADERS,
  });
}
