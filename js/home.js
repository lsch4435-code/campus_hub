/* ============================================
   home.js - 홈페이지 (v2.1)
   D-day 완전 제거, 최신 공지만 표시
   ============================================ */

(function () {
  var urgentGrid = document.getElementById('urgentNotices');
  var todayEventsGrid = document.getElementById('todayEvents');

  function showLoading(el) {
    if (!el) return;
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">⏳</div><p>불러오는 중...</p></div>';
  }

  function renderLatestNotices() {
    if (!urgentGrid) return;

    // 최신 공지 4개 (날짜순)
    var latest = notices.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    }).slice(0, 4);

    if (latest.length === 0) {
      urgentGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🎉</div><p>표시할 공지가 없습니다</p></div>';
      return;
    }

    urgentGrid.innerHTML = latest.map(function (n) {
      return createNoticeCardHTML(n);
    }).join('');
  }

  function renderTodayEvents() {
    if (!todayEventsGrid) return;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var events = getEventsForDate(todayStr);

    if (events.length === 0) {
      todayEventsGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📅</div><p>오늘 등록된 일정이 없습니다</p></div>';
      return;
    }

    todayEventsGrid.innerHTML = events.map(function (e) {
      var sourceLabel = e.source === 'notice' ? '📋 공지에서 추가됨' : e.source === 'academic' ? '🎓 학사일정' : '✏️ 직접 추가';
      return '<div class="card fade-in" style="cursor:default;"><div style="display:flex;align-items:center;justify-content:space-between;"><div><h3 style="font-size:1rem;font-weight:600;margin-bottom:4px;">' + e.title + '</h3><span style="font-size:0.8rem;color:var(--color-text-muted);">' + sourceLabel + '</span></div></div></div>';
    }).join('');
  }

  showLoading(urgentGrid);
  waitForNotices().then(function () {
    renderLatestNotices();
    renderTodayEvents();
  });
})();
