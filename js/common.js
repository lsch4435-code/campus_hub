/* ============================================
   common.js - 공통 유틸리티 함수 (API 연동 버전)
   Campus Smart Hub
   
   변경사항:
   - notices가 비동기로 로드되므로, noticesLoaded 이벤트 대기
   - 공지 상세 모달에서 '원문 보기' 외부 링크 추가
   - 카테고리에 '일반', '혁신' 추가
   ============================================ */

/* --- 모바일 네비게이션 토글 --- */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
    links.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => links.classList.remove('open'));
    });
  }
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

/* --- D-day 계산 --- */
function calculateDday(deadlineStr) {
  if (!deadlineStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getDdayText(diff) {
  if (diff < 0) return '마감';
  if (diff === 0) return '오늘 마감';
  return 'D-' + diff;
}

function getDdayClass(diff) {
  if (diff < 0) return 'dday-passed';
  if (diff === 0) return 'dday-urgent';
  if (diff <= 3) return 'dday-urgent';
  if (diff <= 7) return 'dday-soon';
  return 'dday-normal';
}

/* --- 북마크 관리 (LocalStorage) --- */
function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('csh_bookmarks')) || [];
  } catch { return []; }
}

function toggleBookmark(noticeId) {
  let bookmarks = getBookmarks();
  // 문자열 ID 지원 (API 데이터의 id는 문자열)
  const idStr = String(noticeId);
  const idx = bookmarks.findIndex(b => String(b) === idStr);
  if (idx > -1) {
    bookmarks.splice(idx, 1);
    showToast('북마크가 해제되었습니다');
  } else {
    bookmarks.push(noticeId);
    showToast('북마크에 저장되었습니다');
  }
  localStorage.setItem('csh_bookmarks', JSON.stringify(bookmarks));
  return bookmarks.some(b => String(b) === idStr);
}

function isBookmarked(noticeId) {
  const idStr = String(noticeId);
  return getBookmarks().some(b => String(b) === idStr);
}

/* --- 캘린더 일정 관리 (LocalStorage) --- */
function getEvents() {
  try {
    return JSON.parse(localStorage.getItem('csh_events')) || [];
  } catch { return []; }
}

function saveEvents(events) {
  localStorage.setItem('csh_events', JSON.stringify(events));
}

function addEvent(dateStr, title, source) {
  const events = getEvents();
  const duplicate = events.find(e => e.date === dateStr && e.title === title);
  if (duplicate) {
    showToast('이미 등록된 일정입니다');
    return false;
  }
  events.push({
    id: Date.now(),
    date: dateStr,
    title: title,
    source: source || 'manual'
  });
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

/* --- 공지를 캘린더에 추가 --- */
function addNoticeToCalendar(noticeId) {
  const notice = notices.find(n => String(n.id) === String(noticeId));
  if (!notice || !notice.deadline) return;
  return addEvent(notice.deadline, notice.title, 'notice');
}

function isNoticeInCalendar(noticeId) {
  const notice = notices.find(n => String(n.id) === String(noticeId));
  if (!notice) return false;
  const events = getEvents();
  return events.some(e => e.title === notice.title && e.source === 'notice');
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
  const map = {
    '학사': 'category-학사',
    '장학': 'category-장학',
    '기숙사': 'category-기숙사',
    '취업': 'category-취업',
    '일반': 'category-default',
    '혁신': 'category-혁신',
  };
  return map[category] || 'category-default';
}

/* --- 공지 카드 HTML 생성 --- */
function createNoticeCardHTML(notice, options) {
  options = options || {};
  const dday = calculateDday(notice.deadline);
  const ddayText = getDdayText(dday);
  const ddayClass = getDdayClass(dday);
  const bookmarked = isBookmarked(notice.id);
  const inCalendar = isNoticeInCalendar(notice.id);
  const showDetail = options.showDetail !== false;

  // ID를 안전하게 인용 (문자열 ID 대비)
  const safeId = "'" + String(notice.id).replace(/'/g, "\\'") + "'";

  return '<div class="card notice-card fade-in" data-id="' + notice.id + '" ' +
    (showDetail ? 'onclick="openNoticeModal(' + safeId + ')"' : '') + '>' +
    '<div class="notice-top">' +
      '<span class="notice-category ' + getCategoryClass(notice.category) + '">' + notice.category + '</span>' +
      (notice.pinned ? '<span class="notice-pin">📌 중요</span>' : '') +
      '<span class="notice-dday ' + ddayClass + '">' + ddayText + '</span>' +
    '</div>' +
    '<h3>' + notice.title + '</h3>' +
    '<p class="notice-summary">' + (notice.summary || notice.title) + '</p>' +
    '<div class="notice-meta">' +
      '<span class="notice-date">' + formatDate(notice.date) + ' 게시' + (notice.deadline ? ' · 마감 ' + formatDate(notice.deadline) : '') + '</span>' +
      '<div class="notice-actions">' +
        '<button class="btn-icon ' + (bookmarked ? 'bookmarked' : '') + '" onclick="event.stopPropagation(); handleBookmarkClick(' + safeId + ', this)" title="북마크">' +
          (bookmarked ? '★' : '☆') +
        '</button>' +
        '<button class="btn-icon ' + (inCalendar ? 'cal-added' : '') + '" onclick="event.stopPropagation(); handleCalendarClick(' + safeId + ', this)" title="캘린더에 추가">' +
          '📅' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* --- 북마크 버튼 핸들러 --- */
function handleBookmarkClick(noticeId, btn) {
  const nowBookmarked = toggleBookmark(noticeId);
  btn.classList.toggle('bookmarked', nowBookmarked);
  btn.innerHTML = nowBookmarked ? '★' : '☆';
}

/* --- 캘린더 추가 버튼 핸들러 --- */
function handleCalendarClick(noticeId, btn) {
  if (isNoticeInCalendar(noticeId)) {
    showToast('이미 캘린더에 추가된 일정입니다');
    return;
  }
  addNoticeToCalendar(noticeId);
  btn.classList.add('cal-added');
}

/* --- 공지 상세 모달 --- */
function openNoticeModal(noticeId) {
  const notice = notices.find(n => String(n.id) === String(noticeId));
  if (!notice) return;

  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

const bookmarked = isBookmarked(notice.id);
const inCalendar = isNoticeInCalendar(notice.id);
const safeId = "'" + String(notice.id).replace(/'/g, "\\'") + "'";
const hasUrl = notice.url && notice.url !== '#' && notice.source !== 'sample';
const hasRealContent = notice.content && notice.content !== notice.title;

const contentHTML = hasRealContent
  ? notice.content.replace(/\n/g, '<br>')
  : '<p>이 공지는 현재 목록 정보만 불러와서 본문 전체는 바로 표시되지 않습니다.</p>' +
    (hasUrl
      ? '<p style="margin-top:12px;"><a href="' + notice.url + '" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">한신대학교 원문 공지 보기 →</a></p>'
      : '');
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
          (notice.deadline ? ' · 마감: ' + formatDateFull(notice.deadline) : '') +
        '</p>' +
        '<div class="modal-body">' + contentHTML + '</div>' +
        (hasUrl ?
          '<div style="margin:16px 0;padding:12px 16px;background:var(--color-primary-light);border-radius:var(--radius-sm);font-size:0.9rem;">' +
            '📎 <a href="' + notice.url + '" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">한신대학교 원문 공지 보기 →</a>' +
          '</div>'
        : '') +
        '<div class="modal-actions">' +
          '<button class="btn ' + (bookmarked ? 'btn-secondary' : 'btn-primary') + '" onclick="handleModalBookmark(' + safeId + ', this)">' +
            (bookmarked ? '★ 북마크 해제' : '☆ 북마크 추가') +
          '</button>' +
          '<button class="btn ' + (inCalendar ? 'btn-secondary' : 'btn-primary') + '" onclick="handleModalCalendar(' + safeId + ', this)">' +
            (inCalendar ? '📅 캘린더에 추가됨' : '📅 캘린더에 추가') +
          '</button>' +
          (hasUrl ?
            '<a href="' + notice.url + '" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">🔗 원문 보기</a>'
          : '') +
        '</div>' +
      '</div>' +
    '</div>';

  overlay.addEventListener('click', closeModal);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.addEventListener('keydown', handleModalEsc);
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  }
  document.removeEventListener('keydown', handleModalEsc);
}

function handleModalEsc(e) {
  if (e.key === 'Escape') closeModal();
}

function handleModalBookmark(noticeId, btn) {
  const nowBookmarked = toggleBookmark(noticeId);
  btn.className = 'btn ' + (nowBookmarked ? 'btn-secondary' : 'btn-primary');
  btn.innerHTML = nowBookmarked ? '★ 북마크 해제' : '☆ 북마크 추가';
}

function handleModalCalendar(noticeId, btn) {
  if (isNoticeInCalendar(noticeId)) {
    showToast('이미 캘린더에 추가된 일정입니다');
    return;
  }
  addNoticeToCalendar(noticeId);
  btn.className = 'btn btn-secondary';
  btn.innerHTML = '📅 캘린더에 추가됨';
}

/* --- 데이터 로드 완료 대기 유틸리티 --- */
function waitForNotices() {
  return new Promise((resolve) => {
    if (dataReady && notices.length > 0) {
      resolve(notices);
      return;
    }
    window.addEventListener('noticesLoaded', () => {
      resolve(notices);
    }, { once: true });
    // 안전장치: 10초 후에도 안 오면 현재 상태로 resolve
    setTimeout(() => resolve(notices), 10000);
  });
}

/* --- 초기화 --- */
document.addEventListener('DOMContentLoaded', initNav);
