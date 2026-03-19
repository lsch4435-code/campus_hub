/* ============================================
   home.js - 홈페이지 (v2.2)
   - 최신 공지 (D-day 없음)
   - 다음 셔틀버스
   - 오늘 수업 (시간표)
   - 오늘 일정
   ============================================ */

(function () {
  var urgentGrid = document.getElementById('urgentNotices');
  var todayEventsGrid = document.getElementById('todayEvents');
  var nextShuttleEl = document.getElementById('nextShuttle');
  var todayClassesEl = document.getElementById('todayClasses');

  function showLoading(el) {
    if (!el) return;
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:20px;"><div class="empty-icon">⏳</div><p>불러오는 중...</p></div>';
  }

  /* --- 최신 공지 --- */
  function renderLatestNotices() {
    if (!urgentGrid) return;
    var latest = notices.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    }).slice(0, 4);

    if (latest.length === 0) {
      urgentGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🎉</div><p>표시할 공지가 없습니다</p></div>';
      return;
    }
    urgentGrid.innerHTML = latest.map(function (n) { return createNoticeCardHTML(n); }).join('');
  }

  /* --- 오늘 일정 --- */
  function renderTodayEvents() {
    if (!todayEventsGrid) return;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var events = getEventsForDate(todayStr);

    if (events.length === 0) {
      todayEventsGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">📅</div><p>오늘 등록된 일정이 없습니다</p></div>';
      return;
    }
    todayEventsGrid.innerHTML = events.map(function (e) {
      var src = e.source === 'notice' ? '📋 공지' : e.source === 'academic' ? '🎓 학사일정' : '✏️ 직접';
      return '<div class="card fade-in" style="cursor:default;"><div><h3 style="font-size:1rem;font-weight:600;margin-bottom:4px;">' + e.title + '</h3><span style="font-size:0.8rem;color:var(--color-text-muted);">' + src + '</span></div></div>';
    }).join('');
  }

  /* --- 다음 셔틀버스 --- */
  function renderNextShuttle() {
    if (!nextShuttleEl || typeof SHUTTLE_SCHEDULE === 'undefined') return;

    var dayNames = ['일','월','화','수','목','금','토'];
    var today = dayNames[new Date().getDay()];
    var nowMin = new Date().getHours() * 60 + new Date().getMinutes();

    if (['토','일'].indexOf(today) !== -1) {
      nextShuttleEl.innerHTML = '<div style="padding:12px;color:var(--color-text-muted);font-size:0.9rem;text-align:center;">주말은 운행하지 않습니다</div>';
      return;
    }

    function matchDay(ds, td) {
      if (ds.includes('~')) {
        var all = ['월','화','수','목','금','토','일'];
        var p = ds.replace(/\s/g,'').split('~');
        return all.indexOf(td) >= all.indexOf(p[0]) && all.indexOf(td) <= all.indexOf(p[1]);
      }
      if (ds.includes('·')) return ds.split('·').map(function(s){return s.trim();}).indexOf(td) !== -1;
      return ds.trim() === td;
    }
    function parseM(t) { var m = t.match(/(\d{2}):(\d{2})/); return m ? parseInt(m[1])*60+parseInt(m[2]) : -1; }

    var nextBuses = [];
    for (var name in SHUTTLE_SCHEDULE) {
      var route = SHUTTLE_SCHEDULE[name];
      var todayTimes = [];
      route.schedule.forEach(function(s) {
        if (matchDay(s.days, today)) s.times.forEach(function(t) { todayTimes.push(t); });
      });
      for (var i = 0; i < todayTimes.length; i++) {
        var m = parseM(todayTimes[i]);
        if (m > nowMin) {
          nextBuses.push({ route: name, time: todayTimes[i], diff: m - nowMin, icon: route.icon });
          break;
        }
      }
    }

    if (nextBuses.length === 0) {
      nextShuttleEl.innerHTML = '<div style="padding:12px;color:var(--color-text-muted);font-size:0.9rem;text-align:center;">오늘 셔틀 운행이 모두 종료되었습니다</div>';
      return;
    }

    nextBuses.sort(function(a,b) { return a.diff - b.diff; });
    var html = '';
    nextBuses.slice(0, 3).forEach(function(b) {
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--color-border-light);">';
      html += '<span style="font-size:1.2rem;">' + b.icon + '</span>';
      html += '<div style="flex:1;"><div style="font-size:0.88rem;font-weight:600;">' + b.route + '</div>';
      html += '<div style="font-size:0.8rem;color:var(--color-text-muted);">' + b.time + '</div></div>';
      html += '<span style="background:var(--color-primary);color:white;padding:3px 10px;border-radius:12px;font-size:0.78rem;font-weight:700;">' + b.diff + '분 후</span>';
      html += '</div>';
    });
    nextShuttleEl.innerHTML = html;
  }

  /* --- 오늘 수업 (시간표) --- */
  function renderTodayClasses() {
    if (!todayClassesEl) return;

    var dayIdx = new Date().getDay() - 1; // 0=월 1=화 ... 4=금
    if (dayIdx < 0 || dayIdx > 4) {
      todayClassesEl.innerHTML = '<div style="padding:12px;color:var(--color-text-muted);font-size:0.9rem;text-align:center;">오늘은 수업이 없는 날입니다</div>';
      return;
    }

    var tt = getTimetable();
    var todayClasses = tt.filter(function(e) { return e.day === dayIdx; })
      .sort(function(a,b) { return a.startHour - b.startHour; });

    if (todayClasses.length === 0) {
      todayClassesEl.innerHTML = '<div style="padding:12px;color:var(--color-text-muted);font-size:0.9rem;text-align:center;">오늘 등록된 수업이 없습니다<br><a href="timetable.html" style="color:var(--color-primary);font-size:0.85rem;">시간표 등록하기 →</a></div>';
      return;
    }

    var nowHour = new Date().getHours();
    var colors = ['tt-colors-0','tt-colors-1','tt-colors-2','tt-colors-3','tt-colors-4','tt-colors-5','tt-colors-6','tt-colors-7'];
    var html = '';
    todayClasses.forEach(function(c, i) {
      var isNow = nowHour >= c.startHour && nowHour < c.endHour;
      var isPast = nowHour >= c.endHour;
      var cls = colors[i % 8];
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--color-border-light);' + (isPast ? 'opacity:0.4;' : '') + '">';
      html += '<div class="' + cls + '" style="width:6px;height:32px;border-radius:3px;flex-shrink:0;"></div>';
      html += '<div style="flex:1;"><div style="font-size:0.88rem;font-weight:600;">' + c.name + (isNow ? ' <span style="color:var(--color-primary);font-size:0.75rem;">● 수업중</span>' : '') + '</div>';
      html += '<div style="font-size:0.8rem;color:var(--color-text-muted);">' + String(c.startHour).padStart(2,'0') + ':00~' + String(c.endHour).padStart(2,'0') + ':00' + (c.room ? ' · ' + c.room : '') + '</div></div>';
      html += '</div>';
    });
    todayClassesEl.innerHTML = html;
  }

  /* --- 초기화 --- */
  showLoading(urgentGrid);
  renderNextShuttle();
  renderTodayClasses();

  waitForNotices().then(function () {
    renderLatestNotices();
    renderTodayEvents();
  });

  // 1분마다 셔틀 갱신
  setInterval(renderNextShuttle, 60000);
})();
