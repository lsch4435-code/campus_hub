/* ============================================
   meal.js - 학식 메뉴 페이지
   공지에서 식단 관련 공지를 찾아서 본문+이미지 표시
   ============================================ */

(function () {
  var contentEl = document.getElementById('mealContent');
  if (!contentEl) return;

  async function loadMeal() {
    // 1. Worker /api/meal 시도
    try {
      var mealResult = await fetchMealMenu();
      if (mealResult && mealResult.success && (mealResult.content || (mealResult.images && mealResult.images.length > 0))) {
        renderMeal(mealResult);
        return;
      }
    } catch (e) { /* 폴백 */ }

    // 2. 공지 목록에서 식단 관련 검색
    await waitForNotices();

    var keywords = ['식단', '학식', '급식', '메뉴', '식당', '중식', '석식'];
    var mealNotices = notices.filter(function (n) {
      var t = n.title;
      return keywords.some(function(k) { return t.includes(k); });
    }).sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    if (mealNotices.length === 0) {
      contentEl.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">🍽️</div>' +
          '<p>현재 식단 관련 공지를 찾을 수 없습니다.</p>' +
          '<p style="font-size:0.85rem;color:var(--color-text-muted);margin-top:8px;">학교 공지에 식단 정보가 올라오면 자동으로 표시됩니다.</p>' +
        '</div>';
      return;
    }

    // 최대 3개 식단 공지 표시
    var html = '';
    for (var i = 0; i < Math.min(mealNotices.length, 3); i++) {
      var notice = mealNotices[i];
      html += '<div class="card" style="margin-bottom:20px;cursor:default;">';
      html += '<div class="notice-top" style="margin-bottom:12px;">';
      html += '<span class="notice-category ' + getCategoryClass(notice.category) + '">' + notice.category + '</span>';
      html += '<span style="font-size:0.8rem;color:var(--color-text-muted);">' + formatDate(notice.date) + ' 게시</span>';
      html += '</div>';
      html += '<h3 style="font-size:1.1rem;font-weight:600;margin-bottom:12px;">' + notice.title + '</h3>';
      html += '<div class="meal-body" id="mealBody' + i + '">';
      html += '<div class="modal-loading"><div class="spinner"></div> 식단 내용을 불러오는 중...</div>';
      html += '</div>';
      if (notice.url && notice.url !== '#') {
        html += '<div style="margin-top:12px;"><a href="' + notice.url + '" target="_blank" rel="noopener" style="color:var(--color-primary);font-weight:600;font-size:0.9rem;text-decoration:underline;">원문 보기 →</a></div>';
      }
      html += '</div>';
    }
    contentEl.innerHTML = html;

    // 각 식단 본문 로드
    for (var j = 0; j < Math.min(mealNotices.length, 3); j++) {
      await loadMealBody(mealNotices[j], j);
    }
  }

  async function loadMealBody(notice, idx) {
    var bodyEl = document.getElementById('mealBody' + idx);
    if (!bodyEl) return;

    if (notice.url && notice.url !== '#' && notice.source !== 'sample') {
      try {
        var detail = await fetchNoticeDetail(notice.url);
        if (detail && detail.success) {
          var h = '';
          if (detail.content) h += '<div style="white-space:pre-wrap;line-height:1.8;font-size:0.92rem;">' + detail.content + '</div>';
          if (detail.images && detail.images.length > 0) {
            h += '<div style="margin-top:16px;">';
            detail.images.forEach(function(img) {
              h += '<img src="' + img + '" alt="식단" style="max-width:100%;border-radius:8px;margin-bottom:12px;display:block;" onerror="this.style.display=\'none\'">';
            });
            h += '</div>';
          }
          bodyEl.innerHTML = h || '<p style="color:var(--color-text-muted);">내용을 파싱할 수 없습니다. 원문을 확인해주세요.</p>';
          return;
        }
      } catch (e) { /* fallback */ }
    }
    var has = notice.content && notice.content !== notice.title;
    bodyEl.innerHTML = has ? notice.content.replace(/\n/g, '<br>') : '<p style="color:var(--color-text-muted);">본문 내용이 없습니다.</p>';
  }

  function renderMeal(data) {
    var html = '<div class="card" style="margin-bottom:20px;cursor:default;">';
    if (data.title) html += '<h3 style="font-size:1.1rem;font-weight:600;margin-bottom:12px;">' + data.title + '</h3>';
    if (data.content) html += '<div style="white-space:pre-wrap;line-height:1.8;font-size:0.92rem;">' + data.content + '</div>';
    if (data.images && data.images.length > 0) {
      html += '<div style="margin-top:16px;">';
      data.images.forEach(function(img) {
        html += '<img src="' + img + '" alt="식단" style="max-width:100%;border-radius:8px;margin-bottom:12px;display:block;" onerror="this.style.display=\'none\'">';
      });
      html += '</div>';
    }
    if (data.url) html += '<div style="margin-top:12px;"><a href="' + data.url + '" target="_blank" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">원문 보기 →</a></div>';
    html += '</div>';
    contentEl.innerHTML = html;
  }

  loadMeal();
})();
