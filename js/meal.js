/* ============================================
   meal.js - 학식 메뉴 (v2.1)
   한신대 공지에서 식단 관련 공지를 찾아서
   본문+이미지를 표시
   ============================================ */

(function () {
  const contentEl = document.getElementById('mealContent');
  if (!contentEl) return;

  async function loadMeal() {
    // 1. 먼저 Worker의 /api/meal 엔드포인트 시도
    try {
      const mealResult = await fetchMealMenu();
      if (mealResult && mealResult.success && mealResult.content) {
        renderMealFromApi(mealResult);
        return;
      }
    } catch (e) { /* 폴백으로 진행 */ }

    // 2. 폴백: 공지 목록에서 '식단' '메뉴' 관련 공지 찾기
    await waitForNotices();
    
    const mealKeywords = ['식단', '학식', '급식', '메뉴', '식당', '중식', '석식'];
    const mealNotices = notices.filter(function (n) {
      const titleLower = n.title.toLowerCase();
      return mealKeywords.some(k => titleLower.includes(k));
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

    // 최신 식단 공지 3개까지 본문 로드
    let html = '';
    
    for (let i = 0; i < Math.min(mealNotices.length, 3); i++) {
      const notice = mealNotices[i];
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

    // 각 식단 공지의 본문 로드
    for (let i = 0; i < Math.min(mealNotices.length, 3); i++) {
      const notice = mealNotices[i];
      const bodyEl = document.getElementById('mealBody' + i);
      if (!bodyEl) continue;

      if (notice.url && notice.url !== '#' && notice.source !== 'sample') {
        try {
          const detail = await fetchNoticeDetail(notice.url);
          if (detail && detail.success) {
            let bodyHtml = '';
            if (detail.content) {
              bodyHtml += '<div style="white-space:pre-wrap;line-height:1.8;font-size:0.92rem;">' + detail.content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') + '</div>';
            }
            if (detail.images && detail.images.length > 0) {
              bodyHtml += '<div style="margin-top:16px;">';
              detail.images.forEach(function(imgUrl) {
                bodyHtml += '<img src="' + imgUrl + '" alt="식단 이미지" style="max-width:100%;border-radius:8px;margin-bottom:12px;display:block;" onerror="this.style.display=\'none\'">';
              });
              bodyHtml += '</div>';
            }
            if (bodyHtml) {
              bodyEl.innerHTML = bodyHtml;
            } else {
              bodyEl.innerHTML = '<p style="color:var(--color-text-muted);">내용을 파싱할 수 없습니다. 원문 링크를 확인해주세요.</p>';
            }
          } else {
            bodyEl.innerHTML = '<p style="color:var(--color-text-muted);">내용을 불러올 수 없습니다.</p>';
          }
        } catch (err) {
          bodyEl.innerHTML = '<p style="color:var(--color-text-muted);">로드 실패</p>';
        }
      } else {
        const hasContent = notice.content && notice.content !== notice.title;
        bodyEl.innerHTML = hasContent ? notice.content.replace(/\n/g, '<br>') : '<p style="color:var(--color-text-muted);">본문 내용이 없습니다.</p>';
      }
    }
  }

  function renderMealFromApi(data) {
    let html = '<div class="card" style="margin-bottom:20px;cursor:default;">';
    html += '<h3 style="font-size:1.1rem;font-weight:600;margin-bottom:12px;">🍽️ 이번 주 식단</h3>';
    
    if (data.content) {
      html += '<div style="white-space:pre-wrap;line-height:1.8;font-size:0.92rem;">' + data.content + '</div>';
    }
    if (data.images && data.images.length > 0) {
      html += '<div style="margin-top:16px;">';
      data.images.forEach(function(imgUrl) {
        html += '<img src="' + imgUrl + '" alt="식단 이미지" style="max-width:100%;border-radius:8px;margin-bottom:12px;display:block;" onerror="this.style.display=\'none\'">';
      });
      html += '</div>';
    }
    
    html += '</div>';
    contentEl.innerHTML = html;
  }

  loadMeal();
})();
