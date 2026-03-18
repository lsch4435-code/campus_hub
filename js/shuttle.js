
/* ============================================
   shuttle.js - 셔틀버스 시간표
   Campus Smart Hub v2
   ============================================ */

(function () {
  const container = document.getElementById('shuttleContainer');
  if (!container) return;

  function getCurrentTimeMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function renderShuttle() {
    const nowMinutes = getCurrentTimeMinutes();

    let html = '';
    for (const [routeName, routeData] of Object.entries(SHUTTLE_SCHEDULE)) {
      html += '<div class="shuttle-card">';
      html += '<div class="shuttle-card-header">';
      html += '<span class="shuttle-icon">' + routeData.icon + '</span>';
      html += '<h3>' + routeName + '</h3>';
      html += '</div>';
      html += '<div class="shuttle-times">';

      let foundNext = false;
      routeData.times.forEach(t => {
        const tMin = timeToMinutes(t.time);
        const isNext = !foundNext && tMin > nowMinutes;
        if (isNext) foundNext = true;

        const isPast = tMin <= nowMinutes;

        html += '<div class="shuttle-time-row' + (isNext ? ' next-bus' : '') + '" ' +
          (isPast ? 'style="opacity:0.45;"' : '') + '>';
        html += '<span class="st-time">' + t.time + '</span>';
        if (isNext) {
          const diff = tMin - nowMinutes;
          html += '<span class="st-badge">' + diff + '분 후 출발</span>';
        }
        if (t.note) {
          html += '<span class="st-note">' + t.note + '</span>';
        }
        html += '</div>';
      });

      if (!foundNext) {
        html += '<div class="shuttle-time-row" style="justify-content:center;color:var(--color-text-muted);font-size:0.85rem;">';
        html += '오늘 운행이 종료되었습니다';
        html += '</div>';
      }

      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  renderShuttle();
  // 1분마다 갱신
  setInterval(renderShuttle, 60000);
})();
