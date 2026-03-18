
/* ============================================
   timetable.js - 시간표 등록/관리
   Campus Smart Hub v2
   ============================================ */

(function () {
  const DAYS = ['월', '화', '수', '목', '금'];
  const HOURS_START = 9;
  const HOURS_END = 18;

  const tableContainer = document.getElementById('timetableGrid');
  const formSection = document.getElementById('timetableForm');

  function init() {
    renderTimetable();
    initForm();
  }

  /* --- 시간표 테이블 렌더링 --- */
  function renderTimetable() {
    if (!tableContainer) return;

    const entries = getTimetable();
    
    let html = '<table class="timetable">';
    
    // 헤더
    html += '<thead><tr><th style="width:60px;">시간</th>';
    DAYS.forEach(d => { html += '<th>' + d + '</th>'; });
    html += '</tr></thead><tbody>';

    // 시간 행
    for (let h = HOURS_START; h < HOURS_END; h++) {
      html += '<tr>';
      html += '<td class="time-col">' + String(h).padStart(2, '0') + ':00</td>';
      
      DAYS.forEach((day, dayIdx) => {
        html += '<td data-day="' + dayIdx + '" data-hour="' + h + '" style="position:relative;">';
        
        // 이 칸에 해당하는 수업 찾기
        entries.forEach((entry, idx) => {
          if (entry.day === dayIdx && entry.startHour === h) {
            const height = (entry.endHour - entry.startHour) * 48; // 48px per hour
            const colorIdx = idx % 8;
            html += '<div class="tt-cell tt-colors-' + colorIdx + '" ' +
              'style="height:' + height + 'px;" ' +
              'onclick="event.stopPropagation(); showTimetableDetail(' + entry.id + ')" ' +
              'title="' + entry.name + ' - ' + entry.room + '">' +
              '<div>' + entry.name + '</div>' +
              '<div class="tt-room">' + entry.room + '</div>' +
            '</div>';
          }
        });
        
        html += '</td>';
      });
      
      html += '</tr>';
    }

    html += '</tbody></table>';
    tableContainer.innerHTML = html;
  }

  /* --- 시간표 상세 (삭제) --- */
  window.showTimetableDetail = function (id) {
    const entries = getTimetable();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    if (confirm(entry.name + ' (' + DAYS[entry.day] + ' ' + entry.startHour + ':00~' + entry.endHour + ':00)\n\n삭제하시겠습니까?')) {
      deleteTimetableEntry(id);
      renderTimetable();
    }
  };

  /* --- 입력 폼 --- */
  function initForm() {
    if (!formSection) return;

    const addBtn = document.getElementById('ttAddBtn');
    if (addBtn) {
      addBtn.addEventListener('click', handleAddEntry);
    }
  }

  function handleAddEntry() {
    const name = document.getElementById('ttName').value.trim();
    const professor = document.getElementById('ttProfessor').value.trim();
    const room = document.getElementById('ttRoom').value.trim();
    const day = parseInt(document.getElementById('ttDay').value);
    const startHour = parseInt(document.getElementById('ttStart').value);
    const endHour = parseInt(document.getElementById('ttEnd').value);

    if (!name) { showToast('과목명을 입력해주세요'); return; }
    if (isNaN(day)) { showToast('요일을 선택해주세요'); return; }
    if (isNaN(startHour) || isNaN(endHour)) { showToast('시간을 선택해주세요'); return; }
    if (startHour >= endHour) { showToast('종료 시간은 시작 시간보다 커야 합니다'); return; }

    // 겹침 체크
    const entries = getTimetable();
    const overlap = entries.find(e => {
      return e.day === day && !(endHour <= e.startHour || startHour >= e.endHour);
    });
    if (overlap) {
      showToast('해당 시간에 이미 "' + overlap.name + '" 수업이 있습니다');
      return;
    }

    addTimetableEntry({
      name: name,
      professor: professor || '',
      room: room || '',
      day: day,
      startHour: startHour,
      endHour: endHour,
    });

    // 폼 초기화
    document.getElementById('ttName').value = '';
    document.getElementById('ttProfessor').value = '';
    document.getElementById('ttRoom').value = '';

    renderTimetable();
  }

  init();
})();
