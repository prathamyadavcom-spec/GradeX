

(function () {
  'use strict';
  /* Edit these to match the real product. */
  var CONFIG = { waitlistUrl: '', ai: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', fallbackModel: 'google/gemma-3-27b-it:free', key: '', edgeFunction: 'ask-gradex' }, supabase: { url: 'https://vafrmajuvvhykemtalui.supabase.co', anonKey: 'sb_publishable_T0C1umAx-STjXmxO_fU0uQ_aWX1znuT', profilesTable: 'profiles', idColumn: 'id', roleColumn: 'role', allowDemo: true } }; /* Fill url + anonKey (the public anon key only, never the service-role key) to switch from demo accounts to real Supabase auth. See SUPABASE.md. */ /* Optional AI explainer. Leave key empty in browser code; route through a backend if you add one. */
  var CN_KEY = 'gradex.connections', CN = {};
  try { CN = JSON.parse(localStorage.getItem(CN_KEY) || '{}') || {}; } catch (e) { CN = {}; }
  if (CN.sbUrl && CN.sbKey && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)/.test(CN.sbUrl)) { CONFIG.supabase.url = CN.sbUrl; CONFIG.supabase.anonKey = CN.sbKey; }
  if (CN.aiProv && CN.aiKey) { CONFIG.ai.provider = CN.aiProv; CONFIG.ai.key = CN.aiKey; if (CN.aiModel) CONFIG.ai.model = CN.aiModel; CONFIG.ai.edgeFunction = ''; }
  var SUBJECTS = ['Discrete Maths', 'Data Structures', 'DBMS', 'Comm. Skills', 'Operating Systems', 'Computer Networks'];
  var SHORT = ['Maths', 'DSA', 'DBMS', 'Comm', 'OS', 'Networks'];
  var SCORES = [[62, 55, 48, 71, 66, 78], [68, 63, 57, 74, 70, 82], [76, 72, 66, 79, 73, 88]];
  var BANDS = [{ min: 85, l: 'A' }, { min: 70, l: 'B' }, { min: 55, l: 'C' }, { min: 40, l: 'D' }];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var mob = window.innerWidth < 900;
  function gradeOf(s) { for (var i = 0; i < BANDS.length; i++) { if (s >= BANDS[i].min) return BANDS[i].l; } return 'E'; }
  function nextBand(s) { var nb = null; BANDS.forEach(function (b) { if (b.min > s) nb = b; }); return nb; }
  function avg(arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- pages: one page per feature ---------- */
  var PAGES = [
    { id: 'glance', n: 'At a glance', b: 'Six rings, one per subject, with the lowest in coral, plus a sample insight and the grade bands.', kw: ['at a glance', 'ring', 'grade band', 'bands', 'overview'] },
    { id: 'progress', n: 'Progress', b: 'Sem 3 against Sem 5 for every subject, with the lowest subject spelled out.', kw: ['progress', 'compare', 'comparison', 'improved', 'trend'] },
    { id: 'journey', n: 'Journey', b: 'A scroll-driven timeline of three semesters: where you started, the biggest gain and the next step.', kw: ['journey', 'timeline', 'milestone'] },
    { id: 'sim', n: 'Simulator', b: 'Pick a subject and a target gain to see the new grade and average before the next test.', kw: ['simulator', 'simulate', 'what if', 'next band'] },
    { id: 'attendance', n: 'Attendance', b: 'Set a target and see how many classes you can still miss, or must attend in a row.', kw: ['attendance', 'skip', 'bunk', 'miss a class', 'planner'] },
    { id: 'cgpa', n: 'CGPA', b: 'Semester GPA and the three-semester average on a 10-point scale, with editable credits.', kw: ['cgpa', 'gpa', 'credit', 'planner'] },
    { id: 'timetable', n: 'Timetable', b: 'Your week by day, with the class you are in now and what comes next.', kw: ['timetable', 'schedule', 'next class', 'room', 'planner'] },
    { id: 'ask', n: 'Ask Gradex', b: 'Ask in plain words. Answers use the data from every page.', kw: ['ask gradex', 'chatbot'] },
    { id: 'success', n: 'Success Score', b: 'The new campus layer: seven data sources in one view, an explainable Student Success Score, placement readiness, risk flags and segments.', kw: ['success score', 'placement', 'readiness', 'segment', 'risk flag', 'lms', 'engagement', 'unified'] },
    { id: 'how', n: 'How it works', b: 'From scores to grade bands, semester comparison, a study list and your plan.', kw: ['how it works', 'how does gradex'] },
    { id: 'method', n: 'Method & pitch', b: 'The scoring note (indicators, weights, thresholds, the risk model) and the pitch in six slides, computed from the active dataset.', kw: ['method', 'methodology', 'scoring note', 'pitch', 'slides', 'weights', 'formula'] }
  ];
  var ASKQ = {
    glance: ['Which subject is my lowest?', 'What do the grade bands mean?'],
    progress: ['Which subject improved the most?', 'How did my average change?'],
    journey: ['Walk me through my three semesters'],
    sim: ['How many points to reach the next band in DBMS?', 'What if I gain 10 in Discrete Maths?'],
    attendance: ['Can I skip a DBMS class?', 'Which subject is my attendance lowest in?'],
    cgpa: ['What is my CGPA?', 'Which subject lifts my GPA the fastest?'],
    timetable: ['What is my next class?', 'What is on Wednesday?'],
    success: ['What is my success score?', 'Who is at risk of poor placement outcomes?'],
    method: ['How is the success score calculated?', 'How is risk predicted?'],
    how: ['How does Gradex turn scores into a plan?']
  };
  /* ---------- feature map: every feature, grouped by who uses it; each entry knows the role and the exact spot it lives in ---------- */
  var FEATURE_GROUPS = [
    { n: 'FOR STUDENTS', who: 'demo: Aarav Sharma', qa: 'student', items: [
      { id: 'report', n: 'Report card & dashboard', b: 'Semester report, grades, where you stand, support status, feedback.', go: 'app', role: 'student' },
      { id: 'glance', n: 'At a glance', b: 'Six rings, one per subject, lowest first.', go: 'glance' },
      { id: 'progress', n: 'Progress', b: 'Sem 3 vs Sem 5 for every subject.', go: 'progress' },
      { id: 'journey', n: 'Journey', b: 'Scroll-driven timeline of three semesters.', go: 'journey' },
      { id: 'sim', n: 'What-if simulator', b: 'Pick a subject and a gain, see the new grade.', go: 'sim' },
      { id: 'attendance', n: 'Attendance planner', b: 'How many classes you can still miss.', go: 'attendance' },
      { id: 'cgpa', n: 'CGPA calculator', b: 'Semester GPA on a 10-point scale.', go: 'cgpa' },
      { id: 'timetable', n: 'Timetable', b: 'Your week and what is on now.', go: 'timetable' },
      { id: 'stuscore', n: 'My success score & projection', b: 'Your score explained, plus where you are heading.', go: 'app', role: 'student', scroll: 'stuScoreCard' }
    ] },
    { n: 'FOR FACULTY', who: 'demo: Prof. Rao, CSE-A', qa: 'faculty', items: [
      { id: 'teacher', n: 'Teacher dashboard', b: 'Students who may benefit from a review, class trend, feedback.', go: 'teacher', role: 'teacher' },
      { id: 'ti-journey', n: 'Learning journey', b: 'Every assessment of one student on a timeline.', go: 'ti', role: 'teacher', ti: 'journey' },
      { id: 'ti-gaps', n: 'Learning gaps', b: 'Evidence-backed signals from transparent rules.', go: 'ti', role: 'teacher', ti: 'gaps' },
      { id: 'ti-advisor', n: 'Teaching advisor', b: 'A teaching experiment per gap, with a check.', go: 'ti', role: 'teacher', ti: 'advisor' },
      { id: 'ti-insights', n: 'Class insights', b: 'Topics the whole class struggles with.', go: 'ti', role: 'teacher', ti: 'insights' },
      { id: 'ti-tracker', n: 'Intervention tracker', b: 'Record an adjustment, measure before and after.', go: 'ti', role: 'teacher', ti: 'tracker' },
      { id: 'profile', n: 'Student profile', b: 'One student, all seven sources, prediction, history.', go: 'profile-s04', role: 'teacher' }
    ] },
    { n: 'FOR ADMINISTRATORS', who: 'demo: campus admin', qa: 'admin', items: [
      { id: 'admin', n: 'Campus dashboard', b: 'KPIs, score distribution, risk, segments, class comparison.', go: 'admin', role: 'admin' },
      { id: 'pipeline', n: 'Data pipeline & CSV import', b: 'Seven sources joined, cleaning log, import your own files.', go: 'admin', role: 'admin', scroll: 'adPipeline' },
      { id: 'directory', n: 'Student directory', b: 'Search, filter by flag or prediction, sort, export.', go: 'admin', role: 'admin', scroll: 'adTable' },
      { id: 'rules', n: 'Rules & thresholds', b: 'Every rule behind a flag, in plain words.', go: 'admin', role: 'admin', scroll: 'adRules' },
      { id: 'connect', n: 'Connections & API keys', b: 'Plug in Supabase and an AI provider; keys stay in this browser.', go: 'connect' }
    ] },
    { n: 'CAMPUS ANALYTICS', who: 'open to everyone', qa: 'all', items: [
      { id: 'success', n: 'Success score explorer', b: 'Pick any student: drivers, placement readiness, risk, segment.', go: 'success' },
      { id: 'method', n: 'Method & pitch', b: 'Scoring note, risk model, limitations, six slides.', go: 'method' },
      { id: 'ask', n: 'Ask Gradex', b: 'Plain-word questions answered from the active dataset.', go: 'ask' },
      { id: 'how', n: 'How it works', b: 'From scores to a plan.', go: 'how' }
    ] }
  ];
  var pendingScroll = null;
  function groupsForRole(r) { var allow = { student: ['student', 'all'], teacher: ['faculty', 'all'], admin: ['admin', 'faculty', 'all'] }[r]; return FEATURE_GROUPS.filter(function (g) { return !allow || allow.indexOf(g.qa) >= 0; }); }
  function renderFeatureMenu() {
    var box = $('#pgmPanel'); if (!box) return; var r = (typeof ROLE !== 'undefined' && ROLE.role) || null, gs = groupsForRole(r);
    box.innerHTML = '<div class="pgm-group" style="grid-column:1/-1"><a href="#top" id="pgmHome"><span class="pgm-n">Home<small>Landing page: overview, feature map, campus roles</small></span></a></div>' + (r ? '<div class="pgm-group" style="grid-column:1/-1"><div class="m" style="padding-bottom:0"><span>YOUR TOOLS · ' + ({ student: 'STUDENT VIEW', teacher: 'FACULTY VIEW', admin: 'ADMIN VIEW' })[r] + '</span><a href="#login" style="color:var(--mut);letter-spacing:0;text-decoration:none">Switch role &rarr;</a></div></div>' : '') + gs.map(function (g) { return '<div class="pgm-group"><div class="m">' + g.n + '<small>' + g.who + '</small></div>' + g.items.map(function (f) { return featureLink(f, '<span class="pgm-n">' + f.n + '<small>' + f.b + '</small></span>'); }).join('') + '</div>'; }).join('');
    box.style.width = gs.length <= 2 ? 'min(520px, calc(100vw - 32px))' : '';
    $$('a[data-feat]', box).forEach(bindFeature);
    var ph = $('#pgmHome'); if (ph) ph.addEventListener('click', function (e) { e.preventDefault(); $('#navPages').open = false; if ((location.hash || '#top') === '#top') { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); route(); } else location.hash = 'top'; });
  }
  function featureLink(f, inner, cls) { return '<a href="#' + f.go + '" data-feat="' + f.id + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + inner + '</a>'; }
  function featureById(id) { for (var g = 0; g < FEATURE_GROUPS.length; g++) { for (var k = 0; k < FEATURE_GROUPS[g].items.length; k++) { if (FEATURE_GROUPS[g].items[k].id === id) return FEATURE_GROUPS[g].items[k]; } } return null; }
  function openFeature(f) {
    if (f.role && ROLE.role !== f.role && !(f.role === 'teacher' && ROLE.role === 'admin')) { setRole(f.role); toast('Opened the ' + f.role + ' demo as ' + ROLE.name + '.'); }
    if (f.role === 'student' && !state.user) state.user = { name: (ROLE.name || 'Aarav').split(' ')[0] };
    if (f.ti) { TI.sec = f.ti; }
    pendingScroll = f.scroll || null;
    if ((location.hash || '').replace('#', '') === f.go) route(); else location.hash = f.go;
  }
  function bindFeature(a) { a.addEventListener('click', function (e) { e.preventDefault(); var f = featureById(a.dataset.feat); if (f) openFeature(f); var pm = $('#navPages'); if (pm) pm.open = false; }); }
  var pendingQ = null;
  function pageIdx(id) { for (var i = 0; i < PAGES.length; i++) { if (PAGES[i].id === id) return i; } return -1; }
  function askFrom(q) { if (current === 'ask' && orbUI) { orbUI.ask(q); } else { pendingQ = q; location.hash = 'ask'; } }
  (function () {
    var pm = $('#navPages');
    if (pm) {
      renderFeatureMenu();
      pm.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) pm.open = false; });
      document.addEventListener('click', function (e) { if (pm.open && !pm.contains(e.target)) pm.open = false; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pm.open) { pm.open = false; var sm = pm.querySelector('summary'); if (sm) sm.focus(); } });
    }
    $$('.pgnav').forEach(function (nv) {
      var host = nv.closest('[id^="view-"]'), id = host ? host.id.replace('view-', '') : '';
      nv.setAttribute('aria-label', 'Gradex pages');
      nv.innerHTML = '<a class="chip" href="#top">Home</a>' + PAGES.map(function (p) { return '<a class="chip" href="#' + p.id + '"' + (p.id === id ? ' aria-current="page"' : '') + '>' + p.n + '</a>'; }).join('');
    });
    $$('.pgfoot').forEach(function (ft) {
      var host = ft.closest('[id^="view-"]'), id = host.id.replace('view-', ''), i = pageIdx(id), pv = PAGES[i - 1], nx = PAGES[i + 1];
      var h = '<div class="pn">' +
        (pv ? '<a class="card pn-link" href="#' + pv.id + '"><span class="m">PREVIOUS</span><b>' + pv.n + '</b></a>' : '<a class="card pn-link" href="#explore"><span class="m">ALL PAGES</span><b>Back to the overview</b></a>') +
        (nx ? '<a class="card pn-link next" href="#' + nx.id + '"><span class="m">NEXT</span><b>' + nx.n + '</b></a>' : '<a class="card pn-link next" href="#end"><span class="m">DONE</span><b>Join the waitlist</b></a>') + '</div>';
      if (ASKQ[id]) h += '<div class="askrow"><span class="m">ASK GRADEX ABOUT THIS PAGE</span><div class="sg"></div></div>';
      ft.innerHTML = h;
      var sg = $('.askrow .sg', ft);
      if (sg) ASKQ[id].forEach(function (q) { var b = el('button', 'chip', null); b.type = 'button'; b.textContent = q; b.addEventListener('click', function () { askFrom(q); }); sg.appendChild(b); });
    });
    var ex = $('#exGrid');
    if (ex) { ex.innerHTML = FEATURE_GROUPS.map(function (g, i) { return '<div class="card" data-r style="--d:' + i + '"><div class="m">' + g.n + '<small>' + g.who + '</small></div>' + g.items.map(function (f) { return featureLink(f, '<span><b>' + f.n + '</b><small>' + f.b + '</small></span><i>Open &rarr;</i>'); }).join('') + '</div>'; }).join(''); $$('a[data-feat]', ex).forEach(bindFeature); }
    $$('#gap a[data-feat]').forEach(bindFeature);
    $$('.qa').forEach(function (q) {
      var who = q.dataset.qa, items = [];
      FEATURE_GROUPS.forEach(function (g) { if (g.qa === who) items = items.concat(g.items); });
      q.innerHTML = '<span class="m">QUICK ACCESS</span>' + items.map(function (f) { return featureLink(f, f.n, 'chip'); }).join('');
      $$('a[data-feat]', q).forEach(bindFeature);
    });
  })();

  var state = { term: 0, sel: 2, user: null, mode: 'in' };
  var lowIdx = function (t) { var a = SCORES[t]; return a.indexOf(Math.min.apply(null, a)); };
  state.sel = lowIdx(0);

  /* ---------- waitlist ---------- */
  var joinBtn = $('#joinBtn'), joinNote = $('#joinNote');
  if (CONFIG.waitlistUrl) {
    $$('.join-link').concat([joinBtn]).forEach(function (a) { a.href = CONFIG.waitlistUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  } else {
    joinBtn.setAttribute('aria-disabled', 'true');
    joinBtn.addEventListener('click', function (e) { e.preventDefault(); });
    joinNote.textContent = 'The waitlist link has not been added yet.';
  }

  /* ---------- hero numbers, marquee ---------- */
  var a1 = Math.round(avg(SCORES[0])), a3 = Math.round(avg(SCORES[2]));
  $('#statAvg').textContent = a1 + ' to ' + a3;
  $('#statLow').textContent = SUBJECTS[lowIdx(0)] + ' ' + SCORES[0][lowIdx(0)];
  var mqItems = [['AVERAGE', a1 + ' to ' + a3], ['LOWEST', SHORT[lowIdx(0)] + ' ' + SCORES[0][lowIdx(0)]], ['HIGHEST', SHORT[SCORES[0].indexOf(Math.max.apply(null, SCORES[0]))] + ' ' + Math.max.apply(null, SCORES[0])], ['BANDS', 'A B C D'], ['SEMESTERS', '3 COMPARED'], ['STUDY LIST', 'WEAKEST FIRST'], ['ALSO', 'ATTENDANCE CGPA TIMETABLE'], ['FEATURES', '24 ON THE MAP'], ['DATA', 'SAMPLE']];
  var mqHtml = mqItems.map(function (x) { return '<span>' + x[0] + ' <b>' + x[1] + '</b></span>'; }).join('');
  $('#mt').innerHTML = mqHtml + mqHtml;

  /* ---------- sample report (hero) ---------- */
  var termWrap = $('#termBtns'), subjWrap = $('#subjBtns'), appTerms = $('#appTerms'), miniBars = $('#miniBars');
  [1, 2, 3].forEach(function (n, i) {
    [termWrap, appTerms].forEach(function (wrap) {
      var b = el('button', 'chip', 'Sem ' + (n + 2)); b.type = 'button';
      b.addEventListener('click', function () { state.term = i; render(); renderApp(); });
      wrap.appendChild(b);
    });
  });
  SUBJECTS.forEach(function (n, i) {
    var b = el('button', 'chip', SHORT[i]); b.type = 'button'; b.setAttribute('aria-label', n);
    b.addEventListener('click', function () { state.sel = i; render(); });
    subjWrap.appendChild(b);
    var li = el('li', '', '<span>' + SHORT[i] + '</span><span><i style="width:0"></i></span><b></b>');
    miniBars.appendChild(li);
  });
  function render() {
    $$('.chip', termWrap).forEach(function (c, k) { c.setAttribute('aria-pressed', k === state.term ? 'true' : 'false'); });
    $$('.chip', subjWrap).forEach(function (c, k) { c.setAttribute('aria-pressed', k === state.sel ? 'true' : 'false'); });
    var arr = SCORES[state.term], s = arr[state.sel], mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr);
    $('#roName').textContent = SUBJECTS[state.sel].toUpperCase() + ', SEM ' + (state.term + 3);
    $('#roScore').textContent = s + ' · grade ' + gradeOf(s);
    $('#roTrend').textContent = state.term > 0 ? ((s - SCORES[state.term - 1][state.sel] >= 0 ? '+' : '') + (s - SCORES[state.term - 1][state.sel]) + ' since Sem ' + (state.term + 2)) : 'First semester in the sample';
    var tag = $('#roTag'); tag.textContent = s === mn ? 'Lowest this semester' : (s === mx ? 'Highest this semester' : ''); tag.classList.toggle('hi', s === mx);
    $$('li', miniBars).forEach(function (li, i) { li.querySelector('i').style.width = arr[i] + '%'; li.querySelector('b').textContent = arr[i]; li.style.color = i === state.sel ? '#fff' : ''; });
    if (window.__gx) window.__gx.update();
  }
  render();

  /* ---------- rings ---------- */
  var ringsEl = $('#rings');
  SUBJECTS.forEach(function (n, i) {
    var v = SCORES[0][i], low = i === lowIdx(0);
    ringsEl.insertAdjacentHTML('beforeend', '<div class="card" data-r style="--d:' + i + '"><div class="ring"><svg viewBox="0 0 92 92" aria-hidden="true"><circle class="t" cx="46" cy="46" r="42"/><circle class="v' + (low ? ' low' : '') + '" cx="46" cy="46" r="42" data-v="' + v + '"/></svg><b data-n="' + v + '">0</b></div><div class="m">' + n + ', Sem 3' + (low ? ' <span class="bd">lowest</span>' : '') + '</div></div>');
  });
  new IntersectionObserver(function (es, o) {
    es.forEach(function (x) {
      if (!x.isIntersecting) return; o.disconnect();
      $$('.ring .v').forEach(function (c) { c.style.strokeDashoffset = 264 * (1 - c.dataset.v / 100); });
      $$('[data-n]').forEach(function (b) {
        var T = +b.dataset.n, t0 = performance.now();
        if (RM) { b.textContent = T; return; }
        (function f(t) { var k = Math.min(1, (t - t0) / 1400); b.textContent = Math.round(T * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
      });
    });
  }, { threshold: .3 }).observe(ringsEl);
  var li0 = lowIdx(0), nb0 = nextBand(SCORES[0][li0]);
  $('#insightText').textContent = SUBJECTS[li0] + ' is at ' + SCORES[0][li0] + ' while the sample average is ' + a1 + '. It is the only subject below a C.';
  $('#insightAct').textContent = '→ ' + (nb0 ? (nb0.min - SCORES[0][li0]) + ' more points reach a ' + nb0.l + '. Start there.' : 'Keep going.');

  /* ---------- progress chart + risk card ---------- */
  (function () {
    var svg = $('#chart'), W = 640, H = 230, padL = 28, padB = 30, top = 14, innerH = H - padB - top, colW = (W - padL) / SUBJECTS.length, out = '';
    [0, 25, 50, 75, 100].forEach(function (v) { var y = top + innerH - innerH * v / 100; out += '<line class="axis" x1="' + padL + '" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke-width="1"/><text x="0" y="' + (y + 4) + '">' + v + '</text>'; });
    SUBJECTS.forEach(function (n, i) {
      var x0 = padL + i * colW + colW * .18, bw = colW * .28, h1 = innerH * SCORES[0][i] / 100, h3 = innerH * SCORES[2][i] / 100;
      out += '<rect class="t1" x="' + x0 + '" y="' + (top + innerH - h1) + '" width="' + bw + '" height="' + h1 + '" rx="2"/>';
      out += '<rect class="t3" x="' + (x0 + bw + 4) + '" y="' + (top + innerH - h3) + '" width="' + bw + '" height="' + h3 + '" rx="2"/>';
      out += '<text x="' + (padL + i * colW + colW / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + SHORT[i] + '</text>';
    });
    svg.innerHTML = out;
    var rr = $('#riskRows'), s = SCORES[0][li0];
    rr.innerHTML = '<div class="rw"><span>Subject</span><b>' + SUBJECTS[li0] + '</b></div><div class="rw"><span>Score</span><b class="bd">' + s + '</b></div><div class="rw"><span>Grade</span><b>' + gradeOf(s) + '</b></div><div class="rw"><span>Points to a ' + (nb0 ? nb0.l : '') + '</span><b class="wa">' + (nb0 ? nb0.min - s : 0) + '</b></div><div class="rw"><span>By Sem 5 (sample)</span><b class="ok">' + SCORES[2][li0] + ', grade ' + gradeOf(SCORES[2][li0]) + '</b></div>';
    $('#riskAct').textContent = 'Work on the lowest subject first. In the sample it climbs ' + (SCORES[2][li0] - s) + ' points in two terms.';
  })();

  /* ---------- simulator ---------- */
  var simSel = li0, simGain = 10, simWrap = $('#simSubj');
  SUBJECTS.forEach(function (n, i) {
    var b = el('button', 'chip', SHORT[i]); b.type = 'button'; b.setAttribute('aria-label', n);
    b.addEventListener('click', function () { simSel = i; sim(); });
    simWrap.appendChild(b);
  });
  $('#simGain').addEventListener('input', function (e) { simGain = +e.target.value; sim(); });
  $('#simB1').addEventListener('click', function () { var s = SCORES[0][simSel], nb = nextBand(s); simGain = nb ? clamp(nb.min - s, 0, 30) : 0; $('#simGain').value = simGain; sim(); });
  $('#simB2').addEventListener('click', function () { simSel = li0; sim(); });
  function sim() {
    $$('.chip', simWrap).forEach(function (c, k) { c.setAttribute('aria-pressed', k === simSel ? 'true' : 'false'); });
    var arr = SCORES[0], s = arr[simSel], after = clamp(s + simGain, 0, 100), nb = nextBand(s);
    var newArr = arr.slice(); newArr[simSel] = after;
    $('#simSubjName').textContent = SUBJECTS[simSel]; $('#simGainV').textContent = '+' + simGain;
    $('#simCur').textContent = s; $('#simCurG').textContent = gradeOf(s); $('#simAvg').textContent = avg(arr).toFixed(1);
    $('#simAfter').textContent = after + ' · grade ' + gradeOf(after) + ' · average ' + avg(newArr).toFixed(1);
    var g = $('#simGi'); g.style.width = after + '%'; $('#simGu').style.left = (nb ? nb.min : 100) + '%';
    var v, c, col, t;
    if (!nb) { v = 'TOP BAND'; c = 'ok'; col = 'var(--ok)'; t = SUBJECTS[simSel] + ' is already an A in the sample. Keep it there.'; }
    else if (after >= nb.min) { v = 'NEXT BAND'; c = 'ok'; col = 'var(--ok)'; t = '+' + simGain + ' takes ' + SUBJECTS[simSel] + ' from a ' + gradeOf(s) + ' to a ' + gradeOf(after) + '. Your sample average rises to ' + avg(newArr).toFixed(1) + '.'; }
    else if (after >= nb.min - 4) { v = 'ALMOST'; c = 'wa'; col = 'var(--wa)'; t = (nb.min - after) + ' more points reach a ' + nb.l + '. Aim slightly higher.'; }
    else { v = 'SAME BAND'; c = 'bd'; col = 'var(--rk)'; t = 'Still a ' + gradeOf(after) + '. You need +' + (nb.min - s) + ' to reach a ' + nb.l + '.'; }
    g.style.background = col; var vd = $('#simVerd'); vd.className = 'verd ' + c; vd.textContent = v; $('#simText').textContent = t;
    if (!RM && vd.animate) vd.animate([{ transform: 'scale(.85)', opacity: 0, filter: 'blur(6px)' }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
    if (window.__gx) window.__gx.pulse(col);
  }
  sim();

  /* ---------- planner: attendance predictor, CGPA, timetable ---------- */
  var SAMPLE_ATT = [[38, 45], [34, 44], [28, 40], [41, 46], [30, 36], [27, 32]], SAMPLE_CRED = [4, 4, 4, 3, 3, 4];
  var PL = { att: SAMPLE_ATT.map(function (r) { return r.slice(); }), target: 75, cred: SAMPLE_CRED.slice(), sel: 2, term: 0 };
  var plDirty = false, plTimer = 0, plTab = 0;
  var DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  /* day -> [start, end, subject index, room] */
  var TT = {
    1: [['09:00', '10:00', 0, 'A101'], ['10:15', '11:15', 1, 'Lab 2'], ['11:30', '12:30', 3, 'B204'], ['14:00', '15:30', 5, 'CS Lab']],
    2: [['09:00', '10:30', 2, 'Lab 1'], ['10:45', '11:45', 4, 'B110'], ['13:00', '14:00', 0, 'A101']],
    3: [['09:00', '10:00', 1, 'A205'], ['10:15', '11:15', 0, 'A101'], ['11:30', '12:30', 2, 'A205'], ['14:00', '15:00', 3, 'B204']],
    4: [['09:00', '10:00', 4, 'B110'], ['10:15', '11:45', 5, 'CS Lab'], ['13:00', '14:30', 2, 'Lab 1']],
    5: [['09:00', '10:00', 0, 'A101'], ['10:15', '11:15', 3, 'B204'], ['11:30', '13:00', 1, 'Lab 2']]
  };
  var ttDay = (function () { var d = new Date().getDay(); return d >= 1 && d <= 5 ? d : 1; })();
  function mins(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 'es'); }
  function attInfo(i) {
    var a = PL.att[i][0], t = Math.max(PL.att[i][1], a), T = PL.target, p = t ? a / t * 100 : null, st = 'none', can = 0, need = 0;
    if (p !== null) {
      if (p >= T - 1e-9) { st = 'ok'; can = Math.max(0, Math.floor(a * 100 / T - t + 1e-9)); }
      else { st = p >= T - 5 ? 'wa' : 'bd'; need = Math.ceil((T * t - 100 * a) / (100 - T) - 1e-9); }
    }
    return { p: p, st: st, can: can, need: need, a: a, t: t };
  }
  function attLine(i) {
    var I = attInfo(i); if (I.p === null) return SUBJECTS[i] + ': no classes logged yet.';
    var base = SUBJECTS[i] + ': ' + I.a + ' of ' + I.t + ' classes, ' + I.p.toFixed(1) + '%, target ' + PL.target + '%. ';
    return base + (I.st === 'ok' ? (I.can > 0 ? 'You can miss ' + plural(I.can, 'class') + ' and stay at the target.' : 'You are right on the target, so missing the next class drops you below it.') : 'Attend the next ' + plural(I.need, 'class') + ' in a row to reach it.');
  }
  function gp(sc) { return sc >= 90 ? 10 : sc >= 80 ? 9 : sc >= 70 ? 8 : sc >= 60 ? 7 : sc >= 50 ? 6 : sc >= 40 ? 5 : 0; }
  function termGpa(t) { var sc = scoresFor(t), n = 0, d = 0; sc.forEach(function (v, i) { n += PL.cred[i] * gp(v); d += PL.cred[i]; }); return d ? n / d : 0; }
  function ttState(day) {
    var now = new Date(), isToday = now.getDay() === day, m = now.getHours() * 60 + now.getMinutes(), nextSeen = false;
    return (TT[day] || []).map(function (c) {
      var st = '';
      if (isToday) { if (m >= mins(c[1])) st = 'done'; else if (m >= mins(c[0])) st = 'now'; else if (!nextSeen) { st = 'next'; nextSeen = true; } }
      return { s: mins(c[0]), e: mins(c[1]), st: st, c: c };
    });
  }
  function ttSummary() {
    var now = new Date(), d = now.getDay(), rows = ttState(d);
    if (d < 1 || d > 5) return 'It is the weekend. Monday starts with ' + SUBJECTS[TT[1][0][2]] + ' at ' + TT[1][0][0] + ' in ' + TT[1][0][3] + '.';
    var cur = rows.filter(function (r) { return r.st === 'now'; })[0], nx = rows.filter(function (r) { return r.st === 'next'; })[0];
    if (cur) return 'You are in ' + SUBJECTS[cur.c[2]] + ' until ' + cur.c[1] + ' (' + cur.c[3] + ').' + (nx ? ' Next is ' + SUBJECTS[nx.c[2]] + ' at ' + nx.c[0] + ' in ' + nx.c[3] + '.' : ' It is your last class today.');
    if (nx) return 'Next is ' + SUBJECTS[nx.c[2]] + ' at ' + nx.c[0] + ' in ' + nx.c[3] + '.';
    return 'No more classes today.';
  }
  function setVal(inp, v) { if (document.activeElement !== inp) inp.value = v; }
  function plNote(t) { $$('.plSave').forEach(function (n) { n.textContent = t; }); }
  function planChanged() { plDirty = true; clearTimeout(plTimer); plTimer = setTimeout(planSave, 700); }
  function planSave() {
    if (!DBX.plan) { plDirty = false; return; }
    DBX.plan.set({ att: PL.att, target: PL.target, cred: PL.cred, updatedAt: new Date().toISOString() })
      .then(function () { plNote('Saved privately.'); })
      .catch(function (e) { plNote(dbMsg(e)); })
      .then(function () { plDirty = false; });
  }
  function renderAtt() {
    var sel = PL.sel, I = attInfo(sel);
    $$('#atSubj .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', k === sel ? 'true' : 'false'); });
    $('#atSubjName').textContent = SUBJECTS[sel].toUpperCase(); $('#atTargetV').textContent = PL.target + '%'; $('#atTarget').value = PL.target;
    setVal($('#atA'), I.a); setVal($('#atT'), I.t);
    $('#atPct').textContent = I.p === null ? 'No classes yet' : I.p.toFixed(1) + '%';
    var col = I.st === 'ok' ? 'var(--ok)' : (I.st === 'wa' ? 'var(--wa)' : 'var(--rk)');
    var g = $('#atG'); g.style.width = (I.p || 0) + '%'; g.style.background = col; $('#atU').style.left = PL.target + '%';
    var v = $('#atVerd'); v.className = 'verd ' + (I.st === 'none' ? '' : I.st); v.textContent = I.st === 'ok' ? 'SAFE' : (I.st === 'wa' ? 'CLOSE' : (I.st === 'bd' ? 'BELOW' : '-'));
    $('#atText').textContent = I.p === null ? 'Log a class to start.' : attLine(sel).replace(SUBJECTS[sel] + ': ', '');
    var list = $('#atList'); list.innerHTML = '';
    SUBJECTS.forEach(function (n, i) {
      var X = attInfo(i), b = el('button', 'pl-row'); b.type = 'button'; b.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
      b.innerHTML = '<span></span><b class="' + (X.st === 'none' ? '' : X.st) + '">' + (X.p === null ? '-' : X.p.toFixed(0) + '%') + '</b>'; b.firstChild.textContent = n;
      b.addEventListener('click', function () { PL.sel = i; renderAtt(); }); list.appendChild(b);
    });
  }
  var cgBuilt = false;
  function renderCg() {
    $$('#cgTerm .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', k === PL.term ? 'true' : 'false'); });
    var body = $('#cgRows'), sc = scoresFor(PL.term);
    if (!cgBuilt) {
      cgBuilt = true;
      SUBJECTS.forEach(function (n, i) {
        var tr = el('tr', '', '<td></td><td class="num"><input class="pl-cr" type="number" min="1" max="8" step="1" inputmode="numeric"></td><td class="num"></td><td class="num"></td>');
        tr.children[0].textContent = n;
        tr.querySelector('input').setAttribute('aria-label', n + ' credits');
        tr.querySelector('input').addEventListener('input', function (e) { var v = Math.round(+e.target.value); if (!isFinite(v) || v < 1) return; PL.cred[i] = clamp(v, 1, 8); renderCg(); planChanged(); });
        body.appendChild(tr);
      });
    }
    $$('tr', body).forEach(function (tr, i) { setVal(tr.querySelector('input'), PL.cred[i]); tr.children[2].textContent = sc[i]; tr.children[3].textContent = gp(sc[i]); });
    $('#cgTermName').textContent = 'SEM ' + (PL.term + 3); $('#cgGpa').textContent = termGpa(PL.term).toFixed(2);
    $('#cgCum').textContent = ((termGpa(0) + termGpa(1) + termGpa(2)) / 3).toFixed(2);
  }
  function renderTt() {
    $$('#ttDays .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', k + 1 === ttDay ? 'true' : 'false'); });
    var rows = ttState(ttDay), list = $('#ttList'); list.innerHTML = '';
    rows.forEach(function (r) {
      var li = el('li', r.st === 'done' ? 'done' : '');
      li.innerHTML = '<span class="t">' + r.c[0] + ' to ' + r.c[1] + '</span><span><span class="nm"></span><small></small></span>' + (r.st === 'now' || r.st === 'next' ? '<span class="tt-tag ' + r.st + '">' + (r.st === 'now' ? 'NOW' : 'NEXT') + '</span>' : '');
      li.querySelector('.nm').textContent = SUBJECTS[r.c[2]]; li.querySelector('small').textContent = 'Room ' + r.c[3] + ', ' + Math.round((r.e - r.s)) + ' min';
      list.appendChild(li);
    });
    var now = new Date(), wk = now.getDay() < 1 || now.getDay() > 5, isToday = now.getDay() === ttDay;
    var cur = rows.filter(function (r) { return r.st === 'now'; })[0], nx = rows.filter(function (r) { return r.st === 'next'; })[0], big, txt;
    if (!isToday) { big = DAYN[ttDay]; txt = rows.length + ' classes, starting ' + (rows[0] ? rows[0].c[0] : '') + '. Pick the tab for today to see what is live.'; }
    else if (cur) { big = SUBJECTS[cur.c[2]]; txt = ttSummary(); }
    else if (nx) { big = SUBJECTS[nx.c[2]]; txt = ttSummary(); }
    else { big = 'Done for today'; txt = 'No more classes today.'; }
    $('#ttLab').textContent = !isToday ? 'THIS DAY' : (cur ? 'IN CLASS NOW' : (nx ? 'NEXT UP' : 'TODAY'));
    $('#ttBig').textContent = big; $('#ttText').textContent = txt;
    $('#ttClock').textContent = wk ? 'It is the weekend, so Monday is shown. Times are read from your device clock.' : 'Times are read from your device clock. Sample timetable.';
  }
  function planRender() { renderAtt(); renderCg(); renderTt(); }
  (function () {
    SUBJECTS.forEach(function (n, i) { var b = el('button', 'chip', SHORT[i]); b.type = 'button'; b.setAttribute('aria-label', n); b.addEventListener('click', function () { PL.sel = i; renderAtt(); }); $('#atSubj').appendChild(b); });
    [1, 2, 3].forEach(function (n, i) { var b = el('button', 'chip', 'Sem ' + (n + 2)); b.type = 'button'; b.addEventListener('click', function () { PL.term = i; renderCg(); }); $('#cgTerm').appendChild(b); });
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(function (n, i) { var b = el('button', 'chip', n); b.type = 'button'; b.addEventListener('click', function () { ttDay = i + 1; renderTt(); }); $('#ttDays').appendChild(b); });
    $('#atTarget').addEventListener('input', function (e) { PL.target = +e.target.value; renderAtt(); planChanged(); });
    $('#atA').addEventListener('input', function (e) { var v = Math.round(+e.target.value); if (!isFinite(v) || e.target.value === '') return; PL.att[PL.sel][0] = clamp(v, 0, 999); renderAtt(); planChanged(); });
    $('#atT').addEventListener('input', function (e) { var v = Math.round(+e.target.value); if (!isFinite(v) || e.target.value === '') return; PL.att[PL.sel][1] = clamp(v, 0, 999); renderAtt(); planChanged(); });
    $('#atA').addEventListener('change', function () { $('#atA').value = attInfo(PL.sel).a; $('#atT').value = attInfo(PL.sel).t; });
    $('#atT').addEventListener('change', function () { $('#atA').value = attInfo(PL.sel).a; $('#atT').value = attInfo(PL.sel).t; });
    $('#atPlus').addEventListener('click', function () { var r = PL.att[PL.sel], I = attInfo(PL.sel); r[0] = I.a + 1; r[1] = I.t + 1; renderAtt(); planChanged(); });
    $('#atMiss').addEventListener('click', function () { var r = PL.att[PL.sel], I = attInfo(PL.sel); r[0] = I.a; r[1] = I.t + 1; renderAtt(); planChanged(); });
    $$('.plReset').forEach(function (rb) { rb.addEventListener('click', function () { PL.att = SAMPLE_ATT.map(function (r) { return r.slice(); }); PL.target = 75; PL.cred = SAMPLE_CRED.slice(); $('#atA').blur(); $('#atT').blur(); planRender(); planChanged(); }); });
    planRender();
    setInterval(function () { if (!document.hidden) renderTt(); }, 30000);
  })();

  /* ---------- chat: knows every page (Claude via sample capability, local fallback) ---------- */
  var NOTICES = [], CLASSINFO = '';
  var SITE = PAGES.map(function (p) { return p.n + ' (#' + p.id + '): ' + p.b; }).join(' | ');
  function dataStr(src) { return SUBJECTS.map(function (n, i) { return n + ': T1 ' + src[0][i] + ', T2 ' + src[1][i] + ', T3 ' + src[2][i]; }).join('; '); }
  function journeyInfo() {
    var tAvg = SCORES.map(function (t) { return Math.round(avg(t)); }), g = SUBJECTS.map(function (n, i) { return SCORES[2][i] - SCORES[0][i]; }), gi = g.indexOf(Math.max.apply(null, g));
    return { T: tAvg, gi: gi, gain: g[gi] };
  }
  function gpaLever() {
    var sc = scoresFor(2), best = -1, bv = 1e9, need = 0;
    sc.forEach(function (v, i) { var th = [40, 50, 60, 70, 80, 90].filter(function (x) { return x > v; })[0]; if (!th) return; var cost = (th - v) / PL.cred[i]; if (cost < bv) { bv = cost; best = i; need = th - v; } });
    return best < 0 ? null : { i: best, need: need };
  }
  var SUBJ_RX = [/\bmath(s|ematics)?\b/, /\bphysics\b|\bphy\b/, /\bchem(istry)?\b/, /\benglish\b/, /\bhistory\b/, /\bcs\b|\bcomputer( science)?\b/];
  function subjIn(q) { for (var k = 0; k < SUBJ_RX.length; k++) { if (SUBJ_RX[k].test(q)) return k; } return -1; }
  function pageFor(q) { var best = null, bn = 0; PAGES.forEach(function (p) { var n = 0; p.kw.forEach(function (k) { if (q.indexOf(k) >= 0) n += k.length; }); if (n > bn) { bn = n; best = p; } }); return best; }
  function relPages(q, a) {
    var t = (q + ' ' + a).toLowerCase(), sc = [];
    PAGES.forEach(function (p) { if (p.id === 'ask') return; var n = 0; p.kw.forEach(function (k) { if (t.indexOf(k) >= 0) n += k.length; }); if (t.indexOf(p.n.toLowerCase()) >= 0) n += 12; if (n) sc.push({ p: p, n: n }); });
    sc.sort(function (x, y) { return y.n - x.n; });
    return sc.slice(0, 3).map(function (x) { return x.p; });
  }
  function showRel(q, a) {
    var box = $('#rel'); if (!box) return; box.innerHTML = '';
    var ps = /nine pages|^Demo mode: no live AI|^I could not match/.test(a) ? [] : relPages(q, a); if (!ps.length) return;
    box.appendChild(el('span', 'm', 'OPEN'));
    ps.forEach(function (p) { var c = el('a', 'chip', p.n + ' &rarr;'); c.href = '#' + p.id; box.appendChild(c); });
  }
  function dayFrom(q) { var m = q.match(/\b(monday|tuesday|wednesday|thursday|friday|mon|tues|tue|wed|thurs|thur|thu|fri)\b/); return m ? ({ mo: 1, tu: 2, we: 3, th: 4, fr: 5 })[m[1].slice(0, 2)] : 0; }
  function rules() {
    var att = SUBJECTS.map(function (n, i) { var I = attInfo(i); return n + ' ' + I.a + '/' + I.t + (I.p === null ? '' : ' (' + I.p.toFixed(0) + '%)'); }).join(', ');
    var tt = [1, 2, 3, 4, 5].map(function (d) { return DAYN[d].slice(0, 3) + ': ' + TT[d].map(function (c) { return SUBJECTS[c[2]] + ' ' + c[0] + ' ' + c[3]; }).join(', '); }).join('; ');
    var cr = SUBJECTS.map(function (n, i) { return n + ' ' + PL.cred[i]; }).join(', '), now = new Date(), J = journeyInfo(), more = '';
    if (userScores) more += ' This student has saved their own scores (private): ' + dataStr(userScores) + '. The pages show the sample scores; when the student says "my scores", use their saved ones and say so.';
    if (CLASSINFO) more += ' Class snapshot entered by the teacher: ' + CLASSINFO + '.';
    if (NOTICES.length) more += ' Class notices, newest first: ' + NOTICES.slice(0, 3).map(function (n) { return (n.title || 'Notice') + ': ' + n.text; }).join(' | ') + '.';
    return 'You are Ask Gradex, the assistant inside the Gradex campus analytics platform (never call yourself anything else). You explain verified findings about this ' + (ROLE.role || 'student') + ' account\'s records in plain words, and can answer general study questions. STYLE RULES, always: give the specific answer only, never a paragraph. Maximum 3 short sentences and about 35 words in total. Start with the answer in the first sentence, no warm-up. Use simple words a first-year undergraduate understands, and explain any hard word in the same sentence. Add one tiny real-life example or comparison when it helps the idea stick, for instance "like a battery for plants". Sound friendly and curious, never boring or lecture-like. At most one emoji. Plain text only, no markdown, no lists, no asterisks. For a big topic give only the one key idea and finish with a short question to keep the student curious, for example "Want to know why?". Reply in the language the student writes in. If you cannot know something live or very recent, say so in one sentence. Never invent the student\'s marks or any data not below. For the student\'s own data, answer in under 30 words from the data below and end with one concrete next step. When a Gradex page would help, name it in a few words, for example "Open the Simulator page". '+
      'Pages: ' + SITE + '. ' +
      'Grade bands: A 85+, B 70-84, C 55-69, D 40-54. Scores (three semesters, sample): ' + dataStr(SCORES) + '. Term averages: T1 ' + J.T[0] + ', T2 ' + J.T[1] + ', T3 ' + J.T[2] + '; biggest gain ' + SUBJECTS[J.gi] + ' (+' + J.gain + ' points). ' +
      'Simulator: points needed for the next band = band minimum minus the current Sem 3 score. ' +
      'Attendance, attended/total classes, target ' + PL.target + '%: ' + att + '. To stay at the target a student can miss floor(attended*100/target - total) more classes; below it they must attend ceil((target*total - 100*attended)/(100-target)) in a row. ' +
      'Credits: ' + cr + '. GPA uses a 10-point scale (90+ is 10, 80+ 9, 70+ 8, 60+ 7, 50+ 6, 40+ 5), Sem 3 GPA ' + termGpa(0).toFixed(2) + ', term 2 ' + termGpa(1).toFixed(2) + ', term 3 ' + termGpa(2).toFixed(2) + '. ' +
      'Timetable: ' + tt + '. It is ' + DAYN[now.getDay()] + ' ' + now.getHours() + ':' + ('0' + now.getMinutes()).slice(-2) + ' on the student\'s clock.' + more +
      ' Use this data for questions about the student\'s own marks, attendance, CGPA, timetable and the site; if the student asks for data you do not have, say what you would need. This is demo data. Everything else is open: answer it from your own knowledge.';
  }
  var H = [], tier = 'default', sampleFn = null;
  function local(q) {
    q = q.toLowerCase().replace(/\s+/g, ' ');
    var S = SCORES[0], li = lowIdx(0), s0 = S[li], nb = nextBand(s0), si = subjIn(q), J = journeyInfo(), pg = pageFor(q), go = ' Next step: ', d, i, k;
    if (/^(hi|hello|hey)\b/.test(q)) return 'Hi. Ask me about your marks, attendance, CGPA or timetable, or where a page is.' + go + 'try "What should I study first?"';
    if (/what can you do|what (pages|features|tools)|all (the )?(pages|features|tools)|site ?map|what is gradex/.test(q)) return 'Gradex has ' + groupsForRole(ROLE.role).reduce(function (n, g) { return n + g.items.length; }, 0) + ' features for you' + (ROLE.role ? ' in the ' + ROLE.role + ' view' : ' in four groups') + ': ' + groupsForRole(ROLE.role).map(function (g) { return g.n.toLowerCase() + ' (' + g.items.map(function (f) { return f.n; }).join(', ') + ')'; }).join('; ') + '. Open any of them from the ⋯ button at the top of every page.' + go + 'start with the campus dashboard.';
    if (/planner/.test(q)) return 'The planner is now three pages: Attendance, CGPA and Timetable.' + go + 'open the Attendance page first.';
    if (/\b(open|go to|take me to|where is|where can i find|which page|what page|link to)\b/.test(q) && pg) return pg.n + ' is its own page. ' + pg.b + go + 'use the link below.';
    if (/skip|bunk|miss|attendance|attend\b/.test(q)) {
      var ai = si;
      if (ai < 0) { var lo = 1e9; PL.att.forEach(function (r, n) { var I = attInfo(n); if (I.p !== null && I.p < lo) { lo = I.p; ai = n; } }); }
      return attLine(ai < 0 ? 0 : ai) + go + 'open the Attendance page and log your next class.';
    }
    if (/cgpa|\bgpa\b|credit/.test(q)) {
      if (/credit/.test(q)) return 'Credits: ' + SUBJECTS.map(function (n, n2) { return n + ' ' + PL.cred[n2]; }).join(', ') + '.' + go + 'edit them on the CGPA page.';
      if (/lift|raise|boost|improve|increase|most|cheap|fast/.test(q)) {
        var gl = gpaLever();
        return (gl ? SUBJECTS[gl.i] + ' is the cheapest lever: ' + gl.need + (gl.need === 1 ? ' more point' : ' more points') + ' in Sem 5 moves it up one grade point, and it carries ' + PL.cred[gl.i] + ' credits.' : 'Every subject is already at the top grade point.') + go + 'raise it, then check the CGPA page.';
      }
      return 'Your sample GPA is ' + termGpa(0).toFixed(2) + ' in Sem 3, ' + termGpa(1).toFixed(2) + ' in Sem 4 and ' + termGpa(2).toFixed(2) + ' in Sem 5, so the three-semester average is ' + ((termGpa(0) + termGpa(1) + termGpa(2)) / 3).toFixed(2) + ' on a 10-point scale.' + go + 'open the CGPA page to change credits and see each semester.';
    }
    d = dayFrom(q);
    if (!d && /tomorrow/.test(q) && /class|lecture|timetable|schedule|room/.test(q)) { d = (new Date().getDay() + 1) % 7; if (d < 1 || d > 5) d = 1; }
    if (d || /timetable|schedule|next class|what class|which class|classes|lecture|class today/.test(q)) {
      if (d) return DAYN[d] + ': ' + TT[d].map(function (c) { return SUBJECTS[c[2]] + ' ' + c[0] + ' in ' + c[3]; }).join(', ') + '.' + go + 'open the Timetable page for the whole week.';
      return ttSummary() + go + 'open the Timetable page for the whole week.';
    }
    if (/(improv|gain|rose|rise|grew|jump).*(most|biggest|best)|(most|biggest).*(improv|gain|progress)|which subject.*(improv|gain)/.test(q)) return SUBJECTS[J.gi] + ' improved the most, up ' + J.gain + ' points from Sem 3 to Sem 5 (' + S[J.gi] + ' to ' + SCORES[2][J.gi] + ').' + go + 'open the Progress page to compare all six subjects.';
    if (/what if|simulat|how many points|points (do i|would i|to)|next band|reach (a|an|b|c)\b|\bgain \d|\+\s?\d/.test(q)) {
      k = si >= 0 ? si : li;
      var sc0 = S[k], nbk = nextBand(sc0), mm = q.match(/(\d{1,2})/), g = mm ? clamp(+mm[1], 0, 30) : null;
      if (g !== null && /what if|gain|add|\+/.test(q)) { var after = clamp(sc0 + g, 0, 100), na = S.slice(); na[k] = after; return 'If ' + SUBJECTS[k] + ' gains ' + g + ', it goes from ' + sc0 + ' to ' + after + ' (grade ' + gradeOf(after) + ') and your average moves from ' + avg(S).toFixed(1) + ' to ' + avg(na).toFixed(1) + '.' + go + 'drag the same number in the Simulator page.'; }
      return SUBJECTS[k] + ' is at ' + sc0 + ' in Sem 3 (grade ' + gradeOf(sc0) + '). ' + (nbk ? (nbk.min - sc0) + ' more points reach a ' + nbk.l + '.' : 'It is already an A.') + go + 'set that number in the Simulator page.';
    }
    if (/journey|timeline|three semesters|walk me through|milestone/.test(q)) { var l3 = lowIdx(2); return 'Sem 3 averages ' + J.T[0] + ' with ' + SUBJECTS[li] + ' lowest at ' + s0 + '. Sem 4 averages ' + J.T[1] + '. Sem 5 averages ' + J.T[2] + ', and ' + SUBJECTS[l3] + ' is now lowest at ' + SCORES[2][l3] + '. ' + SUBJECTS[J.gi] + ' gained the most.' + go + 'scroll through the Journey page.'; }
    if (/notice|announce|remark/.test(q)) return NOTICES.length ? 'Latest notice: ' + (NOTICES[0].title || 'Notice') + '. ' + NOTICES[0].text.slice(0, 160) + go + 'check your dashboard after you log in for the full list.' : 'No notices are posted yet. Teachers post them from the Teacher page and they show on your dashboard after you log in.';
    if (/class (average|snapshot|picture)|classmates|top of the class|topper/.test(q)) return CLASSINFO ? CLASSINFO + '.' + go + 'log in to see the class snapshot on your dashboard.' : 'No class roster has been filled in yet. When a teacher adds one, the class picture shows on your dashboard.';
    if (/my (own )?scores|saved scores/.test(q)) return userScores ? 'You have saved your own scores, so your dashboard uses them. The feature pages still show the sample data.' + go + 'review them on the dashboard.' : 'You are on the sample data right now.' + go + 'log in and save your own scores from the demo dashboard.';
    if (/band|grade scale|grading|what is an? [abcd]\b/.test(q)) return 'A is 85 and above, B is 70 to 84, C is 55 to 69 and D is 40 to 54. Your sample Sem 3 average of ' + a1 + ' is a ' + gradeOf(a1) + '.' + go + 'open the At a glance page to see all six rings.';
    if (/how (does|do) (gradex|it)|how it works|pipeline/.test(q)) return 'Gradex places each score in a grade band, compares your terms, builds a study list with the weakest subject first, and turns it into a plan you can test in the Simulator.' + go + 'open the How it works page.';
    if (/weak|lowest|worst|first|start|study|next/.test(q)) return SUBJECTS[li] + ' is your lowest at ' + s0 + ' (grade ' + gradeOf(s0) + '). ' + (nb ? (nb.min - s0) + ' points reach a ' + nb.l + '.' : '') + go + 'set +' + (nb ? nb.min - s0 : 5) + ' in the Simulator page and see the new band.';
    if (/best|highest|strong/.test(q)) { var hi = S.indexOf(Math.max.apply(null, S)); return SUBJECTS[hi] + ' is your strongest at ' + S[hi] + ' (grade ' + gradeOf(S[hi]) + ').' + go + 'keep its routine and spend the freed time on ' + SUBJECTS[li] + '.'; }
    if (/average|overall|total/.test(q)) return 'Your sample average went from ' + a1 + ' in Sem 3 to ' + a3 + ' in Sem 5.' + go + 'open the Progress page to see which subject moved most.';
    if (/term|improv|progress|change|compare/.test(q)) return 'Averages by term: ' + J.T.join(', ') + '. Every subject rose; ' + SUBJECTS[J.gi] + ' gained the most, ' + J.gain + ' points.' + go + 'compare the semesters on the Progress page.';
    if (si >= 0) { var sc = S[si], n2 = nextBand(sc), I2 = attInfo(si); return SUBJECTS[si] + ': ' + sc + ' in Sem 3, ' + SCORES[2][si] + ' by Sem 5 (grade ' + gradeOf(SCORES[2][si]) + '). ' + (n2 ? 'From Sem 3 it needed ' + (n2.min - sc) + ' points for a ' + n2.l + '. ' : '') + (I2.p === null ? '' : 'Attendance is ' + I2.p.toFixed(0) + '%.') + go + 'check its bars on the Progress page.'; }
    if (!/study|first|focus|priorit|win|improv|plan|start|help|mark|score|grade|gpa|cgpa|class|subject|term|exam|fast|quick|advice|tip/.test(q)) return 'Demo mode: no live AI is connected, so I only answer from the dataset. I can answer about marks, attendance, CGPA, timetable, the simulator, support status and where each page is.' + go + 'try "What should I study first?"';
    return 'In the sample, the quickest win is ' + SUBJECTS[li] + ': ' + s0 + ' now, ' + (nb ? (nb.min - s0) + ' points from a ' + nb.l : 'already an A') + '.' + go + 'try the Simulator page with +' + (nb ? nb.min - s0 : 5) + '.';
  }
  /* ---------- external AI provider: works after deploy with a user-supplied key ---------- */
  function activeCfg() { return CONFIG.ai; }
  function aiReady() { return !!(CONFIG.ai && ((CONFIG.ai.provider && CONFIG.ai.key) || (CONFIG.ai.edgeFunction && sbReady()))); }
  async function callAI(sys, history, cfg) {
    cfg = cfg || activeCfg();
    if (cfg.edgeFunction && sbReady()) {
      var ef = await sbClient.functions.invoke(cfg.edgeFunction, { body: { system: sys, messages: history } });
      if (ef.error) throw ef.error;
      if (!ef.data || !ef.data.text) throw new Error((ef.data && ef.data.error) || 'Empty reply');
      return String(ef.data.text).trim();
    }
    var p = cfg.provider, k = cfg.key, m = cfg.model;
    if (p === 'openai' || p === 'groq' || p === 'openrouter' || p === 'nvidia') {
      var url = p === 'openai' ? 'https://api.openai.com/v1/chat/completions'
        : p === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions'
        : p === 'nvidia' ? 'https://integrate.api.nvidia.com/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      var hdr = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k };
      if (p === 'openrouter') { hdr['HTTP-Referer'] = location.origin && location.origin !== 'null' ? location.origin : 'https://gradex.app'; hdr['X-Title'] = 'Gradex'; }
      var r = await fetch(url, { method: 'POST', headers: hdr, body: JSON.stringify({ model: m, messages: [{ role: 'system', content: sys }].concat(history), max_tokens: 300, temperature: 0.5 }) });
      var j = await r.json();
      if (!r.ok && p === 'openrouter' && cfg.fallbackModel && m !== cfg.fallbackModel && (r.status === 404 || r.status === 429 || r.status === 503)) return callAI(sys, history, Object.assign({}, cfg, { model: cfg.fallbackModel, fallbackModel: null }));
      if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
      if (!j.choices || !j.choices[0] || !j.choices[0].message) throw new Error('Empty reply');
      return j.choices[0].message.content.trim();
    }
    if (p === 'anthropic') {
      var r2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: m, system: sys, max_tokens: 400, messages: history })
      });
      var j2 = await r2.json();
      if (!r2.ok) throw new Error((j2.error && j2.error.message) || ('HTTP ' + r2.status));
      return j2.content[0].text.trim();
    }
    if (p === 'google') {
      var contents = history.map(function (t) { return { role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] }; });
      var r3 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent?key=' + encodeURIComponent(k), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: contents, generationConfig: { maxOutputTokens: 400, temperature: 0.7 } })
      });
      var j3 = await r3.json();
      if (!r3.ok) throw new Error((j3.error && j3.error.message) || ('HTTP ' + r3.status));
      return j3.candidates[0].content.parts.map(function (p) { return p.text; }).join('').trim();
    }
    throw new Error('Unknown provider: ' + p);
  }

  /* Resolves to the answer text. Claude through the page, else the user's own AI, else built-in answers. */
  /* Hybrid architecture: deterministic code answers from the dataset first; an AI layer (if configured) only explains the verified finding. */
  var UNMATCHED = /^(Demo mode: no live AI|I could not match)/;
  function engine(q) { var d = askData(q); return d !== null ? d : local(q); }
  function engineOpen(q) { return (ROLE.role ? 'I could not match that to a dataset question. ' : 'That is outside the demo dataset. ') + 'With the AI explainer connected I can answer general questions too, but it is not reachable right now. I can still answer about marks, attendance, CGPA, timetable, support status, scores and interventions.'; }
  function answer(q) {
    H.push({ role: 'user', content: q });
    var finish = function (out) { H.push({ role: 'assistant', content: out }); if (window.__gx) window.__gx.pulse('var(--ok)'); return out; };
    var verified = engine(q), matched = !UNMATCHED.test(verified);
    if (!matched && (sampleFn || aiReady())) verified = engineOpen(q);
    var sys = function () { return rules() + (matched ? ' VERIFIED FINDING computed by Gradex for the latest question (use exactly these figures, never invent others; if it says information is unavailable, say so): ' + engine(q) : ' NO DATASET FINDING applies to the latest question: it is a general question. Answer it helpfully from your own knowledge in plain text, at most about 90 words, no markdown, no lists. If it asks about any student, class, score, attendance or record that is not in the data above, say that information is not available rather than inventing it.'); };
    if (sampleFn) {
      var turns = [{ role: 'user', content: sys() }].concat(H.slice(-10));
      return sampleFn(turns, { cache: false, modelTier: tier })
        .then(function (r) { return finish(r.text); })
        .catch(function (e) {
          if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled' || e.code === 'not_declared' || e.code === 'capability_disabled')) { sampleFn = null; $('#tier').hidden = true; askNote(); }
          if (aiReady()) return callAI(sys(), H.slice(-10), null).then(finish).catch(function () { return finish(verified); });
          return finish(verified);
        });
    }
    if (aiReady()) return callAI(sys(), H.slice(-10), null).then(finish).catch(function () { return finish(verified); });
    return new Promise(function (res) { setTimeout(function () { res(finish(verified)); }, 700); });
  }
  var orbUI = null; /* set by the morph orb below */
  $$('#tier .chip').forEach(function (b) { b.addEventListener('click', function () { tier = b.dataset.t; $$('#tier .chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }); });
  (function () {
    var c = window.claude; if (!c || typeof c.use !== 'function') return;
    c.use('sample').then(function (fn) { if (!fn) return; sampleFn = fn; $('#tier').hidden = false; $('#chatNote').textContent = 'Figures are calculated first by Gradex; Claude explains them in plain words. The first question asks your permission.'; }).catch(function () {});
  })();


  /* ---------- demo dashboard ---------- */
  var userScores = null;
  function scoresFor(t) { return (userScores || SCORES)[t]; }
  function renderApp() {
    if (!state.user) return;
    $$('.chip', appTerms).forEach(function (c, k) { c.setAttribute('aria-pressed', k === state.term ? 'true' : 'false'); });
    $('#appName').textContent = state.user.name;
    $('#appTermTitle').textContent = 'SEM ' + (state.term + 3) + ' REPORT';
    var arr = scoresFor(state.term), prev = state.term > 0 ? scoresFor(state.term - 1) : null, rows = $('#appRows'), bars = $('#appBars');
    rows.innerHTML = ''; bars.innerHTML = '';
    SUBJECTS.forEach(function (n, i) {
      var ch = prev ? arr[i] - prev[i] : null;
      rows.appendChild(el('tr', '', '<td>' + n + '</td><td class="num">' + arr[i] + '</td><td><span class="gr">' + gradeOf(arr[i]) + '</span></td><td class="num ' + (ch === null ? '' : (ch >= 0 ? 'ok' : 'bd')) + '">' + (ch === null ? 'first term' : (ch >= 0 ? '+' : '') + ch) + '</td>'));
      bars.appendChild(el('li', '', '<span>' + SHORT[i] + '</span><span><i style="width:' + arr[i] + '%"></i></span><b>' + arr[i] + '</b>'));
    });
    var order = SUBJECTS.map(function (n, i) { return { n: n, s: arr[i] }; }).sort(function (a, b) { return a.s - b.s; }).slice(0, 3), nx = $('#appNext'); nx.innerHTML = '';
    order.forEach(function (o, k) { var nb = nextBand(o.s); nx.appendChild(el('li', '', '<b>' + (k + 1) + '</b><span>' + o.n + ' is at ' + o.s + ' (grade ' + gradeOf(o.s) + ').' + (nb ? ' ' + (nb.min - o.s) + ' more points reach a ' + nb.l + '.' : '') + '</span>')); });
    renderStudentExtras();
  }

  /* ---------- auth (demo) ---------- */
  var form = $('#authForm'), email = $('#email'), pass = $('#password'), nameIn = $('#name'), tabIn = $('#tabIn'), tabUp = $('#tabUp');
  function setErr(input, errEl, msg) { input.setAttribute('aria-invalid', msg ? 'true' : 'false'); errEl.textContent = msg || ''; }
  function clearErrors() { setErr(email, $('#emailErr'), ''); setErr(pass, $('#passErr'), ''); setErr(nameIn, $('#nameErr'), ''); }
  function setMode(m) {
    state.mode = m; var up = m === 'up';
    tabIn.setAttribute('aria-selected', up ? 'false' : 'true'); tabUp.setAttribute('aria-selected', up ? 'true' : 'false');
    $('#nameField').hidden = !up;
    $('#loginTitle').textContent = up ? 'Create your account' : 'Log in';
    $('#loginSub').textContent = up ? 'Start with the subjects you already have scores for.' : 'See your semester report.';
    $('#submitBtn').textContent = up ? 'Create account' : 'Log in';
    pass.setAttribute('autocomplete', up ? 'new-password' : 'current-password');
    $('#strength').hidden = !up; clearErrors();
  }
  tabIn.addEventListener('click', function () { setMode('in'); }); tabUp.addEventListener('click', function () { setMode('up'); }); setMode('in');
  var eye = $('#eye');
  eye.addEventListener('click', function () { var show = pass.type === 'password'; pass.type = show ? 'text' : 'password'; eye.textContent = show ? 'Hide' : 'Show'; eye.setAttribute('aria-pressed', show ? 'true' : 'false'); eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); });
  pass.addEventListener('input', function () { var v = pass.value, n = 0; if (v.length >= 8) n++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v)) n++; $('#strength').dataset.n = v.length ? n : 0; });
  $('#forgot').addEventListener('click', function () { setErr(pass, $('#passErr'), 'Password reset is not available in the demo. Any password with 8 or more characters works.'); });
  try { if (localStorage.getItem('gradex.remember')) { email.value = localStorage.getItem('gradex.remember'); $('#remember').checked = true; } } catch (e) {}
  /* login portal: one card per login type; the form opens for the chosen type */
  var PORTAL = { role: null };
  var PORTAL_TXT = { student: ['Student / Parent', 'See your semester report.', 'Your subjects, semesters and next steps are waiting.', 'you@college.edu'], teacher: ['Teacher', 'Open your class dashboard.', 'Your class, learning journeys and Teaching Intelligence are waiting.', 'you@faculty.edu'], admin: ['Administrator', 'Open campus analytics.', 'Institution-wide analytics across every class.', 'admin@college.edu'] };
  function portalShow(r) {
    PORTAL.role = r; var on = !!r;
    $('#loginPortal').hidden = on; $('#loginForm').hidden = !on;
    if (!on) return;
    var t = PORTAL_TXT[r]; $('#rolePick').textContent = t[0]; $('#loginSub').textContent = t[1]; $('#loginSub2').textContent = t[2]; email.placeholder = t[3];
    $$('#roleList .role').forEach(function (b) { b.hidden = b.getAttribute('data-role') !== r; });
    $('#tabUp').hidden = r !== 'student'; $('#card .tabs').hidden = r !== 'student'; if (r !== 'student') setMode('in');
    clearErrors(); if (fine) setTimeout(function () { email.focus({ preventScroll: true }); }, 60);
  }
  $$('[data-portal]').forEach(function (b) { b.addEventListener('click', function () { portalShow(b.getAttribute('data-portal')); window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); }); });
  $('#loginBack').addEventListener('click', function () { portalShow(null); });
  $('#loginAllLink').addEventListener('click', function (e) { e.preventDefault(); portalShow(null); });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); clearErrors(); var ok = true, first = null;
    if (state.mode === 'up' && nameIn.value.trim().length < 2) { setErr(nameIn, $('#nameErr'), 'Enter your name.'); ok = false; first = first || nameIn; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setErr(email, $('#emailErr'), 'Enter a valid email address.'); ok = false; first = first || email; }
    if (pass.value.length < 8) { setErr(pass, $('#passErr'), 'Use at least 8 characters.'); ok = false; first = first || pass; }
    if (!ok) { first.focus(); $('#formStatus').textContent = 'Check the highlighted fields.'; return; }
    try { if ($('#remember').checked) localStorage.setItem('gradex.remember', email.value.trim()); else localStorage.removeItem('gradex.remember'); } catch (err) {}
    var nm = state.mode === 'up' ? nameIn.value.trim() : email.value.trim().split('@')[0];
    if (sbOn()) { sbSubmit(email.value.trim(), pass.value, state.mode === 'up', nm); return; }
    var pr = PORTAL.role || 'student'; setRole(pr, { name: nm.charAt(0).toUpperCase() + nm.slice(1) }); if (pr === 'student') state.user = { name: nm.charAt(0).toUpperCase() + nm.slice(1) };
    pass.value = ''; $('#strength').dataset.n = 0; $('#formStatus').textContent = 'Opening the ' + pr + ' demo.';
    toast('Logged in to the ' + pr + ' demo as ' + nm + '.');
    location.hash = ROLE_DEF[pr].home;
  });
  $('#logout').addEventListener('click', function () { if (sbOn()) { sbSignOut(); return; } setRole(null); state.user = null; location.hash = 'top'; });

  /* ---------- teacher tools: roster, marks, attendance, notices ---------- */
  var TEACH = false, T = { sel: null, term: 0, docs: {}, roster: null, notices: null, dirtyName: '' };
  var tScoreIn = [], tTab = 0;
  (function () {
    ['Students', 'Notices'].forEach(function (n, i) {
      var b = el('button', 'chip', n); b.type = 'button'; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { tTab = i; tTabs(); });
      $('#tRecTabs').appendChild(b);
    });
    function tTabs() {
      $$('#tRecTabs .chip').forEach(function (c, i) { c.setAttribute('aria-pressed', i === tTab ? 'true' : 'false'); c.setAttribute('aria-selected', i === tTab ? 'true' : 'false'); });
      $('#tpStudents').hidden = tTab !== 0; $('#tpNotices').hidden = tTab !== 1;
    }
    tTabs();
    [1, 2, 3].forEach(function (n, i) {
      var b = el('button', 'chip', 'Sem ' + (n + 2)); b.type = 'button';
      b.addEventListener('click', function () { T.term = i; tFill(); });
      $('#tTerm').appendChild(b);
    });
    var row = el('div', 'ed-row');
    SUBJECTS.forEach(function (n, i) {
      var lab = el('label', '', SHORT[i]), inp = el('input', 'input'); inp.type = 'number'; inp.min = 0; inp.max = 100; inp.step = 1; inp.inputMode = 'numeric'; inp.setAttribute('aria-label', n + ' score');
      lab.appendChild(inp); row.appendChild(lab); tScoreIn.push(inp);
    });
    $('#tScores').appendChild(row);
  })();
  function tBlank(name) { return { name: name, scores: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], att: [0, 0], remark: '', updatedAt: new Date().toISOString() }; }
  function tFill() {
    var d = T.sel && T.docs[T.sel]; $('#tEd').hidden = !d; if (!d) return;
    $('#tEdName').textContent = d.name;
    $$('#tTerm .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', k === T.term ? 'true' : 'false'); });
    tScoreIn.forEach(function (inp, i) { inp.value = d.scores[T.term][i]; });
    $('#tAtA').value = d.att[0]; $('#tAtT').value = d.att[1]; $('#tRem').value = d.remark || '';
  }
  function tListRender() {
    var list = $('#tList'); list.innerHTML = '';
    var ids = Object.keys(T.docs).sort(function (a, b) { return T.docs[a].name.localeCompare(T.docs[b].name); });
    if (!ids.length) { list.appendChild(el('p', 'fine', 'No students yet. Add the first one below.')); return; }
    ids.forEach(function (id) {
      var d = T.docs[id], b = el('button', 'pl-row'); b.type = 'button'; b.setAttribute('aria-pressed', id === T.sel ? 'true' : 'false');
      var avg3 = Math.round(avg(d.scores[2].some(function (v) { return v > 0; }) ? d.scores[2] : d.scores[0]));
      b.innerHTML = '<span></span><b></b>'; b.firstChild.textContent = d.name; b.lastChild.textContent = avg3 || '-';
      b.addEventListener('click', function () { T.sel = id; tListRender(); tFill(); });
      list.appendChild(b);
    });
  }
  function tRead(snap) {
    T.docs = {};
    snap.docs.forEach(function (ds) {
      var d = ds.data();
      if (d && typeof d.name === 'string' && validScores(d.scores)) T.docs[ds.id] = { name: d.name.slice(0, 40), scores: d.scores, att: Array.isArray(d.att) && d.att.length === 2 ? d.att : [0, 0], remark: typeof d.remark === 'string' ? d.remark.slice(0, 140) : '' };
    });
    if (T.sel && !T.docs[T.sel]) { T.sel = null; }
    tListRender(); tFill(); classSnap();
  }
  function classSnap() {
    var ids = Object.keys(T.docs), box = $('#classSnap'); if (!box) return;
    if (!ids.length) { CLASSINFO = ''; box.innerHTML = '<p class="fine" style="margin-top: 10px">When a teacher fills in the class roster, the class picture appears here.</p>'; return; }
    var t = 2, any2 = ids.some(function (id) { return T.docs[id].scores[2].some(function (v) { return v > 0; }); }); if (!any2) t = 0;
    var avgs = ids.filter(function (id) { return T.docs[id].scores[t].some(function (v) { return v > 0; }); })
      .map(function (id) { return { n: T.docs[id].name, a: avg(T.docs[id].scores[t]) }; }).sort(function (a, b) { return b.a - a.a; });
    if (!avgs.length) { CLASSINFO = ''; box.innerHTML = '<div class="rw"><span>Students</span><b>' + ids.length + '</b></div><p class="fine" style="margin-top: 12px">Marks have not been entered yet.</p>'; return; }
    var cls = avgs.reduce(function (p, c) { return p + c.a; }, 0) / avgs.length;
    CLASSINFO = 'Class average in Term ' + (t + 1) + ' is ' + cls.toFixed(1) + ' across ' + avgs.length + ' students, top of the class is ' + avgs[0].n + ' at ' + avgs[0].a.toFixed(1);
    box.innerHTML = '<div class="rw"><span>Students</span><b>' + ids.length + '</b></div><div class="rw"><span>Class average, Term ' + (t + 1) + '</span><b>' + cls.toFixed(1) + '</b></div><div class="rw"><span>Top of the class</span><b></b></div><p class="fine" style="margin-top: 12px">Entered by your teacher.</p>';
    box.querySelectorAll('b')[2].textContent = avgs[0].n + ', ' + avgs[0].a.toFixed(1);
  }
  function noticesRender(snap) {
    var docs = snap.docs.map(function (ds) { var d = ds.data() || {}; return { id: ds.id, title: String(d.title || '').slice(0, 80), text: String(d.text || '').slice(0, 600), at: String(d.at || '') }; });
    docs.sort(function (a, b) { return a.at < b.at ? 1 : -1; }); NOTICES = docs;
    [['#noticeList', false], ['#tNList', true]].forEach(function (pair) {
      var box = $(pair[0]); if (!box) return; box.innerHTML = '';
      if (!docs.length) { box.appendChild(el('p', 'fine', pair[1] ? 'Nothing posted yet.' : 'Notices appear here when a teacher posts one.')); return; }
      docs.slice(0, pair[1] ? 20 : 5).forEach(function (n) {
        var it = el('div', 'nt'), h = el('h4'), pm = el('div', 'm'), tx = el('p');
        h.textContent = n.title || 'Notice'; tx.textContent = n.text;
        var when = el('span', '', ''); when.textContent = n.at ? new Date(n.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
        pm.appendChild(when);
        if (pair[1]) { var del = el('button', 'link', 'Delete'); del.type = 'button'; del.addEventListener('click', function () { if (T.notices) T.notices.doc(n.id).delete().catch(function () {}); }); pm.appendChild(del); }
        it.appendChild(h); it.appendChild(tx); it.appendChild(pm); box.appendChild(it);
      });
    });
  }
  function initTeacher(db) {
    TEACH = true;
    $('#navTeach').hidden = false; $('#ftTeach').hidden = false;
    $('#tLock').hidden = true; $('#tMain').hidden = false;
    T.roster = db.collection('roster'); T.notices = db.collection('notices');
    $('#tAdd').addEventListener('click', function () {
      var name = $('#tNew').value.trim(); if (!name) { $('#tNew').focus(); return; }
      var id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      T.roster.doc(id).set(tBlank(name)).then(function () { T.sel = id; $('#tNew').value = ''; $('#tStatus').textContent = 'Added ' + name + '. Fill in the scores and save.'; }).catch(function (e) { $('#tStatus').textContent = dbMsg(e); });
    });
    $('#tSave').addEventListener('click', function () {
      var d = T.sel && T.docs[T.sel]; if (!d) return;
      var sc = d.scores.map(function (r) { return r.slice(); }), bad = null;
      tScoreIn.forEach(function (inp, i) { var v = Math.round(+inp.value); if (!isFinite(v) || v < 0 || v > 100) { bad = bad || inp; return; } sc[T.term][i] = v; });
      var a = Math.round(+$('#tAtA').value) || 0, t = Math.round(+$('#tAtT').value) || 0;
      if (bad) { $('#tStatus').textContent = 'Scores are whole numbers from 0 to 100.'; bad.focus(); return; }
      $('#tSave').disabled = true;
      T.roster.doc(T.sel).set({ name: d.name, scores: sc, att: [clamp(a, 0, 999), clamp(Math.max(a, t), 0, 999)], remark: $('#tRem').value.trim().slice(0, 140), updatedAt: new Date().toISOString() })
        .then(function () { $('#tStatus').textContent = 'Saved. Students see the class snapshot update live.'; })
        .catch(function (e) { $('#tStatus').textContent = dbMsg(e); })
        .then(function () { $('#tSave').disabled = false; });
    });
    $('#tDel').addEventListener('click', function () {
      var d = T.sel && T.docs[T.sel]; if (!d) return;
      T.roster.doc(T.sel).delete().then(function () { $('#tStatus').textContent = 'Removed ' + d.name + '.'; }).catch(function (e) { $('#tStatus').textContent = dbMsg(e); });
    });
    $('#tNPost').addEventListener('click', function () {
      var title = $('#tNTitle').value.trim(), text = $('#tNText').value.trim();
      if (!title && !text) { $('#tNTitle').focus(); return; }
      $('#tNPost').disabled = true;
      T.notices.doc('n' + Date.now().toString(36)).set({ title: title.slice(0, 80), text: text.slice(0, 600), at: new Date().toISOString() })
        .then(function () { $('#tNTitle').value = ''; $('#tNText').value = ''; $('#tNStatus').textContent = 'Posted. Students see it on their dashboard.'; })
        .catch(function (e) { $('#tNStatus').textContent = dbMsg(e); })
        .then(function () { $('#tNPost').disabled = false; });
    });
  }

  /* ---------- database: private scores per person, shared waitlist ---------- */
  var DBX = { db: null, id: null, doc: null, plan: null, ok: false };
  var edGrid = $('#edGrid'), edStatus = $('#edStatus'), edSave = $('#edSave'), edReset = $('#edReset');
  var edInputs = [];
  [0, 1, 2].forEach(function (t) {
    var row = el('div', 'ed-row', '<b>Term ' + (t + 1) + '</b>'); edInputs.push([]);
    SUBJECTS.forEach(function (n, i) {
      var lab = el('label', '', SHORT[i]), inp = el('input', 'input'); inp.type = 'number'; inp.min = 0; inp.max = 100; inp.step = 1; inp.inputMode = 'numeric'; inp.setAttribute('aria-label', n + ', Term ' + (t + 1));
      inp.addEventListener('input', function () { inp.setAttribute('aria-invalid', 'false'); });
      lab.appendChild(inp); row.appendChild(lab); edInputs[t].push(inp);
    });
    edGrid.appendChild(row);
  });
  function fillEditor() { var src = userScores || SCORES; edInputs.forEach(function (r, t) { r.forEach(function (inp, i) { inp.value = src[t][i]; }); }); }
  function validScores(m) { return Array.isArray(m) && m.length === 3 && m.every(function (r) { return Array.isArray(r) && r.length === 6 && r.every(function (v) { return typeof v === 'number' && v >= 0 && v <= 100; }); }); }
  function validPlan(d) {
    return Array.isArray(d.att) && d.att.length === 6 && d.att.every(function (r) { return Array.isArray(r) && r.length === 2 && r.every(function (v) { return typeof v === 'number' && v >= 0 && v <= 999; }); }) &&
      typeof d.target === 'number' && d.target >= 60 && d.target <= 90 && Array.isArray(d.cred) && d.cred.length === 6 && d.cred.every(function (v) { return typeof v === 'number' && v >= 1 && v <= 8; });
  }
  function setBadge() {
    var b = $('#appBadge'), n = $('#appDataNote');
    if (DBX.ok || sbStudent()) { b.textContent = userScores ? 'SAVED TO YOUR PRIVATE DATABASE' : 'DEMO LOGIN. YOUR SCORES SAVE PRIVATELY.'; $('#edIntro').textContent = 'Replace the sample numbers with your own, 0 to 100. Saved scores are private to you.'; }
    else { b.textContent = 'DEMO LOGIN. NOTHING IS SAVED.'; $('#edIntro').textContent = 'Replace the sample numbers with your own, 0 to 100. The database is not available here, so edits last until you close the page.'; }
    b.classList.toggle('saved', !!((DBX.ok || sbStudent()) && userScores));
    if (n) n.textContent = (userScores ? 'Your scores.' : 'Sample data.') + ' Grade bands: A 85+, B 70+, C 55+, D 40+.';
  }
  function dbMsg(e) {
    var c = e && e.code;
    if (c === 'invalid_argument') return 'Saving needs Contributor access to this page. Ask the owner to share it with you at that level.';
    if (c === 'quota_exceeded') return 'The database is full, so this could not be saved.';
    if (c === 'revoked' || c === 'not_granted') return 'Access to the database changed. Reload the page.';
    return 'Could not save right now. Try again in a moment.';
  }
  edSave.addEventListener('click', function () {
    var m = [], bad = null;
    edInputs.forEach(function (r) { var row = []; r.forEach(function (inp) { var v = inp.value === '' ? NaN : Number(inp.value); if (!isFinite(v) || v < 0 || v > 100 || Math.round(v) !== v) { inp.setAttribute('aria-invalid', 'true'); bad = bad || inp; } row.push(v); }); m.push(row); });
    if (bad) { edStatus.textContent = 'Use whole numbers from 0 to 100 in every box.'; bad.focus(); return; }
    if (!DBX.doc && sbStudent()) {
      edSave.disabled = true; edStatus.textContent = 'Saving';
      sbClient.from('scores').upsert({ user_id: AUTH.user.id, scores: m, updated_at: new Date().toISOString() })
        .then(function (r) { if (r.error) { edStatus.textContent = 'Could not save: ' + r.error.message; return; } userScores = m; setBadge(); renderApp(); planRender(); edStatus.textContent = 'Saved to your account. Only you can see these scores.'; })
        .then(function () { edSave.disabled = false; });
      return;
    }
    if (!DBX.doc) { userScores = m; setBadge(); renderApp(); edStatus.textContent = 'Updated for this visit only.'; return; }
    edSave.disabled = true; edStatus.textContent = 'Saving';
    DBX.doc.set({ name: state.user ? state.user.name : '', scores: m, updatedAt: new Date().toISOString() })
      .then(function () { edStatus.textContent = 'Saved. Only you can see these scores.'; })
      .catch(function (e) { edStatus.textContent = dbMsg(e); })
      .then(function () { edSave.disabled = false; });
  });
  edReset.addEventListener('click', function () {
    if (!DBX.doc && sbStudent()) {
      edReset.disabled = true;
      sbClient.from('scores').delete().eq('user_id', AUTH.user.id)
        .then(function (r) { if (r.error) { edStatus.textContent = 'Could not remove: ' + r.error.message; return; } userScores = null; fillEditor(); setBadge(); renderApp(); planRender(); edStatus.textContent = 'Saved scores removed. Showing the sample data.'; })
        .then(function () { edReset.disabled = false; });
      return;
    }
    if (!DBX.doc) { userScores = null; fillEditor(); setBadge(); renderApp(); edStatus.textContent = 'Back to the sample data.'; return; }
    edReset.disabled = true;
    DBX.doc.delete().then(function () { edStatus.textContent = 'Saved scores removed. Showing the sample data.'; }).catch(function (e) { edStatus.textContent = dbMsg(e); }).then(function () { edReset.disabled = false; });
  });
  fillEditor(); setBadge();

  (function () {
    var c = window.claude; if (!c || typeof c.use !== 'function') return;
    Promise.all([c.use('user'), c.use('db')]).then(function (r) {
      var u = r[0], db = r[1]; if (!u || !db) return;
      return u.id().then(function (id) {
        if (!id) return;
        DBX.db = db; DBX.id = id; DBX.ok = true;
        DBX.doc = db.doc('data/users/' + id + '/report');
        DBX.doc.onSnapshot(function (snap) {
          var d = snap.exists ? snap.data() : null;
          userScores = d && validScores(d.scores) ? d.scores.map(function (row) { return row.slice(); }) : null;
          fillEditor(); setBadge(); renderApp(); planRender();
        }, function () { DBX.ok = false; DBX.doc = null; setBadge(); });
        DBX.plan = db.doc('data/users/' + id + '/planner');
        plNote('Your planner saves privately to this page.');
        DBX.plan.onSnapshot(function (snap) {
          if (plDirty) return;
          var d = snap.exists ? snap.data() : null;
          if (d && validPlan(d)) { PL.att = d.att.map(function (r) { return r.slice(); }); PL.target = d.target; PL.cred = d.cred.slice(); }
          planRender();
        }, function () { DBX.plan = null; plNote('Changes last until you close the page.'); });
        setBadge();
        /* waitlist: everyone adds themselves, only owner and editors read the list */
        if (!CONFIG.waitlistUrl) {
          var mine = db.doc('waitlist/' + id), on = false;
          joinBtn.removeAttribute('aria-disabled'); joinNote.textContent = 'One tap adds you. Nothing else is collected.';
          mine.onSnapshot(function (snap) { on = snap.exists; joinBtn.textContent = on ? 'You are on the waitlist' : 'Join the waitlist'; if (on) joinNote.textContent = 'Added. You can leave from here any time.'; }, function () {});
          joinBtn.addEventListener('click', function (e) {
            e.preventDefault(); joinBtn.setAttribute('aria-busy', 'true');
            var wasOn = on;
            (wasOn ? mine.delete() : mine.set({ at: new Date().toISOString() }))
              .then(function () { joinNote.textContent = wasOn ? 'You left the waitlist.' : 'Added. You can leave from here any time.'; })
              .catch(function (er) { joinNote.textContent = er && er.code === 'invalid_argument' ? 'Joining needs Contributor access to this page. Ask the owner to share it with you at that level.' : 'Could not update the waitlist right now.'; })
              .then(function () { joinBtn.removeAttribute('aria-busy'); });
          });
          u.canEdit().then(function (ed) {
            if (!ed) return;
            db.collection('waitlist').onSnapshot(function (q) { $('#joinCount').textContent = q.size + (q.size === 1 ? ' person is' : ' people are') + ' on the waitlist. Only editors see this count.'; }, function () {});
          });
        }
        u.canEdit().then(function (ed) { if (ed) initTeacher(db); }).catch(function () {});
        db.collection('roster').onSnapshot(tRead, function () {});
        db.collection('notices').onSnapshot(noticesRender, function () {});
      });
    }).catch(function () {});
  })();

  /* =====================================================================
     SMART CAMPUS ANALYTICS
     1. Demo dataset (fictional, seeded, stable)   2. Metric calculations
     3. Learning-gap rules + support classification 4. Teaching recommendations
     5. Intervention tracking                       6. Role experiences (student / teacher / admin)
     7. Ask Gradex deterministic engine
     ===================================================================== */
  var TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtD(s) { if (!s) return ''; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function r1(v) { return v === null || v === undefined || isNaN(v) ? '-' : (Math.round(v * 10) / 10).toFixed(1); }
  function pct(a, t) { return t > 0 ? a / t * 100 : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var toastT = 0;
  function toast(msg, err) { var t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2800); }

  /* ---------- 1. demo dataset ---------- */
  var RULES = { low: 55, drop: 8, topicLow: 55, att: 75, minRecs: 3, spread: 30, declineFloor: 70 };
  var TOPICS = [['Logic', 'Graphs', 'Combinatorics'], ['Linked lists', 'Trees', 'Hashing'], ['SQL', 'Normalisation', 'Transactions'], ['Presentations', 'Report writing', 'Group discussion'], ['Scheduling', 'Memory', 'File systems'], ['TCP/IP', 'Routing', 'Security']];
  var TERMS = [{ n: 'Sem 3', from: '2025-01-01', to: '2025-06-30' }, { n: 'Sem 4', from: '2025-07-01', to: '2025-12-31' }, { n: 'Sem 5', from: '2026-01-01', to: '2026-06-30' }];
  var SLOTS = [[['Quiz', '2025-02-10'], ['Test', '2025-03-24'], ['Exam', '2025-05-19']], [['Quiz', '2025-08-11'], ['Test', '2025-09-29'], ['Exam', '2025-11-24']], [['Quiz', '2026-02-09'], ['Test', '2026-03-23'], ['Exam', '2026-05-18']]];
  var CLASSES = [
    { id: 'CSE-A', name: 'Section CSE-A', course: 'B.Tech CSE, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Rao' },
    { id: 'CSE-B', name: 'Section CSE-B', course: 'B.Tech CSE, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Iyer' },
    { id: 'ECE-A', name: 'Section ECE-A', course: 'B.Tech ECE, Semester 5', semester: '2024-27 batch', teacher: 'Prof. D\'Souza' },
    { id: 'CSE-C', name: 'Section CSE-C', course: 'B.Tech CSE, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Banerjee' },
    { id: 'IT-A', name: 'Section IT-A', course: 'B.Tech IT, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Kulkarni' },
    { id: 'IT-B', name: 'Section IT-B', course: 'B.Tech IT, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Thomas' },
    { id: 'ECE-B', name: 'Section ECE-B', course: 'B.Tech ECE, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Mishra' },
    { id: 'BCA-A', name: 'Section BCA-A', course: 'BCA, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Fernandes' },
    { id: 'BCA-B', name: 'Section BCA-B', course: 'BCA, Semester 5', semester: '2024-27 batch', teacher: 'Prof. Chawla' },
    { id: 'MCA-A', name: 'Section MCA-A', course: 'MCA, Semester 3', semester: '2025-27 batch', teacher: 'Prof. Sen' }
  ];
  var DEMO_CLASSES = CLASSES.slice();
  var ROSTER = {
    'CSE-A': ['Aarav Sharma', 'Diya Verma', 'Kabir Mehta', 'Ananya Singh', 'Rohan Gupta', 'Ishita Nair', 'Arjun Reddy', 'Sara Khan'],
    'CSE-B': ['Vihaan Joshi', 'Meera Pillai', 'Dev Malhotra', 'Priya Das', 'Yash Agarwal', 'Nisha Bose', 'Karan Shah', 'Tara Menon'],
    'ECE-A': ['Aditya Rao', 'Zara Ali', 'Nikhil Jain', 'Riya Kapoor', 'Om Patil', 'Simran Kaur', 'Rahul Nambiar', 'Pooja Iyer']
  };
  var FIRST = ['Aanya', 'Advait', 'Akash', 'Amrita', 'Anirudh', 'Anjali', 'Ayaan', 'Bhavya', 'Chirag', 'Darshan', 'Deepika', 'Devika', 'Dhruv', 'Esha', 'Farhan', 'Gauri', 'Harsh', 'Hiral', 'Imran', 'Ira', 'Jatin', 'Jiya', 'Kavya', 'Keshav', 'Kriti', 'Lakshya', 'Mahira', 'Manav', 'Mihir', 'Naina', 'Neel', 'Niharika', 'Nitya', 'Parth', 'Pranav', 'Rachit', 'Ritika', 'Ruhi', 'Sahil', 'Samar', 'Sanya', 'Shaurya', 'Shreya', 'Siddharth', 'Sneha', 'Suhani', 'Tanish', 'Tanvi', 'Uday', 'Vanya', 'Varun', 'Vedant', 'Vidhi', 'Yuvraj', 'Zoya', 'Aryan', 'Hrithik', 'Lavanya', 'Mohit', 'Pallavi', 'Rishabh', 'Saanvi', 'Tejas', 'Urvi', 'Ved'];
  var LAST = ['Agarwal', 'Bhat', 'Chatterjee', 'Chauhan', 'Deshmukh', 'Dubey', 'Gill', 'Goswami', 'Hegde', 'Jadhav', 'Kashyap', 'Khanna', 'Kulkarni', 'Lal', 'Mahajan', 'Mathur', 'Mukherjee', 'Naik', 'Narayan', 'Oberoi', 'Pandey', 'Paul', 'Qureshi', 'Rastogi', 'Saxena', 'Sethi', 'Shetty', 'Sinha', 'Srinivasan', 'Tiwari', 'Trivedi', 'Varma', 'Venkatesh', 'Wadhwa', 'Yadav', 'Bhatt', 'Dutta', 'Ghosh', 'Kaur', 'Menon', 'Mistry', 'Rawat', 'Sood', 'Thakur', 'Vyas'];
  function rng(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var STUDENTS = [], ASSESS = [], BYSID = {}, ASSESS_BY = {}, SOURCES = null, QUALITY = null, DATASET = { name: 'Fictional demo dataset', origin: 'generated in the page', students: 0 };

  /* cohort-level change per semester (points), so sections differ and the campus trend tells a story: most sections improve, IT-B and BCA-A decline */
  var CLASS_DRIFT = { 'CSE-C': 4, 'IT-A': 3.5, 'IT-B': -2.5, 'ECE-B': 3, 'BCA-A': -1.5, 'BCA-B': 4.5, 'MCA-A': 2.5 };
  /* ---------- 1a. demo generator: 10 sections, ~300 fictional students, story students kept in CSE-A / CSE-B / ECE-A ---------- */
  function genDemo() {
    var students = [], assess = [], by = {}, n = 0, used = {};
    var mk = function (name, c) {
      var id = 's' + (n + 1 < 100 ? ('0' + (n + 1)).slice(-2) : String(n + 1)); n++;
      var R = rng(hash(name + c.id)), st = { id: id, name: name, cls: c.id, roll: n, att: [], joined: '2025-01-01' };
      var story = n <= 24, lvl0 = story ? .56 + R() * .34 : .48 + Math.sqrt(R()) * .43, drift = (CLASS_DRIFT[c.id] || 0) + (R() - .5) * 7, base = SUBJECTS.map(function () { return clamp(lvl0 * 100 + (R() - .5) * 22, 25, 97); }), trend = SUBJECTS.map(function () { return story ? (R() - .4) * 7 : drift + (R() - .5) * 6; });
      SUBJECTS.forEach(function (s, i) { var t = 38 + Math.floor(R() * 10), rate = story ? .68 + R() * .3 : .6 + R() * .38; st.att.push([Math.min(t, Math.round(t * rate)), t]); });
      var lvl = mean(base) / 100;
      st.ext = {
        backlogs: R() < (lvl < .55 ? .5 : .12) ? 1 + Math.floor(R() * 2) : 0,
        lms: { logins: Math.round(1 + R() * 6 + lvl * 2), completion: clamp(Math.round(45 + lvl * 40 + (R() - .5) * 30), 20, 100) },
        eng: { events: Math.floor(R() * 6), clubs: Math.floor(R() * 3), hackathons: Math.floor(R() * 3), certs: Math.floor(R() * 4) },
        plc: { apt: clamp(Math.round(17 + lvl * 60 + (R() - .5) * 30), 15, 98), code: clamp(Math.round(10 + lvl * 65 + (R() - .5) * 36), 10, 98), mock: clamp(Math.round(20 + lvl * 52 + (R() - .5) * 34), 15, 98) },
        skills: { tech: clamp(Math.round(35 + lvl * 45 + (R() - .5) * 30), 20, 98), soft: clamp(Math.round(40 + R() * 50), 20, 98) },
        fb: { sat: Math.round((2.6 + R() * 2.2) * 10) / 10, fac: Math.round((2.8 + R() * 2) * 10) / 10 }
      };
      /* realistic gaps in the source systems: ~6% have no placement-cell record, ~3% no LMS record, ~4% no skills assessment yet */
      if (n > 24) { if (R() < .06) st.ext.plc = null; if (R() < .03) st.ext.lms = null; if (R() < .04) st.ext.skills = null; }
      students.push(st); by[id] = st;
      SLOTS.forEach(function (slots, t) {
        slots.forEach(function (sl, k) {
          SUBJECTS.forEach(function (s, i) {
            var v = clamp(Math.round(base[i] + trend[i] * t + (R() - .5) * 8), 18, 99), miss = R() < .02;
            assess.push({ id: id + '-' + t + k + i, sid: id, subj: i, term: t, kind: sl[0], date: sl[1], topic: k < 2 ? TOPICS[i][t] : null, score: miss ? null : v, max: 100 });
          });
        });
      });
    };
    DEMO_CLASSES.forEach(function (c) {
      if (ROSTER[c.id]) { ROSTER[c.id].forEach(function (name) { mk(name, c); }); return; }
      var R = rng(hash(c.id)), size = 36 + Math.floor(R() * 8);
      for (var k = 0; k < size; k++) { var nm; do { nm = FIRST[Math.floor(R() * FIRST.length)] + ' ' + LAST[Math.floor(R() * LAST.length)]; } while (used[nm]); used[nm] = 1; mk(nm, c); }
    });
    function set(sid, i, t, k, v) { var a = assess.filter(function (x) { return x.sid === sid && x.subj === i && x.term === t; })[k]; a.score = v; }
    /* Aarav (s01): the landing-page sample student. Semester averages equal SCORES exactly. */
    SCORES.forEach(function (row, t) { row.forEach(function (v, i) { set('s01', i, t, 0, v - 3); set('s01', i, t, 1, v + 3); set('s01', i, t, 2, v); }); });
    by.s01.att = [[38, 45], [34, 44], [28, 40], [41, 46], [30, 36], [27, 32]];
    /* Diya (s02): strong attendance, Discrete Maths declines in Sem 4 with repeated low Graphs scores, improves after a recorded adjustment. */
    [[74, 70, 72], [53, 52, 60], [63, 66, 68]].forEach(function (r, t) { r.forEach(function (v, k) { set('s02', 0, t, k, v); }); });
    [[78, 81, 80], [76, 79, 77], [80, 83, 82]].forEach(function (r, t) { r.forEach(function (v, k) { set('s02', 1, t, k, v); }); });
    by.s02.att = [[44, 46], [42, 44], [40, 42], [45, 46], [36, 38], [33, 34]];
    /* Kabir (s03): three missing Sem 5 assessments and low attendance; marks themselves are mid-range. */
    set('s03', 2, 2, 0, null); set('s03', 2, 2, 1, null); set('s03', 4, 2, 2, null);
    by.s03.att = [[27, 45], [26, 44], [24, 40], [30, 46], [22, 36], [20, 32]];
    [[61, 64, 62], [58, 60, 59], [55, 57, 56]].forEach(function (r, t) { r.forEach(function (v, k) { set('s03', 2, t, k, v); }); });
    /* Sara (s08): joined in Sem 5, only three quizzes recorded so far. */
    by.s08.joined = '2026-01-15';
    assess = assess.filter(function (a) { return a.sid !== 's08' || (a.term === 2 && a.kind === 'Quiz' && a.subj < 3); });
    assess.forEach(function (a) { if (a.sid === 's08' && a.score === null) a.score = 58; });
    by.s08.att = [[10, 12], [9, 12], [11, 12], [10, 11], [8, 10], [9, 10]];
    /* Ananya (s04): inconsistent across subjects. */
    [[80, 83, 82], [82, 85, 84], [84, 86, 85]].forEach(function (r, t) { r.forEach(function (v, k) { set('s04', 0, t, k, v); }); });
    [[78, 80, 79], [80, 82, 81], [81, 83, 82]].forEach(function (r, t) { r.forEach(function (v, k) { set('s04', 3, t, k, v); }); });
    [[88, 90, 89], [90, 91, 92], [91, 93, 92]].forEach(function (r, t) { r.forEach(function (v, k) { set('s04', 5, t, k, v); }); });
    [[52, 49, 51], [50, 53, 52], [54, 51, 53]].forEach(function (r, t) { r.forEach(function (v, k) { set('s04', 4, t, k, v); }); });
    /* Arjun (s07): Data Structures falls in Sem 5 with two low Hashing scores, no recovery yet; Operating Systems low across the year. */
    [[71, 74, 72], [70, 73, 71], [52, 50, 55]].forEach(function (r, t) { r.forEach(function (v, k) { set('s07', 1, t, k, v); }); });
    [[50, 53, 51], [52, 49, 53], [51, 54, 52]].forEach(function (r, t) { r.forEach(function (v, k) { set('s07', 4, t, k, v); }); });
    /* story overrides for the multi-source view */
    Object.assign(by.s04.ext, { plc: { apt: 52, code: 58, mock: 38 }, skills: { tech: 70, soft: 44 }, eng: { events: 0, clubs: 0, hackathons: 0, certs: 1 }, lms: { logins: 6, completion: 92 } }); /* Ananya: high academic, low placement readiness */
    Object.assign(by.s03.ext, { lms: { logins: 5, completion: 84 }, eng: { events: 2, clubs: 1, hackathons: 1, certs: 1 } }); /* Kabir: low attendance, strong online engagement */
    Object.assign(by.s01.ext, { plc: { apt: 68, code: 74, mock: 62 }, skills: { tech: 72, soft: 66 }, eng: { events: 3, clubs: 1, hackathons: 2, certs: 2 }, lms: { logins: 4, completion: 78 }, fb: { sat: 4.1, fac: 4.0 } });
    Object.assign(by.s07.ext, { backlogs: 1, plc: { apt: 44, code: 40, mock: 42 }, lms: { logins: 2, completion: 48 } }); /* Arjun: academic and placement support */
    Object.assign(by.s05.ext, { eng: { events: 5, clubs: 2, hackathons: 2, certs: 3 }, lms: { logins: 6, completion: 88 } }); /* Rohan: highly engaged */
    Object.assign(by.s17.ext, { plc: { apt: 88, code: 84, mock: 80 }, skills: { tech: 86, soft: 78 } }); /* Aditya: placement-ready */
    /* Section CSE-B: several students low on Data Structures / Trees in Sem 4 (class-wide pattern). */
    ['s09', 's10', 's11', 's13', 's15'].forEach(function (sid, j) { set(sid, 1, 1, 0, 46 + j * 2); set(sid, 1, 1, 1, 44 + j * 2); });
    return { students: students, assess: assess };
  }

  /* ---------- 1b. seven source tables (what an ERP, LMS, placement cell and survey tool would export), with the mess real exports have ---------- */
  function toSources(d) {
    var story = function (sid) { return +String(sid).slice(1) <= 24; }, R = rng(20261014), S = { students: [], academic: [], attendance: [], lms: [], engagement: [], placement: [], skills: [], feedback: [] };
    d.students.forEach(function (st, k) {
      var c = DEMO_CLASSES.filter(function (x) { return x.id === st.cls; })[0], nm = st.name;
      if (k >= 24 && R() < .03) nm = (R() < .5 ? nm.toUpperCase() : '  ' + nm + ' '); /* inconsistent casing and stray spaces */
      S.students.push({ student_id: st.id, name: nm, section: st.cls, course: c.course, joined: st.joined, backlogs: st.ext.backlogs });
      st.att.forEach(function (a, i) { var att = a[0]; if (k >= 24 && R() < .01) att = a[1] + 1 + Math.floor(R() * 3); /* attended > sessions */ S.attendance.push({ student_id: st.id, subject: SUBJECTS[i], attended: att, sessions: a[1] }); });
      if (st.ext.lms) S.lms.push({ student_id: st.id, logins_per_week: st.ext.lms.logins, assignment_completion_pct: st.ext.lms.completion });
      S.engagement.push({ student_id: st.id, events: st.ext.eng.events, clubs: st.ext.eng.clubs, hackathons: st.ext.eng.hackathons, certifications: st.ext.eng.certs });
      if (st.ext.plc) S.placement.push({ student_id: st.id, aptitude: st.ext.plc.apt, coding: st.ext.plc.code, mock_interview: st.ext.plc.mock });
      if (st.ext.skills) S.skills.push({ student_id: st.id, technical: st.ext.skills.tech, soft_skills: st.ext.skills.soft });
      S.feedback.push({ student_id: st.id, satisfaction_1_5: st.ext.fb.sat, faculty_rating_1_5: st.ext.fb.fac });
    });
    d.assess.forEach(function (a) {
      var sc = a.score; if (sc !== null && !story(a.sid) && R() < .004) sc = 100 + Math.floor(R() * 16); /* out-of-range marks */
      var row = { student_id: a.sid, subject: SUBJECTS[a.subj], semester: TERMS[a.term].n, kind: a.kind, date: a.date, topic: a.topic || '', score: sc === null ? '' : sc, max: a.max };
      S.academic.push(row);
      if (!story(a.sid) && R() < .012) S.academic.push(Object.assign({}, row)); /* duplicate export rows */
    });
    for (var j = 0; j < 6; j++) S.academic.push({ student_id: 's9' + (90 + j), subject: SUBJECTS[j], semester: 'Sem 4', kind: 'Quiz', date: SLOTS[1][0][1], topic: '', score: 60 + j, max: 100 }); /* orphan rows: IDs not in the student master */
    return S;
  }

  /* ---------- 1c. integration: join the seven sources on student_id, clean, log every fix, build the unified view ---------- */
  function num(v) { if (v === null || v === undefined || v === '') return null; var n = +String(v).replace(/[^0-9.+-]/g, ''); return isNaN(n) ? null : n; }
  function normName(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function subjIdx(name) { var n = String(name || '').trim().toLowerCase(); for (var i = 0; i < SUBJECTS.length; i++) { if (SUBJECTS[i].toLowerCase() === n || SHORT[i].toLowerCase() === n) return i; } return -1; }
  function termIdx(sem, date) { var n = String(sem || '').trim().toLowerCase(); for (var i = 0; i < TERMS.length; i++) { if (TERMS[i].n.toLowerCase() === n || ('sem' + (i + 3)) === n.replace(/\s+/g, '') || ('semester ' + (i + 3)) === n) return i; } if (date) { for (var k = 0; k < TERMS.length; k++) { if (date >= TERMS[k].from && date <= TERMS[k].to) return k; } } return -1; }
  function integrate(S, meta) {
    var Q = { sources: {}, fixes: [], missing: {}, students: 0, assessments: 0, unscored: 0, orphans: 0, duplicates: 0, range: 0, names: 0, attFix: 0, unknownSubject: 0, unknownSem: 0, joinKey: 'student_id' };
    var students = [], by = {}, assess = [], seen = {}, classes = {};
    (S.students || []).forEach(function (r) {
      var id = String(r.student_id || '').trim(); if (!id || by[id]) { if (id) Q.duplicates++; return; }
      var nm = normName(r.name); if (nm !== String(r.name || '')) Q.names++;
      var cls = String(r.section || r.class || 'Unassigned').trim();
      if (!classes[cls]) classes[cls] = (DEMO_CLASSES.filter(function (c) { return c.id === cls; })[0]) || { id: cls, name: 'Section ' + cls, course: String(r.course || 'Course not recorded'), semester: '', teacher: 'Faculty' };
      var st = { id: id, name: nm || id, cls: cls, roll: students.length + 1, att: SUBJECTS.map(function () { return [0, 0]; }), joined: String(r.joined || '2025-01-01').slice(0, 10), ext: { backlogs: num(r.backlogs) || 0, lms: null, eng: null, plc: null, skills: null, fb: null } };
      students.push(st); by[id] = st;
    });
    Object.keys(S).forEach(function (k) { Q.sources[k] = (S[k] || []).length; });
    (S.attendance || []).forEach(function (r) { var st = by[String(r.student_id || '').trim()]; if (!st) { Q.orphans++; return; } var i = subjIdx(r.subject); if (i < 0) { Q.unknownSubject++; return; } var a = num(r.attended) || 0, t = num(r.sessions) || 0; if (a > t) { Q.attFix++; a = t; } st.att[i] = [a, t]; });
    (S.academic || []).forEach(function (r) {
      var sid = String(r.student_id || '').trim(), st = by[sid]; if (!st) { Q.orphans++; return; }
      var i = subjIdx(r.subject); if (i < 0) { Q.unknownSubject++; return; }
      var date = String(r.date || '').slice(0, 10), t = termIdx(r.semester, date); if (t < 0) { Q.unknownSem++; return; }
      var key = sid + '|' + i + '|' + t + '|' + (r.kind || '') + '|' + date; if (seen[key]) { Q.duplicates++; return; } seen[key] = 1;
      var sc = num(r.score), mx = num(r.max) || 100; if (sc !== null && (sc > mx || sc < 0)) { Q.range++; sc = clamp(sc, 0, mx); }
      if (sc !== null && mx !== 100) sc = Math.round(sc / mx * 100);
      assess.push({ id: sid + '-' + t + '-' + i + '-' + assess.length, sid: sid, subj: i, term: t, kind: String(r.kind || 'Test'), date: date, topic: r.topic ? String(r.topic) : null, score: sc, max: 100 });
    });
    var one = function (src, fn) { (S[src] || []).forEach(function (r) { var st = by[String(r.student_id || '').trim()]; if (!st) { Q.orphans++; return; } fn(st, r); }); };
    one('lms', function (st, r) { st.ext.lms = { logins: num(r.logins_per_week) || 0, completion: clamp(num(r.assignment_completion_pct) || 0, 0, 100) }; });
    one('engagement', function (st, r) { st.ext.eng = { events: num(r.events) || 0, clubs: num(r.clubs) || 0, hackathons: num(r.hackathons) || 0, certs: num(r.certifications) || 0 }; });
    one('placement', function (st, r) { st.ext.plc = { apt: num(r.aptitude), code: num(r.coding), mock: num(r.mock_interview) }; });
    one('skills', function (st, r) { st.ext.skills = { tech: num(r.technical), soft: num(r.soft_skills) }; });
    one('feedback', function (st, r) { st.ext.fb = { sat: num(r.satisfaction_1_5), fac: num(r.faculty_rating_1_5) }; });
    ['lms', 'eng', 'plc', 'skills', 'fb'].forEach(function (k) { Q.missing[k] = students.filter(function (s) { return !s.ext[k]; }).length; });
    Q.missing.att = students.filter(function (s) { return s.att.every(function (a) { return a[1] === 0; }); }).length;
    Q.missing.acad = students.filter(function (s) { return !assess.some(function (a) { return a.sid === s.id; }); }).length;
    assess.sort(function (x, y) { return x.date < y.date ? -1 : (x.date > y.date ? 1 : 0); });
    Q.students = students.length; Q.assessments = assess.length; Q.unscored = assess.filter(function (a) { return a.score === null; }).length;
    if (Q.duplicates) Q.fixes.push(Q.duplicates + ' duplicate rows removed (same student, subject, semester, kind and date)');
    if (Q.range) Q.fixes.push(Q.range + ' marks outside 0 to max clipped to the valid range');
    if (Q.attFix) Q.fixes.push(Q.attFix + ' attendance rows with attended > sessions capped at sessions');
    if (Q.names) Q.fixes.push(Q.names + ' names normalised (case and spacing)');
    if (Q.orphans) Q.fixes.push(Q.orphans + ' rows dropped: student_id not in the student master');
    if (Q.unknownSubject) Q.fixes.push(Q.unknownSubject + ' rows dropped: subject not in the catalogue');
    if (Q.unknownSem) Q.fixes.push(Q.unknownSem + ' rows dropped: semester or date not recognised');
    Q.fixes.push(Q.unscored + ' assessments kept with no score (missing evidence, never zero)');
    /* commit */
    STUDENTS = students; BYSID = by; ASSESS = assess; ASSESS_BY = {}; assess.forEach(function (a) { (ASSESS_BY[a.sid] = ASSESS_BY[a.sid] || []).push(a); });
    CLASSES = Object.keys(classes).map(function (k) { return classes[k]; }).sort(function (a, b) { var ia = DEMO_CLASSES.map(function (c) { return c.id; }).indexOf(a.id), ib = DEMO_CLASSES.map(function (c) { return c.id; }).indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a.id < b.id ? -1 : 1); });
    SOURCES = S; QUALITY = Q; DATASET = Object.assign({ name: 'Fictional demo dataset', origin: 'generated in the page' }, meta || {}, { students: students.length, at: new Date() });
    if (typeof CLS_CACHE !== 'undefined') CLS_CACHE = {};
    return Q;
  }
  integrate(toSources(genDemo()), { name: 'Fictional demo dataset', origin: 'generated in the page, exported to 7 source tables, then integrated' });

  /* ---------- 1d. CSV helpers: export the source tables, import real ones ---------- */
  function csvText(rows) { if (!rows.length) return ''; var cols = Object.keys(rows[0]); var q = function (v) { v = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return cols.join(',') + '\n' + rows.map(function (r) { return cols.map(function (c) { return q(r[c]); }).join(','); }).join('\n'); }
  function csvParse(txt) {
    var rows = [], row = [], cell = '', i = 0, inQ = false; txt = String(txt || '').replace(/^﻿/, '');
    while (i < txt.length) { var ch = txt[i]; if (inQ) { if (ch === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; } else if (ch === '"') inQ = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch; i++; }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); }); if (!rows.length) return [];
    var head = rows[0].map(function (h) { return String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); });
    return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, k) { o[h] = r[k] === undefined ? '' : String(r[k]).trim(); }); return o; });
  }
  var SRC_SIG = { students: ['section', 'name'], academic: ['subject', 'score'], attendance: ['attended', 'sessions'], lms: ['logins_per_week'], engagement: ['hackathons'], placement: ['aptitude'], skills: ['technical'], feedback: ['satisfaction_1_5'] };
  function detectSource(rows) { if (!rows.length) return null; var keys = Object.keys(rows[0]); if (keys.indexOf('student_id') < 0) return null; var best = null; Object.keys(SRC_SIG).forEach(function (s) { if (SRC_SIG[s].every(function (k) { return keys.indexOf(k) >= 0; })) best = best || s; }); return best; }
  function downloadText(fname, txt) {
    var fallback = function () { try { var a = el('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = fname; document.body.appendChild(a); a.click(); a.remove(); toast('Downloaded ' + fname + '.'); } catch (e) { toast('Download failed in this browser.', true); } };
    var c = window.claude;
    if (c && typeof c.use === 'function') { c.use('downloads').then(function (dl) { if (!dl) { fallback(); return; } return dl.save({ filename: fname, data: txt }).then(function () { toast('Downloaded ' + fname + '.'); }).catch(function (e) { if (e && e.code === 'declined') toast('Download cancelled.'); else fallback(); }); }).catch(fallback); } else fallback();
  }

  /* ---------- 1e. predictive layer: trajectory + transparent early-warning model ---------- */
  function trajectory(sid) {
    var t = [0, 1, 2].map(function (k) { return studentAvg(sid, k); }), pts = []; t.forEach(function (v, i) { if (v !== null) pts.push([i, v]); });
    if (pts.length < 2) return { n: pts.length, slope: null, next: null, terms: t };
    var mx = mean(pts.map(function (p) { return p[0]; })), my = mean(pts.map(function (p) { return p[1]; })), num = 0, den = 0;
    pts.forEach(function (p) { num += (p[0] - mx) * (p[1] - my); den += (p[0] - mx) * (p[0] - mx); });
    var slope = den ? num / den : 0, b = my - slope * mx;
    return { n: pts.length, slope: slope, next: clamp(b + slope * 3, 0, 100), terms: t, last: pts[pts.length - 1][1] };
  }
  var RISK_W = [
    { k: 'acad', label: 'Academic average', w: .075, ref: 62, dir: -1, why: 'each point below 62 adds risk' },
    { k: 'att', label: 'Attendance %', w: .045, ref: 75, dir: -1, why: 'each point below 75% adds risk' },
    { k: 'lms', label: 'LMS activity', w: .02, ref: 60, dir: -1, why: 'each point below 60 adds risk' },
    { k: 'backlogs', label: 'Backlogs', w: .6, ref: 0, dir: 1, why: 'each backlog adds risk' },
    { k: 'slope', label: 'Trajectory (points per semester)', w: .12, ref: 0, dir: -1, why: 'a falling average adds risk' },
    { k: 'missing', label: 'Missing assessments', w: .25, ref: 0, dir: 1, why: 'each unscored assessment adds risk' }
  ];
  function riskModel(sid) {
    var x = BYSID[sid].ext, A = attOf(sid), ac = studentAvg(sid), tr = trajectory(sid), SS = successScore(sid), lmsP = SS.parts[2];
    var f = { acad: ac, att: A.p, lms: lmsP.raw, backlogs: x.backlogs || 0, slope: tr.slope, missing: missingOf(sid).length };
    var logit = -0.35, parts = RISK_W.map(function (w) { var v = f[w.k]; if (v === null || v === undefined) return { label: w.label, value: null, contrib: 0, why: w.why }; var c = w.w * (w.dir < 0 ? (w.ref - v) : (v - w.ref)); logit += c; return { label: w.label, value: Math.round(v * 10) / 10, contrib: c, why: w.why }; });
    var p = 1 / (1 + Math.exp(-logit)), n = scored(recs(sid)).length;
    var level = n < 6 ? 'insufficient' : (p >= .6 ? 'high' : (p >= .35 ? 'elevated' : 'low'));
    var warn = tr.slope !== null && tr.slope <= -4 && n >= 6;
    return { p: p, pct: Math.round(p * 100), level: level, parts: parts.sort(function (a, b) { return b.contrib - a.contrib; }), traj: tr, warn: warn, n: n };
  }
  var RISK_LABEL = { high: 'High risk', elevated: 'Elevated risk', low: 'Low risk', insufficient: 'More information needed' };
  function predictCard(sid, supportive) {
    var r = riskModel(sid), t = r.traj, next = t.next === null ? null : Math.round(t.next);
    var trend = t.slope === null ? 'Not enough semesters to project a trajectory yet.' : ('Semester averages ' + t.terms.map(function (v) { return v === null ? '-' : r1(v); }).join(' → ') + '; slope ' + (t.slope >= 0 ? '+' : '') + r1(t.slope) + ' points per semester; projected next semester ' + next + '.');
    var drivers = r.parts.filter(function (x) { return x.value !== null && x.contrib > 0.05; }).slice(0, 3);
    if (supportive) return '<div class="rw"><span>Projected next-semester average</span><b>' + (next === null ? 'Not yet' : next) + '</b></div><div class="rw"><span>Trajectory</span><b class="' + (t.slope === null ? '' : (t.slope >= 2 ? 'ok' : (t.slope <= -4 ? 'bd' : 'wa'))) + '">' + (t.slope === null ? '-' : (t.slope >= 2 ? 'Rising' : (t.slope <= -4 ? 'Falling, worth a conversation' : 'Steady'))) + '</b></div><p class="fine" style="margin-top:8px">' + esc(trend) + ' A projection from your own past averages, not a prediction about you as a person.</p>';
    return '<div class="rw"><span>Predicted academic risk (next semester)</span><b>' + riskPill(r) + '</b></div>' + (r.warn ? '<div class="rw"><span>Early warning</span><b class="bd">Declining trajectory, ' + r1(t.slope) + ' points per semester</b></div>' : '') + '<p class="fine" style="margin-top:8px">' + esc(trend) + '</p>' + (drivers.length ? '<ul class="bars-mini drv" style="margin-top:8px">' + drivers.map(function (d) { return '<li><span>' + esc(d.label) + '</span><span><i style="width:' + Math.min(100, Math.round(d.contrib / 3 * 100)) + '%;background:var(--rk)"></i></span><b>+' + r1(d.contrib) + '</b><small>' + esc(d.label) + ' ' + d.value + ' · ' + esc(d.why) + '</small></li>'; }).join('') + '</ul>' : '<p class="fine">No indicator is pushing the risk up.</p>') + '<p class="fine" style="margin-top:8px">Transparent logistic model with hand-set coefficients (see Method). Illustrative on fictional data; an institution would fit the weights on its own outcome history.</p>';
  }
  function riskPill(r) { return '<span class="pill ' + (r.level === 'high' ? 'priority' : (r.level === 'elevated' ? 'monitor' : (r.level === 'low' ? 'on_track' : 'insufficient'))) + '">' + RISK_LABEL[r.level] + (r.level === 'insufficient' ? '' : ' · ' + r.pct + '%') + '</span>'; }
  var IV_KEY = 'gradex.interventions', STRATEGIES = ['Visual demonstrations and diagrams', 'Step-by-step worked examples', 'Breaking the concept into smaller objectives', 'Guided practice with reduced support', 'Short formative quizzes', 'Peer discussion and collaborative exercises', 'Alternative explanations and real-world examples', 'Targeted revision and additional practice', 'Small-group instruction', 'Additional individual support'];
  var SEED_IV = [
    { id: 'iv1', sid: 's02', cls: 'CSE-A', subj: 0, topic: 'Graphs', gap: 'Declining Discrete Maths results with two low Graphs scores in Sem 4', evidence: 'Sem 3 Discrete Maths average 72.0 (3 assessments). Sem 4 Quiz (Graphs) 53 on 11 Aug 2025 and Sem 4 Test (Graphs) 52 on 29 Sep 2025.', strategy: 'Step-by-step worked examples', date: '2025-10-06', follow: '2025-11-24', notes: 'Reteach Graph proofs with worked examples, then a 10-minute formative quiz before the Sem 4 end-semester exam.', status: 'completed' },
    { id: 'iv2', sid: 's03', cls: 'CSE-A', subj: 2, topic: '', gap: 'Two DBMS assessments missing in Sem 5 and attendance below the 75% threshold', evidence: 'Sem 5 Quiz and Test (Physical) not recorded. DBMS attendance 24 of 40 sessions (60%).', strategy: 'Targeted revision and additional practice', date: '2026-09-28', follow: '2026-10-06', notes: 'Check whether the missing work can be submitted. Attendance is context, not a conclusion about effort.', status: 'in_progress' },
    { id: 'iv3', sid: '', cls: 'CSE-B', subj: 1, topic: 'Trees', gap: 'Five students scored below 55 on both Trees assessments in Sem 4', evidence: 'Section CSE-B Sem 4 Quiz and Test (Trees): five students below 55 on each.', strategy: 'Alternative explanations and real-world examples', date: '2026-10-20', follow: '2026-11-03', notes: 'Short revision lesson using tree diagrams, then a formative quiz before moving on.', status: 'planned' }
  ];
  var IV = [], IV_DEL = [];
  function ivLoad() {
    var mine = []; try { mine = JSON.parse(localStorage.getItem(IV_KEY) || '[]'); } catch (e) { mine = []; }
    if (!Array.isArray(mine)) mine = [];
    var seeded = SEED_IV.map(function (s) { return Object.assign({}, s); });
    mine.forEach(function (m) { if (m && typeof m.id === 'string') ivMerge(seeded, m); });
    IV = seeded.filter(function (iv) { return (iv.sid ? !!BYSID[iv.sid] : true) && CLASSES.some(function (c) { return c.id === iv.cls; }); });
  }
  function ivMerge(list, m) {
    var k = list.findIndex(function (s) { return s.id === m.id; });
    if (m.deleted) { if (k >= 0) list.splice(k, 1); if (IV_DEL.indexOf(m.id) < 0) IV_DEL.push(m.id); return; }
    if (k >= 0) list[k] = m; else list.push(m);
  }
  function ivSave(rec) {
    if (rec) ivRemote(rec);
    try { localStorage.setItem(IV_KEY, JSON.stringify(IV.concat(IV_DEL.map(function (id) { return { id: id, deleted: true }; })))); return true; } catch (e) { return false; }
  }
  ivLoad();

  /* ---------- 2. metrics ---------- */
  function recs(sid, subj, term) { return (ASSESS_BY[sid] || []).filter(function (a) { return (subj == null || a.subj === subj) && (term == null || a.term === term); }).sort(function (x, y) { return x.date < y.date ? -1 : 1; }); }
  function scored(list) { return list.filter(function (a) { return a.score !== null; }); }
  function termScore(sid, t, i) { var s = scored(recs(sid, i, t)); return s.length ? mean(s.map(function (a) { return a.score; })) : null; }
  function termMatrix(sid) { return [0, 1, 2].map(function (t) { return SUBJECTS.map(function (n, i) { return termScore(sid, t, i); }); }); }
  function studentAvg(sid, term) { var s = scored(recs(sid, null, term)); return s.length ? mean(s.map(function (a) { return a.score; })) : null; }
  function attOf(sid, i) { var st = BYSID[sid]; if (i == null) { var a = 0, t = 0; st.att.forEach(function (r) { a += r[0]; t += r[1]; }); return { a: a, t: t, p: pct(a, t) }; } return { a: st.att[i][0], t: st.att[i][1], p: pct(st.att[i][0], st.att[i][1]) }; }
  function missingOf(sid, term) { return recs(sid, null, term).filter(function (a) { return a.score === null; }); }
  function subjTrend(sid, i) {
    var s = scored(recs(sid, i)); if (s.length < RULES.minRecs) return { n: s.length, ok: false };
    var recent = s.slice(-2), earlier = s.slice(0, -2), rm = mean(recent.map(function (a) { return a.score; })), em = mean(earlier.map(function (a) { return a.score; }));
    return { n: s.length, ok: true, recent: recent, earlier: earlier, rm: rm, em: em, change: rm - em, first: s[0], last: s[s.length - 1] };
  }
  function classStudents(cls) { return STUDENTS.filter(function (s) { return !cls || s.cls === cls; }); }
  function classAvg(cls, term) { var v = classStudents(cls).map(function (s) { return studentAvg(s.id, term); }).filter(function (x) { return x !== null; }); return v.length ? mean(v) : null; }
  function classAtt(cls) { var a = 0, t = 0; classStudents(cls).forEach(function (s) { var x = attOf(s.id); a += x.a; t += x.t; }); return pct(a, t); }
  function completeness(cls, term) { var all = ASSESS.filter(function (a) { return (!cls || BYSID[a.sid].cls === cls) && (term == null || a.term === term); }); var sc = scored(all).length; return { total: all.length, scored: sc, missing: all.length - sc, p: pct(sc, all.length) }; }

  /* ---------- 3. learning-gap rules and support classification ---------- */
  var RULE_TEXT = [
    ['Declining results', 'A subject\'s semester average falls by ' + RULES.drop + ' or more points from one semester to the next (each semester needs 2+ scored records). If a later semester recovers by 5+ points, or the subject is still at ' + RULES.declineFloor + ' or above, the decline is kept as context, not an active signal.'],
    ['Low subject average', 'A subject\'s average over its scored assessments is below ' + RULES.low + ' with at least ' + RULES.minRecs + ' records.'],
    ['Repeated topic difficulty', 'Two or more scored quizzes/tests tagged with the same topic are below ' + RULES.topicLow + '. Exams are mixed-topic and never produce topic claims.'],
    ['Inconsistent across subjects', 'The gap between the highest and lowest subject average is ' + RULES.spread + ' points or more.'],
    ['Missing assessments', 'Assessments with no recorded score. Counted as missing evidence, never as a zero.'],
    ['Attendance context', 'Attendance below ' + RULES.att + '% is shown as context. On its own it can only raise a student to Monitor, never higher.'],
    ['Priority review', 'Two or more academic signals (a subject with a low average or repeated topic difficulty counts once; each decline counts separately), or one academic signal plus two or more missing assessments.'],
    ['Support recommended', 'Exactly one academic signal (declining, low subject or repeated topic).'],
    ['Monitor', 'No active academic signal, but low attendance, two or more missing assessments, a recovered decline or an inconsistent profile.'],
    ['On track', 'None of the above.'],
    ['More information needed', 'Fewer than 6 scored assessments overall. No classification is made.']
  ];
  var LEVEL = { priority: 'Priority review', support: 'Support recommended', monitor: 'Monitor', on_track: 'On track', insufficient: 'More information needed' };
  function gapsFor(sid) {
    var out = [], st = BYSID[sid];
    SUBJECTS.forEach(function (n, i) {
      var all = recs(sid, i), s = scored(all), tm = [0, 1, 2].map(function (t) { var x = scored(recs(sid, i, t)); return x.length >= 2 ? mean(x.map(function (a) { return a.score; })) : null; });
      for (var t = 0; t < 2; t++) {
        if (tm[t] === null || tm[t + 1] === null || tm[t] - tm[t + 1] < RULES.drop) continue;
        var later = t + 2 < 3 && tm[t + 2] !== null ? tm[t + 2] : null, recovered = later !== null && later >= tm[t + 1] + 5, latest = later !== null ? later : tm[t + 1], still = latest >= RULES.declineFloor, evd = scored(recs(sid, i, t)).concat(scored(recs(sid, i, t + 1)));
        out.push({ type: 'decline', sev: recovered || still ? 'support' : 'priority', current: !recovered && !still, subj: i, title: 'Declining results in ' + n + ', ' + TERMS[t].n + ' to ' + TERMS[t + 1].n, pattern: n + ' averaged ' + r1(tm[t]) + ' in ' + TERMS[t].n + ' and ' + r1(tm[t + 1]) + ' in ' + TERMS[t + 1].n + ', a drop of ' + r1(tm[t] - tm[t + 1]) + ' points.' + (later !== null ? (recovered ? ' Recovery observed later: ' + TERMS[t + 2].n + ' average ' + r1(later) + '.' : ' ' + TERMS[t + 2].n + ' average ' + r1(later) + ', no recovery yet.') : ''), ev: evd, period: TERMS[t].n + ' (' + fmtD(TERMS[t].from) + ') to ' + TERMS[t + 1].n + ' (' + fmtD(TERMS[t + 1].to) + ')', n: evd.length, limits: 'Subject-level marks only. A decline can have many explanations (difficulty of the paper, absence, workload); it is not evidence about effort or teaching quality.' + (recovered ? ' Counted as context, not an active signal, because a later semester recovered.' : (still ? ' Counted as context, not an active signal, because the subject is still at ' + RULES.declineFloor + ' or above.' : '')) });
      }
      if (s.length >= RULES.minRecs) {
        var av = mean(s.map(function (a) { return a.score; }));
        if (av < RULES.low) out.push({ type: 'low', sev: 'support', subj: i, title: n + ' average below ' + RULES.low, pattern: n + ' averages ' + r1(av) + ' across ' + s.length + ' scored assessments.', ev: s, period: fmtD(s[0].date) + ' to ' + fmtD(s[s.length - 1].date), n: s.length, limits: 'Compares against the C band threshold used in this demo. Institutions can change the threshold.' });
      }
      TOPICS[i].forEach(function (tp) {
        var tr2 = s.filter(function (a) { return a.topic === tp && a.score < RULES.topicLow; });
        if (tr2.length >= 2) out.push({ type: 'topic', sev: 'support', subj: i, topic: tp, title: 'Repeated difficulty with ' + tp + ' (' + n + ')', pattern: tr2.length + ' scored assessments tagged ' + tp + ' are below ' + RULES.topicLow + '.', ev: tr2, period: fmtD(tr2[0].date) + ' to ' + fmtD(tr2[tr2.length - 1].date), n: tr2.length, limits: 'Topic tags come from quizzes and tests. Question-level responses are not in this dataset, so the specific sub-skill cannot be identified.' });
      });
    });
    var avgs = SUBJECTS.map(function (n, i) { var s = scored(recs(sid, i)); return s.length >= RULES.minRecs ? mean(s.map(function (a) { return a.score; })) : null; }).filter(function (x) { return x !== null; });
    if (avgs.length >= 3 && Math.max.apply(null, avgs) - Math.min.apply(null, avgs) >= RULES.spread) out.push({ type: 'spread', sev: 'info', subj: null, title: 'Inconsistent results across subjects', pattern: 'Subject averages range from ' + r1(Math.min.apply(null, avgs)) + ' to ' + r1(Math.max.apply(null, avgs)) + '.', ev: [], period: 'All recorded semesters', n: avgs.length, limits: 'A wide spread is context for a conversation, not a problem in itself.' });
    var miss = missingOf(sid);
    if (miss.length >= 2) out.push({ type: 'missing', sev: 'info', subj: null, title: miss.length + ' assessment' + (miss.length > 1 ? 's' : '') + ' without a recorded score', pattern: 'Missing evidence: ' + miss.map(function (a) { return SHORT[a.subj] + ' ' + TERMS[a.term].n + ' ' + a.kind; }).join(', ') + '.', ev: miss, period: 'All recorded semesters', n: miss.length, limits: 'A missing record is not a zero and says nothing about ability. Check whether the work can still be submitted.' });
    var A = attOf(sid);
    if (A.p !== null && A.p < RULES.att) out.push({ type: 'att', sev: 'info', subj: null, title: 'Attendance below ' + RULES.att + '%', pattern: 'Attended ' + A.a + ' of ' + A.t + ' recorded sessions (' + r1(A.p) + '%).', ev: [], period: 'Whole year, all subjects', n: A.t, limits: 'Attendance is context. It is not proof of low motivation or effort, and it never raises the support level above Monitor on its own.' });
    return out;
  }
  function classify(sid) {
    var all = scored(recs(sid)); if (all.length < 6) return { level: 'insufficient', gaps: gapsFor(sid), reasons: ['Only ' + all.length + ' scored assessment' + (all.length === 1 ? '' : 's') + ' recorded' + (BYSID[sid].joined > '2025-01-01' ? ' (joined ' + fmtD(BYSID[sid].joined) + ')' : '') + '. More information needed before any classification.'] };
    var gaps = gapsFor(sid), acad = gaps.filter(function (g) { return g.type === 'decline' || g.type === 'low' || g.type === 'topic'; }), miss = missingOf(sid).length, ctx = gaps.filter(function (g) { return g.type === 'att' || g.type === 'spread' || g.type === 'missing'; });
    /* one academic signal per subject for low/topic (they describe the same weakness); a decline is a separate signal */
    var n = uniq(acad.filter(function (g) { return g.type !== 'decline'; }).map(function (g) { return g.subj; })).length + acad.filter(function (g) { return g.type === 'decline' && g.current; }).length;
    var level = 'on_track';
    if (n >= 2 || (n === 1 && miss >= 2)) level = 'priority'; else if (n === 1) level = 'support'; else if (ctx.length || miss >= 2 || acad.some(function (g) { return g.type === 'decline'; })) level = 'monitor';
    return { level: level, gaps: gaps, reasons: gaps.map(function (g) { return g.title; }) };
  }
  var CLS_CACHE = {};
  function cls(sid) { return CLS_CACHE[sid] || (CLS_CACHE[sid] = classify(sid)); }
  function pill(level, txt) { return '<span class="pill ' + level + '">' + (txt || LEVEL[level]) + '</span>'; }
  function classTopics(clsId) {
    var ids = classStudents(clsId).map(function (s) { return s.id; }), rows = [];
    SUBJECTS.forEach(function (n, i) {
      var all = scored(ASSESS.filter(function (a) { return ids.indexOf(a.sid) >= 0 && a.subj === i; }));
      if (all.length) rows.push({ subj: i, topic: null, label: n, avg: mean(all.map(function (a) { return a.score; })), low: all.filter(function (a) { return a.score < RULES.low; }).length, lowStudents: uniq(all.filter(function (a) { return a.score < RULES.low; }).map(function (a) { return a.sid; })).length, n: all.length });
      TOPICS[i].forEach(function (tp) {
        var t = all.filter(function (a) { return a.topic === tp; }); if (!t.length) return;
        rows.push({ subj: i, topic: tp, label: n + ' · ' + tp, avg: mean(t.map(function (a) { return a.score; })), low: t.filter(function (a) { return a.score < RULES.topicLow; }).length, lowStudents: uniq(t.filter(function (a) { return a.score < RULES.topicLow; }).map(function (a) { return a.sid; })).length, n: t.length });
      });
    });
    rows.forEach(function (r) { r.flag = r.topic ? (r.lowStudents >= 3 && r.avg < 62) : (r.avg < 60); });
    return rows;
  }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  /* ---------- 4. teaching recommendations (rule-based templates) ---------- */
  function adviseFor(g, st) {
    var n = g.subj !== null && g.subj !== undefined ? SUBJECTS[g.subj] : 'this area', tp = g.topic || null, where = tp ? tp + ' in ' + n : n;
    var T = {
      decline: { s: 'Step-by-step worked examples', why: 'When results drop across consecutive assessments, worked examples make the expected reasoning visible and let you find the exact step where understanding breaks, instead of assuming the whole subject is the problem.', act: 'Choose two questions of the kind that appeared in the most recent ' + n + ' assessment. Model the first one aloud, step by step. Have the student narrate the second while you only prompt.', check: 'Three-question exit ticket at the end of the lesson on the same question type. Note which step, if any, still breaks down.', follow: 'Compare the next scored ' + n + ' assessment with the recent average of ' + r1(g.ev.length ? mean(g.ev.slice(-2).map(function (a) { return a.score; })) : null) + '.' },
      low: { s: 'Guided practice with reduced support', why: 'A persistently low average usually reflects gaps in prerequisite knowledge rather than a single bad day. Guided practice rebuilds the basics with support that fades as confidence grows.', act: 'Build a four-item practice set in ' + n + ' that starts one level below the current assessments. Work the first together, the second with hints, the last two independently.', check: 'A short quiz (5 questions, 10 minutes) on the prerequisite skills before the next unit. Score it, do not grade it.', follow: 'Review the quiz and the next ' + n + ' assessment together.' },
      topic: { s: 'Alternative explanations and real-world examples', why: 'Two low scores on the same topic suggest the first explanation did not land for this student. A different representation gives a second route into the same idea.', act: 'Reteach ' + where + ' using a different representation (diagram, physical model or real-life scenario). Then give three short questions on ' + (tp || n) + ' only.', check: 'Ask the student to explain ' + (tp || n) + ' back in their own words and solve one unseen question. Record whether the earlier error pattern reappears.', follow: 'Check the next assessment tagged ' + (tp || n) + '.' },
      spread: { s: 'Peer discussion and collaborative exercises', why: 'A student who is strong in some subjects and much lower in others often has study strategies that transfer. Structured discussion lets them borrow approaches from their stronger subjects and from peers.', act: 'Pair the student with a classmate for a 15-minute problem-solving session in the lowest subject, with explicit roles (explainer, checker).', check: 'Short reflection: which strategy from a stronger subject could apply here? One question answered independently afterwards.', follow: 'Compare the lowest subject\'s next assessment with its current average.' },
      missing: { s: 'Additional individual support', why: 'Missing work is missing evidence. Before any academic conclusion, find out whether the assessment can be completed and whether something outside the classroom got in the way.', act: 'A five-minute individual check-in: confirm which assessments are outstanding, agree a submission date, and ask what support would help.', check: 'The outstanding assessment is completed and scored.', follow: 'Once scored, re-run the learning journey; the classification updates automatically.' },
      att: { s: 'Additional individual support', why: 'Low attendance is context, not a verdict. The most useful first step is a conversation that treats the student as a partner.', act: 'Check in privately. Share the recorded numbers, ask what is making attendance hard, and agree one realistic target for the next four weeks.', check: 'Review attendance after four weeks and ask whether missed sessions were caught up.', follow: 'Compare attendance for the next four weeks with the current ' + r1(attOf(st.id).p) + '%.' }
    }[g.type];
    return { gap: g, s: T.s, why: T.why, act: T.act, check: T.check, follow: T.follow, obs: g.title + '. ' + g.pattern, ev: g.ev.length ? g.ev.map(function (a) { return SHORT[a.subj] + ' ' + TERMS[a.term].n + ' ' + a.kind + (a.topic ? ' (' + a.topic + ')' : '') + ': ' + (a.score === null ? 'not recorded' : a.score) + ', ' + fmtD(a.date); }).join('; ') : g.pattern };
  }
  function evList(ev) { return ev.length ? '<ul class="ev">' + ev.map(function (a) { return '<li' + (a.score !== null && a.score < RULES.low ? ' class="low"' : '') + '><span>' + fmtD(a.date) + '</span><span>' + SHORT[a.subj] + ' ' + TERMS[a.term].n + ' ' + a.kind + (a.topic ? ' · ' + a.topic : '') + '</span><b>' + (a.score === null ? 'not recorded' : a.score) + '</b></li>'; }).join('') + '</ul>' : '';
  }

  /* ---------- 5. intervention tracking ---------- */
  function ivOutcome(iv) {
    var before = [], after = [];
    var pool = iv.sid ? ASSESS.filter(function (a) { return a.sid === iv.sid && a.subj === iv.subj; }) : ASSESS.filter(function (a) { return BYSID[a.sid].cls === iv.cls && a.subj === iv.subj && (!iv.topic || a.topic === iv.topic); });
    scored(pool).forEach(function (a) { if (a.date < iv.date) before.push(a); else if (a.date > iv.date) after.push(a); });
    before.sort(function (x, y) { return x.date < y.date ? -1 : 1; }); after.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    var b = before.slice(-3), bm = b.length ? mean(b.map(function (a) { return a.score; })) : null, am = after.length ? mean(after.map(function (a) { return a.score; })) : null;
    return { before: bm, after: am, nb: b.length, na: after.length, change: bm !== null && am !== null ? am - bm : null };
  }
  function ivStatus(iv) {
    if (iv.status === 'completed' || iv.status === 'more_support') return iv.status;
    var o = ivOutcome(iv);
    if (iv.follow && iv.follow < iso(TODAY) && o.na === 0) return 'follow_due';
    return iv.status || 'planned';
  }
  var IV_LABEL = { planned: 'Planned', in_progress: 'In progress', follow_due: 'Follow-up due', completed: 'Completed', more_support: 'Further support needed' };
  function ivReading(iv) {
    var o = ivOutcome(iv);
    if (o.na === 0) return { txt: 'Outcome not yet measured. No scored assessment after ' + fmtD(iv.date) + '.', cls: 'm' };
    if (o.before === null) return { txt: 'No scored assessment before the adjustment, so a before-and-after comparison is not possible.', cls: 'm' };
    if (o.change >= 3) return { txt: 'Improvement observed after the intervention: ' + r1(o.before) + ' before (' + o.nb + ' assessments) to ' + r1(o.after) + ' after (' + o.na + '). This is an observed change, not proof that the adjustment caused it.', cls: 'ok' };
    if (o.change <= -3) return { txt: 'Results were lower after the intervention: ' + r1(o.before) + ' to ' + r1(o.after) + '. Consider reviewing the learning gap, trying another explanation, checking prerequisite knowledge, or adding support.', cls: 'bd' };
    return { txt: 'No clear change yet: ' + r1(o.before) + ' before to ' + r1(o.after) + ' after. Consider another explanation or checking prerequisites before concluding.', cls: 'wa' };
  }
  function ivCard(iv, admin) {
    var st = ivStatus(iv), o = ivOutcome(iv), rd = ivReading(iv), who = iv.sid ? (BYSID[iv.sid] || { name: iv.sid }).name : ((CLASSES.filter(function (c) { return c.id === iv.cls; })[0] || { name: iv.cls }).name + ' (whole section)');
    return '<div class="ivc" data-id="' + iv.id + '"><div class="top"><h4>' + esc(who) + ' · ' + SUBJECTS[iv.subj] + (iv.topic ? ' · ' + esc(iv.topic) : '') + '</h4>' + pill(st, IV_LABEL[st]) + '</div>' +
      '<p><b style="color:#fff;font-weight:400">Gap:</b> ' + esc(iv.gap) + '</p><p><b style="color:#fff;font-weight:400">Evidence:</b> ' + esc(iv.evidence || 'Not recorded') + '</p><p><b style="color:#fff;font-weight:400">Strategy:</b> ' + esc(iv.strategy) + '</p>' +
      '<div class="ba"><span>Adjusted <b>' + fmtD(iv.date) + '</b></span><span>Follow-up <b>' + (iv.follow ? fmtD(iv.follow) : '-') + '</b></span><span>Before <b>' + (o.before === null ? '-' : r1(o.before)) + '</b></span><span>After <b>' + (o.after === null ? '-' : r1(o.after)) + '</b></span><span>Change <b class="' + (o.change === null ? '' : (o.change >= 3 ? 'ok' : (o.change <= -3 ? 'bd' : 'wa'))) + '">' + (o.change === null ? 'not measured' : (o.change >= 0 ? '+' : '') + r1(o.change)) + '</b></span></div>' +
      '<p class="' + rd.cls + '" style="font-size:14px">' + rd.txt + '</p>' + (iv.notes ? '<p>' + esc(iv.notes) + '</p>' : '') +
      (admin ? '' : '<div class="cta" style="margin:4px 0 0;gap:8px"><button class="btn sm" type="button" data-iv="edit">Edit</button>' + (st !== 'completed' ? '<button class="btn sm" type="button" data-iv="complete">Mark completed</button>' : '<button class="btn sm" type="button" data-iv="more">Needs further support</button>') + '<button class="btn sm" type="button" data-iv="delete">Delete</button></div>') + '</div>';
  }

  /* ---------- charts ---------- */
  function lineChart(svg, series, opts) {
    /* series: [{pts:[{x,y,cls,label}], cls}], x in 0..1 */
    opts = opts || {}; var W = 640, H = +svg.getAttribute('viewBox').split(' ')[3], padL = 30, padR = 12, top = 14, padB = 28, iw = W - padL - padR, ih = H - top - padB, out = '', y0 = opts.yMin || 0, y1 = opts.yMax || 100;
    var y = function (v) { return top + ih - ih * (clamp(v, y0, y1) - y0) / (y1 - y0); }, x = function (k) { return padL + iw * k; };
    if (RULES.low > y0) out += '<rect class="band" x="' + padL + '" y="' + y(RULES.low) + '" width="' + iw + '" height="' + (ih - (y(RULES.low) - top)) + '"/>';
    (opts.ticks || [0, 25, 50, 75, 100]).forEach(function (v) { out += '<line class="axis" x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - padR) + '" y2="' + y(v) + '" stroke-width="1"/><text class="ax" x="0" y="' + (y(v) + 4) + '">' + v + '</text>'; });
    (opts.xl || []).forEach(function (l) { out += '<text class="ax" x="' + x(l.x) + '" y="' + (H - 8) + '" text-anchor="' + (l.anchor || 'middle') + '">' + esc(l.t) + '</text>'; });
    (opts.vlines || []).forEach(function (v) { out += '<line class="ivl" x1="' + x(v.x) + '" y1="' + top + '" x2="' + x(v.x) + '" y2="' + (top + ih) + '"/><text class="ax" x="' + (x(v.x) + 4) + '" y="' + (top + 10) + '" fill="var(--ok)">' + esc(v.t) + '</text>'; });
    series.forEach(function (s) {
      var pts = s.pts.filter(function (p) { return p.y !== null; });
      if (pts.length > 1) out += '<path class="ln ' + (s.cls || '') + '" d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p.x).toFixed(1) + ' ' + y(p.y).toFixed(1); }).join(' ') + '"/>';
      pts.forEach(function (p) { out += '<circle class="pt ' + (p.cls || '') + '" cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="4"><title>' + esc(p.label || '') + '</title></circle>'; });
    });
    svg.innerHTML = out;
  }
  function dateX(d, from, to) { var a = new Date(from).getTime(), b = new Date(to).getTime(), v = new Date(d).getTime(); return clamp((v - a) / (b - a), 0, 1); }
  function journeyChart(svg, sid, subj, term, note) {
    var list = recs(sid, subj === -1 ? null : subj, term === -1 ? null : term), from = term === -1 ? '2025-01-01' : TERMS[term].from, to = term === -1 ? '2026-06-30' : TERMS[term].to;
    var pts = [];
    if (subj === -1) {
      var byDate = {}; list.forEach(function (a) { if (a.score === null) return; (byDate[a.date] = byDate[a.date] || []).push(a.score); });
      Object.keys(byDate).sort().forEach(function (d) { pts.push({ x: dateX(d, from, to), y: mean(byDate[d]), label: fmtD(d) + ': average ' + r1(mean(byDate[d])) + ' across ' + byDate[d].length + ' subjects' }); });
    } else list.forEach(function (a) { if (a.score === null) return; pts.push({ x: dateX(a.date, from, to), y: a.score, cls: a.score < RULES.low ? 'low' : '', label: fmtD(a.date) + ' ' + a.kind + (a.topic ? ' (' + a.topic + ')' : '') + ': ' + a.score }); });
    var vl = IV.filter(function (iv) { return iv.sid === sid && (subj === -1 || iv.subj === subj) && iv.date >= from && iv.date <= to; }).map(function (iv) { return { x: dateX(iv.date, from, to), t: 'Adjustment' }; });
    var xl = term === -1 ? TERMS.map(function (t, i) { return { x: dateX(t.from, from, to) + .16, t: t.n }; }) : SLOTS[term].map(function (s) { return { x: dateX(s[1], from, to), t: s[0] + ' ' + fmtD(s[1]).slice(0, 6) }; });
    lineChart(svg, [{ pts: pts }], { xl: xl, vlines: vl });
    var sc = scored(list).length, ms = list.length - sc;
    if (note) note.textContent = (pts.length ? sc + ' scored assessment' + (sc === 1 ? '' : 's') + (ms ? ', ' + ms + ' without a recorded score' : '') + ', ' + fmtD(from) + ' to ' + fmtD(to) + '. ' : 'No scored assessments in this period. ') + (subj === -1 ? 'Each point is the average of the assessments held that day. ' : 'Shaded band marks scores below ' + RULES.low + '. ') + (vl.length ? 'Dashed line: recorded teaching adjustment.' : '');
    return pts.length;
  }
  function termTrendChart(svg, clsId, zoom) {
    var sc = [0, 1, 2].map(function (t) { return classAvg(clsId, t); }), at = classAtt(clsId), xs = [.12, .5, .88], series = [];
    if (zoom && !clsId) CLASSES.forEach(function (c) { var v = [0, 1, 2].map(function (t) { return classAvg(c.id, t); }); series.push({ cls: 'sec', pts: v.map(function (y, i) { return { x: xs[i], y: y, cls: 'sec', label: c.id + ', ' + TERMS[i].n + ': ' + r1(y) }; }) }); });
    series.push({ pts: sc.map(function (v, i) { return { x: xs[i], y: v, label: (clsId || 'Campus') + ' ' + TERMS[i].n + ' average ' + r1(v) }; }) });
    series.push({ cls: 'b', pts: xs.map(function (x) { return { x: x, y: at, label: 'Attendance ' + r1(at) + '% (whole year)' }; }) });
    lineChart(svg, series, { xl: TERMS.map(function (t, i) { return { x: xs[i], t: t.n + ' · ' + r1(sc[i]) }; }), yMin: zoom ? 50 : 0, yMax: 100, ticks: zoom ? [50, 60, 70, 80, 90, 100] : null });
  }

  /* ---------- 3b. Student Success Score, placement readiness, risk flags, segmentation ---------- */
  function weighted(parts) {
    var av = parts.filter(function (p) { return p.raw !== null; }), tw = av.reduce(function (s, p) { return s + p.w; }, 0);
    av.forEach(function (p) { p.weight = p.w / tw; p.contrib = p.raw * p.weight; });
    parts.forEach(function (p) { if (p.raw === null) { p.weight = 0; p.contrib = 0; } });
    return { score: av.length ? av.reduce(function (s, p) { return s + p.contrib; }, 0) : null, parts: parts, n: av.length, total: parts.length };
  }
  function successScore(sid) {
    var x = BYSID[sid].ext, A = attOf(sid), ac = studentAvg(sid), eng = x.eng ? Math.min(100, Math.round((x.eng.events * 8 + x.eng.clubs * 12 + x.eng.hackathons * 15 + x.eng.certs * 10))) : null;
    var lms = x.lms ? Math.round(x.lms.completion * .7 + Math.min(100, x.lms.logins / 5 * 100) * .3) : null, sk = x.skills && x.skills.tech !== null && x.skills.soft !== null ? Math.round((x.skills.tech + x.skills.soft) / 2) : null, sat = x.fb && x.fb.sat !== null ? Math.round(x.fb.sat / 5 * 100) : null;
    return weighted([
      { k: 'academic', label: 'Academic average', raw: ac === null ? null : Math.round(ac), w: .35, note: ac === null ? 'no scored assessments' : 'mean of ' + scored(recs(sid)).length + ' scored assessments' + (x.backlogs ? ', ' + x.backlogs + ' backlog' + (x.backlogs > 1 ? 's' : '') : '') },
      { k: 'attendance', label: 'Attendance', raw: A.p === null ? null : Math.round(A.p), w: .15, note: A.a + ' of ' + A.t + ' sessions' },
      { k: 'lms', label: 'LMS activity', raw: lms, w: .15, note: x.lms ? x.lms.completion + '% assignments completed, ' + x.lms.logins + ' logins/week' : 'no LMS record' },
      { k: 'engagement', label: 'Campus engagement', raw: eng, w: .15, note: x.eng ? x.eng.events + ' events, ' + x.eng.clubs + ' clubs, ' + x.eng.hackathons + ' hackathons, ' + x.eng.certs + ' certifications' : 'no engagement record' },
      { k: 'skills', label: 'Skills assessments', raw: sk, w: .10, note: x.skills ? 'technical ' + x.skills.tech + ', soft skills ' + x.skills.soft : 'no skills assessment yet' },
      { k: 'feedback', label: 'Student satisfaction', raw: sat, w: .10, note: x.fb ? x.fb.sat + ' of 5 from the satisfaction survey (feedback you submit is read by teachers and never changes this score)' : 'no survey response' }
    ]);
  }
  function placementScore(sid) {
    var x = BYSID[sid].ext, P = x.plc || { apt: null, code: null, mock: null }, certs = x.eng ? x.eng.certs : 0, tech = x.skills && x.skills.tech !== null ? Math.min(100, Math.round(x.skills.tech * .8 + certs * 5)) : null;
    return weighted([
      { k: 'apt', label: 'Aptitude score', raw: P.apt, w: .30, note: x.plc ? 'latest aptitude test' : 'no placement-cell record' },
      { k: 'code', label: 'Coding score', raw: P.code, w: .30, note: x.plc ? 'latest coding assessment' : 'no placement-cell record' },
      { k: 'mock', label: 'Mock interview', raw: P.mock, w: .25, note: x.plc ? 'panel score' : 'no placement-cell record' },
      { k: 'tech', label: 'Technical skills + certifications', raw: tech, w: .15, note: x.skills ? 'technical ' + x.skills.tech + ', ' + certs + ' certifications' : 'no skills assessment yet' }
    ]);
  }
  var PL_LEVEL = { ready: 'Placement ready', pl_monitor: 'Build readiness', pl_support: 'Placement support' };
  function placementFlag(sid) { var P = placementScore(sid), s = P.score; return s === null || P.n < 3 ? 'insufficient' : (s < 50 ? 'pl_support' : (s < 65 ? 'pl_monitor' : 'ready')); }
  var SEGMENTS = [
    ['info', 'More information needed', 'Too few academic records to place in a segment.'],
    ['hi_acad_lo_plc', 'High academic, low placement readiness', 'Average 72+ but placement readiness under 60. Action: aptitude and interview practice, not more academics.'],
    ['plc_ready_acad', 'Placement-ready, academic support needed', 'Readiness 65+ with an active academic signal. Action: keep placement prep, close the specific subject gap.'],
    ['lo_att_hi_lms', 'Low attendance, strong online engagement', 'Attendance under 75% but LMS completion 75%+. Action: ask what blocks in-person attendance; learning is happening online.'],
    ['engaged_acad', 'Highly engaged, academic support needed', 'Engagement 60+ with an academic signal. Action: protect study time, use the engagement as a motivator.'],
    ['consistent', 'Consistent performer', 'Average 70+, readiness 65+, attendance 75%+. Action: stretch opportunities, peer mentoring.'],
    ['acad_support', 'Needs academic support', 'An active academic signal without the patterns above. Action: Teaching Intelligence workflow.'],
    ['steady', 'Steady, build placement readiness', 'No academic signal; readiness under 65. Action: skills and placement preparation.'],
    ['no_plc', 'No placement-cell record', 'No aptitude, coding or mock-interview record yet. Action: schedule the placement baseline assessment.']
  ];
  function segmentOf(sid) {
    var c = cls(sid); if (c.level === 'insufficient') return 'info';
    var ac = studentAvg(sid), pl = placementScore(sid).score, A = attOf(sid).p, x = BYSID[sid].ext, eng = successScore(sid).parts[3].raw, sig = c.level === 'support' || c.level === 'priority';
    var hasPl = placementFlag(sid) !== 'insufficient';
    if (hasPl && ac >= 72 && pl < 60) return 'hi_acad_lo_plc';
    if (hasPl && pl >= 65 && sig) return 'plc_ready_acad';
    if (A !== null && A < RULES.att && x.lms && x.lms.completion >= 75) return 'lo_att_hi_lms';
    if (eng !== null && eng >= 60 && sig) return 'engaged_acad';
    if (hasPl && ac >= 70 && pl >= 65 && A >= RULES.att) return 'consistent';
    if (sig) return 'acad_support';
    if (!hasPl) return 'no_plc';
    return 'steady';
  }
  function segLabel(id) { return (SEGMENTS.filter(function (s) { return s[0] === id; })[0] || [])[1] || id; }
  function scoreBars(S) {
    return '<ul class="bars-mini drv">' + S.parts.map(function (p) { return '<li' + (p.raw === null ? ' class="na"' : '') + '><span title="' + esc(p.note) + '">' + esc(p.label) + '</span><span><i style="width:' + (p.raw === null ? 0 : p.raw) + '%"></i></span><b>' + (p.raw === null ? 'n/a' : '+' + r1(p.contrib)) + '</b><small>' + (p.raw === null ? 'not available' : p.raw + ' × ' + Math.round(p.weight * 100) + '%' + (p.note ? ' · ' + esc(p.note) : '')) + '</small></li>'; }).join('') + '</ul>';
  }
  function scoreCol(v) { return v === null ? '' : (v >= 70 ? 'ok' : (v >= 50 ? 'wa' : 'bd')); }
  function plPill(sid) { var f = placementFlag(sid); return '<span class="pill ' + (f === 'ready' ? 'on_track' : (f === 'pl_monitor' ? 'monitor' : (f === 'pl_support' ? 'priority' : 'insufficient'))) + '">' + (PL_LEVEL[f] || 'No data') + '</span>'; }
  function unifiedView(sid) {
    var x = BYSID[sid].ext, A = attOf(sid), ac = studentAvg(sid);
    var card = function (t, rows) { return '<div class="card" style="padding:18px 20px"><div class="m">' + t + '</div>' + rows.map(function (r) { return '<div class="rw" style="font-size:14px"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>'; };
    return card('ACADEMIC', [['Average, all scored', r1(ac)], ['Sem 5 average', r1(studentAvg(sid, 2))], ['Backlogs', x.backlogs], ['Missing scores', missingOf(sid).length]]) +
      card('ATTENDANCE', [['Overall', A.p === null ? 'No data' : r1(A.p) + '%'], ['Lowest subject', (function () { var lo = null; SUBJECTS.forEach(function (n, i) { var p = attOf(sid, i).p; if (p !== null && (lo === null || p < lo.p)) lo = { n: n, p: p }; }); return lo ? lo.n + ' ' + r1(lo.p) + '%' : '-'; })()]]) +
      (x.lms ? card('LMS', [['Logins per week', x.lms.logins], ['Assignment completion', x.lms.completion + '%']]) : card('LMS', [['Record', '<span class="m">not in LMS export</span>']])) +
      (x.eng ? card('ENGAGEMENT', [['Events', x.eng.events], ['Clubs', x.eng.clubs], ['Hackathons', x.eng.hackathons], ['Certifications', x.eng.certs]]) : card('ENGAGEMENT', [['Record', '<span class="m">none</span>']])) +
      (x.plc ? card('PLACEMENT', [['Aptitude', x.plc.apt], ['Coding', x.plc.code], ['Mock interview', x.plc.mock]]) : card('PLACEMENT', [['Record', '<span class="m">not assessed yet</span>']])) +
      (x.skills ? card('SKILLS', [['Technical', x.skills.tech], ['Soft skills', x.skills.soft]]) : card('SKILLS', [['Record', '<span class="m">not assessed yet</span>']])) +
      card('FEEDBACK', [['Survey satisfaction', x.fb ? x.fb.sat + ' / 5' : '<span class="m">no response</span>'], ['Faculty feedback', x.fb ? x.fb.fac + ' / 5' : '-'], ['Submitted feedback', FB.filter(function (f) { return f.type === 'student' && f.sid === sid; }).length], ['Faculty notes received', FB.filter(function (f) { return f.type === 'faculty' && f.sid === sid; }).length]]);
  }

  /* ---------- 5b. feedback: student -> faculty, faculty -> student ---------- */
  var FB_KEY = 'gradex.feedback', SEED_FB = [
    { id: 'fb1', type: 'student', sid: 's02', cls: 'CSE-A', subj: 0, rating: 4, text: 'The worked examples in Graphs helped a lot. More practice sets before the exam please.', at: '2025-12-02' },
    { id: 'fb2', type: 'student', sid: 's05', cls: 'CSE-A', subj: null, rating: 3, text: 'Too many assessments in the same week in Sem 4.', at: '2025-11-26' },
    { id: 'fb3', type: 'student', sid: 's03', cls: 'CSE-A', subj: 2, rating: 2, text: 'Hard to follow Transactions after missing a few classes. A recap sheet would help.', at: '2026-02-10' },
    { id: 'fb4', type: 'student', sid: 's10', cls: 'CSE-B', subj: 1, rating: 2, text: 'Trees went too fast. Could we redo tree traversals with examples?', at: '2025-11-28' },
    { id: 'fb5', type: 'faculty', sid: 's02', cls: 'CSE-A', subj: 0, rating: 4, text: 'Graph proofs are much clearer since the worked-example sessions. Keep doing one timed problem a day.', at: '2026-01-20', by: 'Prof. Rao' },
    { id: 'fb6', type: 'faculty', sid: 's01', cls: 'CSE-A', subj: 2, rating: 3, text: 'SQL joins: strong effort this semester. Try the query-plan method we discussed for multi-table joins.', at: '2026-02-01', by: 'Prof. Rao' }
  ];
  var FB = [];
  function fbLoad() { var mine = []; try { mine = JSON.parse(localStorage.getItem(FB_KEY) || '[]'); } catch (e) { mine = []; } if (!Array.isArray(mine)) mine = []; var all = SEED_FB.filter(function (s) { return BYSID[s.sid]; }).map(function (s) { return Object.assign({}, s); }); mine.forEach(function (f) { if (f && typeof f.id === 'string' && BYSID[f.sid]) { var k = all.findIndex(function (x) { return x.id === f.id; }); if (k >= 0) all[k] = f; else all.push(f); } }); FB = all.sort(function (a, b) { return a.at < b.at ? 1 : -1; }); }
  function fbSave(rec) {
    if (sbReady()) sbClient.from('feedback').insert({ id: rec.id, type: rec.type, sid: rec.sid, cls: rec.cls, subj: rec.subj, rating: rec.rating, text: rec.text, by_name: rec.by || null })
      .then(function (r) { if (r.error) toast('Saved on this device, but not online: ' + r.error.message, true); });
    FB.push(rec); FB.sort(function (a, b) { return a.at < b.at ? 1 : -1; }); try { var mine = JSON.parse(localStorage.getItem(FB_KEY) || '[]'); if (!Array.isArray(mine)) mine = []; mine.push(rec); localStorage.setItem(FB_KEY, JSON.stringify(mine)); return true; } catch (e) { return false; } }
  fbLoad();
  function fbStars(n) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆'; return '<span style="color:var(--wa);letter-spacing:.1em">' + s + '</span>'; }
  function fbItem(f, anon) { return '<div class="nt"><div class="m"><span>' + (anon ? 'Student' : (f.type === 'faculty' ? esc(f.by || 'Faculty') : esc(BYSID[f.sid].name))) + ' · ' + (f.subj === null || f.subj === '' ? 'Course' : SUBJECTS[f.subj]) + '</span><span>' + fmtD(f.at) + '</span></div><p>' + fbStars(f.rating) + (f.text ? '<br>' + esc(f.text) : '') + '</p></div>'; }
  function studentSat(sid) { var mine = FB.filter(function (f) { return f.type === 'student' && f.sid === sid; }); return mine.length ? mean(mine.map(function (f) { return f.rating; })) : (BYSID[sid].ext.fb ? BYSID[sid].ext.fb.sat : null); }
  function classFb(cls) { var ids = classStudents(cls).map(function (s) { return s.id; }), sub = FB.filter(function (f) { return f.type === 'student' && ids.indexOf(f.sid) >= 0; }); return { n: sub.length, avg: sub.length ? mean(sub.map(function (f) { return f.rating; })) : null, seeded: mean(ids.map(function (id) { return BYSID[id].ext.fb ? BYSID[id].ext.fb.sat : null; }).filter(function (v) { return v !== null; })), items: sub, bySubj: SUBJECTS.map(function (n, i) { var x = sub.filter(function (f) { return f.subj === i; }); return x.length ? mean(x.map(function (f) { return f.rating; })) : null; }) }; }
  function renderStudentFb() {
    var sid = ROLE.sid, box = $('#fbMine'), fac = $('#fbFromFac');
    var sel = $('#fbSubj'); if (sel.options.length === 1) SUBJECTS.forEach(function (n, i) { var o = el('option', '', n); o.value = i; sel.appendChild(o); });
    var mine = FB.filter(function (f) { return f.type === 'student' && f.sid === sid; });
    box.innerHTML = mine.length ? mine.map(function (f) { return fbItem(f, false); }).join('') : '<div class="empty">You have not sent any feedback yet.</div>';
    var from = FB.filter(function (f) { return f.type === 'faculty' && f.sid === sid; });
    fac.innerHTML = from.length ? from.map(function (f) { return fbItem(f, false); }).join('') : '<div class="empty">No faculty feedback yet.</div>';
  }
  $('#fbForm').addEventListener('submit', function (e) {
    e.preventDefault(); if (!ROLE.sid) return;
    var rec = { id: 'fb' + Date.now().toString(36), type: 'student', sid: ROLE.sid, cls: ROLE.cls, subj: $('#fbSubj').value === '' ? null : +$('#fbSubj').value, rating: +$('#fbRate').value, text: $('#fbText').value.trim().slice(0, 300), at: iso(TODAY) };
    var ok = fbSave(rec); $('#fbText').value = ''; toast(ok ? 'Feedback sent. Thank you.' : 'Saved for this visit only.', !ok); renderStudentFb(); renderStudentExtras();
  });
  function renderTeacherFb() {
    var cf = classFb(TI.cls), sum = $('#tFbSummary'), list = $('#tFbList');
    sum.innerHTML = '<div class="rw"><span>Submitted feedback</span><b>' + cf.n + (cf.avg !== null ? ' · average ' + r1(cf.avg) + ' / 5' : '') + '</b></div><div class="rw"><span>Survey satisfaction (seeded)</span><b>' + r1(cf.seeded) + ' / 5</b></div>' + SUBJECTS.map(function (n, i) { return cf.bySubj[i] === null ? '' : '<div class="rw"><span>' + n + '</span><b class="' + (cf.bySubj[i] < 3 ? 'wa' : '') + '">' + r1(cf.bySubj[i]) + ' / 5</b></div>'; }).join('') + '<p class="fine" style="margin-top:10px">Ratings 1 to 5. Subject rows appear once a student rates that subject. Low ratings are a prompt to look, not a verdict on teaching.</p>';
    list.innerHTML = cf.items.length ? cf.items.slice(0, 6).map(function (f) { return fbItem(f, true); }).join('') : '<div class="empty">No feedback submitted for this class yet.</div>';
    var sel = $('#tfbStudent'), cur = sel.value; sel.innerHTML = ''; classStudents(TI.cls).forEach(function (s) { var o = el('option', '', esc(s.name)); o.value = s.id; sel.appendChild(o); }); if (cur && BYSID[cur] && BYSID[cur].cls === TI.cls) sel.value = cur;
    var ss = $('#tfbSubj'); if (ss.options.length === 1) SUBJECTS.forEach(function (n, i) { var o = el('option', '', n); o.value = i; ss.appendChild(o); });
  }
  $('#tfbForm').addEventListener('submit', function (e) {
    e.preventDefault(); var sid = $('#tfbStudent').value; if (!BYSID[sid]) return;
    var rec = { id: 'fb' + Date.now().toString(36), type: 'faculty', sid: sid, cls: BYSID[sid].cls, subj: $('#tfbSubj').value === '' ? null : +$('#tfbSubj').value, rating: +$('#tfbRate').value, text: $('#tfbText').value.trim().slice(0, 300), at: iso(TODAY), by: ROLE.name || 'Faculty' };
    var ok = fbSave(rec); $('#tfbText').value = ''; toast(ok ? 'Feedback sent to ' + BYSID[sid].name + '.' : 'Saved for this visit only.', !ok); renderTeacherFb();
  });

  /* ---------- 6. roles ---------- */
  var ROLE = { role: null, sid: null, cls: null, name: '' };
  var ROLE_DEF = { student: { name: 'Aarav Sharma', sid: 's01', cls: 'CSE-A', home: 'app' }, teacher: { name: 'Prof. Rao', sid: null, cls: 'CSE-A', home: 'teacher' }, admin: { name: 'Campus admin', sid: null, cls: null, home: 'admin' } };
  function setRole(r, who) {
    var d = ROLE_DEF[r]; if (!d) { ROLE = { role: null, sid: null, cls: null, name: '' }; state.user = null; }
    else { ROLE = { role: r, sid: (r === 'student' && who && who.sid && BYSID[who.sid]) ? who.sid : d.sid, cls: (r === 'student' && who && who.sid && BYSID[who.sid]) ? BYSID[who.sid].cls : d.cls, name: (who && who.name) || d.name, uid: who && who.uid }; state.user = r === 'student' ? { name: ((who && who.name) || 'Aarav').split(' ')[0] } : state.user; }
    try { if (!sbOn()) { if (r) sessionStorage.setItem('gradex.role', r); else sessionStorage.removeItem('gradex.role'); } } catch (e) {}
    document.body.classList.toggle('has-role', !!ROLE.role); document.body.classList.toggle('is-staff', ROLE.role === 'teacher' || ROLE.role === 'admin');
    roleNav();
  }
  function roleNav() {
    var r = ROLE.role, rb = $('#roleBtn'); renderFeatureMenu();
    $('#navTI').hidden = !(r === 'teacher' || r === 'admin'); $('#navAdmin').hidden = r !== 'admin';
    $('#navTeach').hidden = !(r === 'teacher' || r === 'admin' || TEACH);
    $('#ftTeach').hidden = $('#navTeach').hidden;
    if (r) { rb.hidden = false; rb.innerHTML = esc(ROLE.name) + '<b>' + ({ student: 'Student', teacher: 'Teacher', admin: 'Admin' })[r] + '</b>'; rb.href = '#login'; }
    else rb.hidden = true;
  }
  /* every in-page link navigates through JS, so it works inside embedded viewers that intercept plain anchor clicks */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || a.target === '_blank') return;
    var href = a.getAttribute('href'); if (!href || href === '#') return;
    e.preventDefault(); var want = href.slice(1);
    if ((location.hash || '#top') === '#' + want) { if (want === 'top' || homeIds.indexOf(want) >= 0) { var tg = document.getElementById(want); if (tg) tg.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); } route(); } else location.hash = want;
  });
  $('#navHome').addEventListener('click', function (e) { if ((location.hash || '#top') === '#top' || current === 'home') { e.preventDefault(); if (location.hash && location.hash !== '#top') location.hash = 'top'; else { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); route(); } } });
  $$('[data-role]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); var r = b.getAttribute('data-role'); if (sbOn() && !CONFIG.supabase.allowDemo) { location.hash = 'login'; toast('Demo accounts are off. Sign in with your Gradex account.'); return; } setRole(r); toast('Opened the ' + r + ' demo as ' + ROLE.name + '.'); var dest = b.getAttribute('data-go') || ROLE_DEF[r].home; if ((location.hash || '').replace('#', '') === dest) route(); else location.hash = dest; }); });
  try { var sr = sessionStorage.getItem('gradex.role'); if (!sbOn() && ROLE_DEF[sr]) setRole(sr); } catch (e) {}
  (function () { var c = completeness(null); var fl = STUDENTS.filter(function (s) { var l = cls(s.id).level; return l === 'priority' || l === 'support' || placementFlag(s.id) === 'pl_support'; }).length; $('#statN').textContent = STUDENTS.length; $('#statRisk').textContent = fl; $('#campusStat').textContent = 'Demo dataset: ' + STUDENTS.length + ' fictional students in ' + CLASSES.length + ' sections, ' + c.total.toLocaleString() + ' assessment records (' + c.scored.toLocaleString() + ' scored), seven source tables joined on student_id, and ' + SEED_IV.length + ' seeded interventions. No real student data.'; })();

  /* ---------- student dashboard extras ---------- */
  var stuJ = { subj: -1 };
  function renderStudentExtras() {
    var on = ROLE.role === 'student' && ROLE.sid; $('#stuExtras').hidden = !on; $('#stuJourneyCard').hidden = !on; $('#stuScoreCard').hidden = !on; $('#stuFbWrap').hidden = !on; if (!on) return;
    renderStudentFb();
    var sid = ROLE.sid, C = cls(sid), box = $('#stuStatus'), h = '';
    var friendly = { on_track: 'Your recorded results and attendance do not show any of the patterns Gradex watches for. Keep the routine that is working.', monitor: 'Nothing in your marks needs urgent attention, but one or two things are worth keeping an eye on.', support: 'One pattern in your records suggests extra practice could help. It is a signal to act on, not a label.', priority: 'A few patterns in your records suggest it is worth talking to your teacher about support. This is a signal, not a judgement.', insufficient: 'There are not enough recorded assessments yet to say much. That is normal when you have just joined.' };
    h += pill(C.level) + '<p style="margin:10px 0 8px;font-size:15px">' + friendly[C.level] + '</p>';
    h += C.gaps.length ? '<div class="m" style="margin-top:8px">WHAT THE RECORDS SHOW</div><ul class="next" style="margin-top:4px">' + C.gaps.map(function (g, i) { return '<li><b>' + (i + 1) + '</b><span>' + esc(g.pattern) + '</span></li>'; }).join('') + '</ul>' : '';
    h += '<p class="fine" style="margin-top:10px">Measured from your recorded assessments and attendance. Asking for help never changes this status.</p>';
    box.innerHTML = h;
    var A = attOf(sid), ab = $('#stuAtt');
    ab.innerHTML = '<div class="big" style="margin-top:4px">' + (A.p === null ? 'No data' : r1(A.p) + '%') + '</div><p class="fine">' + A.a + ' of ' + A.t + ' recorded sessions this year, all subjects. Target ' + RULES.att + '%.</p>' + SUBJECTS.map(function (n, i) { var x = attOf(sid, i); return '<div class="rw"><span>' + n + '</span><b class="' + (x.p !== null && x.p < RULES.att ? 'wa' : '') + '">' + (x.p === null ? 'No data' : x.a + '/' + x.t + ' · ' + r1(x.p) + '%') + '</b></div>'; }).join('');
    var goals = [], M = termMatrix(sid), last = M[2];
    SUBJECTS.forEach(function (n, i) { var v = last[i]; if (v === null) return; var nb = nextBand(Math.round(v)); if (nb) goals.push({ n: n, v: v, need: nb.min - Math.round(v), l: nb.l }); });
    goals.sort(function (a, b) { return a.need - b.need; });
    var g = $('#stuGoals'), hh = '';
    C.gaps.filter(function (x) { return x.type === 'decline' || x.type === 'low' || x.type === 'topic'; }).slice(0, 2).forEach(function (x) { var a = adviseFor(x, BYSID[sid]); hh += '<div class="nt"><h4>' + esc(SUBJECTS[x.subj]) + (x.topic ? ': ' + esc(x.topic) : '') + '</h4><p>' + esc(x.type === 'topic' ? 'Two scores on ' + x.topic + ' were below ' + RULES.topicLow + '. Try a different explanation (video, diagram, worked example), then three practice questions on ' + x.topic + ' only.' : (x.type === 'decline' ? 'Recent scores dipped. Redo the last two assessments step by step and note where each one broke down.' : 'Rebuild the basics: a four-question set one level below the last test, two with help, two alone.')) + '</p></div>'; });
    hh += goals.slice(0, 3).map(function (o) { return '<div class="rw"><span>' + o.n + ' to a ' + o.l + '</span><b>' + r1(o.v) + ' now, +' + o.need + ' needed</b></div>'; }).join('');
    if (!hh) hh = '<p class="fine" style="margin-top:10px">No goals yet: no scored assessments recorded.</p>';
    hh += '<p class="fine" style="margin-top:10px">Suggestions, not guarantees. Sem 5 averages against the demo grade bands.</p>';
    g.innerHTML = hh;
    var SS = successScore(sid), PS = placementScore(sid), sg = segmentOf(sid);
    $('#stuScore').innerHTML = '<div class="big" style="margin-top:4px">' + (SS.score === null ? 'No data' : Math.round(SS.score)) + '<span class="m" style="font-size:14px"> / 100</span></div><p class="fine">Built from ' + SS.n + ' of ' + SS.total + ' indicators; each bar is what that indicator adds. Your segment: <b style="color:#fff;font-weight:400">' + esc(segLabel(sg)) + '</b>.</p>' + scoreBars(SS) + '<div class="m" style="margin-top:16px">PLACEMENT READINESS ' + (PS.score === null ? '' : Math.round(PS.score)) + '</div><div style="margin-top:6px">' + plPill(sid) + '</div>' + scoreBars(PS) + '<p class="fine" style="margin-top:10px">Two separate scores on purpose: academic success and placement readiness are not blended into one number. Both are explainable, reviewable signals, not labels.</p>';
    $('#stuScore').innerHTML += '<div class="m" style="margin-top:18px">WHERE YOU ARE HEADING</div>' + predictCard(sid, true);
    var sj = $('#stuJSubj'); if (!sj.children.length) { [['All', -1]].concat(SUBJECTS.map(function (n, i) { return [SHORT[i], i]; })).forEach(function (p) { var b = el('button', 'chip', p[0]); b.type = 'button'; b.addEventListener('click', function () { stuJ.subj = p[1]; renderStudentExtras(); }); sj.appendChild(b); }); }
    $$('.chip', sj).forEach(function (c, k) { c.setAttribute('aria-pressed', (k === 0 ? -1 : k - 1) === stuJ.subj ? 'true' : 'false'); });
    journeyChart($('#stuJChart'), sid, stuJ.subj, -1, $('#stuJNote'));
  }

  /* ---------- teacher dashboard + Teaching Intelligence ---------- */
  var TI = { cls: 'CSE-A', tab: 0, sid: 's02', subj: -1, term: -1, sec: 'journey', editing: null, pendingGap: null };
  var TI_SECS = [['journey', 'Learning Journey'], ['gaps', 'Learning Gaps'], ['advisor', 'Teaching Advisor'], ['insights', 'Class Insights'], ['tracker', 'Intervention Tracker']];
  (function () {
    ['Overview', 'Class records'].forEach(function (n, i) { var b = el('button', 'chip', n); b.type = 'button'; b.setAttribute('role', 'tab'); b.addEventListener('click', function () { TI.tab = i; renderTeacher(); }); $('#tTabs').appendChild(b); });
    var tiLink = el('a', 'btn sm p', 'Open Teaching Intelligence'); tiLink.href = '#ti'; $('#tTabs').parentNode.appendChild(tiLink);
    TI_SECS.forEach(function (s) { var b = el('button', 'chip', s[1]); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.sec = s[0]; b.addEventListener('click', function () { TI.sec = s[0]; renderTI(); }); $('#tiTabs').appendChild(b); });
    [['All', -1]].concat(SUBJECTS.map(function (n, i) { return [SHORT[i], i]; })).forEach(function (p) { var b = el('button', 'chip', p[0]); b.type = 'button'; b.addEventListener('click', function () { TI.subj = p[1]; renderTI(); }); $('#tiSubj').appendChild(b); });
    [['All semesters', -1], ['Sem 3', 0], ['Sem 4', 1], ['Sem 5', 2]].forEach(function (p) { var b = el('button', 'chip', p[0]); b.type = 'button'; b.addEventListener('click', function () { TI.term = p[1]; renderTI(); }); $('#tiTerm').appendChild(b); });
    $('#tiStudent').addEventListener('change', function (e) { TI.sid = e.target.value; renderTI(); });
    $$('[data-ti]').forEach(function (b) { b.addEventListener('click', function () { TI.sec = b.dataset.ti; location.hash = 'ti'; }); });
    STRATEGIES.forEach(function (s) { var o = el('option', '', esc(s)); o.value = s; $('#ivStrat').appendChild(o); });
    SUBJECTS.forEach(function (s, i) { var o = el('option', '', s); o.value = i; $('#ivSubj').appendChild(o); });
    $('#tiRules').innerHTML = RULE_TEXT.map(function (r, i) { return '<li><b>' + (i + 1) + '</b><span><b style="color:#fff">' + r[0] + '.</b> ' + r[1] + '</span></li>'; }).join('');
    $('#adRules').innerHTML = $('#tiRules').innerHTML;
    $('#ivForm').addEventListener('submit', ivSubmit);
    $('#ivClear').addEventListener('click', function () { ivFormReset(); });
    $('#ivList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-iv]'); if (!b) return; var id = b.closest('.ivc').dataset.id, iv = IV.filter(function (x) { return x.id === id; })[0]; if (!iv) return;
      if (b.dataset.iv === 'delete') { IV = IV.filter(function (x) { return x.id !== id; }); if (IV_DEL.indexOf(id) < 0) IV_DEL.push(id); ivSave({ id: id, deleted: true }); toast('Intervention removed.'); renderTI(); return; }
      if (b.dataset.iv === 'complete') { iv.status = 'completed'; ivSave(iv); toast('Marked completed.'); renderTI(); return; }
      if (b.dataset.iv === 'more') { iv.status = 'more_support'; ivSave(iv); toast('Marked as needing further support.'); renderTI(); return; }
      if (b.dataset.iv === 'edit') { ivFormFill(iv); $('#ivForm').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); }
    });
  })();
  function ivFormReset() { TI.editing = null; $('#ivForm').reset(); ivTargets(); $('#ivDate').value = iso(TODAY); var f = new Date(TODAY); f.setDate(f.getDate() + 14); $('#ivFollow').value = iso(f); $('#ivSave').textContent = 'Save intervention'; $('#ivStatusMsg').textContent = 'Saved in this browser only.'; }
  function ivTargets() {
    var sel = $('#ivTarget'), cur = sel.value; sel.innerHTML = '';
    var oc = el('option', '', 'Whole ' + TI.cls); oc.value = 'class:' + TI.cls; sel.appendChild(oc);
    classStudents(TI.cls).forEach(function (s) { var o = el('option', '', esc(s.name)); o.value = s.id; sel.appendChild(o); });
    sel.value = cur && $$('option', sel).some(function (o) { return o.value === cur; }) ? cur : (TI.sid && BYSID[TI.sid].cls === TI.cls ? TI.sid : 'class:' + TI.cls);
  }
  function ivFormFill(iv) {
    TI.editing = iv.id; ivTargets(); $('#ivTarget').value = iv.sid || 'class:' + iv.cls; $('#ivSubj').value = iv.subj; $('#ivTopic').value = iv.topic || ''; $('#ivStrat').value = iv.strategy; $('#ivGap').value = iv.gap; $('#ivEv').value = iv.evidence || ''; $('#ivDate').value = iv.date; $('#ivFollow').value = iv.follow || ''; $('#ivStatus').value = iv.status === 'follow_due' ? 'in_progress' : iv.status; $('#ivNotes').value = iv.notes || '';
    $('#ivSave').textContent = 'Update intervention'; $('#ivStatusMsg').textContent = 'Editing an existing record.';
  }
  function ivSubmit(e) {
    e.preventDefault();
    var tg = $('#ivTarget').value, gap = $('#ivGap').value.trim(), d = $('#ivDate').value, f = $('#ivFollow').value, msg = $('#ivStatusMsg');
    if (!gap) { msg.textContent = 'Describe the learning gap first.'; $('#ivGap').focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(f)) { msg.textContent = 'Enter both dates.'; return; }
    if (f < d) { msg.textContent = 'The follow-up date must be on or after the adjustment date.'; $('#ivFollow').focus(); return; }
    var rec = { id: TI.editing || ('iv' + Date.now().toString(36)), sid: tg.indexOf('class:') === 0 ? '' : tg, cls: tg.indexOf('class:') === 0 ? tg.slice(6) : BYSID[tg].cls, subj: +$('#ivSubj').value, topic: $('#ivTopic').value.trim().slice(0, 40), gap: gap.slice(0, 160), evidence: $('#ivEv').value.trim().slice(0, 400), strategy: $('#ivStrat').value, date: d, follow: f, status: $('#ivStatus').value, notes: $('#ivNotes').value.trim().slice(0, 400) };
    var k = IV.findIndex(function (x) { return x.id === rec.id; }); if (k >= 0) IV[k] = rec; else IV.push(rec);
    var ok = ivSave(rec); toast(ok ? (k >= 0 ? 'Intervention updated.' : 'Intervention recorded. Follow-up scheduled for ' + fmtD(f) + '.') : 'Saved for this visit only; this browser blocks storage.', !ok);
    ivFormReset(); renderTI();
  }
  function renderTeacher() {
    if (!ROLE.role || ROLE.role === 'student') return;
    var cl = CLASSES.filter(function (c) { return c.id === TI.cls; })[0];
    $$('#tClass .chip').forEach(function (c) { c.setAttribute('aria-pressed', c.textContent === TI.cls ? 'true' : 'false'); });
    $$('#tTabs .chip').forEach(function (c, i) { c.setAttribute('aria-pressed', i === TI.tab ? 'true' : 'false'); c.setAttribute('aria-selected', i === TI.tab ? 'true' : 'false'); });
    $('#tpOverview').hidden = TI.tab !== 0; $('#tpRecords').hidden = TI.tab !== 1;
    $('#tHead').textContent = TI.tab === 1 ? 'Class records.' : cl.name + '.';
    $('#tTag').hidden = true;
    $('#tBadge').textContent = (ROLE.role === 'admin' ? 'ADMIN VIEWING TEACHER DASHBOARD' : 'TEACHER DASHBOARD') + '. ' + cl.name + ', ' + cl.course + ', ' + cl.teacher + '. FICTIONAL DEMO DATA.';
    if (TI.tab === 0) renderOverview();
  }
  function renderTIPage() {
    if (!ROLE.role || ROLE.role === 'student') return;
    var cl = CLASSES.filter(function (c) { return c.id === TI.cls; })[0];
    $$('#tiClass .chip').forEach(function (c) { c.setAttribute('aria-pressed', c.textContent === TI.cls ? 'true' : 'false'); });
    $('#tiBadge').textContent = 'GRADEX TEACHING INTELLIGENCE. ' + cl.name + ', ' + cl.course + ', ' + cl.teacher + '. FICTIONAL DEMO DATA.';
    renderTI();
  }
  function renderOverview() {
    var ss = classStudents(TI.cls), counts = { priority: 0, support: 0, monitor: 0, on_track: 0, insufficient: 0 }, pend = IV.filter(function (iv) { return iv.cls === TI.cls && ['planned', 'in_progress', 'follow_due'].indexOf(ivStatus(iv)) >= 0; });
    ss.forEach(function (s) { counts[cls(s.id).level]++; });
    var a3 = classAvg(TI.cls, 2), at = classAtt(TI.cls), cp = completeness(TI.cls);
    $('#tKpis').innerHTML = [[ss.length, 'Students'], [r1(a3), 'Class average, Sem 5'], [at === null ? 'No data' : r1(at) + '%', 'Attendance, whole year'], [counts.priority + counts.support, 'May benefit from review'], [pend.length, 'Pending follow-ups'], [r1(cp.p) + '%', 'Assessments scored']].map(function (k) { return '<div class="card kpi"><span class="sv">' + k[0] + '</span><span class="sl">' + k[1] + '</span></div>'; }).join('');
    var order = { priority: 0, support: 1, monitor: 2, insufficient: 3, on_track: 4 };
    var rows = ss.map(function (s) { return { s: s, c: cls(s.id) }; }).sort(function (a, b) { return order[a.c.level] - order[b.c.level] || a.s.name.localeCompare(b.s.name); }).filter(function (r) { return r.c.level !== 'on_track'; });
    $('#tReview').innerHTML = rows.length ? rows.map(function (r) { var A = attOf(r.s.id); return '<tr><td><a class="rowlink" href="#profile-' + r.s.id + '">' + esc(r.s.name) + '</a></td><td>' + pill(r.c.level) + '</td><td style="white-space:normal;min-width:180px">' + esc(r.c.reasons[0] || '') + '</td><td class="num ' + (A.p !== null && A.p < RULES.att ? 'wa' : '') + '">' + (A.p === null ? '-' : r1(A.p) + '%') + '</td><td class="num ' + scoreCol(successScore(r.s.id).score) + '">' + (successScore(r.s.id).score === null ? '-' : Math.round(successScore(r.s.id).score)) + '</td><td><button class="btn sm" type="button" data-journey="' + r.s.id + '">Journey</button></td></tr>'; }).join('') : '<tr><td colspan="6"><div class="empty">Every student in this class is on track. No signals to review.</div></td></tr>';
    $$('[data-journey]', $('#tReview')).forEach(function (b) { b.addEventListener('click', function () { TI.sid = b.dataset.journey; TI.sec = 'journey'; location.hash = 'ti'; }); });
    termTrendChart($('#tTrend'), TI.cls);
    renderTeacherFb();
    var gc = {}; ss.forEach(function (s) { cls(s.id).gaps.forEach(function (g) { gc[g.type] = (gc[g.type] || 0) + 1; }); });
    var GL = { decline: 'Declining results', low: 'Low subject average', topic: 'Repeated topic difficulty', spread: 'Inconsistent across subjects', missing: 'Missing assessments', att: 'Attendance below ' + RULES.att + '%' };
    $('#tGapCounts').innerHTML = Object.keys(GL).map(function (k) { return '<div class="rw"><span>' + GL[k] + '</span><b>' + (gc[k] || 0) + '</b></div>'; }).join('');
    var ins = classTopics(TI.cls).filter(function (r) { return r.flag; }).sort(function (a, b) { return a.avg - b.avg; }).slice(0, 3);
    $('#tInsightsMini').innerHTML = ins.length ? ins.map(function (r) { return '<div class="rw"><span>' + esc(r.label) + '</span><b class="wa">' + r1(r.avg) + ' avg · ' + r.lowStudents + ' students below ' + RULES.low + '</b></div>'; }).join('') : '<div class="empty">No class-wide pattern meets the rule (3 or more students below ' + RULES.low + ' on a topic with a class average under 62).</div>';
    $('#tPending').innerHTML = pend.length ? pend.map(function (iv) { var st = ivStatus(iv); return '<div class="rw"><span>' + esc(iv.sid ? BYSID[iv.sid].name : 'Whole class') + ' · ' + SUBJECTS[iv.subj] + '</span><b>' + pill(st, IV_LABEL[st]) + '</b></div>'; }).join('') : '<div class="empty">No pending interventions for this class.</div>';
  }
  function renderTI() {
    var sel = $('#tiStudent'); sel.innerHTML = ''; classStudents(TI.cls).forEach(function (s) { var o = el('option', '', esc(s.name) + ' · ' + LEVEL[cls(s.id).level]); o.value = s.id; sel.appendChild(o); });
    if (!BYSID[TI.sid] || BYSID[TI.sid].cls !== TI.cls) TI.sid = classStudents(TI.cls)[0].id; sel.value = TI.sid;
    $$('#tiSubj .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', (k === 0 ? -1 : k - 1) === TI.subj ? 'true' : 'false'); });
    $$('#tiTerm .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', (k - 1) === TI.term ? 'true' : 'false'); });
    $$('#tiTabs .chip').forEach(function (c) { var on = c.dataset.sec === TI.sec; c.setAttribute('aria-pressed', on ? 'true' : 'false'); c.setAttribute('aria-selected', on ? 'true' : 'false'); });
    TI_SECS.forEach(function (s) { $('#ti-' + s[0]).hidden = s[0] !== TI.sec; });
    var st = BYSID[TI.sid], C = cls(TI.sid);
    if (TI.sec === 'journey') {
      $('#tiJTitle').textContent = 'LEARNING JOURNEY, ' + st.name.toUpperCase() + (TI.subj >= 0 ? ', ' + SUBJECTS[TI.subj].toUpperCase() : '');
      journeyChart($('#tiJChart'), TI.sid, TI.subj, TI.term, $('#tiJAvail'));
      var M = termMatrix(TI.sid), bars = $('#tiJBars'); bars.innerHTML = '';
      SUBJECTS.forEach(function (n, i) { var vals = (TI.term === -1 ? [0, 1, 2] : [TI.term]).map(function (t) { return M[t][i]; }).filter(function (v) { return v !== null; }), v = vals.length ? mean(vals) : null; bars.appendChild(el('li', '', '<span>' + SHORT[i] + '</span><span><i style="width:' + (v || 0) + '%;' + (v !== null && v < RULES.low ? 'background:var(--rk)' : '') + '"></i></span><b>' + (v === null ? '-' : Math.round(v)) + '</b>')); });
      var ev = recs(TI.sid, TI.subj === -1 ? null : TI.subj, TI.term === -1 ? null : TI.term).map(function (a) { return { d: a.date, cls: a.score === null ? 'miss' : (a.score < RULES.low ? 'low' : ''), t: SHORT[a.subj] + ' ' + a.kind + (a.topic ? ' · ' + a.topic : ''), v: a.score === null ? 'not recorded' : a.score }; });
      IV.filter(function (iv) { return iv.sid === TI.sid && (TI.subj === -1 || iv.subj === TI.subj) && (TI.term === -1 || (iv.date >= TERMS[TI.term].from && iv.date <= TERMS[TI.term].to)); }).forEach(function (iv) { ev.push({ d: iv.date, cls: 'iv', t: 'Teaching adjustment: ' + iv.strategy, v: IV_LABEL[ivStatus(iv)] }); if (iv.follow) ev.push({ d: iv.follow, cls: 'iv', t: 'Follow-up scheduled', v: ivOutcome(iv).na ? 'assessed' : 'not yet measured' }); });
      if (st.joined > '2025-01-01') ev.push({ d: st.joined, cls: '', t: 'Joined the class', v: '' });
      ev.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      $('#tiJTl').innerHTML = ev.length ? ev.map(function (e) { return '<li class="' + e.cls + '"><span class="d">' + fmtD(e.d) + '</span><span>' + esc(e.t) + '</span><span class="v">' + esc(e.v) + '</span></li>'; }).join('') : '<li><span class="d"></span><span class="m">No records in this period.</span></li>';
    }
    if (TI.sec === 'gaps') {
      var gaps = C.gaps.filter(function (g) { return TI.subj === -1 || g.subj === TI.subj || g.subj === null; });
      var head = '<div class="card" style="grid-column:1/-1"><div class="m">SUPPORT STATUS</div><div style="margin-top:8px">' + pill(C.level) + '</div><p style="margin-top:10px;font-size:15px">' + (C.level === 'insufficient' ? esc(C.reasons[0]) : (C.gaps.length ? C.gaps.length + ' signal' + (C.gaps.length > 1 ? 's' : '') + ' found from ' + scored(recs(TI.sid)).length + ' scored assessments and ' + attOf(TI.sid).t + ' attendance sessions.' : 'No signals found across ' + scored(recs(TI.sid)).length + ' scored assessments.')) + '</p><p class="fine">Reviewable signals, not labels. Topic-level claims appear only where topic-tagged quizzes and tests exist; question-level analysis would need question-level data, which this dataset does not contain.</p></div>';
      $('#tiGaps').innerHTML = head + (gaps.length ? gaps.map(function (g, i) { return '<div class="card gapc ' + g.sev + '"><span class="pill ' + (g.sev === 'priority' ? 'priority' : (g.sev === 'support' ? 'support' : 'insufficient')) + '">' + (g.sev === 'info' ? 'Context' : 'Academic signal') + '</span><h4>' + esc(g.title) + '</h4><dl class="kv"><dt>Observed pattern</dt><dd>' + esc(g.pattern) + '</dd><dt>Supporting records</dt><dd>' + (evList(g.ev) || esc(g.pattern)) + '</dd><dt>Period</dt><dd>' + esc(g.period) + '</dd><dt>Data available</dt><dd>' + g.n + ' record' + (g.n === 1 ? '' : 's') + '</dd><dt>Limitations</dt><dd>' + esc(g.limits) + '</dd></dl><div class="cta" style="margin:14px 0 0"><button class="btn sm p" type="button" data-rec="' + i + '">Get a recommendation</button></div></div>'; }).join('') : '<div class="card" style="grid-column:1/-1"><div class="empty">' + (C.level === 'insufficient' ? 'More information needed. Fewer than 6 scored assessments.' : 'No learning gaps identified' + (TI.subj >= 0 ? ' in ' + SUBJECTS[TI.subj] : '') + ' by the current rules.') + '</div></div>');
      $$('[data-rec]', $('#tiGaps')).forEach(function (b) { b.addEventListener('click', function () { TI.pendingGap = gaps[+b.dataset.rec]; TI.sec = 'advisor'; renderTI(); window.scrollTo({ top: $('#tpTI').offsetTop - 80, behavior: RM ? 'auto' : 'smooth' }); }); });
    }
    if (TI.sec === 'advisor') {
      var gs = TI.pendingGap ? [TI.pendingGap] : C.gaps.filter(function (g) { return TI.subj === -1 || g.subj === TI.subj || g.subj === null; });
      var intro = '<div class="card" style="grid-column:1/-1"><div class="m">TEACHING ADVISOR, ' + st.name.toUpperCase() + '</div><p style="margin-top:8px;font-size:15px">' + (TI.pendingGap ? 'Recommendation for the selected gap. ' : 'One recommendation per identified gap. ') + 'Each is a teaching experiment to try, adapt or reject, not a guaranteed fix. Gradex does not attribute a decline to the teacher or the student.</p>' + (TI.pendingGap ? '<div class="cta" style="margin:10px 0 0"><button class="btn sm" type="button" id="advAll">Show all gaps</button></div>' : '') + '</div>';
      $('#tiAdv').innerHTML = intro + (gs.length ? gs.map(function (g, i) { var a = adviseFor(g, st); return '<div class="card recc"><span class="pill on_track">Rule-based demo recommendation</span><h4>' + esc(a.s) + '</h4><dl class="kv"><dt>Observed learning gap</dt><dd>' + esc(a.obs) + '</dd><dt>Evidence</dt><dd>' + esc(a.ev) + '</dd><dt>Suggested teaching adjustment</dt><dd>' + esc(a.s) + '</dd><dt>Why it may help</dt><dd>' + esc(a.why) + '</dd><dt>Classroom activity</dt><dd>' + esc(a.act) + '</dd><dt>Understanding check</dt><dd>' + esc(a.check) + '</dd><dt>Follow-up point</dt><dd>' + esc(a.follow) + '</dd></dl><div class="cta" style="margin:14px 0 0"><button class="btn sm p" type="button" data-adopt="' + i + '">Record this adjustment</button></div></div>'; }).join('') : '<div class="card" style="grid-column:1/-1"><div class="empty">No gap to advise on. ' + (C.level === 'insufficient' ? 'More information needed.' : 'Pick another subject or student.') + '</div></div>');
      var aa = $('#advAll'); if (aa) aa.addEventListener('click', function () { TI.pendingGap = null; renderTI(); });
      $$('[data-adopt]', $('#tiAdv')).forEach(function (b) { b.addEventListener('click', function () { var g = gs[+b.dataset.adopt], a = adviseFor(g, st); TI.sec = 'tracker'; renderTI(); ivFormReset(); $('#ivTarget').value = st.id; $('#ivSubj').value = g.subj === null ? 0 : g.subj; $('#ivTopic').value = g.topic || ''; $('#ivStrat').value = a.s; $('#ivGap').value = g.title + '. ' + g.pattern; $('#ivEv').value = a.ev; $('#ivNotes').value = a.act; $('#ivStatusMsg').textContent = 'Pre-filled from the recommendation. Edit anything, then save.'; $('#ivForm').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); toast('Recommendation copied into the tracker.'); }); });
    }
    if (TI.sec === 'insights') {
      var rows = classTopics(TI.cls).filter(function (r) { return TI.subj === -1 || r.subj === TI.subj; });
      $('#tiCIHead').textContent = 'CLASS-WIDE PATTERNS, ' + TI.cls + ' (' + classStudents(TI.cls).length + ' STUDENTS, ALL TERMS)';
      $('#tiCIRows').innerHTML = rows.map(function (r) { return '<tr' + (r.topic ? '' : ' style="color:#fff"') + '><td>' + (r.topic ? '&nbsp;&nbsp;' : '') + esc(r.label) + '</td><td class="num ' + (r.flag ? 'wa' : '') + '">' + r1(r.avg) + '</td><td class="num">' + r.lowStudents + '</td><td class="num">' + r.n + '</td><td>' + (r.flag ? '<span class="pill monitor">May need reteaching</span>' : '<span class="pill on_track">No pattern</span>') + '</td></tr>'; }).join('');
      var fl = rows.filter(function (r) { return r.flag; }).sort(function (a, b) { return a.avg - b.avg; });
      $('#tiCISug').innerHTML = fl.length ? fl.map(function (r) { return '<div class="nt"><h4>' + esc(r.label) + '</h4><p>' + r.lowStudents + ' of ' + classStudents(TI.cls).length + ' students scored below ' + RULES.low + (r.topic ? ' on a ' + r.topic + ' quiz or test' : ' in ' + SUBJECTS[r.subj]) + '; class average ' + r1(r.avg) + ' over ' + r.n + ' records.\nSuggested adjustments: a short revision lesson with a different explanation' + (r.topic ? ' of ' + r.topic : '') + ', a 5-question formative quiz before moving on, and a small-group session for the students below the threshold. Differentiate: students above 70 get an extension task instead.</p></div>'; }).join('') : '<div class="empty">No concept meets the class-wide rule' + (TI.subj >= 0 ? ' in ' + SUBJECTS[TI.subj] : '') + '. The rule needs 3 or more students below ' + RULES.low + ' on the same topic and a class average under 62, so one or two low scores do not trigger it.</div>';
    }
    if (TI.sec === 'tracker') {
      ivTargets(); if (!TI.editing) { if (!$('#ivDate').value) $('#ivDate').value = iso(TODAY); if (!$('#ivFollow').value) { var f = new Date(TODAY); f.setDate(f.getDate() + 14); $('#ivFollow').value = iso(f); } }
      var list = IV.filter(function (iv) { return iv.cls === TI.cls; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      $('#ivList').innerHTML = list.length ? list.map(function (iv) { return ivCard(iv, false); }).join('') : '<div class="empty">No interventions recorded for ' + TI.cls + ' yet. Use the form, or start from a recommendation in the Teaching Advisor.</div>';
    }
  }

  /* ---------- student profile ---------- */
  function renderProfile(sid) {
    var st = BYSID[sid]; if (!st) { $('#pfName').textContent = 'Student not found'; $('#pfMeta').textContent = ''; $('#pfKpis').innerHTML = ''; $('#pfRows').innerHTML = ''; $('#pfStatus').innerHTML = '<div class="empty err">No student with this id in the demo dataset.</div>'; $('#pfTl').innerHTML = ''; $('#pfIv').innerHTML = ''; return; }
    var cl = CLASSES.filter(function (c) { return c.id === st.cls; })[0], C = cls(sid), A = attOf(sid), sc = scored(recs(sid)), M = termMatrix(sid);
    $('#pfName').textContent = st.name; $('#pfMeta').textContent = cl.name + ' · ' + cl.course + ' · ' + cl.semester + ' · joined ' + fmtD(st.joined);
    $('#pfOpenTI').hidden = false; $('#pfBack').href = ROLE.role === 'admin' ? '#admin' : '#teacher';
    $('#pfOpenTI').onclick = function () { TI.cls = st.cls; TI.sid = sid; TI.sec = 'journey'; };
    var SS = successScore(sid), PS = placementScore(sid), seg = segmentOf(sid);
    $('#pfKpis').innerHTML = [[SS.score === null ? 'No data' : Math.round(SS.score), 'Success score'], [PS.score === null ? 'No data' : Math.round(PS.score), 'Placement readiness'], [r1(studentAvg(sid)), 'Average, all scored'], [A.p === null ? 'No data' : r1(A.p) + '%', 'Attendance'], [sc.length + ' / ' + recs(sid).length, 'Scored / recorded'], [missingOf(sid).length, 'Missing scores']].map(function (k) { return '<div class="card kpi"><span class="sv">' + k[0] + '</span><span class="sl">' + k[1] + '</span></div>'; }).join('');
    $('#pfRows').innerHTML = SUBJECTS.map(function (n, i) { var x = attOf(sid, i); return '<tr><td>' + n + '</td>' + [0, 1, 2].map(function (t) { var v = M[t][i]; return '<td class="num ' + (v !== null && v < RULES.low ? 'bd' : '') + '">' + (v === null ? '-' : r1(v)) + '</td>'; }).join('') + '<td class="num ' + (x.p !== null && x.p < RULES.att ? 'wa' : '') + '">' + (x.p === null ? '-' : r1(x.p) + '%') + '</td></tr>'; }).join('');
    $('#pfFlags').innerHTML = '<div class="rw"><span>Academic support status</span><b>' + pill(C.level) + '</b></div><div class="rw"><span>Placement outcome risk</span><b>' + plPill(sid) + '</b></div><div class="rw"><span>Segment</span><b style="text-align:right">' + esc(segLabel(seg)) + '</b></div><p class="fine" style="margin-top:10px">' + esc((SEGMENTS.filter(function (s) { return s[0] === seg; })[0] || [])[2] || '') + '</p>';
    $('#pfFlags').innerHTML += '<div class="m" style="margin-top:20px">PREDICTION · EARLY WARNING</div>' + predictCard(sid);
    $('#pfDrivers').innerHTML = '<div class="m">SUCCESS SCORE ' + (SS.score === null ? '' : Math.round(SS.score)) + ' · DRIVERS</div>' + scoreBars(SS) + '<div class="m" style="margin-top:18px">PLACEMENT READINESS ' + (PS.score === null ? '' : Math.round(PS.score)) + ' · DRIVERS</div>' + scoreBars(PS) + '<p class="fine" style="margin-top:10px">Each bar is the indicator\'s contribution (value × weight). Missing indicators are excluded and the remaining weights rescaled; they never count as zero.</p>';
    $('#pfUnified').innerHTML = unifiedView(sid);
    $('#pfStatus').innerHTML = pill(C.level) + (C.gaps.length ? '<ul class="next" style="margin-top:10px">' + C.gaps.map(function (g, i) { return '<li><b>' + (i + 1) + '</b><span>' + esc(g.title) + '. ' + esc(g.pattern) + '</span></li>'; }).join('') + '</ul>' : '<p class="fine" style="margin-top:10px">' + esc(C.reasons[0] || 'No signals from the current rules.') + '</p>');
    var ev = recs(sid).map(function (a) { return { d: a.date, cls: a.score === null ? 'miss' : (a.score < RULES.low ? 'low' : ''), t: SHORT[a.subj] + ' ' + a.kind + (a.topic ? ' · ' + a.topic : ''), v: a.score === null ? 'not recorded' : a.score }; });
    IV.filter(function (iv) { return iv.sid === sid; }).forEach(function (iv) { ev.push({ d: iv.date, cls: 'iv', t: 'Teaching adjustment: ' + iv.strategy, v: IV_LABEL[ivStatus(iv)] }); });
    ev.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    $('#pfTl').innerHTML = ev.map(function (e) { return '<li class="' + e.cls + '"><span class="d">' + fmtD(e.d) + '</span><span>' + esc(e.t) + '</span><span class="v">' + esc(e.v) + '</span></li>'; }).join('');
    var ivs = IV.filter(function (iv) { return iv.sid === sid; });
    var pfb = FB.filter(function (f) { return f.sid === sid; });
    $('#pfFb').innerHTML = pfb.length ? pfb.map(function (f) { return fbItem(f, false); }).join('') : '<div class="empty">No feedback recorded for this student.</div>';
    $('#pfIv').innerHTML = ivs.length ? ivs.map(function (iv) { return ivCard(iv, true); }).join('') : '<div class="empty">No interventions recorded for this student.</div>';
  }

  /* ---------- admin ---------- */
  var AD = { cls: '', term: -1, q: '', status: '', seg: '', sortK: 'name', sortD: 1, limit: 40 };
  (function () {
    [['All semesters', -1], ['Sem 3', 0], ['Sem 4', 1], ['Sem 5', 2]].forEach(function (p) { var b = el('button', 'chip', p[0]); b.type = 'button'; b.addEventListener('click', function () { AD.term = p[1]; renderAdmin(); }); $('#adTerm').appendChild(b); });
    $('#adSearch').addEventListener('input', function (e) { AD.q = e.target.value.trim().toLowerCase(); AD.limit = 40; adminTable(); });
    $('#adStatus').addEventListener('change', function (e) { AD.status = e.target.value; AD.limit = 40; adminTable(); });
    $$('#adTable th.sort').forEach(function (th) { th.addEventListener('click', function () { if (AD.sortK === th.dataset.k) AD.sortD = -AD.sortD; else { AD.sortK = th.dataset.k; AD.sortD = 1; } adminTable(); }); });
    $('#adExport').addEventListener('click', function () {
      var rows = adminRows(), csv = [['id', 'name', 'class', 'course', 'average_' + (AD.term === -1 ? 'all' : 'sem' + (AD.term + 3)), 'attendance_pct', 'attended', 'sessions', 'missing_assessments', 'support_status', 'success_score', 'predicted_risk_pct', 'early_warning', 'placement_readiness', 'placement_flag', 'segment', 'interventions']].concat(rows.map(function (r) { return [r.s.id, r.s.name, r.s.cls, r.course, r.avg === null ? '' : r1(r.avg), r.att === null ? '' : r1(r.att), r.A.a, r.A.t, r.missing, LEVEL[r.level], r.ss === null ? '' : Math.round(r.ss), r.rp === null ? '' : r.rp, r.rk.warn ? 'yes' : '', r.pl === null ? '' : Math.round(r.pl), PL_LEVEL[r.plf] || '', segLabel(r.seg), r.iv]; }));
      var txt = csv.map(function (r) { return r.map(function (v) { return /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
      var fname = 'gradex-demo-students' + (AD.cls ? '-' + AD.cls : '') + '.csv';
      var fallback = function () { try { var a = el('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = fname; document.body.appendChild(a); a.click(); a.remove(); toast('Exported ' + rows.length + ' rows.'); } catch (e) { toast('Export failed in this browser.', true); } };
      var c = window.claude;
      if (c && typeof c.use === 'function') {
        c.use('downloads').then(function (dl) {
          if (!dl) { fallback(); return; }
          return dl.save({ filename: fname, data: txt }).then(function () { toast('Exported ' + rows.length + ' rows.'); }).catch(function (e) { if (e && e.code === 'declined') toast('Export cancelled.'); else toast('Export not available here.', true); });
        }).catch(fallback);
      } else fallback();
    });
  })();
  function adminRows() {
    return classStudents(AD.cls).map(function (s) { var A = attOf(s.id), c = cls(s.id); return { s: s, course: CLASSES.filter(function (x) { return x.id === s.cls; })[0].course, avg: studentAvg(s.id, AD.term === -1 ? null : AD.term), att: A.p, A: A, missing: missingOf(s.id, AD.term === -1 ? null : AD.term).length, level: c.level, iv: IV.filter(function (iv) { return iv.sid === s.id; }).length, ss: successScore(s.id).score, pl: placementScore(s.id).score, plf: placementFlag(s.id), seg: segmentOf(s.id), rk: riskModel(s.id) }; }).map(function (r) { r.rp = r.rk.level === 'insufficient' ? null : r.rk.pct; return r; })
      .filter(function (r) { return (!AD.q || r.s.name.toLowerCase().indexOf(AD.q) >= 0) && (!AD.status || r.level === AD.status || r.plf === AD.status || (AD.status === 'rk_high' && r.rk.level === 'high') || (AD.status === 'rk_warn' && r.rk.warn)) && (!AD.seg || r.seg === AD.seg); })
      .sort(function (a, b) { var k = AD.sortK, x = k === 'name' ? a.s.name : (k === 'cls' ? a.s.cls : a[k]), y = k === 'name' ? b.s.name : (k === 'cls' ? b.s.cls : b[k]); if (x === null) return 1; if (y === null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * AD.sortD; });
  }
  function adminTable() {
    var rows = adminRows();
    $$('#adTable th.sort').forEach(function (th) { if (th.dataset.k === AD.sortK) th.setAttribute('aria-sort', AD.sortD > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort'); });
    var shown = rows.slice(0, AD.limit);
    $('#adRows').innerHTML = rows.length ? shown.map(function (r) { return '<tr><td><a class="rowlink" href="#profile-' + r.s.id + '">' + esc(r.s.name) + '</a></td><td>' + r.s.cls + '</td><td class="num">' + (r.avg === null ? '<span class="m">no data</span>' : r1(r.avg)) + '</td><td class="num ' + (r.att !== null && r.att < RULES.att ? 'wa' : '') + '">' + (r.att === null ? '<span class="m">no data</span>' : r1(r.att) + '%') + '</td><td class="num ' + scoreCol(r.ss) + '">' + (r.ss === null ? '-' : Math.round(r.ss)) + '</td><td class="num ' + (r.rp === null ? '' : (r.rp >= 60 ? 'bd' : (r.rp >= 35 ? 'wa' : 'ok'))) + '" title="Predicted probability of an academic risk flag next semester">' + (r.rp === null ? '-' : r.rp + '%' + (r.rk.warn ? ' ↓' : '')) + '</td><td>' + pill(r.level) + '</td><td class="num ' + scoreCol(r.pl) + '">' + (r.pl === null ? '-' : Math.round(r.pl)) + '</td><td>' + plPill(r.s.id) + '</td><td style="white-space:normal;min-width:160px;font-size:13px;color:var(--mut)">' + esc(segLabel(r.seg)) + '</td><td class="num">' + r.iv + '</td></tr>'; }).join('') : '<tr><td colspan="11"><div class="empty">No students match these filters.</div></td></tr>';
    var more = $('#adMore'); if (!more) { more = el('button', 'btn sm', 'Show 40 more'); more.type = 'button'; more.id = 'adMore'; more.style.marginTop = '10px'; more.addEventListener('click', function () { AD.limit += 40; adminTable(); }); $('#adCount').parentNode.insertBefore(more, $('#adCount')); }
    more.hidden = rows.length <= AD.limit;
    $('#adCount').textContent = (rows.length > AD.limit ? 'First ' + AD.limit + ' of ' : '') + rows.length + ' of ' + classStudents(AD.cls).length + ' students shown' + (AD.seg ? ' in segment "' + segLabel(AD.seg) + '"' : '') + '. Average uses ' + (AD.term === -1 ? 'all scored assessments' : TERMS[AD.term].n) + '; attendance is the whole year. Click a column to sort.';
  }
  /* ---------- admin visual analytics: risk by section, semester change, attendance vs score ---------- */
  function svgEsc(v) { return esc(String(v)); }
  function adminViz(ss, t, counts, col) {
    var order = ['priority', 'support', 'monitor', 'on_track', 'insufficient'];
    /* A. risk flags by section, stacked 100% bars, click to filter */
    var rows = CLASSES.map(function (c) { var cs = classStudents(c.id), k = { priority: 0, support: 0, monitor: 0, on_track: 0, insufficient: 0 }; cs.forEach(function (s) { k[cls(s.id).level]++; }); return { c: c, n: cs.length, k: k, flagged: (k.priority + k.support) / (cs.length || 1) }; }).sort(function (a, b) { return b.flagged - a.flagged; });
    var W = 640, rh = 26, padL = 84, padR = 62, top = 6, H = top + rows.length * rh + 4, bw = W - padL - padR, o = '';
    rows.forEach(function (r, i) {
      var y = top + i * rh, x = padL, sel = AD.cls === r.c.id, dim = AD.cls && !sel;
      o += '<g class="vz-row' + (sel ? ' on' : '') + (dim ? ' dim' : '') + '" data-cls="' + r.c.id + '" tabindex="0" role="button" aria-label="' + svgEsc(r.c.id + ': ' + r.k.priority + ' priority, ' + r.k.support + ' support of ' + r.n + '. Filter to this section.') + '">';
      o += '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rh + '"/>';
      o += '<text class="lbl" x="0" y="' + (y + 17) + '">' + r.c.id + '</text>';
      order.forEach(function (lv) { var w = r.n ? r.k[lv] / r.n * bw : 0; if (w > 0) o += '<rect x="' + x.toFixed(1) + '" y="' + (y + 5) + '" width="' + Math.max(0, w - 1.5).toFixed(1) + '" height="' + (rh - 10) + '" rx="3" fill="' + col[lv] + '"><title>' + svgEsc(r.c.id + ' · ' + LEVEL[lv] + ': ' + r.k[lv] + ' of ' + r.n) + '</title></rect>'; x += w; });
      o += '<text class="val" x="' + (W - padR + 8) + '" y="' + (y + 17) + '">' + Math.round(r.flagged * 100) + '%</text></g>';
    });
    var a = $('#adRiskCls'); a.setAttribute('viewBox', '0 0 ' + W + ' ' + H); a.innerHTML = o;
    $('#adRiskClsL').innerHTML = order.slice(0, 4).map(function (lv) { return '<span><i style="background:' + col[lv] + '"></i>' + LEVEL[lv] + '</span>'; }).join('') + '<span><b style="color:#fff;font-weight:400">%</b> = priority + support</span>';
    var top3 = rows.slice(0, 2).map(function (r) { return r.c.id + ' (' + Math.round(r.flagged * 100) + '%)'; }).join(' and ');
    $('#adRiskClsNote').textContent = 'Sorted by share of students with an academic flag. Highest: ' + top3 + '. Click a section to filter the whole dashboard' + (AD.cls ? '; click it again to clear.' : '.');
    /* B. semester change by section, Sem 3 to Sem 5, diverging bars */
    var ch = CLASSES.map(function (c) { var a0 = classAvg(c.id, 0), a2 = classAvg(c.id, 2); return { c: c, a0: a0, a2: a2, d: a0 === null || a2 === null ? null : a2 - a0 }; }).filter(function (r) { return r.d !== null; }).sort(function (a, b) { return b.d - a.d; });
    var mx = Math.max(4, Math.max.apply(null, ch.map(function (r) { return Math.abs(r.d); }))), cx = padL + (W - padL - padR) / 2, half = (W - padL - padR) / 2, H2 = top + ch.length * rh + 4; o = '';
    o += '<line class="axis" x1="' + cx + '" y1="0" x2="' + cx + '" y2="' + H2 + '"/>';
    ch.forEach(function (r, i) {
      var y = top + i * rh, w = Math.abs(r.d) / mx * half, up = r.d >= 0, sel = AD.cls === r.c.id, dim = AD.cls && !sel;
      o += '<g class="vz-row' + (sel ? ' on' : '') + (dim ? ' dim' : '') + '" data-cls="' + r.c.id + '" tabindex="0" role="button" aria-label="' + svgEsc(r.c.id + ' changed ' + (up ? '+' : '') + r1(r.d) + ' points from Sem 3 to Sem 5. Filter to this section.') + '"><rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rh + '"/>';
      o += '<text class="lbl" x="0" y="' + (y + 17) + '">' + r.c.id + '</text>';
      o += '<rect x="' + (up ? cx : cx - w).toFixed(1) + '" y="' + (y + 5) + '" width="' + Math.max(1, w).toFixed(1) + '" height="' + (rh - 10) + '" rx="3" fill="' + (up ? 'var(--ok)' : 'var(--rk)') + '"><title>' + svgEsc(r.c.id + ': ' + r1(r.a0) + ' in Sem 3 → ' + r1(r.a2) + ' in Sem 5') + '</title></rect>';
      o += '<text class="val" x="' + (up ? cx + w + 6 : cx - w - 6) + '" y="' + (y + 17) + '" text-anchor="' + (up ? 'start' : 'end') + '">' + (up ? '+' : '') + r1(r.d) + '</text></g>';
    });
    var b = $('#adChange'); b.setAttribute('viewBox', '0 0 ' + W + ' ' + H2); b.innerHTML = o;
    var dn = ch.filter(function (r) { return r.d <= -2; }).map(function (r) { return r.c.id; });
    $('#adChangeNote').textContent = 'Change in section average from Sem 3 to Sem 5. ' + (dn.length ? dn.join(' and ') + (dn.length > 1 ? ' are' : ' is') + ' declining: start with the Teaching Intelligence view for ' + (dn.length > 1 ? 'those sections.' : 'that section.') : 'No section is declining by 2 points or more.') + ' Observed change, not a causal claim.';
    /* C. attendance vs average score, one dot per student, click to open the profile */
    var pts = ss.map(function (s) { return { s: s, x: attOf(s.id).p, y: studentAvg(s.id, t), lv: cls(s.id).level }; }).filter(function (p) { return p.x !== null && p.y !== null; });
    var W3 = 640, H3 = 300, pl = 34, pr = 12, pt = 12, pb = 30, iw = W3 - pl - pr, ih = H3 - pt - pb, xMin = 50, xMax = 100, yMin = 30, yMax = 100;
    var X = function (v) { return pl + iw * (clamp(v, xMin, xMax) - xMin) / (xMax - xMin); }, Y = function (v) { return pt + ih - ih * (clamp(v, yMin, yMax) - yMin) / (yMax - yMin); };
    o = '<rect class="band" x="' + pl + '" y="' + Y(RULES.low) + '" width="' + (X(RULES.att) - pl) + '" height="' + (pt + ih - Y(RULES.low)) + '"/>';
    [30, 40, 50, 60, 70, 80, 90, 100].forEach(function (v) { o += '<line class="axis" x1="' + pl + '" y1="' + Y(v) + '" x2="' + (W3 - pr) + '" y2="' + Y(v) + '"/><text class="ax" x="0" y="' + (Y(v) + 4) + '">' + v + '</text>'; });
    [50, 60, 70, 80, 90, 100].forEach(function (v) { o += '<text class="ax" x="' + X(v) + '" y="' + (H3 - 10) + '" text-anchor="' + (v === 50 ? 'start' : (v === 100 ? 'end' : 'middle')) + '">' + v + '%</text>'; });
    o += '<line class="ref" x1="' + X(RULES.att) + '" y1="' + pt + '" x2="' + X(RULES.att) + '" y2="' + (pt + ih) + '"/><text class="ax" x="' + (X(RULES.att) + 4) + '" y="' + (pt + 10) + '">' + RULES.att + '% attendance</text>';
    o += '<line class="ref" x1="' + pl + '" y1="' + Y(RULES.low) + '" x2="' + (W3 - pr) + '" y2="' + Y(RULES.low) + '"/><text class="ax" x="' + (W3 - pr) + '" y="' + (Y(RULES.low) - 4) + '" text-anchor="end">score ' + RULES.low + '</text>';
    var drawOrder = ['on_track', 'monitor', 'insufficient', 'support', 'priority'];
    pts.sort(function (p, q) { return drawOrder.indexOf(p.lv) - drawOrder.indexOf(q.lv); }).forEach(function (p) { o += '<a href="#profile-' + p.s.id + '"><circle class="dot" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (p.lv === 'priority' || p.lv === 'support' ? 4.2 : 3.2) + '" fill="' + col[p.lv] + '"><title>' + svgEsc(p.s.name + ' (' + p.s.cls + ') · average ' + r1(p.y) + ', attendance ' + r1(p.x) + '% · ' + LEVEL[p.lv]) + '</title></circle></a>'; });
    var c3 = $('#adScatter'); c3.setAttribute('viewBox', '0 0 ' + W3 + ' ' + H3); c3.innerHTML = o;
    var both = pts.filter(function (p) { return p.x < RULES.att && p.y < RULES.low + 10; }).length;
    $('#adScatterNote').textContent = pts.length + ' students' + (AD.cls ? ' in ' + AD.cls : '') + (t === null ? '' : ', ' + TERMS[t].n + ' average') + '. ' + both + ' have attendance under ' + RULES.att + '% and an average under ' + (RULES.low + 10) + ': the first group to call in. Hover a dot for details, click to open the student profile.';
    $('#adScatterL').innerHTML = order.map(function (lv) { return counts[lv] ? '<span><i style="background:' + col[lv] + ';border-radius:50%"></i>' + LEVEL[lv] + ' ' + counts[lv] + '</span>' : ''; }).join('');
  }
  function bindAdminViz() {
    ['#adRiskCls', '#adChange'].forEach(function (id) {
      var svg = $(id); if (!svg || svg.dataset.bound) return; svg.dataset.bound = '1';
      var go = function (e) { var g = e.target.closest && e.target.closest('[data-cls]'); if (!g) return; AD.cls = AD.cls === g.dataset.cls ? '' : g.dataset.cls; AD.limit = 40; renderAdmin(); };
      svg.addEventListener('click', go);
      svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    });
  }
  function renderAdmin() {
    bindAdminViz();
    $$('#adClass .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', (k === 0 ? '' : c.textContent) === AD.cls ? 'true' : 'false'); });
    $$('#adTerm .chip').forEach(function (c, k) { c.setAttribute('aria-pressed', (k - 1) === AD.term ? 'true' : 'false'); });
    var ss = classStudents(AD.cls), t = AD.term === -1 ? null : AD.term, counts = { priority: 0, support: 0, monitor: 0, on_track: 0, insufficient: 0 };
    ss.forEach(function (s) { counts[cls(s.id).level]++; });
    var ivs = IV.filter(function (iv) { return !AD.cls || iv.cls === AD.cls; }), pend = ivs.filter(function (iv) { return ['planned', 'in_progress', 'follow_due'].indexOf(ivStatus(iv)) >= 0; }), due = ivs.filter(function (iv) { return ivStatus(iv) === 'follow_due'; }), cp = completeness(AD.cls, t), at = classAtt(AD.cls);
    var ssv = ss.map(function (s) { return successScore(s.id).score; }).filter(function (v) { return v !== null; }), plS = ss.filter(function (s) { return placementFlag(s.id) === 'pl_support'; }).length;
    var rk = { high: 0, warn: 0 }; ss.forEach(function (s) { var r = riskModel(s.id); if (r.level === 'high') rk.high++; if (r.warn) rk.warn++; });
    $('#adKpis').innerHTML = [[ss.length, 'Student records'], [ssv.length ? Math.round(mean(ssv)) : 'No data', 'Avg success score'], [at === null ? 'No data' : r1(at) + '%', 'Attendance, whole year'], [r1(classAvg(AD.cls, t)), 'Average score' + (t === null ? '' : ', ' + TERMS[t].n)], [counts.priority + counts.support, 'Academic risk flags'], [plS, 'Placement risk flags'], [rk.high, 'Predicted high risk'], [rk.warn, 'Early warnings (falling)'], [pend.length, 'Interventions open'], [r1(cp.p) + '%', 'Data completeness']].map(function (k) { return '<div class="card kpi"><span class="sv">' + k[0] + '</span><span class="sl">' + k[1] + '</span></div>'; }).join('');
    var col = { priority: 'var(--rk)', support: '#ff9a6b', monitor: 'var(--wa)', on_track: 'var(--ok)', insufficient: 'rgba(255,255,255,.25)' };
    $('#adDist').innerHTML = Object.keys(counts).map(function (k) { return '<i style="width:' + (ss.length ? counts[k] / ss.length * 100 : 0) + '%;background:' + col[k] + '"></i>'; }).join('');
    $('#adDistL').innerHTML = Object.keys(counts).map(function (k) { return '<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + col[k] + ';margin-right:6px;vertical-align:-1px"></i>' + LEVEL[k] + ' <b>' + counts[k] + '</b></span>'; }).join('');
    termTrendChart($('#adTrend'), AD.cls, true); adminViz(ss, t, counts, col);
    var bands = [['0-49', 0, 49], ['50-64', 50, 64], ['65-79', 65, 79], ['80-100', 80, 100]], bcol = ['var(--rk)', '#ff9a6b', 'var(--wa)', 'var(--ok)'];
    var bn = bands.map(function (b) { return ssv.filter(function (v) { return v >= b[1] && v < b[2] + 1; }).length; });
    $('#adSsDist').innerHTML = bn.map(function (n, i) { return '<i style="width:' + (ssv.length ? n / ssv.length * 100 : 0) + '%;background:' + bcol[i] + '"></i>'; }).join('');
    $('#adSsL').innerHTML = bands.map(function (b, i) { return '<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + bcol[i] + ';margin-right:6px;vertical-align:-1px"></i>' + b[0] + ' <b>' + bn[i] + '</b></span>'; }).join('');
    var agg = {}; ss.forEach(function (s) { successScore(s.id).parts.forEach(function (p) { if (p.raw === null) return; agg[p.label] = agg[p.label] || { c: 0, n: 0, r: 0 }; agg[p.label].c += p.contrib; agg[p.label].r += p.raw; agg[p.label].n++; }); });
    $('#adDrivers').innerHTML = '<ul class="bars-mini drv">' + Object.keys(agg).map(function (k) { var a = agg[k]; return '<li><span>' + k + '</span><span><i style="width:' + (a.r / a.n) + '%"></i></span><b>+' + r1(a.c / a.n) + '</b><small>average indicator value ' + Math.round(a.r / a.n) + '</small></li>'; }).join('') + '</ul>';
    var sc2 = {}; ss.forEach(function (s) { var g = segmentOf(s.id); sc2[g] = (sc2[g] || 0) + 1; });
    $('#adSeg').innerHTML = SEGMENTS.filter(function (s) { return sc2[s[0]]; }).map(function (s) { return '<button class="pl-row" type="button" data-seg="' + s[0] + '" aria-pressed="' + (AD.seg === s[0] ? 'true' : 'false') + '" title="' + esc(s[2]) + '"><span>' + esc(s[1]) + '</span><b>' + sc2[s[0]] + '</b></button>'; }).join('') + '<p class="fine" style="margin-top:10px">Rule-based segments, one per student (first matching rule). Click a segment to filter the directory; hover for the suggested action.</p>';
    $$('[data-seg]', $('#adSeg')).forEach(function (b) { b.addEventListener('click', function () { AD.seg = AD.seg === b.dataset.seg ? '' : b.dataset.seg; renderAdmin(); }); });
    var plc = { ready: 0, pl_monitor: 0, pl_support: 0 }; ss.forEach(function (s) { plc[placementFlag(s.id)] = (plc[placementFlag(s.id)] || 0) + 1; });
    $('#adRisk').innerHTML = '<div class="rw"><span>Academic: Priority review</span><b>' + counts.priority + '</b></div><div class="rw"><span>Academic: Support recommended</span><b>' + counts.support + '</b></div><div class="rw"><span>Placement: support needed (readiness under 50)</span><b>' + plc.pl_support + '</b></div><div class="rw"><span>Placement: build readiness (50 to 64)</span><b>' + plc.pl_monitor + '</b></div><div class="rw"><span>Both academic and placement flags</span><b>' + ss.filter(function (s) { var l = cls(s.id).level; return (l === 'priority' || l === 'support') && placementFlag(s.id) === 'pl_support'; }).length + '</b></div>';
    var fbs = FB.filter(function (f) { return f.type === 'student' && (!AD.cls || f.cls === AD.cls); }), fbf = FB.filter(function (f) { return f.type === 'faculty' && (!AD.cls || f.cls === AD.cls); }), lowfb = fbs.filter(function (f) { return f.rating <= 2; });
    $('#adFb').innerHTML = '<div class="rw"><span>Student feedback submitted</span><b>' + fbs.length + (fbs.length ? ' · avg ' + r1(mean(fbs.map(function (f) { return f.rating; }))) + ' / 5' : '') + '</b></div><div class="rw"><span>Low ratings (2 or below)</span><b class="' + (lowfb.length ? 'wa' : '') + '">' + lowfb.length + '</b></div><div class="rw"><span>Faculty feedback notes sent</span><b>' + fbf.length + '</b></div><div class="rw"><span>Survey satisfaction</span><b>' + r1(mean(ss.map(function (s) { return s.ext.fb ? s.ext.fb.sat : null; }).filter(function (v) { return v !== null; }))) + ' / 5</b></div>';
    $('#adClasses').innerHTML = CLASSES.filter(function (c) { return !AD.cls || c.id === AD.cls; }).map(function (c) { var cs = classStudents(c.id), rv = cs.filter(function (s) { var l = cls(s.id).level; return l === 'priority' || l === 'support'; }).length, ssc = cs.map(function (s) { return successScore(s.id).score; }).filter(function (v) { return v !== null; }), plr = cs.filter(function (s) { return placementFlag(s.id) === 'pl_support'; }).length, pd = IV.filter(function (iv) { return iv.cls === c.id && ['planned', 'in_progress', 'follow_due'].indexOf(ivStatus(iv)) >= 0; }).length, a = classAtt(c.id); return '<tr><td>' + c.name + '</td><td>' + c.course + '</td><td class="num">' + cs.length + '</td><td class="num">' + r1(classAvg(c.id, t)) + '</td><td class="num ' + (a !== null && a < RULES.att ? 'wa' : '') + '">' + (a === null ? '-' : r1(a) + '%') + '</td><td class="num">' + (ssc.length ? Math.round(mean(ssc)) : '-') + '</td><td class="num">' + rv + '</td><td class="num">' + plr + '</td><td class="num">' + pd + '</td></tr>'; }).join('');
    var sc = {}; ivs.forEach(function (iv) { var s = ivStatus(iv); sc[s] = (sc[s] || 0) + 1; });
    $('#adIv').innerHTML = ivs.length ? Object.keys(IV_LABEL).map(function (k) { return '<div class="rw"><span>' + IV_LABEL[k] + '</span><b>' + (sc[k] || 0) + '</b></div>'; }).join('') : '<div class="empty">No interventions recorded.</div>';
    var inc = CLASSES.filter(function (c) { return !AD.cls || c.id === AD.cls; }).map(function (c) { var x = completeness(c.id, t); return c.id + ' ' + r1(x.p) + '% (' + x.missing + ' missing)'; }).join(', ');
    renderPipeline();
    $('#adComplete').innerHTML = '<div class="rw"><span>Assessment records' + (t === null ? '' : ', ' + TERMS[t].n) + '</span><b>' + cp.scored + ' of ' + cp.total + ' scored</b></div><div class="rw"><span>By class</span><b style="text-align:right">' + inc + '</b></div><div class="rw"><span>Attendance records</span><b>' + ss.length * 6 + ' subject totals' + (QUALITY.missing.att ? ', ' + QUALITY.missing.att + ' students without any' : ', none missing') + '</b></div><div class="rw"><span>Question-level responses</span><b>Not in this dataset</b></div><p class="fine" style="margin-top:12px">Topic-level insights use the topic tag on quizzes and tests only. Question-level and sub-skill analysis would need question-level data.</p>';
    adminTable();
  }

  /* ---------- 5c. data pipeline UI: sources, cleaning log, CSV import ---------- */
  var STAGED = {};
  var SRC_META = { students: ['Student master (ERP)', 'students.csv'], academic: ['Academic records (ERP)', 'academic.csv'], attendance: ['Attendance (ERP)', 'attendance.csv'], lms: ['LMS activity', 'lms.csv'], engagement: ['Engagement (events, clubs, certs)', 'engagement.csv'], placement: ['Placement cell', 'placement.csv'], skills: ['Skills assessments', 'skills.csv'], feedback: ['Feedback survey', 'feedback.csv'] };
  function renderPipeline() {
    var Q = QUALITY, S = SOURCES, keyMiss = { lms: 'lms', engagement: 'eng', placement: 'plc', skills: 'skills', feedback: 'fb', attendance: 'att', academic: 'acad' };
    $('#adSources').innerHTML = Object.keys(SRC_META).map(function (k) { var n = Q.sources[k] || 0, miss = k === 'students' ? 0 : (Q.missing[keyMiss[k]] || 0); return '<div class="card" style="padding:14px 16px"><div class="m">' + esc(SRC_META[k][0]) + '</div><div class="sv" style="font-size:1.5rem;margin-top:6px">' + n.toLocaleString() + '</div><div class="sl">' + (n ? 'rows · ' + (k === 'students' ? 'join key for everything else' : (miss ? miss + ' student' + (miss === 1 ? '' : 's') + ' without a record' : 'every student covered')) : 'not supplied') + '</div></div>'; }).join('');
    $('#adQuality').innerHTML = '<li><b>1</b><span>Join: ' + Q.students + ' students matched on ' + Q.joinKey + '; ' + Q.assessments.toLocaleString() + ' assessment rows kept.</span></li>' + Q.fixes.map(function (f, i) { return '<li><b>' + (i + 2) + '</b><span>' + esc(f) + '</span></li>'; }).join('');
    $('#adSource').innerHTML = '<div class="rw"><span>Active dataset</span><b style="text-align:right">' + esc(DATASET.name) + '</b></div><div class="rw"><span>Origin</span><b style="text-align:right">' + esc(DATASET.origin) + '</b></div><div class="rw"><span>Sources integrated</span><b style="text-align:right">' + Object.keys(SRC_META).filter(function (k) { return k !== 'students' && Q.sources[k]; }).length + ' of 7 (plus the student master)</b></div><div class="rw"><span>Students · sections</span><b>' + STUDENTS.length + ' · ' + CLASSES.length + '</b></div><div class="rw"><span>Live ERP / LMS connector</span><b>Not connected (CSV stage in its place)</b></div><div class="rw"><span>CSV import</span><b>Available, any subset of the 7 tables</b></div><div class="rw"><span>CSV export</span><b>Directory summary and all 7 source tables</b></div><div class="rw"><span>Intervention records</span><b>Seeded demo plus this browser\'s additions</b></div>';
    var keys = Object.keys(STAGED); $('#adIntegrate').hidden = !keys.length;
    if (keys.length) $('#adStaged').innerHTML = keys.map(function (k) { return '<div class="rw"><span>' + esc(SRC_META[k][0]) + '</span><b>' + STAGED[k].length + ' rows</b></div>'; }).join('') + (keys.indexOf('students') < 0 || keys.indexOf('academic') < 0 ? '<p class="fine wa" style="margin-top:8px">students and academic are required; the others are optional and show as missing indicators when absent.</p>' : '<p class="fine" style="margin-top:8px">Ready. Integration replaces the active dataset in this browser only; nothing is uploaded anywhere.</p>');
  }
  function buildClassChips() {
    var mk = function (box, fn) { box.innerHTML = ''; CLASSES.forEach(function (c) { var b = el('button', 'chip', c.id); b.type = 'button'; b.title = c.name; b.addEventListener('click', function () { fn(c); }); box.appendChild(b); }); };
    mk($('#tClass'), function (c) { TI.cls = c.id; var first = classStudents(c.id)[0]; if (!BYSID[TI.sid] || BYSID[TI.sid].cls !== c.id) TI.sid = first.id; renderTeacher(); });
    mk($('#tiClass'), function (c) { TI.cls = c.id; var first = classStudents(c.id)[0]; if (!BYSID[TI.sid] || BYSID[TI.sid].cls !== c.id) TI.sid = first.id; renderTIPage(); });
    var ad = $('#adClass'); ad.innerHTML = ''; [['All', '']].concat(CLASSES.map(function (c) { return [c.id, c.id]; })).forEach(function (p) { var b = el('button', 'chip', p[0]); b.type = 'button'; b.addEventListener('click', function () { AD.cls = p[1]; renderAdmin(); }); ad.appendChild(b); });
  }
  function afterIntegrate() {
    CLS_CACHE = {}; ivLoad(); fbLoad(); STAGED = {};
    if (!BYSID[TI.sid]) { TI.cls = CLASSES[0].id; TI.sid = classStudents(TI.cls)[0].id; }
    if (!BYSID[SC.sid]) SC.sid = STUDENTS[0].id; SC.built = false; $('#scStudent').innerHTML = '';
    if (!BYSID[ROLE_DEF.student.sid]) { ROLE_DEF.student.sid = STUDENTS[0].id; ROLE_DEF.student.cls = STUDENTS[0].cls; ROLE_DEF.student.name = STUDENTS[0].name; }
    if (!CLASSES.some(function (c) { return c.id === ROLE_DEF.teacher.cls; })) ROLE_DEF.teacher.cls = CLASSES[0].id;
    AD.cls = ''; AD.seg = ''; buildClassChips();
    $('#campusStat').textContent = DATASET.name + ': ' + STUDENTS.length + ' students in ' + CLASSES.length + ' sections, ' + ASSESS.length.toLocaleString() + ' assessment records, 7 source tables joined on student_id.';
    renderAdmin();
  }
  (function () {
    buildClassChips();
    $('#adSamples').addEventListener('click', function () { var ks = Object.keys(SRC_META), i = 0; (function next() { if (i >= ks.length) return; var k = ks[i++]; downloadText('gradex-' + SRC_META[k][1], csvText(SOURCES[k] || [])); setTimeout(next, 450); })(); });
    $('#adResetData').addEventListener('click', function () { integrate(toSources(genDemo()), { name: 'Fictional demo dataset', origin: 'generated in the page, exported to 7 source tables, then integrated' }); afterIntegrate(); toast('Demo dataset restored.'); });
    $('#adImport').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files || []); if (!files.length) return; var left = files.length, bad = [];
      files.forEach(function (f) { var rd = new FileReader(); rd.onload = function () { var rows = csvParse(rd.result), src = detectSource(rows); if (src) STAGED[src] = rows; else bad.push(f.name); if (--left === 0) { renderPipeline(); toast(bad.length ? 'Could not recognise: ' + bad.join(', ') + '. Each file needs a student_id column plus the table\'s own columns.' : files.length + ' file' + (files.length === 1 ? '' : 's') + ' staged.', !!bad.length); } }; rd.onerror = function () { bad.push(f.name); if (--left === 0) renderPipeline(); }; rd.readAsText(f); });
      e.target.value = '';
    });
    $('#adIntegrate').addEventListener('click', function () {
      if (!STAGED.students || !STAGED.academic) { toast('students.csv and academic.csv are required.', true); return; }
      var S = {}; Object.keys(SRC_META).forEach(function (k) { S[k] = STAGED[k] || []; });
      var names = Object.keys(STAGED).length; integrate(S, { name: 'Imported dataset (' + names + ' of 7 tables)', origin: 'CSV files integrated in this browser, ' + new Date().toLocaleString('en-GB') }); afterIntegrate(); toast('Integrated ' + STUDENTS.length + ' students from ' + names + ' tables.');
    });
  })();

  /* ---------- 6b. public page: Success Score explorer ---------- */
  var SC = { sid: 's04', built: false };
  var NEW_FEATURES = [
    ['DATA', 'Unified student view', 'Academic, attendance, LMS, engagement, placement, skills and feedback records for ~300 fictional students, joined on student_id with a cleaning log.', 'profile-s04'],
    ['SCORE', 'Student Success Score', 'Six weighted indicators, every driver visible as value × weight. Missing data is excluded, never zero.', 'success'],
    ['PLACEMENT', 'Placement readiness and risk', 'A separate score from aptitude, coding, mock interview and skills, with support / build / ready flags.', 'admin'],
    ['SEGMENTS', 'Student segmentation', 'Eight rule-based groups such as "High academic, low placement readiness", each with a targeted action.', 'admin'],
    ['ROLES', 'Student, teacher, admin demos', 'Three role-scoped experiences on the same dataset, switched from the login page.', 'login'],
    ['TEACHING', 'Gradex Teaching Intelligence', 'Learning journey, evidence-based gaps, teaching advisor, class insights and an intervention tracker.', 'ti'],
    ['TRACKING', 'Intervention follow-up', 'Record an adjustment, schedule a follow-up and see the observed before/after change without causal claims.', 'ti'],
    ['FEEDBACK', 'Two-way feedback', 'Students rate subjects and comment; teachers see anonymous class sentiment and send supportive notes that reach the student dashboard.', 'login'],
    ['ASK', 'Ask Gradex, grounded', 'Role-aware answers calculated from the dataset: scores, attendance, declines, segments, interventions.', 'ask'],
    ['ADMIN', 'Campus analytics dashboard', 'KPIs, distributions, class comparison, data completeness, searchable and sortable directory with CSV export.', 'admin'],
    ['PIPELINE', 'CSV import and cleaning log', 'Drop the 7 source exports (or any subset) into the admin dashboard; duplicates, out-of-range marks and orphan rows are fixed and logged, then everything recomputes.', 'admin'],
    ['PREDICT', 'Early warning model', 'A transparent logistic model projects next-semester academic risk from average, attendance, LMS, backlogs, trajectory and missing work, with every coefficient visible.', 'method']
  ];
  function renderSuccess() {
    var sel = $('#scStudent');
    if (!SC.built) {
      SC.built = true;
      CLASSES.forEach(function (c) { var og = el('optgroup'); og.label = c.name; classStudents(c.id).forEach(function (s) { var o = el('option', '', esc(s.name)); o.value = s.id; og.appendChild(o); }); sel.appendChild(og); });
      sel.addEventListener('change', function () { SC.sid = sel.value; renderSuccess(); });
      $('#scNew').innerHTML = NEW_FEATURES.map(function (f, i) { return '<a class="card ex" href="#' + f[3] + '"' + (f[3] === 'login' || f[3] === 'method' ? '' : (['admin', 'ti', 'profile-s04'].indexOf(f[3]) >= 0 ? ' data-role="' + (f[3] === 'ti' ? 'teacher' : 'admin') + '" data-go="' + f[3] + '"' : '')) + '><span class="ex-n">' + f[0] + '</span><b>' + f[1] + '</b><span class="ex-b">' + f[2] + '</span><span class="ex-go">Open &rarr;</span></a>'; }).join('');
      $$('[data-go]', $('#scNew')).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var r = a.getAttribute('data-role'); setRole(r); location.hash = a.dataset.go; }); });
      /* campus-wide, computed once */
      if ($('#scCampusN')) $('#scCampusN').textContent = STUDENTS.length + ' students';
      var all = STUDENTS, ssv = all.map(function (s) { return successScore(s.id).score; }).filter(function (v) { return v !== null; });
      var bands = [['0-49', 0, 49], ['50-64', 50, 64], ['65-79', 65, 79], ['80-100', 80, 100]], bcol = ['var(--rk)', '#ff9a6b', 'var(--wa)', 'var(--ok)'];
      var bn = bands.map(function (b) { return ssv.filter(function (v) { return v >= b[1] && v < b[2] + 1; }).length; });
      $('#scDist').innerHTML = bn.map(function (n, i) { return '<i style="width:' + (n / ssv.length * 100) + '%;background:' + bcol[i] + '"></i>'; }).join('');
      $('#scDistL').innerHTML = bands.map(function (b, i) { return '<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + bcol[i] + ';margin-right:6px;vertical-align:-1px"></i>' + b[0] + ' <b>' + bn[i] + '</b></span>'; }).join('') + '<span>Average <b>' + Math.round(mean(ssv)) + '</b></span>';
      var cnt = { priority: 0, support: 0 }, plc = { pl_support: 0, pl_monitor: 0, ready: 0 };
      all.forEach(function (s) { var l = cls(s.id).level; if (cnt[l] !== undefined) cnt[l]++; var f = placementFlag(s.id); if (plc[f] !== undefined) plc[f]++; });
      $('#scRisk').innerHTML = '<div class="rw"><span>Academic: Priority review</span><b>' + cnt.priority + '</b></div><div class="rw"><span>Academic: Support recommended</span><b>' + cnt.support + '</b></div><div class="rw"><span>Placement: support needed</span><b>' + plc.pl_support + '</b></div><div class="rw"><span>Placement: build readiness</span><b>' + plc.pl_monitor + '</b></div><div class="rw"><span>Placement: ready</span><b>' + plc.ready + '</b></div>';
      var sc2 = {}; all.forEach(function (s) { var g = segmentOf(s.id); sc2[g] = (sc2[g] || 0) + 1; });
      $('#scSeg').innerHTML = SEGMENTS.filter(function (s) { return sc2[s[0]]; }).map(function (s) { return '<div class="nt"><div class="m" style="justify-content:space-between"><h4 style="font-size:15px">' + esc(s[1]) + '</h4><b style="color:#fff;font-weight:400">' + sc2[s[0]] + '</b></div><p>' + esc(s[2]) + '</p></div>'; }).join('');
    }
    sel.value = SC.sid;
    var sid = SC.sid, st = BYSID[sid], SS = successScore(sid), PS = placementScore(sid), seg = segmentOf(sid), C = cls(sid), A = attOf(sid);
    $('#scKpis').innerHTML = [[SS.score === null ? 'No data' : Math.round(SS.score), 'Success score'], [PS.score === null ? 'No data' : Math.round(PS.score), 'Placement readiness'], [r1(studentAvg(sid)), 'Academic average'], [A.p === null ? 'No data' : r1(A.p) + '%', 'Attendance'], [st.cls, 'Class']].map(function (k) { return '<div class="card kpi"><span class="sv">' + k[0] + '</span><span class="sl">' + k[1] + '</span></div>'; }).join('');
    $('#scSsHead').textContent = 'SUCCESS SCORE ' + (SS.score === null ? '' : Math.round(SS.score)) + ' · ' + st.name.toUpperCase() + ' · ' + SS.n + ' OF ' + SS.total + ' INDICATORS';
    $('#scSs').innerHTML = scoreBars(SS);
    $('#scPlHead').textContent = 'PLACEMENT READINESS ' + (PS.score === null ? '' : Math.round(PS.score)) + ' · DRIVERS';
    $('#scPl').innerHTML = scoreBars(PS);
    $('#scFlags').innerHTML = '<div class="rw"><span>Academic support status</span><b>' + pill(C.level) + '</b></div><div class="rw"><span>Placement outcome risk</span><b>' + plPill(sid) + '</b></div><div class="rw"><span>Segment</span><b style="text-align:right">' + esc(segLabel(seg)) + '</b></div><p class="fine" style="margin-top:10px">' + esc((SEGMENTS.filter(function (s) { return s[0] === seg; })[0] || [])[2] || '') + ' Reviewable signals, not labels.</p>';
    $('#scUni').innerHTML = unifiedView(sid);
    var pc = $('#scPredict'); if (!pc) { pc = el('div'); pc.id = 'scPredict'; $('#scFlags').parentNode.insertBefore(pc, $('#scFlags').nextSibling); }
    pc.innerHTML = '<div class="m" style="margin-top:20px">PREDICTION · EARLY WARNING</div>' + predictCard(sid);
  }

  /* ---------- 6b2. connections: Supabase + AI keys, stored in this browser ---------- */
  (function () {
    var f = $('#cnForm'); if (!f) return;
    $('#cnSbUrl').value = CN.sbUrl || ''; $('#cnSbKey').value = CN.sbKey || ''; $('#cnAiProv').value = CN.aiProv || ''; $('#cnAiModel').value = CN.aiModel || ''; $('#cnAiKey').value = CN.aiKey || '';
    var sb = $('#cnSbState'), ai = $('#cnAiState');
    sb.className = 'pill ' + (sbOn() ? 'on_track' : 'insufficient'); sb.textContent = sbOn() ? 'Supabase: connected' : 'Supabase: off';
    ai.className = 'pill ' + (CONFIG.ai.key ? 'on_track' : 'insufficient'); ai.textContent = CONFIG.ai.key ? 'AI: ' + CONFIG.ai.provider : 'AI: off';
    var msg = $('#cnMsg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var url = $('#cnSbUrl').value.trim().replace(/\/+$/, ''), key = $('#cnSbKey').value.trim(), prov = $('#cnAiProv').value, model = $('#cnAiModel').value.trim(), akey = $('#cnAiKey').value.trim();
      if (/^sb_secret_|service_role/i.test(key)) { msg.textContent = 'That looks like a secret / service-role key. It must never go in a web page. Use the publishable (anon) key instead.'; msg.style.color = 'var(--rk)'; return; }
      if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url)) { msg.textContent = 'The project URL should look like https://abcdefgh.supabase.co (Supabase → Project Settings → API).'; msg.style.color = 'var(--rk)'; return; }
      if ((url && !key) || (!url && key)) { msg.textContent = 'Enter both the project URL and the publishable key, or neither.'; msg.style.color = 'var(--rk)'; return; }
      if (prov && !akey) { msg.textContent = 'Enter an API key for the AI provider, or set it to Off.'; msg.style.color = 'var(--rk)'; return; }
      try { localStorage.setItem(CN_KEY, JSON.stringify({ sbUrl: url, sbKey: key, aiProv: prov, aiModel: model, aiKey: akey })); } catch (err) { msg.textContent = 'This browser blocks storage, so the keys cannot be kept.'; msg.style.color = 'var(--rk)'; return; }
      msg.style.color = ''; msg.textContent = 'Saved. Reloading to apply.'; setTimeout(function () { location.reload(); }, 400);
    });
    $('#cnClear').addEventListener('click', function () { try { localStorage.removeItem(CN_KEY); } catch (e) {} msg.textContent = 'Disconnected. Reloading.'; setTimeout(function () { location.reload(); }, 400); });
    $('#cnTest').addEventListener('click', function () {
      var url = $('#cnSbUrl').value.trim().replace(/\/+$/, ''), key = $('#cnSbKey').value.trim();
      if (!url || !key) { msg.textContent = 'Enter the URL and key first.'; return; }
      msg.style.color = ''; msg.textContent = 'Testing…';
      fetch(url + '/auth/v1/settings', { headers: { apikey: key, Authorization: 'Bearer ' + key } }).then(function (r) { return r.ok ? r.json().then(function () { msg.textContent = 'Supabase reachable and the key is accepted. Save & reload to switch logins to your project.'; msg.style.color = 'var(--ok)'; }) : Promise.reject(new Error('HTTP ' + r.status)); }).catch(function (e) { msg.textContent = 'Could not reach Supabase: ' + e.message + '. Check the URL and that this is the publishable/anon key.'; msg.style.color = 'var(--rk)'; });
    });
  })();

  /* ---------- 6c. method & pitch page ---------- */
  var MT = { built: false };
  function renderMethod() {
    var all = STUDENTS, ssv = all.map(function (s) { return successScore(s.id).score; }).filter(function (v) { return v !== null; });
    var cnt = { priority: 0, support: 0 }, plc = { pl_support: 0 }, rk = { high: 0, elevated: 0, warn: 0 }, segc = {};
    all.forEach(function (s) { var l = cls(s.id).level; if (cnt[l] !== undefined) cnt[l]++; if (placementFlag(s.id) === 'pl_support') plc.pl_support++; var r = riskModel(s.id); if (r.level === 'high') rk.high++; if (r.level === 'elevated') rk.elevated++; if (r.warn) rk.warn++; var g = segmentOf(s.id); segc[g] = (segc[g] || 0) + 1; });
    var both = all.filter(function (s) { var l = cls(s.id).level; return (l === 'priority' || l === 'support') && placementFlag(s.id) === 'pl_support'; }).length;
    $('#mtKpis').innerHTML = [[all.length, 'Students integrated'], [CLASSES.length, 'Sections'], [ASSESS.length.toLocaleString(), 'Assessment records'], [Math.round(mean(ssv)), 'Avg success score'], [cnt.priority + cnt.support, 'Academic risk flags'], [plc.pl_support, 'Placement risk flags'], [rk.high, 'Predicted high risk'], [both, 'Both flags']].map(function (k) { return '<div class="card kpi"><span class="sv">' + k[0] + '</span><span class="sl">' + k[1] + '</span></div>'; }).join('');
    var Q = QUALITY;
    $('#mtSources').innerHTML = Object.keys(SRC_META).map(function (k) { return '<div class="rw" style="font-size:14px"><span>' + esc(SRC_META[k][0]) + '</span><b>' + (Q.sources[k] || 0).toLocaleString() + ' rows</b></div>'; }).join('') + '<p class="fine" style="margin-top:10px">Cleaning this run: ' + Q.fixes.join('; ') + '.</p>';
    $('#mtRisk').innerHTML = '<div class="rw"><span>Rule flags today (priority + support)</span><b>' + (cnt.priority + cnt.support) + '</b></div><div class="rw"><span>Predicted high risk next semester</span><b class="bd">' + rk.high + '</b></div><div class="rw"><span>Predicted elevated risk</span><b class="wa">' + rk.elevated + '</b></div><div class="rw"><span>Early warnings from a falling trajectory</span><b>' + rk.warn + '</b></div>';
    $('#mtSeg').innerHTML = SEGMENTS.filter(function (s) { return segc[s[0]]; }).map(function (s) { return '<div class="nt"><div class="m" style="justify-content:space-between"><h4 style="font-size:15px">' + esc(s[1]) + '</h4><b style="color:#fff;font-weight:400">' + segc[s[0]] + '</b></div><p>' + esc(s[2]) + '</p></div>'; }).join('');
    var hiLo = segc.hi_acad_lo_plc || 0;
    var slides = [
      ['01 · THE PROBLEM', 'Campus data is everywhere and used nowhere.', 'Attendance, marks, LMS logs, placement scores, club records and feedback sit in ' + Object.keys(SRC_META).length + ' separate systems. Faculty see one at a time, usually after the semester is over. Gradex joins them so a problem is visible while there is still time to act.'],
      ['02 · THE DATA', all.length + ' students, 7 sources, one unified view.', 'Every row is joined on student_id, cleaned and logged (' + Q.fixes.length + ' kinds of fix this run). Anything the import does not cover is shown as missing, never guessed. Faculty can drop their own CSV exports into the admin dashboard and the whole platform recomputes.'],
      ['03 · THE SCORE', 'One explainable number, with every driver visible.', 'Student Success Score = academic 35% + attendance 15% + LMS 15% + engagement 15% + skills 10% + satisfaction 10%. Placement readiness is scored separately so strong marks never hide weak readiness. Campus average today: ' + Math.round(mean(ssv)) + '.'],
      ['04 · RISK AND PREDICTION', 'Rules you can read, plus an early warning that looks ahead.', (cnt.priority + cnt.support) + ' students carry an academic signal from transparent rules; ' + plc.pl_support + ' need placement support; the logistic model predicts high risk next semester for ' + rk.high + ' and raises ' + rk.warn + ' early warnings from a falling trajectory.'],
      ['05 · SEGMENTS AND ACTION', 'Groups that tell faculty what to do, not just who to worry about.', hiLo + ' students are "high academic, low placement readiness": the answer is aptitude and interview practice, not more lectures. Each of the ' + SEGMENTS.length + ' segments carries its own action, and Teaching Intelligence turns a flagged gap into a recorded, followed-up intervention.'],
      ['06 · WHAT IS NEXT', 'Connect the live systems and fit the model on real outcomes.', 'ERP and LMS connectors replace the CSV stage; the risk weights are fitted on the institution\'s own placement and result history; interventions become the training signal for what actually works on this campus.']
    ];
    $('#mtSlides').innerHTML = slides.map(function (s, i) { return '<div class="card" data-r style="display:grid;gap:8px;--d:' + i + '"><span class="m">' + s[0] + '</span><b style="font-size:clamp(1.3rem,2.6vw,1.9rem);font-weight:500;letter-spacing:-.02em;line-height:1.1">' + esc(s[1]) + '</b><span style="color:var(--mut);font-size:15px">' + esc(s[2]) + '</span></div>'; }).join('');
    if (!MT.built) { MT.built = true; $('#mtPrint').addEventListener('click', function () { window.print(); }); $$('[data-go]', $('#method')).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); setRole(a.getAttribute('data-role')); location.hash = a.dataset.go; }); }); }
    $$('#method [data-r]').forEach(function (n) { n.classList.add('in'); });
  }

  /* ---------- 7. Ask Gradex: deterministic, dataset-grounded, role-aware ---------- */
  var ASK_SUGGEST = {
    none: ['What should I study first?', 'Can I skip a DBMS class?', 'What is my next class?', 'What is my CGPA?', 'Which subject improved the most?', 'What if I gain 10 in DBMS?', 'What pages are there?'],
    student: ['What feedback have I received?', 'What is my success score?', 'How has my performance changed?', 'Which subjects may need more practice?', 'What is my recorded attendance?', 'What should I revise?', 'Help me plan my study time', 'Where am I heading next semester?', 'What is my CGPA?'],
    teacher: ['Which section has the lowest attendance?', 'What feedback has the class given?', 'What drives Ananya\'s success score?', 'Who is at risk of poor placement outcomes?', 'Which students have attendance below 75%?', 'Which students show a decline in recent assessments?', 'What is the attendance average for this class?', 'Which students may benefit from a check-in?', 'What evidence contributed to Diya\'s support status?', 'Which concepts may need revision across the class?', 'What teaching adjustment could help Diya in Discrete Maths?', 'Which interventions are awaiting follow-up?', 'Did the latest follow-up show a change?', 'What is Arjun\'s predicted risk?'],
    admin: ['Which section has the most at-risk students?', 'Which section improved the most?', 'What is the average success score across campus?', 'Who is at risk of poor placement outcomes?', 'Which segments do students fall into?', 'What are the academic trends across CSE-A?', 'How does attendance vary across courses?', 'How many interventions require follow-up?', 'Which classes have incomplete assessment data?', 'How many students may need support?', 'Who is predicted to be high risk next semester?', 'What did the data cleaning fix?']
  };
  function studentIn(q, pool) { var best = null, full = false; pool.forEach(function (s) { var nm = s.name.toLowerCase(), p = nm.split(' '), w = function (t) { return new RegExp('(^|[^a-z])' + t.replace(/[^a-z]/g, '') + '(\'s)?([^a-z]|$)').test(q); }; if (q.indexOf(nm) >= 0) { best = s; full = true; } else if (!full && w(p[0])) best = s; }); return best; }
  function clsIn(q) { var hit = null; CLASSES.forEach(function (c) { if (q.indexOf(c.id.toLowerCase()) >= 0) hit = c.id; }); return hit; }
  function listNames(arr) { return arr.map(function (s) { return s.name; }).join(', '); }
  function askData(q) {
    var role = ROLE.role, L = q.toLowerCase().replace(/\s+/g, ' ').replace(/at-risk/g, 'at risk'), si = subjIn(L), scope = role === 'admin' ? (clsIn(L) || '') : (ROLE.cls || 'CSE-A'), pool = classStudents(scope), who = studentIn(L, STUDENTS);
    var period = 'Period: all recorded semesters, Jan 2025 to Jun 2026. ', demo = ' (Fictional demo data.)';
    if (role === 'student') {
      var sid = ROLE.sid, C = cls(sid), A = attOf(sid);
      if (who && who.id !== sid) return 'I can only answer about your own records. Information about other students is not available to a student account.';
      if (/feedback|satisfaction|rating/.test(L)) { var mf = FB.filter(function (f) { return f.type === 'student' && f.sid === sid; }), ff = FB.filter(function (f) { return f.type === 'faculty' && f.sid === sid; }); return 'You have sent ' + mf.length + ' feedback item' + (mf.length === 1 ? '' : 's') + (mf.length ? ' (average rating ' + r1(mean(mf.map(function (f) { return f.rating; }))) + ' of 5)' : '') + ' and received ' + ff.length + ' faculty note' + (ff.length === 1 ? '' : 's') + (ff.length ? '. Latest from ' + ff[0].by + ' (' + fmtD(ff[0].at) + '): ' + ff[0].text : '') + '. Feedback you send goes to your teachers and never changes your score or status. Use the Give feedback card on your dashboard to send more.' + demo; }
      if (/predict|forecast|project|heading|next semester|trajectory|early warning/.test(L)) { var tq = trajectory(sid); return tq.slope === null ? 'There are not enough semesters recorded yet to project a trajectory.' + demo : 'Your semester averages are ' + tq.terms.map(function (v) { return v === null ? '-' : r1(v); }).join(' → ') + ', a slope of ' + (tq.slope >= 0 ? '+' : '') + r1(tq.slope) + ' points per semester, so a simple projection for next semester is about ' + Math.round(tq.next) + '. A projection from your own averages, not a verdict; the Simulator page shows what one subject change would do.' + demo; }
      if (/success score|my score|placement|readiness|segment|driver/.test(L)) { var SSq = successScore(sid), PSq = placementScore(sid), top = SSq.parts.filter(function (p) { return p.raw !== null; }).sort(function (a, b) { return b.contrib - a.contrib; }); return 'Your success score is ' + Math.round(SSq.score) + ' of 100, built from ' + SSq.n + ' indicators. Biggest contributors: ' + top.slice(0, 3).map(function (p) { return p.label + ' +' + r1(p.contrib) + ' (' + p.raw + ' × ' + Math.round(p.weight * 100) + '%)'; }).join(', ') + '. Lowest: ' + top[top.length - 1].label + ' (' + top[top.length - 1].raw + '). Placement readiness is a separate score: ' + Math.round(PSq.score) + ' (' + PL_LEVEL[placementFlag(sid)] + '). Segment: ' + segLabel(segmentOf(sid)) + '. Explainable signals, not labels.' + demo; }
      if (/attendance|attend\b|sessions/.test(L) && !/skip|bunk|miss/.test(L)) { var x = si >= 0 ? attOf(sid, si) : A; return (si >= 0 ? SUBJECTS[si] + ' attendance' : 'Your recorded attendance') + ' is ' + (x.p === null ? 'not available: no sessions recorded' : r1(x.p) + '%: ' + x.a + ' of ' + x.t + ' recorded sessions') + '. Attendance % = attended ÷ recorded sessions × 100, whole year. Target ' + RULES.att + '%.' + demo; }
      if (/status|support|flag|signal|why/.test(L) && /status|support|flag|signal/.test(L)) return 'Your support status is "' + LEVEL[C.level] + '". ' + (C.gaps.length ? 'Based on: ' + C.gaps.map(function (g) { return g.pattern; }).join(' ') : 'No patterns found in your records.') + ' This is a reviewable signal, not a label, and asking for help never changes it.' + demo;
      if (/changed|change|performance|progress|trend|how (am|have) i/.test(L)) { var t = [0, 1, 2].map(function (k) { return studentAvg(sid, k); }); return 'Measured: your average moved from ' + r1(t[0]) + ' (Sem 3) to ' + r1(t[1]) + ' (Sem 4) to ' + r1(t[2]) + ' (Sem 5), over ' + scored(recs(sid)).length + ' scored assessments. ' + (t[2] > t[0] ? 'That is a rise of ' + r1(t[2] - t[0]) + ' points.' : 'That is a change of ' + r1(t[2] - t[0]) + ' points.') + ' Open the Progress page to see each subject.' + demo; }
      if (/practice|need(s)? (more )?work|revise|revision|weak|focus|study first|what should i/.test(L)) { var ac = C.gaps.filter(function (g) { return g.type === 'decline' || g.type === 'low' || g.type === 'topic'; }); var M = termMatrix(sid)[2], lo = SUBJECTS.map(function (n, i) { return { n: n, v: M[i] }; }).filter(function (o) { return o.v !== null; }).sort(function (a, b) { return a.v - b.v; }).slice(0, 2); return (ac.length ? 'Measured signals: ' + ac.map(function (g) { return g.pattern; }).join(' ') + ' ' : 'No subject shows a decline or repeated topic difficulty in your records. ') + 'Lowest Sem 5 averages: ' + lo.map(function (o) { return o.n + ' ' + r1(o.v); }).join(', ') + '. Suggestion (not a guarantee): start with ' + lo[0].n + ', redo the last test step by step, then three fresh questions.' + demo; }
      if (/plan|study time|schedule my|timetable for study|hours/.test(L) && /plan|study/.test(L)) { var M2 = termMatrix(sid)[2], order = SUBJECTS.map(function (n, i) { return { n: n, v: M2[i] }; }).filter(function (o) { return o.v !== null; }).sort(function (a, b) { return a.v - b.v; }); return 'A simple split based on your Sem 5 averages: 3 sessions a week on ' + order[0].n + ' (' + r1(order[0].v) + '), 2 on ' + order[1].n + ' (' + r1(order[1].v) + '), 1 each on the rest, and keep ' + order[order.length - 1].n + ' (' + r1(order[order.length - 1].v) + ') as a quick weekly review. Use the Timetable page to fit sessions around classes. A recommendation, not a guarantee.' + demo; }
      return null; /* fall through to the existing student answers (marks, CGPA, timetable, simulator, pages) */
    }
    if (role === 'teacher' || role === 'admin') {
      if (role === 'teacher' && who && who.cls !== ROLE.cls) return who.name + ' is in ' + who.cls + ', which is outside your class. Teacher accounts see their own class only.';
      var scopeTxt = scope ? scope + ' (' + pool.length + ' students)' : 'all ' + CLASSES.length + ' sections (' + pool.length + ' students)';
      var rk = rankAnswer(L); if (rk) return rk;
      if (/feedback|satisfaction|rating|complain/.test(L)) { var cfs = scope ? [classFb(scope)] : CLASSES.map(function (c) { var x = classFb(c.id); x.id = c.id; return x; }); return (scope ? 'Student feedback for ' + scopeTxt + ': ' + cfs[0].n + ' submissions' + (cfs[0].avg !== null ? ', average ' + r1(cfs[0].avg) + ' of 5' : '') + '; survey satisfaction ' + r1(cfs[0].seeded) + ' of 5. ' + (cfs[0].items.length ? 'Latest (anonymous): "' + cfs[0].items[0].text + '" (' + (cfs[0].items[0].subj === null ? 'course' : SUBJECTS[cfs[0].items[0].subj]) + ', ' + cfs[0].items[0].rating + ' of 5).' : 'No comments yet.') : 'Feedback by class: ' + cfs.map(function (x) { return x.id + ' ' + x.n + ' submissions' + (x.avg !== null ? ' avg ' + r1(x.avg) : '') + ', survey ' + r1(x.seeded); }).join('; ') + '.') + ' Low ratings are prompts to look, not verdicts on teaching.' + demo; }
      if (/predict|forecast|early warning|probability|trajectory|next semester|likely to/.test(L)) { if (who) { var rw = riskModel(who.id), td = rw.parts.filter(function (x) { return x.value !== null && x.contrib > 0.05; }).slice(0, 3); return who.name + ': predicted academic risk next semester ' + (rw.level === 'insufficient' ? 'not estimated (fewer than 6 scored assessments)' : rw.pct + '% (' + RISK_LABEL[rw.level] + ')') + (rw.traj.slope !== null ? '; trajectory ' + (rw.traj.slope >= 0 ? '+' : '') + r1(rw.traj.slope) + ' points per semester, projected ' + Math.round(rw.traj.next) : '') + (td.length ? '. Pushing it up: ' + td.map(function (x) { return x.label + ' ' + x.value; }).join(', ') : '') + '. Transparent logistic model with hand-set coefficients; see the Method page.' + demo; } var hi = pool.filter(function (s) { return riskModel(s.id).level === 'high'; }), wn = pool.filter(function (s) { return riskModel(s.id).warn; }); return 'Predicted high academic risk next semester in ' + scopeTxt + ': ' + hi.length + ' student' + (hi.length === 1 ? '' : 's') + (hi.length ? ' (' + hi.slice(0, 8).map(function (s) { return s.name + ' ' + riskModel(s.id).pct + '%'; }).join(', ') + (hi.length > 8 ? ', …' : '') + ')' : '') + '; ' + wn.length + ' early warning' + (wn.length === 1 ? '' : 's') + ' from a falling trajectory (4+ points per semester). Model: logistic on average, attendance, LMS, backlogs, trajectory and missing work; filter the admin directory by "Predicted: high risk".' + demo; }
      if (/import|csv|pipeline|clean|duplicate|data quality|data source|integrat/.test(L)) { var Qd = QUALITY; return 'Active dataset: ' + DATASET.name + ' (' + DATASET.origin + '). ' + Qd.students + ' students joined on student_id from ' + Object.keys(SRC_META).filter(function (k) { return k !== 'students' && Qd.sources[k]; }).length + ' of 7 source tables, ' + Qd.assessments.toLocaleString() + ' assessment rows. Cleaning: ' + Qd.fixes.join('; ') + '. Admins can import their own CSVs from the Data integration pipeline card.' + demo; }
      if (/placement|readiness|aptitude|coding score|mock interview/.test(L)) { var pls = pool.filter(function (s) { return placementFlag(s.id) === 'pl_support'; }), plm = pool.filter(function (s) { return placementFlag(s.id) === 'pl_monitor'; }), hl = pool.filter(function (s) { return segmentOf(s.id) === 'hi_acad_lo_plc'; }); return 'Placement outcome risk in ' + scopeTxt + ': ' + pls.length + ' student' + (pls.length === 1 ? '' : 's') + ' with readiness under 50 (' + (pls.map(function (s) { return s.name + ' ' + Math.round(placementScore(s.id).score); }).join(', ') || 'none') + '), ' + plm.length + ' between 50 and 64. ' + (hl.length ? 'High academic but low placement readiness: ' + listNames(hl) + '. ' : '') + 'Readiness = aptitude 30% + coding 30% + mock interview 25% + technical skills and certifications 15%.' + demo; }
      if (/segment|group|cluster/.test(L)) { var sc3 = {}; pool.forEach(function (s) { var g = segmentOf(s.id); (sc3[g] = sc3[g] || []).push(s.name); }); return 'Segments in ' + scopeTxt + ': ' + SEGMENTS.filter(function (s) { return sc3[s[0]]; }).map(function (s) { return s[1] + ' (' + sc3[s[0]].length + ': ' + sc3[s[0]].join(', ') + ')'; }).join('; ') + '. Rule-based, one segment per student; the admin dashboard filters by them.' + demo; }
      if (/success score|driver/.test(L) || (/contribut/.test(L) && !/status|evidence|support|flag|signal/.test(L))) { if (who) { var S2 = successScore(who.id), tp = S2.parts.filter(function (p) { return p.raw !== null; }).sort(function (a, b) { return b.contrib - a.contrib; }); return who.name + ': success score ' + Math.round(S2.score) + ' (' + S2.n + ' of ' + S2.total + ' indicators). Drivers: ' + tp.map(function (p) { return p.label + ' +' + r1(p.contrib) + ' (' + p.raw + ' × ' + Math.round(p.weight * 100) + '%)'; }).join(', ') + '. Placement readiness ' + Math.round(placementScore(who.id).score) + ', segment: ' + segLabel(segmentOf(who.id)) + '.' + demo; } var vals = pool.map(function (s) { return successScore(s.id).score; }).filter(function (v) { return v !== null; }).sort(function (a, b) { return a - b; }); return 'Success score in ' + scopeTxt + ': average ' + Math.round(mean(vals)) + ', lowest ' + Math.round(vals[0]) + ', highest ' + Math.round(vals[vals.length - 1]) + '. ' + vals.filter(function (v) { return v < 50; }).length + ' students under 50. Weights: academic 35%, attendance 15%, LMS 15%, engagement 15%, skills 10%, satisfaction 10%; missing indicators are excluded and weights rescaled.' + demo; }
      if (/interventions?|follow[- ]?ups?/.test(L) && /await|pending|due|require|need|how many|open|outstanding/.test(L)) { var ivs = IV.filter(function (iv) { return !scope || iv.cls === scope; }), due = ivs.filter(function (iv) { return ivStatus(iv) === 'follow_due'; }), open = ivs.filter(function (iv) { return ['planned', 'in_progress'].indexOf(ivStatus(iv)) >= 0; }); return 'In ' + scopeTxt + ': ' + due.length + ' intervention' + (due.length === 1 ? '' : 's') + ' with a follow-up date passed and no assessment since (' + (due.map(function (iv) { return (iv.sid ? BYSID[iv.sid].name : 'whole ' + iv.cls) + ', ' + SUBJECTS[iv.subj] + ', due ' + fmtD(iv.follow); }).join('; ') || 'none') + '), plus ' + open.length + ' planned or in progress. Rule: follow-up due = follow-up date before today and no scored assessment after the adjustment.' + demo; }
      if (/latest|last|recent/.test(L) && /follow|change|outcome|intervention/.test(L)) { var done = IV.filter(function (iv) { return (!scope || iv.cls === scope) && ivOutcome(iv).na > 0; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0]; if (!done) return 'No intervention in ' + scopeTxt + ' has a scored assessment after its adjustment date yet, so no outcome has been measured.'; var o = ivOutcome(done); return (done.sid ? BYSID[done.sid].name : 'Whole ' + done.cls) + ', ' + SUBJECTS[done.subj] + ', adjusted ' + fmtD(done.date) + ' (' + done.strategy + '): before ' + r1(o.before) + ' (' + o.nb + ' assessments), after ' + r1(o.after) + ' (' + o.na + '), change ' + (o.change >= 0 ? '+' : '') + r1(o.change) + '. ' + ivReading(done).txt + demo; }
      if (/attendance|attend\b/.test(L) && /below|under|less than|low/.test(L)) { var th = (L.match(/(\d{2})\s?%/) || [])[1], T2 = th ? +th : RULES.att, low = pool.filter(function (s) { var p = attOf(s.id).p; return p !== null && p < T2; }); return low.length ? low.length + ' student' + (low.length === 1 ? '' : 's') + ' in ' + scopeTxt + ' below ' + T2 + '%: ' + low.map(function (s) { var a = attOf(s.id); return s.name + ' ' + r1(a.p) + '% (' + a.a + '/' + a.t + ')'; }).join(', ') + '. Whole year, all subjects. Attendance is context, not evidence about effort.' + demo : 'No student in ' + scopeTxt + ' is below ' + T2 + '% attendance for the year.' + demo; }
      if (/attendance|attend\b/.test(L) && /average|mean|vary|varies|across|course|compare|by class/.test(L)) { if (role === 'admin' && /course|vary|across|compare|by class/.test(L)) return 'Attendance by class, whole year: ' + CLASSES.map(function (c) { return c.name + ' (' + c.course + ') ' + r1(classAtt(c.id)) + '%'; }).join('; ') + '. Formula: attended ÷ recorded sessions × 100.' + demo; var ca = classAtt(scope); return 'Average attendance for ' + scopeTxt + ' is ' + r1(ca) + '%, whole year, attended ÷ recorded sessions across all subjects.' + demo; }
      if (/declin|drop|fall|fell|lower|decrease/.test(L)) { var dec = []; pool.forEach(function (s) { cls(s.id).gaps.forEach(function (g) { if (g.type === 'decline' && (si < 0 || g.subj === si)) dec.push(s.name + ' in ' + SUBJECTS[g.subj] + (g.current ? '' : ' (recovered later)') + ': ' + g.pattern); }); }); return dec.length ? dec.length + ' decline signal' + (dec.length === 1 ? '' : 's') + ' in ' + scopeTxt + ': ' + dec.join('; ') + ' Rule: semester average falls ' + RULES.drop + '+ points from one semester to the next.' + demo : 'No student in ' + scopeTxt + ' meets the decline rule (term average falling ' + RULES.drop + '+ points between consecutive semesters).' + demo; }
      if (/check[- ]?in|benefit|review|need support|at risk|priority|which students (may|might|need)/.test(L)) { var rv = pool.filter(function (s) { var l = cls(s.id).level; return l === 'priority' || l === 'support'; }), mi = pool.filter(function (s) { return cls(s.id).level === 'insufficient'; }); return (rv.length ? rv.length + ' student' + (rv.length === 1 ? '' : 's') + ' in ' + scopeTxt + ' with an academic signal: ' + rv.map(function (s) { var c = cls(s.id); return s.name + ' (' + LEVEL[c.level] + ': ' + c.reasons[0] + ')'; }).join('; ') + '.' : 'No student in ' + scopeTxt + ' has an academic signal right now.') + (mi.length ? ' More information needed for ' + listNames(mi) + '.' : '') + ' These are reviewable signals, not labels.' + demo; }
      if (who && /evidence|status|why|support|signal|flag/.test(L)) { var c2 = cls(who.id); return who.name + ' is "' + LEVEL[c2.level] + '". ' + (c2.gaps.length ? 'Evidence: ' + c2.gaps.map(function (g) { return g.title + ': ' + g.pattern + (g.ev.length ? ' [' + g.ev.slice(0, 4).map(function (a) { return a.kind + ' ' + fmtD(a.date) + ' ' + (a.score === null ? 'n/a' : a.score); }).join(', ') + ']' : ''); }).join(' ') : c2.reasons[0]) + ' Limitation: subject-level marks and topic tags only; no question-level data.' + demo; }
      if (who && /adjust|teach|strategy|recommend|help|approach/.test(L)) { var gs = cls(who.id).gaps.filter(function (g) { return (si < 0 || g.subj === si) && g.type !== 'spread'; }); if (!gs.length) return 'No learning gap is identified for ' + who.name + (si >= 0 ? ' in ' + SUBJECTS[si] : '') + ' by the current rules, so there is nothing to adjust for. Open the Learning Journey to review the records directly.'; var a = adviseFor(gs[0], who); return 'Suggested teaching experiment for ' + who.name + ' (' + gs[0].title + '): ' + a.s + '. Why: ' + a.why + ' Activity: ' + a.act + ' Check: ' + a.check + ' Not a guaranteed fix; record it in the Intervention Tracker to measure what follows.' + demo; }
      if (/concept|topic|revis|reteach|across the class|class[- ]wide|struggl/.test(L)) { var fl = (scope ? classTopics(scope) : [].concat.apply([], CLASSES.map(function (c) { return classTopics(c.id).map(function (r) { r.label = c.id + ' · ' + r.label; return r; }); }))).filter(function (r) { return r.flag && (si < 0 || r.subj === si); }).sort(function (a, b) { return a.avg - b.avg; }); return fl.length ? 'Concepts meeting the class-wide rule in ' + scopeTxt + ': ' + fl.map(function (r) { return r.label + ' (avg ' + r1(r.avg) + ', ' + r.lowStudents + ' students below ' + RULES.low + ', ' + r.n + ' records)'; }).join('; ') + '. Suggested: a short revision lesson with a different explanation and a formative quiz before moving on.' + demo : 'No concept in ' + scopeTxt + ' meets the class-wide rule (3+ students below ' + RULES.low + ' on the same topic, class average under 62).' + demo; }
      if (/incomplete|missing|completeness|data quality/.test(L)) { var cc = CLASSES.filter(function (c) { return !scope || c.id === scope; }).map(function (c) { var x = completeness(c.id); return c.name + ': ' + x.missing + ' of ' + x.total + ' assessments unscored (' + r1(x.p) + '% complete)'; }); return cc.join('; ') + '. Missing records are counted as missing evidence, never as zero.' + demo; }
      if (/trend|average|performance|how (is|are)|overview|summary/.test(L)) { var tt = [0, 1, 2].map(function (k) { return r1(classAvg(scope, k)); }), cnt = { priority: 0, support: 0, monitor: 0, on_track: 0, insufficient: 0 }; pool.forEach(function (s) { cnt[cls(s.id).level]++; }); return scopeTxt + ': average score ' + tt[0] + ' (Sem 3), ' + tt[1] + ' (Sem 4), ' + tt[2] + ' (Sem 5); attendance ' + r1(classAtt(scope)) + '%. Support status: ' + Object.keys(cnt).map(function (k) { return cnt[k] + ' ' + LEVEL[k].toLowerCase(); }).join(', ') + '. Averages use scored assessments only.' + demo; }
      if (who) { var tm = [0, 1, 2].map(function (k) { return r1(studentAvg(who.id, k)); }), aw = attOf(who.id); return who.name + ' (' + who.cls + '): averages ' + tm.join(' / ') + ' across the three semesters, attendance ' + r1(aw.p) + '% (' + aw.a + '/' + aw.t + '), status "' + LEVEL[cls(who.id).level] + '". Ask "what evidence" for the detail.' + demo; }
      if (/^(hi|hello|hey)\b/.test(L)) return 'Hi. I am Ask Gradex. I answer from the demo dataset for ' + scopeTxt + ': attendance, declines, support status and evidence, class-wide concepts, teaching adjustments and interventions. Try a suggested question below.';
      return 'I could not match that to a dataset question. I can answer about attendance, declining results, students who may benefit from a check-in, the evidence behind a status, class-wide concepts, teaching adjustments and intervention follow-ups' + (role === 'admin' ? ', per class or across the campus' : '') + '. I do not invent figures that are not in the records.';
    }
    return null;
  }
  /* class / section ranking: "which section has the most at-risk students", "lowest attendance by class", "which class improved most" */
  function rankAnswer(L) {
    var asksRank = /(which|what) (class|section|course|batch)|(class|section)(es|s)? (has|have|with|is|are)|by (class|section)|rank|compare (the )?(class|section)|across (the )?(class|section)|(most|highest|lowest|least|fewest|worst|best|top|bottom)\b.*(class|section)|(class|section).*(most|highest|lowest|least|fewest|worst|best)/.test(L);
    if (!asksRank || clsIn(L)) return null;
    var low = /lowest|least|fewest|worst|bottom|weakest|poorest|smallest/.test(L) && !/worst (attendance|results|performance)/.test(L) ? true : false;
    var M = null;
    if (/at risk|risk|flag|priority|support|struggl|check[- ]?in/.test(L) && !/placement/.test(L)) M = { name: 'share of students with an academic flag (priority review or support recommended)', f: function (c) { var cs = classStudents(c.id), n = cs.filter(function (s) { var l = cls(s.id).level; return l === 'priority' || l === 'support'; }).length; return { v: n / (cs.length || 1) * 100, txt: n + ' of ' + cs.length + ' (' + Math.round(n / (cs.length || 1) * 100) + '%)' }; } };
    else if (/placement|readiness/.test(L)) M = { name: 'share of students with placement readiness under 50', f: function (c) { var cs = classStudents(c.id), n = cs.filter(function (s) { return placementFlag(s.id) === 'pl_support'; }).length; return { v: n / (cs.length || 1) * 100, txt: n + ' of ' + cs.length }; } };
    else if (/attend/.test(L)) M = { name: 'attendance (whole year)', f: function (c) { var v = classAtt(c.id); return { v: v, txt: r1(v) + '%' }; } };
    else if (/improv|declin|drop|fall|change|trend|progress|grow/.test(L)) { if (/declin|drop|fall/.test(L)) low = true; M = { name: 'change in section average from Sem 3 to Sem 5', f: function (c) { var a = classAvg(c.id, 0), b = classAvg(c.id, 2), d = a === null || b === null ? null : b - a; return { v: d, txt: d === null ? 'no data' : (d >= 0 ? '+' : '') + r1(d) + ' (' + r1(a) + ' → ' + r1(b) + ')' }; } }; }
    else if (/success/.test(L)) M = { name: 'average success score', f: function (c) { var v = classStudents(c.id).map(function (s) { return successScore(s.id).score; }).filter(function (x) { return x !== null; }); var m = v.length ? mean(v) : null; return { v: m, txt: m === null ? 'no data' : String(Math.round(m)) }; } };
    else if (/score|marks|average|perform|result|grade|academic/.test(L)) M = { name: 'Sem 5 average score', f: function (c) { var v = classAvg(c.id, 2); return { v: v, txt: r1(v) }; } };
    else if (/missing|incomplete|complete/.test(L)) M = { name: 'number of assessments without a recorded score', f: function (c) { var x = completeness(c.id); return { v: x.missing, txt: x.missing + ' (' + r1(x.p) + '% complete)' }; } };
    if (!M) return null;
    var rows = CLASSES.map(function (c) { var r = M.f(c); r.c = c; return r; }).filter(function (r) { return r.v !== null && !isNaN(r.v); }).sort(function (a, b) { return low ? a.v - b.v : b.v - a.v; });
    if (!rows.length) return null;
    var top = rows[0], dir = low ? 'lowest' : 'highest', big = rows.filter(function (r) { return classStudents(r.c.id).length >= 30; })[0], small = classStudents(top.c.id).length < 15 && big && big !== top;
    return top.c.name + ' (' + top.c.course + ') has the ' + dir + ' ' + M.name + ': ' + top.txt + '.' + (small ? ' It is a small section (' + classStudents(top.c.id).length + ' students); among sections with 30+ students, ' + big.c.id + ' is ' + dir + ' at ' + big.txt + '.' : '') + ' Full ranking: ' + rows.map(function (r, i) { return (i + 1) + '. ' + r.c.id + ' ' + r.txt; }).join('; ') + '. Computed from all ' + STUDENTS.length + ' students in the active dataset; the admin dashboard charts show the same comparison, and clicking a section filters it. (Fictional demo data.)';
  }
  function askSuggest() { var box = $('#sg'); box.innerHTML = ''; (ASK_SUGGEST[ROLE.role || 'none']).forEach(function (q) { var b = el('button', 'chip', q); b.type = 'button'; b.addEventListener('click', function () { if (orbUI) orbUI.ask(q); }); box.appendChild(b); }); }
  function askNote() { var n = $('#chatNote'); n.textContent = (ROLE.role ? ({ student: 'Student view: answers use Aarav\'s own records only. ', teacher: 'Teacher view: answers use Section CSE-A records. ', admin: 'Admin view: answers cover every section. ' })[ROLE.role] : 'Public view: answers use the sample student. ') + (aiReady() ? 'Verified figures are calculated first; the configured AI explains them.' : 'Works offline: every answer is calculated by deterministic rules from the active dataset, so it needs no API key. An optional AI layer only rephrases verified figures.') + ' Press Escape to cancel.'; }
  window.__gradex = { feedback: function () { return FB; }, classFb: classFb, successScore: successScore, placementScore: placementScore, segmentOf: segmentOf, students: STUDENTS, assessments: ASSESS, classify: cls, gaps: gapsFor, attOf: attOf, completeness: completeness, ivOutcome: ivOutcome, ivStatus: ivStatus, interventions: function () { return IV; }, ask: askData, setRole: setRole, classTopics: classTopics };

  /* =====================================================================
     ROLE-BASED AUTH (Supabase). One authenticated user -> one verified role -> one dashboard.
     States: idle (demo mode) | loading | anon | role_loading | ready | denied | error
     The role is read from the profiles table on the server (RLS), never from the form, a dropdown or storage.
     ===================================================================== */
  var AUTH = { status: 'idle', user: null, role: null, msg: '', sub: null, seq: 0 }, sbClient = null, ALLOWED_ROLES = ['student', 'teacher', 'admin'];
  function sbOn() { return !!(CONFIG.supabase && CONFIG.supabase.url && CONFIG.supabase.anonKey); }
  function sbLoad() {
    return new Promise(function (res, rej) {
      if (window.supabase && window.supabase.createClient) return res(window.supabase);
      var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
      s.onload = function () { window.supabase && window.supabase.createClient ? res(window.supabase) : rej(new Error('Supabase library did not load')); };
      s.onerror = function () { rej(new Error('Could not load the Supabase library')); };
      document.head.appendChild(s);
    });
  }
  function authSet(status, msg) { AUTH.status = status; AUTH.msg = msg || ''; authRender(); }
  function authRender() {
    var box = $('#authState'), demo = $('#demoBlock'), mode = $('#authMode'), note = $('#loginNote'), f = $('#authForm');
    if (!sbOn()) { box.hidden = true; demo.hidden = false; f.hidden = false; mode.textContent = ''; return; }
    demo.hidden = !CONFIG.supabase.allowDemo; note.textContent = 'Sign in with your Gradex account. Your dashboard is chosen from the role stored on your profile, verified on the server, whichever card you started from.';
    mode.textContent = 'Connected to Supabase authentication.'; $('#portalFine').hidden = true;
    var m = { loading: ['<span class="loading"><i></i>Checking your session</span>', ''], role_loading: ['<span class="loading"><i></i>Verifying your role</span>', ''], denied: ['<div class="m" style="color:var(--rk)">ACCESS NOT GRANTED</div><p style="margin:8px 0 12px;font-size:15px">' + esc(AUTH.msg || 'Your account has no verified role (student, teacher or admin). Ask an administrator to assign one, then try again.') + '</p><div class="cta" style="margin:0"><button class="btn sm" type="button" id="authRetry">Try again</button><button class="btn sm" type="button" id="authOut">Log out</button></div>', ''], error: ['<div class="m" style="color:var(--rk)">COULD NOT VERIFY YOUR ACCOUNT</div><p style="margin:8px 0 12px;font-size:15px">' + esc(AUTH.msg || 'Something went wrong while checking your session.') + '</p><div class="cta" style="margin:0"><button class="btn sm" type="button" id="authRetry">Try again</button><button class="btn sm" type="button" id="authOut">Log out</button><a class="btn sm" href="#connect">Check connection</a></div>', ''], ready: ['<div class="m" style="color:var(--ok)">SIGNED IN</div><p style="margin:8px 0 12px;font-size:15px">' + esc(ROLE.name) + ' · ' + esc(AUTH.role) + '. <a href="#' + (ROLE_DEF[AUTH.role] || {}).home + '">Open your dashboard</a>.</p><div class="cta" style="margin:0"><button class="btn sm" type="button" id="authOut">Log out</button></div>', ''] }[AUTH.status];
    box.hidden = !m; if (m) { box.innerHTML = m[0]; portalShow(null); }
    $('#portalGrid').hidden = !!m; f.hidden = ['loading', 'role_loading', 'ready', 'denied', 'error'].indexOf(AUTH.status) >= 0;
    var rt = $('#authRetry'), out = $('#authOut');
    if (rt) rt.addEventListener('click', function () { sbResolve(true); });
    if (out) out.addEventListener('click', sbSignOut);
  }
  function sbClear() {
    var had = !!AUTH.user;
    setRole(null); state.user = null; AUTH.user = null; AUTH.role = null; CLS_CACHE = {};
    if (had) { userScores = null; fillEditor(); setBadge(); fbLoad(); IV_DEL = []; ivLoad(); }
  }
  /* ---------- Supabase data: scores, feedback, interventions (all protected by RLS, see supabase/schema.sql) ---------- */
  function sbReady() { return !!(sbClient && AUTH && AUTH.status === 'ready' && AUTH.user); }
  function sbStudent() { return sbReady() && AUTH.role === 'student'; }
  function sbStaff() { return sbReady() && (AUTH.role === 'teacher' || AUTH.role === 'admin'); }
  function ivRemote(rec) {
    if (!sbStaff()) return;
    sbClient.from('interventions').upsert({ id: rec.id, data: rec, updated_at: new Date().toISOString() })
      .then(function (r) { if (r.error) toast('Saved on this device, but not online: ' + r.error.message, true); });
  }
  function sbSync() {
    if (!sbReady()) return;
    var uid = AUTH.user.id, jobs = [];
    if (AUTH.role === 'student') jobs.push(sbClient.from('scores').select('scores').eq('user_id', uid).maybeSingle().then(function (r) {
      if (!r.error && r.data && validScores(r.data.scores)) { userScores = r.data.scores.map(function (row) { return row.slice(); }); fillEditor(); planRender(); }
      setBadge();
    }));
    jobs.push(sbClient.from('feedback').select('*').order('created_at', { ascending: false }).limit(500).then(function (r) {
      if (r.error || !r.data) return;
      r.data.forEach(function (row) {
        if (!BYSID[row.sid] || FB.some(function (f) { return f.id === row.id; })) return;
        FB.push({ id: row.id, type: row.type, sid: row.sid, cls: row.cls, subj: row.subj, rating: row.rating, text: row.text || '', at: String(row.created_at).slice(0, 10), by: row.by_name || undefined });
      });
      FB.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    }));
    if (AUTH.role !== 'student') jobs.push(sbClient.from('interventions').select('id, data').then(function (r) {
      if (r.error || !r.data) return;
      r.data.forEach(function (row) { if (row.data && row.data.id === row.id && (row.data.deleted || BYSID[row.data.sid] || !row.data.sid)) ivMerge(IV, row.data); });
    }));
    Promise.all(jobs).then(function () { if (sbReady()) route(); }).catch(function () {});
  }
  function sbSignOut() {
    sbClear(); authSet('loading');
    (sbClient ? sbClient.auth.signOut() : Promise.resolve()).catch(function () {}).then(function () { authSet('anon'); location.hash = 'login'; route(); toast('Logged out.'); });
  }
  /* fetch the role for the current session; seq guards against stale async results after account switches */
  function sbResolve(retry) {
    if (!sbClient) return; var my = ++AUTH.seq;
    authSet(retry ? 'role_loading' : 'loading');
    sbClient.auth.getSession().then(function (r) {
      if (my !== AUTH.seq) return;
      var sess = r && r.data && r.data.session; if (r && r.error) throw r.error;
      if (!sess || !sess.user) { sbClear(); authSet('anon'); route(); return; }
      AUTH.user = { id: sess.user.id, email: sess.user.email }; authSet('role_loading');
      var C = CONFIG.supabase;
      return sbClient.from(C.profilesTable).select(C.roleColumn + ', full_name, student_id').eq(C.idColumn, sess.user.id).maybeSingle().then(function (q) {
        if (my !== AUTH.seq) return;
        /* the profiles table is not set up yet (PGRST205 / 42P01) or this account has no profile row yet: open the student view, never a dead end */
        var noTable = q.error && /PGRST205|42P01|PGRST116/.test(String(q.error.code || '') + ' ' + String(q.error.message || ''));
        if (q.error && !noTable) { sbClear(); authSet('error', 'Could not read your profile (' + (q.error.code || 'database') + '). If this persists, ask an administrator to check the profiles table and its access policies.'); route(); return; }
        var row = noTable ? null : q.data;
        if (!row) { row = {}; row[C.roleColumn] = 'student'; row.full_name = (sess.user.user_metadata && sess.user.user_metadata.full_name) || ''; toast('Signed in. Opening the student view; an administrator can assign a teacher or admin role.'); }
        var role = String(row[C.roleColumn] || '').toLowerCase().trim();
        if (ALLOWED_ROLES.indexOf(role) < 0) { sbClear(); authSet('denied', 'This account has ' + (role ? 'an unrecognised role ("' + role + '")' : 'no role assigned') + '. Access is not granted until an administrator assigns student, teacher or admin.'); route(); return; }
        AUTH.role = role; setRole(role, { name: (row.full_name || sess.user.email || '').split('@')[0], uid: sess.user.id, sid: row.student_id }); authSet('ready'); sbSync();
        var want = (location.hash || '').replace('#', ''), home = ROLE_DEF[role].home;
        if (!want || want === 'login' || want === 'top') location.hash = home; else route();
      });
    }).catch(function (e) { if (my !== AUTH.seq) return; sbClear(); authSet('error', (e && e.message) || 'Network or authentication error.'); route(); });
  }
  function sbSubmit(em, pw, signUp, name) {
    if (!sbClient) { $('#formStatus').textContent = 'Authentication is still loading.'; return; }
    var btn = $('#submitBtn'); btn.disabled = true; $('#formStatus').textContent = signUp ? 'Creating your account' : 'Signing in';
    var p = signUp ? sbClient.auth.signUp({ email: em, password: pw, options: { data: { full_name: name } } }) : sbClient.auth.signInWithPassword({ email: em, password: pw });
    p.then(function (r) {
      if (r.error) { setErr(pass, $('#passErr'), r.error.message && /invalid|credentials/i.test(r.error.message) ? 'Email or password is incorrect.' : (r.error.message || 'Sign-in failed.')); $('#formStatus').textContent = 'Sign-in failed.'; return; }
      pass.value = ''; $('#strength').dataset.n = 0;
      if (signUp && r.data && !r.data.session) { $('#formStatus').textContent = 'Check your email to confirm the account, then log in. In the meantime, open a demo account above.'; setErr(email, $('#emailErr'), ''); toast('Account created. Confirm your email, then log in.'); return; }
      /* onAuthStateChange(SIGNED_IN) triggers sbResolve; call directly too in case the event already fired */
      sbResolve();
    }).catch(function (e) { $('#formStatus').textContent = 'Network error. Try again.'; setErr(pass, $('#passErr'), 'Could not reach the authentication service.'); }).then(function () { btn.disabled = false; });
  }
  function sbInit() {
    if (!sbOn()) { authRender(); return; }
    try { sessionStorage.removeItem('gradex.role'); } catch (e) {}
    authSet('loading'); route();
    sbLoad().then(function (lib) {
      sbClient = lib.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      if (AUTH.sub) { try { AUTH.sub.unsubscribe(); } catch (e) {} AUTH.sub = null; }
      var res = sbClient.auth.onAuthStateChange(function (ev, sess) {
        if (ev === 'SIGNED_OUT') { sbClear(); authSet('anon'); if ((location.hash || '').replace('#', '') !== 'login') location.hash = 'login'; else route(); return; }
        if (ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED' || ev === 'USER_UPDATED') { var uid = sess && sess.user && sess.user.id; if (ev === 'TOKEN_REFRESHED' && uid && AUTH.user && AUTH.user.id === uid && AUTH.status === 'ready') return; sbResolve(); }
      });
      AUTH.sub = res && res.data && res.data.subscription;
      sbResolve();
    }).catch(function (e) { authSet('error', e.message || 'Could not load authentication.'); route(); });
  }
  window.addEventListener('beforeunload', function () { if (AUTH.sub) { try { AUTH.sub.unsubscribe(); } catch (e) {} } });

  /* ---------- router: home, one page per feature, login, demo app, teacher ---------- */
  var views = { home: $('#view-home'), connect: $('#view-connect'), login: $('#view-login'), app: $('#view-app'), teacher: $('#view-teacher'), ti: $('#view-ti'), admin: $('#view-admin'), profile: $('#view-profile') }, current = 'home';
  PAGES.forEach(function (p) { views[p.id] = $('#view-' + p.id); });
  var homeIds = ['top', 'problem', 'gap', 'explore', 'campus', 'end'];
  var TITLES = { home: 'Gradex', connect: 'Connections, Gradex', login: 'Log in, Gradex', app: 'Your dashboard, Gradex', teacher: 'Teacher, Gradex', ti: 'Teaching Intelligence, Gradex', admin: 'Admin, Gradex', profile: 'Student profile, Gradex' };
  PAGES.forEach(function (p) { TITLES[p.id] = p.n + ', Gradex'; });
  function route() {
    var h = (location.hash || '').replace('#', ''), pid = null;
    if (h === 'planner') { location.replace('#attendance'); return; }
    if (h.indexOf('profile-') === 0) { pid = h.slice(8); h = 'profile'; }
    var v = Object.prototype.hasOwnProperty.call(views, h) ? h : 'home';
    if (sbOn() && AUTH.status === 'loading' && v !== 'connect') { h = 'login'; }
    var staff = ROLE.role === 'teacher' || ROLE.role === 'admin' || TEACH;
    if (v === 'app' && !state.user) v = 'login';
    if ((v === 'teacher' || v === 'profile' || v === 'ti') && !staff) v = 'login';
    if (v === 'admin' && ROLE.role !== 'admin') v = 'login';
    var changed = v !== current, feat = pageIdx(v) >= 0, dash = v === 'app' || v === 'teacher' || v === 'ti' || v === 'admin' || v === 'profile';
    if (changed && current === 'journey' && window.__gxJourneyKill) window.__gxJourneyKill();
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== v; });
    document.body.classList.toggle('is-dash', dash);
    current = v;
    $('#topLogin').hidden = !(v === 'home' || feat) || !!ROLE.role; $('#navList').hidden = !(v === 'home' || feat || dash); $('#dots').hidden = v !== 'home';
    if (v === 'teacher') renderTeacher();
    if (v === 'ti') renderTIPage();
    if (v === 'admin') renderAdmin();
    if (v === 'profile') renderProfile(pid);
    if (v === 'ask') { askSuggest(); askNote(); }
    if (v === 'success') renderSuccess();
    if (v === 'method') renderMethod();
    /* back + home quick nav: track in-site history so Back always lands on a Gradex view */
    var curH = location.hash || '#top';
    if (!qnPop) { if (!qnStack.length || qnStack[qnStack.length - 1].h !== curH) { if (qnStack.length) qnStack[qnStack.length - 1].y = (pendingY === null ? window.scrollY : pendingY); qnStack.push({ h: curH, y: 0 }); fwdStack = []; if (qnStack.length > 60) qnStack.shift(); } }
    qnPop = false; pendingY = null; hnavSync();
    document.body.classList.toggle('not-home', v !== 'home');
    $('#qn').hidden = v === 'home' && homeIds.indexOf(h) <= 0;
    $$('#navList a, #pgmPanel a').forEach(function (a) { var on = a.getAttribute('href') === '#' + v || (v === 'home' && a.getAttribute('href') === '#top'); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var pm = $('#navPages'); if (pm) pm.open = false;
    document.title = TITLES[v] || 'Gradex';
    if (changed) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (v === 'home' && homeIds.indexOf(h) > 0) { var tg = document.getElementById(h); if (tg) tg.scrollIntoView(); }
    if (v === 'login') { if (changed) portalShow(null); authRender(); }
    if (v === 'app') renderApp();
    if (v === 'journey' && window.__gxJourney) requestAnimationFrame(function () { window.__gxJourney(); });
    if (v === 'ask' && pendingQ) { var pq = pendingQ; pendingQ = null; setTimeout(function () { if (orbUI) orbUI.ask(pq); }, 500); }
    if (window.__gx) window.__gx.view(v);
    if (restoreY !== null) { var ry = restoreY; restoreY = null; var back = function () { window.scrollTo({ top: ry, left: 0, behavior: 'instant' }); }; back(); setTimeout(back, 0); setTimeout(back, 160); }
    if (pendingScroll) { var ps = pendingScroll; pendingScroll = null; setTimeout(function () { var n = document.getElementById(ps); if (n) n.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); }, 120); }
    $$('.qa a[data-feat]').forEach(function (a) { var f = featureById(a.dataset.feat), on = f && f.go === (pid ? 'profile-' + pid : h) && (!f.ti || f.ti === TI.sec) && !f.scroll; if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  var qnStack = [], qnPop = false, fwdStack = [], pendingY = null, restoreY = null;
  /* remember where the user was before any in-site link fires, so Back lands on the same spot of the same page */
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href^="#"], [data-feat], [data-go], [data-role], [data-ti], [data-journey]')) pendingY = window.scrollY; }, true);
  function hnavSync() { var b = $('#hBack'), f = $('#hFwd'); if (b) b.disabled = qnStack.length < 2; if (f) f.disabled = !fwdStack.length; }
  function hnavGo(entry) { qnPop = true; restoreY = entry.y || 0; if ((location.hash || '#top') === entry.h) { route(); } else location.hash = entry.h; }
  $('#hBack').addEventListener('click', function () { if (qnStack.length < 2) return; var cur = qnStack.pop(); cur.y = window.scrollY; fwdStack.push(cur); hnavGo(qnStack[qnStack.length - 1]); });
  $('#hFwd').addEventListener('click', function () { if (!fwdStack.length) return; qnStack[qnStack.length - 1].y = window.scrollY; var nxt = fwdStack.pop(); qnStack.push(nxt); hnavGo(nxt); });
  document.addEventListener('keydown', function (e) { if (e.altKey && e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); $('#hFwd').click(); } });
  $('#qnBack').addEventListener('click', function () { $('#hBack').click(); });
  $('#qnHome').addEventListener('click', function () { if ((location.hash || '') === '#top' || !location.hash) { window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); route(); } else location.hash = 'top'; });
  document.addEventListener('keydown', function (e) { if (e.altKey && e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); $('#qnBack').click(); } if (e.altKey && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); $('#qnHome').click(); } });
  window.addEventListener('hashchange', route);

  /* ---------- reveals, dots, progress, seq ---------- */
  var secs = $$('#view-home section');
  $('#dots').innerHTML = secs.map(function (s) { return '<a href="#' + s.id + '" aria-label="' + s.id + '"></a>'; }).join('');
  var dotEls = $$('#dots a');
  var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) x.target.classList.add('in'); }); }, { threshold: .2 });
  $$('section, [data-r]').forEach(function (e) { io.observe(e); });
  var activeSec = 'top';
  secs.forEach(function (s, i) {
    new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { activeSec = s.id; dotEls.forEach(function (a, k) { a.classList.toggle('on', k === i); }); if (window.__gx) window.__gx.section(s.id); } }); }, { threshold: s.id === 'journey' ? .12 : .5 }).observe(s);
  });
  var tk = 0;
  window.addEventListener('scroll', function () { if (tk) return; tk = requestAnimationFrame(function () { tk = 0; var P = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight); $('#prog').style.width = (P * 100) + '%'; if (window.__gx) window.__gx.scroll(P); }); }, { passive: true });
  (function () { var b = $$('#seq b'), i = 0; var f = function () { b.forEach(function (x, k) { x.classList.toggle('on', k <= i); }); i = (i + 1) % (b.length + 2); }; f(); if (!RM) setInterval(f, 900); })();
  if (fine && !RM) {
    $$('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, kx = dx ? r.width / 2 / Math.abs(dx) : 1e9, ky = dy ? r.height / 2 / Math.abs(dy) : 1e9, ed = clamp(1 / Math.min(kx, ky), 0, 1); c.style.setProperty('--ca', ((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360) + 'deg'); c.style.setProperty('--p', Math.pow(ed, 3).toFixed(2)); });
      c.addEventListener('pointerleave', function () { c.style.setProperty('--p', 0); });
    });
    var card = $('#card');
    card.addEventListener('pointermove', function (e) { var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; card.style.transform = 'rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg)'; });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  }

  /* ---------- 3D: scattered marks become a skyline ---------- */
  (function () {
    var ok = false; try { ok = !!document.createElement('canvas').getContext('webgl') && !!window.THREE; } catch (e) {}
    if (!ok) { $('#gl').remove(); return; }
    $('#fb').remove();
    var cv = $('#gl'), R = new THREE.WebGLRenderer({ canvas: cv, antialias: !mob, alpha: true });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, mob ? 1.5 : 2)); R.setClearColor(0x000000, 0);
    var S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, 1, .1, 100), G = new THREE.Group(); S.add(G);
    var ADD = THREE.AdditiveBlending;
    var cCy = new THREE.Color(0x5ad1f5), cBl = new THREE.Color(0x3a6bff), cRk = new THREE.Color(0xff6574), tmp = new THREE.Color(), tint = new THREE.Color(0x5ad1f5), tintT = new THREE.Color(0x5ad1f5);

    /* plinth grid */
    var gp = [], i, x, z;
    for (x = -4.2; x <= 4.21; x += .6) gp.push(x, 0, -1.2, x, 0, 1.2);
    for (z = -1.2; z <= 1.21; z += .6) gp.push(-4.2, 0, z, 4.2, 0, z);
    var gridGeo = new THREE.BufferGeometry(); gridGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gp), 3));
    G.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0x8aa8ff, transparent: true, opacity: .18, blending: ADD })));
    /* grade guide lines */
    BANDS.forEach(function (b) { var y = b.min * .04; var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-4.2, y, -1.2, 4.2, y, -1.2]), 3)); G.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x8aa8ff, transparent: true, opacity: .22, blending: ADD }))); });
    /* bars */
    var boxGeo = new THREE.BoxGeometry(.8, 1, .8), edges = new THREE.EdgesGeometry(boxGeo), bars = [];
    SUBJECTS.forEach(function (n, k) {
      var fillM = new THREE.MeshBasicMaterial({ color: 0x3a6bff, transparent: true, opacity: .16, blending: ADD });
      var m = new THREE.Mesh(boxGeo, fillM); m.position.x = (k - 2.5) * 1.3; m.scale.y = .001;
      var lm = new THREE.LineBasicMaterial({ color: 0x5ad1f5, transparent: true, opacity: .75, blending: ADD });
      m.add(new THREE.LineSegments(edges, lm));
      G.add(m); bars.push({ m: m, fm: fillM, lm: lm, h: RM ? SCORES[0][k] * .04 : .001 });
    });
    /* X marker */
    var xm = new THREE.Group(), xmM = new THREE.MeshBasicMaterial({ color: 0xff6574, transparent: true, opacity: .95, blending: ADD });
    [Math.PI / 4, -Math.PI / 4].forEach(function (a) { var m = new THREE.Mesh(new THREE.BoxGeometry(.7, .09, .09), xmM); m.rotation.z = a; xm.add(m); });
    G.add(xm);
    /* rings */
    var rings = [0, 1, 2].map(function (k) { var r = new THREE.Mesh(new THREE.TorusGeometry(4.6 + k * .5, .01, 6, 160), new THREE.MeshBasicMaterial({ color: 0x8aa8ff, transparent: true, opacity: .4 - k * .1, blending: ADD })); r.rotation.set(Math.PI / 2 + k * .25, k * .5, 0); r.position.y = 1.4; G.add(r); return r; });
    /* fragments: scattered score slips -> orbit */
    var F = mob ? 16 : 34, fr = [], eg = new THREE.EdgesGeometry(new THREE.PlaneGeometry(.5, .66));
    for (i = 0; i < F; i++) {
      var l = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: .6, blending: ADD }));
      var r = 4 + Math.random() * 5, t = Math.random() * 6.28, p = Math.acos(2 * Math.random() - 1);
      l.userData = { s: new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.cos(p) + 1.4, r * Math.sin(p) * Math.sin(t)), a: i / F * 6.28, h: 1.4 + (Math.random() - .5) * 2.2, k: Math.random() * 6, rt: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 3) };
      G.add(l); fr.push(l);
    }
    /* particles drifting inward */
    var N = mob ? 260 : 800, pos = new Float32Array(N * 3), vl = [];
    function rs(k) { var r = 7 + Math.random() * 5, t = Math.random() * 6.28, p = Math.acos(2 * Math.random() - 1); pos[k * 3] = r * Math.sin(p) * Math.cos(t); pos[k * 3 + 1] = r * Math.cos(p); pos[k * 3 + 2] = r * Math.sin(p) * Math.sin(t); }
    for (i = 0; i < N; i++) { rs(i); vl.push(.01 + Math.random() * .02); }
    var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    S.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x6fd3ff, size: .04, transparent: true, opacity: .75, blending: ADD })));
    /* pulse ring */
    var pulse = new THREE.Mesh(new THREE.TorusGeometry(1, .02, 6, 100), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: ADD })); pulse.rotation.x = Math.PI / 2; pulse.position.y = 1.4; G.add(pulse); var pu = -1;

    /* orbit system removed on request: the bar skyline, rings, fragments and particles remain */

    var ST = {
      top: { x: 2.4, y: -.6, s: 1, o: .35, a: 1 }, problem: { x: 2.6, y: -.4, s: .85, o: 0, a: 1 }, gap: { x: 2.8, y: -.4, s: .8, o: .55, a: .7 },
      glance: { x: 0, y: -.8, s: 1.5, o: 1, a: .25 }, progress: { x: 3.2, y: -.8, s: .7, o: 1, a: .35 }, journey: { x: 3.2, y: -.8, s: .7, o: 1, a: .25 }, sim: { x: 3.4, y: -.6, s: .75, o: 1, a: .45 }, planner: { x: 3.4, y: -.6, s: .75, o: 1, a: .4 }, attendance: { x: 3.4, y: -.6, s: .75, o: 1, a: .4 }, cgpa: { x: 3.4, y: -.6, s: .75, o: 1, a: .4 }, timetable: { x: 3.4, y: -.6, s: .75, o: 1, a: .4 }, explore: { x: 3.2, y: -.6, s: .8, o: 1, a: .4 },
      ask: { x: 3.2, y: -.6, s: .8, o: 1, a: .4 }, how: { x: 3.4, y: -.6, s: .7, o: 1, a: .35 }, end: { x: 0, y: -.9, s: 1.2, o: 1, a: 1 },
      login: { x: -2.6, y: -.6, s: .9, o: 1, a: .35 }, app: { x: 0, y: -.6, s: .6, o: 1, a: .18 }, teacher: { x: 0, y: -.6, s: .6, o: 1, a: .15 },
      ti: { x: 0, y: -.6, s: .6, o: 1, a: .12 }, admin: { x: 0, y: -.6, s: .6, o: 1, a: .12 }, profile: { x: 0, y: -.6, s: .6, o: 1, a: .12 }
    };
    /* where the orbit system sits and how visible it is in each section (q is opacity) */
    var OST = {
      top: { x: 3.3, y: 4.6, s: .5, q: .95 }, problem: { x: 3.4, y: 2.4, s: .8, q: 0 }, gap: { x: 3.6, y: 1.2, s: .9, q: 1 },
      glance: { x: 0, y: 1, s: 1, q: 0 }, progress: { x: 3.4, y: 1, s: .8, q: 0 }, journey: { x: 3.4, y: 1, s: .8, q: 0 }, sim: { x: 3.4, y: 1, s: .8, q: 0 }, planner: { x: 3.4, y: 1, s: .8, q: 0 }, attendance: { x: 3.4, y: 1, s: .8, q: 0 }, cgpa: { x: 3.4, y: 1, s: .8, q: 0 }, timetable: { x: 3.4, y: 1, s: .8, q: 0 }, explore: { x: 3.4, y: 1, s: .8, q: 0 },
      ask: { x: 3.4, y: 1, s: .8, q: 0 }, how: { x: 3.6, y: 1.2, s: .9, q: 1 }, end: { x: 5.1, y: 3.4, s: .5, q: .9 },
      login: { x: 0, y: 1, s: .8, q: 0 }, app: { x: 0, y: 1, s: .8, q: 0 }, teacher: { x: 0, y: 1, s: .8, q: 0 },
      ti: { x: 0, y: 1, s: .8, q: 0 }, admin: { x: 0, y: 1, s: .8, q: 0 }, profile: { x: 0, y: 1, s: .8, q: 0 }
    };
    var st = ST.top, ost = OST.top, oq = 0, or = .35, mx = 0, my = 0, t = 0, P = 0, hoverCol = null;
    window.addEventListener('pointermove', function (e) { mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; });
    function rz() { R.setSize(window.innerWidth, window.innerHeight, false); cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix(); } rz(); window.addEventListener('resize', rz);
    window.__gx = {
      section: function (id) { if (current === 'home') { st = ST[id] || st; ost = OST[id] || ost; cv.style.opacity = st.a; } },
      view: function (v) { if (v !== 'home') { st = ST[v] || st; ost = OST[v] || ost; cv.style.opacity = st.a; } else { st = ST[activeSec] || ST.top; ost = OST[activeSec] || OST.top; cv.style.opacity = st.a; } },
      scroll: function (p) { P = p; },
      update: function () {},
      pulse: function (c) { var m = /rgb|#/.test(c) ? c : getComputedStyle(document.documentElement).getPropertyValue(c.replace('var(', '').replace(')', '')).trim(); try { tintT.set(m); } catch (e) {} pu = 0; }
    };
    var L = function (a, b, k) { return a + (b - a) * k; };
    var visible = true;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(document.body);
    (function an() {
      requestAnimationFrame(an);
      if (document.hidden || !visible) return;
      if (!RM) t += .005;
      var tx = mob ? 0 : st.x, ty = mob ? (current === 'home' ? 1.6 : -.4) : st.y, sc = mob ? st.s * .7 : st.s;
      or = L(or, st.o, .03);
      G.position.x = L(G.position.x, tx, .05); G.position.y = L(G.position.y, ty, .05); G.scale.setScalar(L(G.scale.x, sc, .05));
      G.rotation.y = -.5 + Math.sin(t * .6) * .12 + mx * .5; G.rotation.x = .12 + my * .2;
      var scores = SCORES[state.term];
      bars.forEach(function (b, k) {
        var tgt = scores[k] * .04 * or; b.h = L(b.h, Math.max(.001, tgt), RM ? 1 : .06);
        b.m.scale.y = b.h; b.m.position.y = b.h / 2;
        tmp.copy(cBl).lerp(cCy, clamp(scores[k] / 100, 0, 1)); b.lm.color.copy(k === state.sel ? tint : tmp); b.fm.color.copy(tmp);
        b.fm.opacity = k === state.sel ? .32 : .14; b.lm.opacity = k === state.sel ? 1 : .6;
      });
      var sb = bars[state.sel]; xm.position.x = L(xm.position.x, sb.m.position.x, .1); xm.position.y = L(xm.position.y, sb.h + .7 + Math.sin(t * 8) * .06, .1); xm.rotation.y = -G.rotation.y; xmM.opacity = .95 * or;
      rings.forEach(function (r, k) { r.rotation.z = t * (1 + k * .4); });
      tint.lerp(tintT, .05); if (pu < 0 && tintT.getHex() !== 0x5ad1f5) { tintT.lerp(cCy, .01); }
      fr.forEach(function (l) { var u = l.userData, o = clamp(or, 0, 1), ox = Math.cos(u.a + t * 1.5) * 4.9, oz = Math.sin(u.a + t * 1.5) * 4.9, cx = u.s.x + Math.sin(t * 2 + u.k) * .4, cy = u.s.y + Math.cos(t * 2 + u.k) * .4; l.position.set(L(cx, ox, o), L(cy, u.h, o), L(u.s.z, oz, o)); l.rotation.set(u.rt.x * (1 - o) + t, u.rt.y * (1 - o) + (-u.a - t * 1.5 + 1.57) * o, u.rt.z * (1 - o)); l.material.opacity = .25 + .4 * o; });
      if (pu >= 0) { pu += .025; pulse.scale.setScalar(1 + pu * 6); pulse.material.opacity = Math.max(0, .9 - pu); pulse.material.color.copy(tint); if (pu > 1) pu = -1; }
      cam.position.set(mx * 1.1, 1.2 - my * .8 + P * 1.2, 11 - Math.sin(P * Math.PI) * 1.5); cam.lookAt(0, 1, 0);
      if (!RM) for (i = 0; i < N; i++) { var px = pos[i * 3] - G.position.x, py = pos[i * 3 + 1] - G.position.y - 1.4, pz = pos[i * 3 + 2], d = Math.hypot(px, py, pz); if (d < 2.2) { rs(i); continue; } var kk = vl[i] * (.5 + or) / d; pos[i * 3] -= px * kk; pos[i * 3 + 1] -= py * kk; pos[i * 3 + 2] -= pz * kk; }
      pg.attributes.position.needsUpdate = true;
      R.render(S, cam);
    })();
  })();

  /* ---------- score-card band: a curved, tilted stream of sample cards ---------- */
  (function () {
    var host = $('#tgh'); if (!host) return;
    var style = null, vis = true, rt = 0;
    function face(t, i, tw, th, off) {
      var s = SCORES[t][i], g = gradeOf(s), col = (g === 'A' || g === 'B') ? 'var(--cy)' : (g === 'C' ? 'var(--wa)' : 'var(--rk)');
      return '<div class="tgh-face" style="width:' + tw + 'px;height:' + th + 'px;left:' + off + 'px;color:' + col + '"><small>' + SHORT[i] + ', Term ' + (t + 1) + '</small><b style="color:var(--ink)">' + s + '</b><i style="width:' + s + '%"></i></div>';
    }
    function build() {
      var W = host.clientWidth, H = host.clientHeight; if (!W || !H) return;
      var old = $('.tgh-band', host); if (old) old.remove(); if (style) { style.remove(); style = null; }
      var rowH = Math.round(H * .31), tw = Math.round(rowH * .8), gap = 14, S = 6, sw = tw / S;
      var N = Math.min(28, Math.ceil(Math.PI * W / (tw + gap))), R = N * (tw + gap) / (2 * Math.PI);
      var band = el('div', 'tgh-band'); band.style.perspective = '1100px'; band.style.transform = 'rotate(-3deg) scale(1.02)';
      var css = '';
      for (var r = 0; r < 2; r++) {
        var ring = el('div', 'tgh-tile'); ring.style.cssText = 'left:50%;top:50%;width:0;height:0;animation:tgh-spin-' + r + ' ' + (r ? 95 : 75) + 's linear infinite;animation-play-state:' + (vis ? 'running' : 'paused');
        var dy = (r ? 1 : -1) * (rowH / 2 + gap / 2), pre = 'translateY(' + dy + 'px) translateZ(' + (-R) + 'px) rotateX(-6deg) ';
        css += '@keyframes tgh-spin-' + r + '{from{transform:' + pre + 'rotateY(0deg)}to{transform:' + pre + 'rotateY(' + (r ? 360 : -360) + 'deg)}}';
        for (var n = 0; n < N; n++) {
          var theta = n * 360 / N, idx = (n + r * 7) % 18, tt = Math.floor(idx / 6), ii = idx % 6;
          var tile = el('div'); tile.style.cssText = 'position:absolute;left:0;top:0;transform-style:preserve-3d;transform:rotateY(' + theta.toFixed(3) + 'deg)';
          for (var j = 0; j < S; j++) {
            var sl = el('div', 'tgh-slice' + (j === 0 ? ' first' : '') + (j === S - 1 ? ' last' : ''));
            var phi = ((j + .5) * sw - tw / 2) / R * 180 / Math.PI;
            sl.style.cssText = 'width:' + (sw + .6).toFixed(2) + 'px;height:' + rowH + 'px;left:' + (-sw / 2).toFixed(2) + 'px;top:' + (-rowH / 2) + 'px;transform:rotateY(' + phi.toFixed(3) + 'deg) translateZ(' + R.toFixed(2) + 'px)';
            sl.innerHTML = face(tt, ii, tw, rowH, -(j * sw));
            tile.appendChild(sl);
          }
          ring.appendChild(tile);
        }
        band.appendChild(ring);
      }
      style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
      host.insertBefore(band, host.firstChild);
      requestAnimationFrame(function () { band.classList.add('on'); });
    }
    build();
    if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(build, 180); }).observe(host);
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; $$('.tgh-tile', host).forEach(function (r) { r.style.animationPlayState = vis ? 'running' : 'paused'; }); }, { threshold: 0 }).observe(host);
  })();

  /* ---------- term journey: pinned horizontal timeline driven by scroll ---------- */
  (function () {
    var sec = $('#journey'); if (!sec) return;
    var top = $('#jnTop'), bot = $('#jnBottom'), line = $('#jnLine'), track = $('#jnTrack'), svg = $('#jnChart');
    var T = SCORES.map(function (t) { return Math.round(avg(t)); });
    var gains = SUBJECTS.map(function (n, i) { return SCORES[2][i] - SCORES[0][i]; }), gi = gains.indexOf(Math.max.apply(null, gains));
    var l1 = lowIdx(0), l3 = lowIdx(2), hi3 = SCORES[2].indexOf(Math.max.apply(null, SCORES[2])), nb3 = nextBand(SCORES[2][l3]);
    var topData = [
      ['Sem 3, average ' + T[0], SCORES[0].filter(function (s) { return s >= 55; }).length + ' of 6 subjects are at C or above. ' + SUBJECTS[l1] + ' starts lowest at ' + SCORES[0][l1] + '.'],
      ['Sem 4, average ' + T[1], 'Every subject rises. ' + SUBJECTS[l1] + ' moves from ' + SCORES[0][l1] + ' to ' + SCORES[1][l1] + '.'],
      ['Sem 5, average ' + T[2], SCORES[2].filter(function (s) { return s >= 70; }).length + ' of 6 subjects reach a B or better. ' + SUBJECTS[hi3] + ' reaches ' + gradeOf(SCORES[2][hi3]) + ' at ' + SCORES[2][hi3] + '.']
    ];
    var botData = [
      ['Lowest subject', SUBJECTS[l1] + ': ' + SCORES[0][l1] + ' in Sem 3, ' + SCORES[2][l1] + ' in Sem 5.'],
      ['Biggest gain', SUBJECTS[gi] + ' gains ' + gains[gi] + ' points, the most of any subject.'],
      ['Next step', SUBJECTS[l3] + ' is now the lowest at ' + SCORES[2][l3] + (nb3 ? ', ' + (nb3.min - SCORES[2][l3]) + ' points from a ' + nb3.l + '.' : '.')]
    ];
    function item(d, isBot) {
      var n = el('div', 'jn-item');
      n.innerHTML = '<div class="jn-stem">' + (isBot ? '<div class="jn-rule"></div><div class="jn-dot"></div>' : '<div class="jn-dot"></div><div class="jn-rule"></div>') + '</div><div class="jn-text"><h4><span>' + d[0] + '</span></h4><p><span>' + d[1] + '</span></p></div>';
      return n;
    }
    topData.forEach(function (d) { top.appendChild(item(d, false)); });
    botData.forEach(function (d) { bot.appendChild(item(d, true)); });

    /* chart of the three term averages */
    var xs = [50, 160, 270], ys = T.map(function (v) { return 130 - (v - 50) / 40 * 100; });
    var pd = 'M' + xs[0] + ' ' + ys[0] + ' L' + xs[1] + ' ' + ys[1] + ' L' + xs[2] + ' ' + ys[2];
    svg.innerHTML = '<line x1="20" y1="130" x2="300" y2="130" stroke="rgba(138,168,255,.25)"/><path id="jnPath" d="' + pd + '" pathLength="1" fill="none" stroke="#5ad1f5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1"/>' +
      xs.map(function (x, i) { return '<circle cx="' + x + '" cy="' + ys[i] + '" r="4.5" fill="#5ad1f5"/><text x="' + x + '" y="' + (ys[i] - 12) + '" text-anchor="middle">' + T[i] + '</text><text x="' + x + '" y="146" text-anchor="middle">Term ' + (i + 1) + '</text>'; }).join('');
    var path = $('#jnPath');

    function stat() { sec.classList.add('jn-static'); path.style.strokeDashoffset = 0; }
    if (RM || !window.gsap || !window.ScrollTrigger) { stat(); return; }
    gsap.registerPlugin(ScrollTrigger);
    var ctx = null, rz = 0;
    function build() {
      if (ctx) { ctx.revert(); ctx = null; }
      if (!track.offsetWidth || !sec.offsetWidth) return;
      ctx = gsap.context(function () {
        var W = window.innerWidth, Sx = Math.max(0, track.offsetWidth - W), dotW = $('.jn-line i', sec).offsetWidth;
        var tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true } });
        tl.to(track, { x: -Sx, duration: 1 }, 0);
        tl.fromTo(line, { width: 0 }, { width: function () { return $('.jn-line', sec).offsetWidth - 2 * dotW; }, duration: .9 }, .02);
        gsap.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: sec, start: 'top 70%', once: true } });
        var base = track.getBoundingClientRect().left;
        $$('.jn-item', sec).forEach(function (it) {
          var r = it.getBoundingClientRect(), pos = clamp(Sx ? (r.left - .72 * W) / Sx : 0, .02, .84);
          var s = gsap.timeline();
          s.fromTo($('.jn-dot', it), { scale: 0 }, { scale: 1, duration: .3, ease: 'back.out(2)' }, 0)
            .fromTo($('.jn-rule', it), { scaleY: 0 }, { scaleY: 1, duration: .5, ease: 'power2.out' }, .1)
            .fromTo($$('.jn-text span', it), { yPercent: 110 }, { yPercent: 0, duration: .5, stagger: .12, ease: 'power3.out' }, .25);
          s.duration(.14);
          tl.add(s, pos);
        });
        tl.set({}, {}, 1);
      }, sec);
    }
    window.__gxJourney = build;
    window.__gxJourneyKill = function () { if (ctx) { ctx.revert(); ctx = null; } };
    requestAnimationFrame(build);
    window.addEventListener('load', build);
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(build, 220); });
  })();

  /* ---------- morph orb: the input becomes a thinking orb, then unfolds into the answer ---------- */
  (function () {
    var root = $('#mo'), actor = $('#moActor'), mover = $('#moMover'), trails = $$('.mo-trail', root), field = $('#ci'), send = $('#moSend');
    var cvs = $('#moOrb'), pulseEl = $('#moPulse'), ansEl = $('#moAnswer'), body = $('#moBody'), status = $('#moStatus'), resetBtn = $('#moReset'), live = $('#moLive'), moLog = $('#moLog');
    resetBtn.hidden = true;
    function logMsg(cls, text) { var m = el('div', 'msg ' + cls); m.textContent = text; moLog.appendChild(m); root.classList.add('has-log'); setTimeout(function () { moLog.scrollTop = moLog.scrollHeight; }, 10); return m; }
    if (!root) return;
    var ABORT = { aborted: true }, IDLE_Y = 90, phase = 'idle', ctrl = null, timers = [];
    var E = { io: function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: function (k) { return 1 - Math.pow(1 - k, 3); }, oe: function (k) { return 1 - Math.pow(1 - k, 5); }, so: function (k) { var p = 1 - Math.pow(1 - k, 3); return p < 1 ? p + .04 * Math.sin(k * Math.PI) : 1; } };
    function wpill() { return clamp(root.clientWidth - 32, 260, 560); }
    var V = { w: wpill(), h: 60, r: 30, cs: 1, y: IDLE_Y, oPill: 1, oAur: 1, oInput: 1, inScale: 1, oBall: 0, oGreen: 0, gs: .55, oHalo: 0, oCard: 0, oRing: 1, oGlow: 1, bloom: 1, hOp: 0, dotS: 0, oCenter: 0, orbA: 0, orbS: .6, spread: 0, gmix: 0, sOp: 0, sTy: 6, trK: 0, pK: 0, wr: 0 };
    var words = [], shown = 0;
    var CSSV = ['oPill', 'oAur', 'oInput', 'inScale', 'oBall', 'oGreen', 'gs', 'oHalo', 'oCard', 'oRing', 'oGlow', 'bloom', 'hOp', 'dotS'];
    function ballY(k) { return IDLE_Y * (1 - E.out(clamp(k, 0, 1))); }
    function apply() {
      var s = actor.style;
      s.setProperty('--w', V.w + 'px'); s.setProperty('--h', V.h + 'px'); s.setProperty('--r', V.r + 'px'); s.setProperty('--cs', V.cs);
      CSSV.forEach(function (k) { s.setProperty('--' + k, V[k]); });
      root.style.setProperty('--oCenter', V.oCenter); root.style.setProperty('--sOp', V.sOp); root.style.setProperty('--sTy', V.sTy);
      mover.style.transform = 'translateY(' + V.y + 'px)';
      cvs.style.opacity = RM ? 0 : V.orbA; cvs.style.transform = 'translate(-50%,-50%) scale(' + V.orbS + ')';
      pulseEl.style.opacity = V.pK > 0 && V.pK < 1 ? .8 * (1 - V.pK) : 0; pulseEl.style.transform = 'scale(' + (1 + V.pK * 3.5) + ')';
      trails.forEach(function (tr, i) {
        var on = V.trK > 0 && V.trK < 1, rel = ballY(V.trK - .08 * (i + 1)) - V.y;
        tr.style.opacity = on ? .45 * (1 - i / 6) * Math.sin(Math.PI * V.trK) : 0;
        tr.style.transform = 'translate(-50%,-50%) translateY(' + rel + 'px) scale(' + (.5 - i * .06) + ')';
      });
      var n = Math.floor(V.wr * words.length + .001);
      while (shown < n) { words[shown].style.opacity = 1; shown++; }
    }
    function anim(to, ms, ease, sig) {
      var from = {}, keys = Object.keys(to); keys.forEach(function (k) { from[k] = V[k]; });
      return new Promise(function (res, rej) {
        if (RM) { keys.forEach(function (k) { V[k] = to[k]; }); apply(); return res(); }
        var t0 = performance.now();
        (function f(now) {
          if (sig && sig.aborted) return rej(ABORT);
          var k = clamp((now - t0) / ms, 0, 1), e = (ease || E.io)(k);
          keys.forEach(function (key) { V[key] = from[key] + (to[key] - from[key]) * e; });
          apply();
          if (k < 1) requestAnimationFrame(f); else res();
        })(t0);
      });
    }
    function wait(ms, sig) {
      return new Promise(function (res, rej) {
        var id = setTimeout(res, RM ? Math.min(ms, 200) : ms); timers.push(id);
        if (sig) sig.addEventListener('abort', function () { clearTimeout(id); rej(ABORT); }, { once: true });
      });
    }
    function abortable(p, sig) { return new Promise(function (res, rej) { p.then(res, rej); sig.addEventListener('abort', function () { rej(ABORT); }, { once: true }); }); }
    function setPhase(p) { phase = p; root.dataset.phase = p; }
    var curLab = null;
    function setStatus(html, cls) {
      var n = el('span', 'mo-lab mo-in' + (cls ? ' ' + cls : ''), html), old = curLab; curLab = n; status.appendChild(n);
      if (old) { old.className = 'mo-lab mo-out'; setTimeout(function () { old.remove(); }, 320); }
    }
    function clearStatus() { status.innerHTML = ''; curLab = null; }

    /* dotted sphere */
    var dpr = Math.min(window.devicePixelRatio || 1, 2), SZ = 220, NP = mob ? 380 : 620, NB = 12, cx2 = cvs.getContext('2d');
    cvs.width = cvs.height = Math.round(SZ * dpr);
    var PX = new Float32Array(NP), PY = new Float32Array(NP), PZ = new Float32Array(NP), bx = [], bc = new Int32Array(NB);
    for (var q = 0; q < NP; q++) { var yy = 1 - 2 * (q + .5) / NP, rr = Math.sqrt(1 - yy * yy), th = q * 2.399963; PX[q] = Math.cos(th) * rr; PY[q] = yy; PZ[q] = Math.sin(th) * rr; }
    for (q = 0; q < NB; q++) bx.push(new Float32Array(NP * 3));
    function draw(now) {
      cx2.setTransform(dpr, 0, 0, dpr, 0, 0); cx2.clearRect(0, 0, SZ, SZ);
      var R = SZ * .34, c = SZ / 2, ay = now * .00055, ax = .35, cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax), rad = R * (1 + V.spread * 1.4), amp = (V.bloom - 1) + .45, i, b;
      for (b = 0; b < NB; b++) bc[b] = 0;
      for (i = 0; i < NP; i++) {
        var x1 = PX[i] * cY + PZ[i] * sY, z1 = -PX[i] * sY + PZ[i] * cY, y2 = PY[i] * cX - z1 * sX, z2 = PY[i] * sX + z1 * cX;
        var d = (z2 + 1) / 2, bk = Math.min(NB - 1, Math.floor(d * NB)), w = .5 + .5 * Math.sin(PY[i] * 5 - now * .004), sz = (.6 + d * 1.3) * (1 + .7 * w * amp), o = bc[bk]++ * 3, a = bx[bk];
        a[o] = c + x1 * rad; a[o + 1] = c + y2 * rad; a[o + 2] = sz;
      }
      var cr = Math.round(90 + (69 - 90) * V.gmix), cg = Math.round(209 + (224 - 209) * V.gmix), cb = Math.round(245 + (160 - 245) * V.gmix);
      for (b = 0; b < NB; b++) {
        if (!bc[b]) continue;
        cx2.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + ((.15 + .85 * b / (NB - 1)) * (1 - V.spread * .4)).toFixed(3) + ')';
        cx2.beginPath(); var arr = bx[b];
        for (i = 0; i < bc[b]; i++) { cx2.moveTo(arr[i * 3] + arr[i * 3 + 2], arr[i * 3 + 1]); cx2.arc(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2], 0, 6.2832); }
        cx2.fill();
      }
    }
    var raf = 0;
    function loop(now) { raf = requestAnimationFrame(loop); if (!document.hidden) draw(now); }
    function startOrb() { if (!raf && !RM) raf = requestAnimationFrame(loop); }
    function stopOrb() { cancelAnimationFrame(raf); raf = 0; cx2.setTransform(1, 0, 0, 1, 0, 0); cx2.clearRect(0, 0, cvs.width, cvs.height); }

    function setBody(text) {
      body.textContent = ''; words = []; shown = 0; V.wr = 0;
      text.replace(/[*#`]/g, '').split(/\s+/).filter(Boolean).forEach(function (tok) {
        var s = el('span', 'mo-w'); s.textContent = tok; s.style.transition = 'opacity .35s'; body.appendChild(s); body.appendChild(document.createTextNode(' ')); words.push(s);
      });
    }
    function measure(w) {
      var wrap = el('div'), m = el('div', 'mo-answer'); wrap.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
      m.style.cssText = 'position:static;inset:auto;height:auto;opacity:1;box-sizing:border-box;width:' + w + 'px'; m.innerHTML = ansEl.innerHTML;
      wrap.appendChild(m); root.appendChild(wrap); var h = m.offsetHeight; wrap.remove(); return h;
    }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    async function toIdle(keep) {
      setPhase('reset'); ctrl = null; clearTimers(); stopOrb(); clearStatus();
      await anim({ hOp: 0, dotS: 0 }, 180, E.out);
      await Promise.all([
        anim({ w: wpill(), h: 60, r: 30, y: IDLE_Y, cs: 1, oCard: 0, oGreen: 0, oHalo: 0, oBall: 0, orbA: 0, oCenter: 0, oPill: 1, oAur: 1, oRing: 1, oGlow: 1, bloom: 1, gmix: 0, sOp: 0, sTy: 6, spread: 0, pK: 0, trK: 0, orbS: .6, gs: .55 }, 520, E.io),
        anim({ oInput: 1, inScale: 1 }, 360, E.out)
      ]);
      body.textContent = ''; words = []; shown = 0; ansEl.style.overflowY = ''; live.textContent = ''; $('#rel').innerHTML = '';
      if (!keep) { field.value = ''; send.removeAttribute('data-ready'); }
      setPhase('idle');
    }

    async function run(q) {
      if (phase !== 'idle') return;
      ctrl = new AbortController(); var sig = ctrl.signal; field.blur(); live.textContent = '';
      logMsg('user', q); field.value = ''; send.removeAttribute('data-ready');
      var pAns = answer(q).catch(function () { return local(q); });
      try {
        setPhase('launch'); V.trK = 0;
        await Promise.all([
          anim({ oInput: 0, inScale: .82 }, 220, E.out, sig),
          anim({ w: 64, h: 64, r: 32, oPill: 0, oAur: 0, oBall: 1, oGlow: 1.6, y: 0, trK: 1 }, 460, E.oe, sig)
        ]);
        V.trK = 0;
        setPhase('assemble'); startOrb(); V.orbS = .55; V.spread = 1; setStatus('READING YOUR QUESTION');
        await Promise.all([
          anim({ orbA: 1, orbS: 1, spread: 0, oCenter: 1, oBall: .4 }, 520, E.out, sig),
          anim({ sOp: 1, sTy: 0 }, 320, E.out, sig)
        ]);
        setPhase('think');
        timers.push(setTimeout(function () { if (phase === 'think') setStatus('THINKING<span class="mo-dots"><i></i><i></i><i></i></span>'); }, 650));
        var res = await Promise.all([abortable(pAns, sig), wait(800, sig)]), text = res[0];
        setPhase('resolve'); setStatus('GOT IT', 'mo-lab-done');
        await Promise.all([anim({ gmix: 1, bloom: 1.6 }, 260, E.out, sig), anim({ pK: 1 }, 420, E.out, sig)]);
        V.pK = 0;
        setPhase('condense');
        await anim({ orbS: .25, orbA: 0, oBall: 0, oCenter: 0, spread: 0, bloom: 1 }, 320, E.io, sig);
        stopOrb(); ctrl = null;
        logMsg('bot', text); live.textContent = text; showRel(q, text);
        clearStatus();
        await anim({ w: wpill(), h: 60, r: 30, y: IDLE_Y, cs: 1, oGreen: 0, oHalo: 0, oBall: 0, orbA: 0, oCenter: 0, oPill: 1, oAur: 1, oRing: 1, oGlow: 1, bloom: 1, gmix: 0, sOp: 0, sTy: 6, pK: 0, trK: 0, orbS: .6, gs: .55, oInput: 1, inScale: 1 }, 360, E.so);
        setPhase('idle');
        if (fine) field.focus({ preventScroll: true });
      } catch (e) {
        if (e !== ABORT) throw e;
        clearTimers(); await toIdle(true); $('#chatNote').textContent = 'Question cancelled. Your text is still in the box.';
      }
    }

    field.addEventListener('input', function () { if (field.value.trim()) send.setAttribute('data-ready', ''); else send.removeAttribute('data-ready'); });
    $('#moForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = field.value.trim();
      if (!q) { actor.setAttribute('data-shake', ''); setTimeout(function () { actor.removeAttribute('data-shake'); }, 300); field.focus(); return; }
      if (phase !== 'idle') return;
      run(q);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ctrl && ['launch', 'assemble', 'think', 'resolve', 'condense'].indexOf(phase) >= 0) ctrl.abort();
    });
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (phase === 'idle') { V.w = wpill(); apply(); }
      else if (phase === 'answered') { V.w = wpill(); V.h = clamp(measure(V.w) + 4, 96, 400); apply(); }
    }).observe(root);
    orbUI = {
      ask: async function (q) {
        if (phase !== 'idle') return;
        field.value = q; send.setAttribute('data-ready', '');
        root.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' });
        run(q);
      }
    };
    apply();
  })();

  askSuggest(); askNote();
  sbInit();
  route();
})();

