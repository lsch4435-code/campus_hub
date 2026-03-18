/* ============================================
   notices.js - 공지 목록 (v2.1)
   deadline 기반 정렬 완전 제거, 날짜 최신순만
   ============================================ */

(function () {
  const grid = document.getElementById('noticeGrid');
  const searchInput = document.getElementById('noticeSearch');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const resultCount = document.getElementById('resultCount');

  let currentFilter = '전체';
  let currentSearch = '';

  function showLoading() {
    if (!grid) return;
    grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;">' +
        '<div class="empty-icon" style="animation:spin 1s linear infinite;">⏳</div>' +
        '<p>공지사항을 불러오는 중...</p>' +
      '</div>';
  }

  function sortNotices(list) {
    return list.slice().sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });
  }

  function getFilteredNotices() {
    var result = notices;
    if (currentFilter !== '전체') {
      result = result.filter(function (n) { return n.category === currentFilter; });
    }
    if (currentSearch.trim()) {
      var query = currentSearch.trim().toLowerCase();
      result = result.filter(function (n) {
        return n.title.toLowerCase().includes(query) ||
          (n.summary && n.summary.toLowerCase().includes(query)) ||
          (n.keywords && n.keywords.some(function (k) { return k.toLowerCase().includes(query); })) ||
          n.category.includes(query);
      });
    }
    return sortNotices(result);
  }

  function renderNotices() {
    var filtered = getFilteredNotices();
    if (resultCount) resultCount.textContent = filtered.length + '건';
    if (filtered.length === 0) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1;">' +
          '<div class="empty-icon">🔍</div><p>검색 결과가 없습니다</p>' +
        '</div>';
      return;
    }
    grid.innerHTML = filtered.map(function (n) {
      return createNoticeCardHTML(n);
    }).join('');
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.dataset.category;
      renderNotices();
    });
  });

  if (searchInput) {
    var debounceTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        currentSearch = searchInput.value;
        renderNotices();
      }, 250);
    });
  }

  showLoading();
  waitForNotices().then(function () { renderNotices(); });
})();
