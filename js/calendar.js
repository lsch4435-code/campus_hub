/* ============================================
   calendar.js - 캘린더 (v2)
   Campus Smart Hub v2
   
   변경사항:
   - 학사일정 자동등록 섹션 추가
   - 시간표 페이지 링크
   ============================================ */

(function () {
  const calendarDays = document.getElementById('calendarDays');
  const calendarTitle = document.getElementById('calendarTitle');
  const prevBtn = document.getElementById('calendarPrev');
  const nextBtn = document.getElementById('calendarNext');
  const eventPanel = document.getElementById('eventPanel');
  const eventDateTitle = document.getElementById('eventDateTitle');
  const eventList = document.getElementById('eventList');
  const eventInput = document.getElementById('eventInput');
  const eventAddBtn = document.getElementById('eventAddBtn');
  const academicSection = document.getElementById('academicCalendarSection');

  let currentYear, currentMonth;
  let selectedDate = null;

  function init() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    selectedDate = formatDateStr(currentYear, currentMonth, now.getDate());
    renderCalendar();
    renderEventPanel();
    renderAcademicCalendar();
  }

  function formatDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function renderCalendar() {
    calendarTitle.textContent = `${currentYear}년 ${currentMonth + 1}월`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    const allEvents = getEvents();

    let html = '';

    for (let i = startDay - 1; i >= 0; i--) {
      html += `<div class="calendar-day other-month">${prevLastDay - i}</div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = formatDateStr(currentYear, currentMonth, day);
      const isToday = dateStr === todayStr;
      const hasEvent = allEvents.some(e => e.date === dateStr);
      const isSelected = dateStr === selectedDate;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (hasEvent) classes += ' has-event';
      if (isSelected && !isToday) classes += ' selected';

      html += `<div class="${classes}" data-date="${dateStr}" onclick="selectDate('${dateStr}')">${day}</div>`;
    }

    const totalCells = startDay + totalDays;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day other-month">${i}</div>`;
    }

    calendarDays.innerHTML = html;
  }

  window.selectDate = function (dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    renderEventPanel();
  };

  function renderEventPanel() {
    if (!selectedDate) {
      eventPanel.style.display = 'none';
      return;
    }

    eventPanel.style.display = 'block';

    const d = new Date(selectedDate);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    eventDateTitle.textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;

    const events = getEventsForDate(selectedDate);

    if (events.length === 0) {
      eventList.innerHTML = `
        <div class="empty-state" style="padding: 24px;">
          <p style="font-size: 0.9rem;">등록된 일정이 없습니다</p>
        </div>
      `;
    } else {
      eventList.innerHTML = events.map(e => `
        <div class="event-item">
          <div>
            <span>${e.title}</span>
            ${e.source === 'notice' ? '<span class="event-source">📋 공지에서 추가</span>' : 
              e.source === 'academic' ? '<span class="event-source">🎓 학사일정</span>' : ''}
          </div>
          <button class="event-delete" onclick="handleDeleteEvent(${e.id})" title="삭제">✕</button>
        </div>
      `).join('');
    }
  }

  /* --- 학사일정 자동등록 섹션 --- */
  function renderAcademicCalendar() {
    if (!academicSection) return;
    if (typeof ACADEMIC_CALENDAR === 'undefined') return;

    const existingEvents = getEvents();

    const html = ACADEMIC_CALENDAR.map(ac => {
      const isAdded = existingEvents.some(e => e.title === ac.title && e.source === 'academic');
      const typeEmoji = ac.type === 'exam' ? '📝' : ac.type === 'deadline' ? '⚠️' : '📌';

      return `<div class="academic-event-item">
        <span class="ae-title">${typeEmoji} ${ac.title}</span>
        <span class="ae-date">${formatDate(ac.date)}</span>
        ${isAdded 
          ? '<button class="ae-btn ae-added" disabled>등록됨</button>'
          : '<button class="ae-btn ae-add" onclick="addAcademicEvent(\'' + ac.title + '\', \'' + ac.date + '\', this)">등록</button>'
        }
      </div>`;
    }).join('');

    academicSection.innerHTML = `
      <h4>🎓 2026학년도 1학기 학사일정</h4>
      <p style="font-size:0.82rem;color:var(--color-text-muted);margin-bottom:12px;">주요 학사일정을 캘린더에 한번에 등록하세요.</p>
      <button class="btn btn-sm btn-primary" onclick="addAllAcademicEvents()" style="margin-bottom:14px;">📅 전체 일괄 등록</button>
      <div class="academic-event-list">${html}</div>
    `;
  }

  window.addAcademicEvent = function (title, dateStr, btn) {
    const success = addEvent(dateStr, title, 'academic');
    if (success && btn) {
      btn.className = 'ae-btn ae-added';
      btn.textContent = '등록됨';
      btn.disabled = true;
    }
    renderCalendar();
    renderEventPanel();
  };

  window.addAllAcademicEvents = function () {
    let count = 0;
    ACADEMIC_CALENDAR.forEach(ac => {
      const existingEvents = getEvents();
      const isAdded = existingEvents.some(e => e.title === ac.title && e.source === 'academic');
      if (!isAdded) {
        addEvent(ac.date, ac.title, 'academic');
        count++;
      }
    });
    if (count > 0) {
      showToast(count + '개 학사일정이 등록되었습니다');
    } else {
      showToast('이미 모든 학사일정이 등록되어 있습니다');
    }
    renderAcademicCalendar();
    renderCalendar();
    renderEventPanel();
  };

  function handleAddEvent() {
    if (!selectedDate) {
      showToast('날짜를 선택해주세요');
      return;
    }
    const title = eventInput.value.trim();
    if (!title) {
      showToast('일정 제목을 입력해주세요');
      return;
    }
    addEvent(selectedDate, title, 'manual');
    eventInput.value = '';
    renderCalendar();
    renderEventPanel();
  }

  window.handleDeleteEvent = function (eventId) {
    deleteEvent(eventId);
    renderCalendar();
    renderEventPanel();
    renderAcademicCalendar();
  };

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      selectedDate = null;
      renderCalendar();
      renderEventPanel();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      selectedDate = null;
      renderCalendar();
      renderEventPanel();
    });
  }

  if (eventAddBtn) eventAddBtn.addEventListener('click', handleAddEvent);
  if (eventInput) eventInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAddEvent(); });

  init();
})();
