/* ============================================
   common.js - 공통 유틸리티 (v2.1)
   Campus Smart Hub v2
   
   수정사항:
   - 다크모드: 초기 data-theme="light" 명시 설정
   - D-day/deadline 관련 코드 완전 제거
   - 공지 모달: Worker에서 본문 바로 표시
   - 알림: 권한 요청 로직 수정
   ============================================ */

/* --- 다크모드 --- */
function initTheme() {
  const saved = localStorage.getItem('csh_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    localStorage.setItem('csh_theme', prefersDark ? 'dark' : 'light');
  }
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = (current === 'dark') ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('csh_theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title = isDark ? '라이트 모드로 전환' : '다크 모드로 전환';
}

/* --- 모바일 네비게이션 토글 --- */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => links.classList.remove('open'));
    });
  }
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
}

/* --- 토스트 알림 --- */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

/* --- 북마크 관리 --- */
function getBookmarks() {
  try { return JSON.parse(localStorage.getItem('csh_bookmarks')) || []; }
  catch { return []; }
}
function toggleBookmark(noticeId) {
  let bookmarks = getBookmarks();
  const idStr = String(noticeId);
  const idx = bookmarks.findIndex(b => String(b) === idStr);
  if (idx > -1) { bookmarks.splice(idx, 1); showToast('북마크가 해제되었습니다'); }
  else { bookmarks.push(noticeId); showToast('북마크에 저장되었습니다'); }
  localStorage.setItem('csh_bookmarks', JSON.stringify(bookmarks));
  return bookmarks.some(b => String(b) === idStr);
}
function isBookmarked(noticeId) {
  return getBookmarks().some(b => String(b) === String(noticeId));
}

/* --- 캘린더 일정 관리 --- */
function getEvents() {
  try { return JSON.parse(localStorage.getItem('csh_events')) || []; }
  catch { return []; }
}
function saveEvents(events) { localStorage.setItem('csh_events', JSON.stringify(events)); }
function addEvent(dateStr, title, source) {
  const events = getEvents();
  if (events.find(e => e.date === dateStr && e.title === title)) {
    showToast('이미 등록된 일정입니다');
    return false;
  }
  events.push({ id: Date.now(), date: dateStr, title: title, source: source || 'manual' });
  saveEvents(events);
  showToast('일정이 추가되었습니다');
  return true;
}
function deleteEvent(eventId) {
  let events = getEvents();
  events = events.filter(e => e.id !== eventId);
  saveEvents(events);
  showToast('일정이 삭제되었습니다');
}
function getEventsForDate(dateStr) {
  return getEvents().filter(e => e.date === dateStr);
}

/* --- 공지를 캘린더에 추가 (게시일 기준) --- */
function addNoticeToCalendar(noticeId) {
  const notice = notices.find(n => String(n.id) === String(noticeId));
  if (!notice || !notice.date) return;
  return addEvent(notice.date, notice.title, 'notice');
}
function isNoticeInCalendar(noticeId) {
  const notice = notices.find(n => String(n.id) === String(noticeId));
  if (!notice) return false;
  return getEvents().some(e => e.title === notice.title && e.source === 'notice');
}

/* --- 날짜 포맷 --- */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}
function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}

/* --- 카테고리 클래스 --- */
function getCategoryClass(category) {
  const map = { '학사': 'category-학사', '장학': 'category-장학', '기숙사': 'category-기숙사', '취업': 'category-취업', '일반': 'category-default', '혁신': 'category-혁신' };
  return map[category] || 'category-default';
}

/* --- 공지 카드 HTML (v2.1: D-day 완전 제거) --- */
function createNoticeCardHTML(notice, options) {
  options = options || {};
  const bookmarked = isBookmarked(notice.id);
  const inCalendar = isNoticeInCalendar(notice.id);
  const showDetail = options.showDetail !== false;
  const safeId = "'" + String(notice.id).replace(/'/g, "\\'") + "'";

  return '<div class="card notice-card fade-in" data-id="' + notice.id + '" ' +
    (showDetail ? 'onclick="openNoticeModal(' + safeId + ')"' : '') + '>' +
    '<div class="notice-top">' +
      '<span class="notice-category ' + getCategoryClass(notice.category) + '">' + notice.category + '</span>' +
      (notice.pinned ? '<span class="notice-pin">📌 중요</span>' : '') +
    '</div>' +
    '<h3>' + notice.title + '</h3>' +
    '<p class="notice-summary">' + (notice.summary || notice.title) + '</p>' +
    '<div class="notice-meta">' +
      '<span class="notice-date">' + formatDate(notice.date) + ' 게시</span>' +
      '<div class="notice-actions">' +
        '<button class="btn-icon ' + (bookmarked ? 'bookmarked' : '') + '" onclick="event.stopPropagation(); handleBookmarkClick(' + safeId + ', this)" title="북마크">' + (bookmarked ? '★' : '☆') + '</button>' +
        '<button class="btn-icon ' + (inCalendar ? 'cal-added' : '') + '" onclick="event.stopPropagation(); handleCalendarClick(' + safeId + ', this)" title="캘린더에 추가">📅</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function handleBookmarkClick(noticeId, btn) {
  const nowBookmarked = toggleBookmark(noticeId);
  btn.classList.toggle('bookmarked', nowBookmarked);
  btn.innerHTML = nowBookmarked ? '★' : '☆';
}
function handleCalendarClick(noticeId, btn) {
  if (isNoticeInCalendar(noticeId)) { showToast('이미 캘린더에 추가된 일정입니다'); return; }
  addNoticeToCalendar(noticeId);
  btn.classList.add('cal-added');
}

/* --- 공지 상세 모달 (v2.1: 본문 바로 표시) --- */
async function openNoticeModal(noticeId) {
  const notice = notices.find(n => String(n.id) === String(noticeId));
  if (!notice) return;

  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const bookmarked = isBookmarked(notice.id);
  const inCalendar = isNoticeInCalendar(notice.id);
  const safeId = "'" + String(notice.id).replace(/'/g, "\\'") + "'";
  const hasUrl = notice.url && notice.url !== '#' && notice.source !== 'sample';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal" onclick="event.stopPropagation()">' +
      '<div style="position:relative">' +
        '<button class="modal-close" onclick="closeModal()">✕</button>' +
        '<div class="notice-top" style="margin-bottom:16px;">' +
          '<span class="notice-category ' + getCategoryClass(notice.category) + '">' + notice.category + '</span>' +
          (notice.pinned ? '<span class="notice-pin">📌 중요</span>' : '') +
          (isLiveData && notice.source !== 'sample' ? '<span style="font-size:0.75rem;color:var(--color-primary);font-weight:600;">🟢 실시간</span>' : '') +
        '</div>' +
        '<h2>' + notice.title + '</h2>' +
        '<p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:20px;">' +
          '게시일: ' + formatDateFull(notice.date) +
        '</p>' +
        '<div class="modal-body" id="modalBody">' +
          '<div class="modal-loading"><div class="spinner"></div> 본문을 불러오는 중...</div>' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn ' + (bookmarked ? 'btn-secondary' : 'btn-primary') + '" onclick="handleModalBookmark(' + safeId + ', this)">' + (bookmarked ? '★ 북마크 해제' : '☆ 북마크 추가') + '</button>' +
          '<button class="btn ' + (inCalendar ? 'btn-secondary' : 'btn-primary') + '" onclick="handleModalCalendar(' + safeId + ', this)">' + (inCalendar ? '📅 캘린더에 추가됨' : '📅 캘린더에 추가') + '</button>' +
          (hasUrl ? '<a href="' + notice.url + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">🔗 원문 보기</a>' : '') +
        '</div>' +
      '</div>' +
    '</div>';

  overlay.addEventListener('click', closeModal);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.addEventListener('keydown', handleModalEsc);

  // 본문 로드
  const modalBody = document.getElementById('modalBody');
  if (hasUrl) {
    try {
      const detail = await fetchNoticeDetail(notice.url);
      if (detail && detail.success) {
        let html = '';
        if (detail.content) {
          html += '<div style="white-space:pre-wrap;line-height:1.8;">' + sanitizeHtml(detail.content) + '</div>';
        }
        if (detail.images && detail.images.length > 0) {
          html += '<div style="margin-top:16px;">';
          detail.images.forEach(function(imgUrl) {
            html += '<img src="' + imgUrl + '" alt="공지 이미지" style="max-width:100%;border-radius:8px;margin-bottom:12px;display:block;" onerror="this.style.display=\'none\'">';
          });
          html += '</div>';
        }
        if (html) {
          modalBody.innerHTML = html;
        } else {
          modalBody.innerHTML = '<p style="color:var(--color-text-muted);">본문 파싱에 실패했습니다.</p>' +
            '<p style="margin-top:12px;"><a href="' + notice.url + '" target="_blank" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">한신대학교 원문 공지 보기 →</a></p>';
        }
      } else {
        modalBody.innerHTML = '<p style="color:var(--color-text-muted);">본문을 불러올 수 없습니다.</p>' +
          '<p style="margin-top:12px;"><a href="' + notice.url + '" target="_blank" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">한신대학교 원문 공지 보기 →</a></p>';
      }
    } catch (err) {
      modalBody.innerHTML = '<p style="color:var(--color-text-muted);">본문 로드 중 오류가 발생했습니다.</p>' +
        '<p style="margin-top:12px;"><a href="' + notice.url + '" target="_blank" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">한신대학교 원문 공지 보기 →</a></p>';
    }
  } else {
    // 샘플 데이터
    const hasContent = notice.content && notice.content !== notice.title;
    modalBody.innerHTML = hasContent ? notice.content.replace(/\n/g, '<br>') : '<p>본문 내용이 없습니다.</p>';
  }
}

function sanitizeHtml(text) {
  return text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/on\w+="[^"]*"/gi, '').replace(/on\w+='[^']*'/gi, '');
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300); }
  document.removeEventListener('keydown', handleModalEsc);
}
function handleModalEsc(e) { if (e.key === 'Escape') closeModal(); }

function handleModalBookmark(noticeId, btn) {
  const nowBookmarked = toggleBookmark(noticeId);
  btn.className = 'btn ' + (nowBookmarked ? 'btn-secondary' : 'btn-primary');
  btn.innerHTML = nowBookmarked ? '★ 북마크 해제' : '☆ 북마크 추가';
}
function handleModalCalendar(noticeId, btn) {
  if (isNoticeInCalendar(noticeId)) { showToast('이미 캘린더에 추가된 일정입니다'); return; }
  addNoticeToCalendar(noticeId);
  btn.className = 'btn btn-secondary';
  btn.innerHTML = '📅 캘린더에 추가됨';
}

/* --- 브라우저 알림 --- */
function initNotifications() {
  const enableBtn = document.getElementById('enableNotifBtn');
  if (!enableBtn) return;

  if (!('Notification' in window)) {
    enableBtn.textContent = '🔕 알림 미지원';
    enableBtn.disabled = true;
    return;
  }

  if (Notification.permission === 'granted') {
    enableBtn.textContent = '🔔 알림 켜짐';
    enableBtn.classList.remove('btn-primary');
    enableBtn.classList.add('btn-secondary');
  }

  enableBtn.addEventListener('click', async function() {
    if (Notification.permission === 'granted') {
      showToast('이미 알림이 활성화되어 있습니다');
      return;
    }
    if (Notification.permission === 'denied') {
      showToast('알림이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('알림이 활성화되었습니다!');
        enableBtn.textContent = '🔔 알림 켜짐';
        enableBtn.classList.remove('btn-primary');
        enableBtn.classList.add('btn-secondary');
        localStorage.setItem('csh_notif_enabled', 'true');
        // 테스트 알림
        new Notification('Campus Smart Hub', {
          body: '새 공지가 올라오면 알려드릴게요!',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%236b3fa0"/><text x="50" y="68" text-anchor="middle" fill="white" font-size="50" font-weight="bold">H</text></svg>',
        });
      } else {
        showToast('알림 권한이 거부되었습니다.');
      }
    } catch(e) {
      showToast('알림 설정 중 오류가 발생했습니다.');
    }
  });
}

function sendBrowserNotification(title, body, url) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notif = new Notification(title, {
    body: body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%236b3fa0"/><text x="50" y="68" text-anchor="middle" fill="white" font-size="50" font-weight="bold">H</text></svg>',
    tag: 'csh-notice',
    renotify: true,
  });
  if (url) notif.onclick = function() { window.focus(); notif.close(); };
}

function showNotificationBanner(newNotices) {
  if (!newNotices || newNotices.length === 0) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    sendBrowserNotification('📢 새 공지 ' + newNotices.length + '건', newNotices[0].title + (newNotices.length > 1 ? ' 외 ' + (newNotices.length - 1) + '건' : ''));
  }
  let banner = document.querySelector('.notif-banner');
  if (!banner) { banner = document.createElement('div'); banner.className = 'notif-banner'; document.body.appendChild(banner); }
  banner.innerHTML = '<div class="notif-banner-inner"><span>📢</span><span>새 공지 <strong>' + newNotices.length + '건</strong> 등록! <a href="notices.html" style="color:white;text-decoration:underline;margin-left:4px;">확인 →</a></span><button class="notif-close" onclick="this.closest(\'.notif-banner\').classList.remove(\'show\')">✕</button></div>';
  requestAnimationFrame(() => banner.classList.add('show'));
  setTimeout(() => banner.classList.remove('show'), 10000);
}

/* --- 데이터 로드 대기 --- */
function waitForNotices() {
  return new Promise((resolve) => {
    if (dataReady && notices.length > 0) { resolve(notices); return; }
    window.addEventListener('noticesLoaded', () => resolve(notices), { once: true });
    setTimeout(() => resolve(notices), 10000);
  });
}

/* --- 시간표 관리 --- */
function getTimetable() {
  try { return JSON.parse(localStorage.getItem('csh_timetable')) || []; }
  catch { return []; }
}
function saveTimetable(tt) { localStorage.setItem('csh_timetable', JSON.stringify(tt)); }
function addTimetableEntry(entry) {
  const tt = getTimetable();
  entry.id = Date.now();
  tt.push(entry);
  saveTimetable(tt);
  showToast('시간표에 추가되었습니다');
  return entry;
}
function deleteTimetableEntry(id) {
  let tt = getTimetable();
  tt = tt.filter(e => e.id !== id);
  saveTimetable(tt);
  showToast('시간표에서 삭제되었습니다');
}

/* --- 초기화 --- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initNotifications();

  waitForNotices().then(() => {
    if (isLiveData) {
      const newNotices = checkForNewNotices(notices);
      if (newNotices.length > 0) showNotificationBanner(newNotices);
    }
  });
});
