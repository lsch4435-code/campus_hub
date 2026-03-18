/* ============================================
   home.js - 홈페이지 (v2)
   Campus Smart Hub v2
   ============================================ */

(function () {
  var urgentGrid = document.getElementById('urgentNotices');
  var todayEventsGrid = document.getElementById('todayEvents');

  function showLoading(el) {
    if (!el) return;
    el.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;">' +
        '<div class="empty-icon">⏳</div><p>불러오는 중...</p>' +
      '</div>';
  }

  /* --- 최신 공지 (마감 임박 대신) --- */
  function renderLatestNotices() {
    if (!urgentGrid) return;

    // v2: 가짜 마감일 기반이 아닌, 최신 공지 표시
    // deadline이 있는 것 중 마감 임박한 것이 있으면 우선 표시
    var urgent = notices.filter(function (n) {
      if (!n.deadline) return false;
      var dday = calculateDday(n.deadline);
      return dday >= 0 && dday <= 7;
    }).sort(function (a, b) {
      return calculateDday(a.deadline) - calculateDday(b.deadline);
    }).slice(0, 4);

    // 마감 임박이 없으면 최신 공지 4개
    if (urgent.length === 0) {
      urgent = notices.slice().sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      }).slice(0, 4);
    }

    if (urgent.length === 0) {
      urgentGrid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1;">' +
          '<div class="empty-icon">🎉</div><p>표시할 공지가 없습니다</p>' +
        '</div>';
      return;
    }

    urgentGrid.innerHTML = urgent.map(function (n) {
      return createNoticeCardHTML(n);
    }).join('');
  }

  /* --- 오늘 일정 --- */
  function renderTodayEvents() {
    if (!todayEventsGrid) return;

    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    var events = getEventsForDate(todayStr);

    if (events.length === 0) {
      todayEventsGrid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1;">' +
          '<div class="empty-icon">📅</div><p>오늘 등록된 일정이 없습니다</p>' +
        '</div>';
      return;
    }

    todayEventsGrid.innerHTML = events.map(function (e) {
      return '<div class="card fade-in" style="cursor:default;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<h3 style="font-size:1rem;font-weight:600;margin-bottom:4px;">' + e.title + '</h3>' +
            '<span style="font-size:0.8rem;color:var(--color-text-muted);">' +
              (e.source === 'notice' ? '📋 공지에서 추가됨' : e.source === 'academic' ? '🎓 학사일정' : '✏️ 직접 추가한 일정') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* --- 초기화 --- */
  showLoading(urgentGrid);
  waitForNotices().then(function () {
    renderLatestNotices();
    renderTodayEvents();
  });
})();
