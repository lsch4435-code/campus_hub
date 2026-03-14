/* ============================================
   calendar.js - 캘린더 일정 관리 로직
   Campus Smart Hub
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

  let currentYear, currentMonth;
  let selectedDate = null;

  /* --- 초기화 --- */
  function init() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();

    // 오늘 날짜를 선택 상태로 설정
    const todayStr = formatDateStr(currentYear, currentMonth, now.getDate());
    selectedDate = todayStr;

    renderCalendar();
    renderEventPanel();
  }

  /* --- 날짜 문자열 포맷 (YYYY-MM-DD) --- */
  function formatDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  /* --- 캘린더 렌더링 --- */
  function renderCalendar() {
    // 제목 업데이트
    calendarTitle.textContent = `${currentYear}년 ${currentMonth + 1}월`;

    // 해당 월의 첫 번째 날과 마지막 날
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDay.getDay(); // 0(일) ~ 6(토)
    const totalDays = lastDay.getDate();

    // 이전 달의 마지막 날
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();

    // 오늘 날짜
    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    // 모든 이벤트 가져오기
    const allEvents = getEvents();

    let html = '';

    // 이전 달 날짜
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevLastDay - i;
      html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // 이번 달 날짜
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = formatDateStr(currentYear, currentMonth, day);
      const isToday = dateStr === todayStr;
      const hasEvent = allEvents.some(e => e.date === dateStr);
      const isSelected = dateStr === selectedDate;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (hasEvent) classes += ' has-event';
      if (isSelected && !isToday) {
        // 선택된 날짜에 미묘한 스타일 추가
      }

      html += `<div class="${classes}" 
                    data-date="${dateStr}" 
                    onclick="selectDate('${dateStr}')"
                    ${isSelected ? 'style="outline: 2px solid var(--color-primary); outline-offset: -2px;"' : ''}>
                ${day}
              </div>`;
    }

    // 다음 달 날짜 (6줄 채우기)
    const totalCells = startDay + totalDays;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day other-month">${i}</div>`;
    }

    calendarDays.innerHTML = html;
  }

  /* --- 날짜 선택 --- */
  window.selectDate = function (dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    renderEventPanel();
  };

  /* --- 이벤트 패널 렌더링 --- */
  function renderEventPanel() {
    if (!selectedDate) {
      eventPanel.style.display = 'none';
      return;
    }

    eventPanel.style.display = 'block';

    // 날짜 표시
    const d = new Date(selectedDate);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    eventDateTitle.textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;

    // 일정 목록
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
            ${e.source === 'notice' ? '<span class="event-source">📋 공지에서 추가</span>' : ''}
          </div>
          <button class="event-delete" onclick="handleDeleteEvent(${e.id})" title="삭제">✕</button>
        </div>
      `).join('');
    }
  }

  /* --- 일정 추가 --- */
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

  /* --- 일정 삭제 --- */
  window.handleDeleteEvent = function (eventId) {
    deleteEvent(eventId);
    renderCalendar();
    renderEventPanel();
  };

  /* --- 이벤트 바인딩 --- */
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      selectedDate = null;
      renderCalendar();
      renderEventPanel();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      selectedDate = null;
      renderCalendar();
      renderEventPanel();
    });
  }

  if (eventAddBtn) {
    eventAddBtn.addEventListener('click', handleAddEvent);
  }

  if (eventInput) {
    eventInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddEvent();
    });
  }

  // 초기화
  init();
})();
