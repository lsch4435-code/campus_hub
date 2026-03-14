/* ============================================
   bookmark.js - 북마크 페이지 (API 연동 버전)
   Campus Smart Hub
   ============================================ */

(function () {
  var grid = document.getElementById('bookmarkGrid');
  var countEl = document.getElementById('bookmarkCount');

  function renderBookmarks() {
    var bookmarkIds = getBookmarks();
    var bookmarkedNotices = notices.filter(function (n) {
      return bookmarkIds.some(function (b) { return String(b) === String(n.id); });
    });

    if (countEl) countEl.textContent = bookmarkedNotices.length + '건';

    if (bookmarkedNotices.length === 0) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1;">' +
          '<div class="empty-icon">📑</div>' +
          '<p>저장된 북마크가 없습니다.<br>공지에서 ☆ 버튼을 눌러 북마크에 추가해보세요.</p>' +
        '</div>';
      return;
    }

    grid.innerHTML = bookmarkedNotices.map(function (n) {
      return createNoticeCardHTML(n);
    }).join('');
  }

  // 북마크 변경 감지 (주기적)
  var lastState = JSON.stringify(getBookmarks());
  setInterval(function () {
    var current = JSON.stringify(getBookmarks());
    if (current !== lastState) {
      lastState = current;
      renderBookmarks();
    }
  }, 500);

  window.refreshBookmarks = renderBookmarks;

  /* --- 초기화 --- */
  waitForNotices().then(function () {
    renderBookmarks();
  });
})();
