/* ============================================
   search.js - 질문 기반 공지 검색 (v2.1)
   ============================================ */

(function () {
  var input = document.getElementById('askInput');
  var submitBtn = document.getElementById('askSubmit');
  var resultsContainer = document.getElementById('askResults');
  var resultsTitle = document.getElementById('askResultsTitle');
  var suggestionsContainer = document.getElementById('askSuggestions');

  function renderSuggestions() {
    if (!suggestionsContainer) return;
    suggestionsContainer.innerHTML = suggestedQuestions.map(function (q) {
      return '<button class="ask-suggestion-btn" onclick="handleSuggestionClick(\'' + q.replace(/'/g, "\\'") + '\')">' + q + '</button>';
    }).join('');
  }

  function extractKeywords(query) {
    var stopWords = ['이', '가', '은', '는', '을', '를', '의', '에', '에서', '로', '으로',
      '도', '만', '까지', '부터', '와', '과', '하고', '이나', '나', '든지',
      '좀', '알려줘', '알려주세요', '어떻게', '언제', '어디', '뭐', '무엇',
      '해줘', '해주세요', '있어', '있나요', '돼', '되나요', '뭔가요', '인가요',
      '어때', '거', '것', '수', '때', '등', '중', '및', '뭐야'];
    var queryClean = query.toLowerCase().replace(/[?？!！.,。，]/g, '').trim();
    return queryClean.split(/\s+/).filter(function (w) {
      return w.length > 0 && stopWords.indexOf(w) === -1;
    });
  }

  function scoreNotice(notice, keywords) {
    var score = 0;
    keywords.forEach(function (keyword) {
      if (notice.keywords) {
        notice.keywords.forEach(function (nk) {
          if (nk.toLowerCase().includes(keyword) || keyword.includes(nk.toLowerCase())) score += 10;
        });
      }
      if (notice.title.toLowerCase().includes(keyword)) score += 5;
      if (notice.summary && notice.summary.toLowerCase().includes(keyword)) score += 3;
      if (notice.category.toLowerCase().includes(keyword)) score += 2;
      if (notice.content && notice.content.toLowerCase().includes(keyword)) score += 1;
    });
    return score;
  }

  function performSearch(query) {
    if (!query.trim()) {
      resultsTitle.textContent = '';
      resultsContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>궁금한 것을 질문해보세요</p></div>';
      return;
    }
    var keywords = extractKeywords(query);
    if (keywords.length === 0) {
      resultsTitle.textContent = '검색 결과';
      resultsContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">🤔</div><p>좀 더 구체적으로 질문해주세요</p></div>';
      return;
    }
    var scored = notices.map(function (n) {
      return { notice: n, score: scoreNotice(n, keywords) };
    }).filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    resultsTitle.textContent = '"' + query + '" 관련 공지 ' + scored.length + '건';

    if (scored.length === 0) {
      resultsContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">😥</div><p>관련된 공지를 찾지 못했습니다.<br>다른 키워드로 검색해보세요.</p></div>';
      return;
    }
    resultsContainer.innerHTML = scored.map(function (item) {
      return createNoticeCardHTML(item.notice);
    }).join('');
  }

  if (submitBtn) submitBtn.addEventListener('click', function () { performSearch(input.value); });
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') performSearch(input.value); });
  window.handleSuggestionClick = function (question) { input.value = question; performSearch(question); };

  renderSuggestions();
  resultsContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>궁금한 것을 질문해보세요</p></div>';
  waitForNotices().then(function () { console.log('[CSH] 검색 준비 완료'); });
})();
