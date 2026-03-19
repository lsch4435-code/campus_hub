/* ============================================
   shuttle.js - 셔틀버스 시간표 (v2.1 fix)
   data.js의 schedule:[{days,times}] 구조에 맞춤
   ============================================ */

(function () {
  const container = document.getElementById('shuttleContainer');
  if (!container) return;

  function getTodayDayName() {
    return ['일','월','화','수','목','금','토'][new Date().getDay()];
  }

  function matchesDay(daysStr, today) {
    if (daysStr.includes('~')) {
      var all = ['월','화','수','목','금','토','일'];
      var p = daysStr.replace(/\s/g,'').split('~');
      return all.indexOf(today) >= all.indexOf(p[0]) && all.indexOf(today) <= all.indexOf(p[1]);
    }
    if (daysStr.includes('·')) return daysStr.split('·').map(function(s){return s.trim();}).includes(today);
    return daysStr.trim() === today;
  }

  function nowMinutes() {
    var n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }

  function parseMin(t) {
    var m = t.match(/(\d{2}):(\d{2})/);
    return m ? parseInt(m[1])*60+parseInt(m[2]) : -1;
  }

  function render() {
    var today = getTodayDayName();
    var now = nowMinutes();

    if (['토','일'].indexOf(today) !== -1) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🚌</div><p>주말·공휴일은 셔틀버스가 운행되지 않습니다.</p></div>';
      return;
    }

    var html = '';
    for (var name in SHUTTLE_SCHEDULE) {
      var route = SHUTTLE_SCHEDULE[name];
      var todayTimes = [];
      route.schedule.forEach(function(s) {
        if (matchesDay(s.days, today)) {
          s.times.forEach(function(t) { todayTimes.push(t); });
        }
      });

      html += '<div class="shuttle-card">';
      html += '<div class="shuttle-card-header"><span class="shuttle-icon">' + route.icon + '</span><h3>' + name + '</h3></div>';

      if (route.note) {
        html += '<div style="padding:10px 20px;font-size:0.78rem;color:var(--color-text-muted);background:var(--color-bg);border-bottom:1px solid var(--color-border-light);line-height:1.5;">' + route.note + '</div>';
      }

      html += '<div class="shuttle-times">';

      if (todayTimes.length === 0) {
        html += '<div style="padding:20px;text-align:center;color:var(--color-text-muted);font-size:0.88rem;">오늘(' + today + '요일)은 이 노선이 운행되지 않습니다</div>';
      } else {
        var nextFound = false;
        todayTimes.forEach(function(t) {
          var m = parseMin(t);
          var isNext = !nextFound && m > now;
          if (isNext) nextFound = true;
          var past = m > 0 && m <= now;

          html += '<div class="shuttle-time-row' + (isNext ? ' next-bus' : '') + '"' + (past ? ' style="opacity:0.4"' : '') + '>';
          html += '<span class="st-time">' + t + '</span>';
          if (isNext && m > 0) html += '<span class="st-badge">' + (m - now) + '분 후</span>';
          html += '</div>';
        });

        if (!nextFound) {
          html += '<div style="padding:10px 0;text-align:center;color:var(--color-text-muted);font-size:0.85rem;">오늘 운행이 종료되었습니다</div>';
        }
      }

      // 전체 요일별 접기
      html += '<details style="padding:8px 20px 12px;border-top:1px solid var(--color-border-light);">';
      html += '<summary style="font-size:0.82rem;color:var(--color-primary);cursor:pointer;padding:6px 0;font-weight:500;">📋 전체 요일별 시간표</summary>';
      html += '<div style="font-size:0.82rem;line-height:2;margin-top:6px;color:var(--color-text-secondary);">';
      route.schedule.forEach(function(s) {
        html += '<div><strong>[' + s.days + ']</strong> ' + s.times.join(' / ') + '</div>';
      });
      html += '</div></details>';

      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  render();
  setInterval(render, 60000);
})();
