// Prepxa — free in-browser SAT practice. Reading & Writing (text) + Math (image-based).
(function () {
  "use strict";
  var app = document.getElementById("app");
  var SUBJECT = "rw";
  var DATA = { rw: null, math: null };
  var DIFFS = ["Easy", "Medium", "Hard"];
  var RW_ORDER = ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"];
  var MATH_ORDER = ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"];
  var PACE = { "Standard English Conventions": 22, "Expression of Ideas": 30, "Craft and Structure": 65, "Information and Ideas": 80,
               "Algebra": 75, "Advanced Math": 95, "Problem-Solving and Data Analysis": 90, "Geometry and Trigonometry": 95 };
  var DCOLOR = { "Information and Ideas": "#3B82F6", "Craft and Structure": "#8B5CF6", "Standard English Conventions": "#10B981", "Expression of Ideas": "#F59E0B",
                 "Algebra": "#3B82F6", "Advanced Math": "#8B5CF6", "Problem-Solving and Data Analysis": "#10B981", "Geometry and Trigonometry": "#F59E0B" };
  var FCOLOR = { Easy: "#34D399", Medium: "#F59E0B", Hard: "#F87171" };

  var tick = null;
  function clearTick() { if (tick) { clearInterval(tick); tick = null; } }
  function fmt(s) { return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function byId(id) { return document.getElementById(id); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }

  function load(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch (e) { return new Set(); } }
  function sv(k, s) { localStorage.setItem(k, JSON.stringify(Array.from(s))); }
  var attempted = load("prepxa_attempted"), correct = load("prepxa_correct"), marked = load("prepxa_marked");
  function record(id, ok) { attempted.add(id); if (ok) correct.add(id); else correct.delete(id); sv("prepxa_attempted", attempted); sv("prepxa_correct", correct); }
  function toggleMark(id) { if (marked.has(id)) marked.delete(id); else marked.add(id); sv("prepxa_marked", marked); }
  function wrongSet() { var s = new Set(); attempted.forEach(function (id) { if (!correct.has(id)) s.add(id); }); return s; }

  function buildSubject(arr, order) {
    var s = { all: arr, domains: [], skills: {}, dcount: {}, scount: {} }, present = {};
    arr.forEach(function (q) {
      present[q.domain] = 1; s.dcount[q.domain] = (s.dcount[q.domain] || 0) + 1;
      if (!s.skills[q.domain]) s.skills[q.domain] = [];
      if (s.skills[q.domain].indexOf(q.skill) < 0) s.skills[q.domain].push(q.skill);
      s.scount[q.domain + "||" + q.skill] = (s.scount[q.domain + "||" + q.skill] || 0) + 1;
    });
    s.domains = order.filter(function (x) { return present[x]; });
    return s;
  }

  Promise.all([
    fetch("data/sat-questions.json").then(function (r) { return r.json(); }),
    fetch("data/math-questions.json").then(function (r) { return r.json(); }).catch(function () { return []; })
  ]).then(function (res) {
    res[0].forEach(function (q) { q.subject = "rw"; });
    res[1].forEach(function (q) { q.subject = "math"; q.img = true; });
    DATA.rw = buildSubject(res[0], RW_ORDER);
    DATA.math = buildSubject(res[1], MATH_ORDER);
    renderHome();
  }).catch(function () { app.innerHTML = '<p class="sub">Couldn’t load questions. Please refresh.</p>'; });

  function S() { return DATA[SUBJECT]; }
  function allSkills() { var o = []; S().domains.forEach(function (d) { S().skills[d].forEach(function (x) { o.push(SUBJECT + "::" + x); }); }); return o; }

  // ================= HOME =================
  function renderHome() {
    clearTick();
    var w = wrongSet();
    app.innerHTML =
      '<span class="kicker">Free practice</span>' +
      '<h1>Digital SAT practice</h1>' +
      '<p class="sub">' + (DATA.rw.all.length + DATA.math.all.length) + ' official-style questions · no sign-up, free. Progress saves on this device.</p>' +
      subjectToggle() +
      '<div class="card" style="display:flex;gap:0;margin:0 0 18px;text-align:center">' +
        stat(attempted.size, "Attempted", "var(--text)") + dv() + stat(correct.size, "Correct", "var(--success)") +
        dv() + stat(w.size, "Wrong", "var(--error)") + dv() + stat(marked.size, "Marked", "var(--amber)") + '</div>' +
      modeCard("bank", "📖", "rgba(79,70,229,.16)", "#818CF8", "Question Bank",
        "Choose domains, subdomains, difficulty, and order. Instant feedback and a per-question timer.") +
      modeCard("module", "⏱️", "rgba(245,158,11,.16)", "#F59E0B", "Module Test",
        SUBJECT === "rw" ? "Timed: 27 questions in 32 minutes, then a score report." : "Timed: 22 questions in 35 minutes, then a score report.") +
      (w.size ? rev("redo", "↺", "#F87171", "Redo wrong answers", w.size) : "") +
      (marked.size ? rev("mk", "★", "#F59E0B", "Marked for review", marked.size) : "");
    byId("sub-rw").onclick = function () { SUBJECT = "rw"; cfg.skills = null; cfg.expanded = null; renderHome(); };
    byId("sub-math").onclick = function () { SUBJECT = "math"; cfg.skills = null; cfg.expanded = null; renderHome(); };
    byId("m-bank").onclick = renderBankSetup;
    byId("m-module").onclick = startModuleForSubject;
    if (byId("rv-redo")) byId("rv-redo").onclick = function () { startList(allQ().filter(function (q) { return w.has(q.id); })); };
    if (byId("rv-mk")) byId("rv-mk").onclick = function () { startList(allQ().filter(function (q) { return marked.has(q.id); })); };
  }
  function allQ() { return DATA.rw.all.concat(DATA.math.all); }
  function subjectToggle() {
    return '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<button id="sub-rw" class="seg' + (SUBJECT === "rw" ? " on" : "") + '">Reading &amp; Writing</button>' +
      '<button id="sub-math" class="seg' + (SUBJECT === "math" ? " on" : "") + '">Math</button></div>';
  }
  function stat(v, l, c) { return '<div style="flex:1"><div style="font-family:var(--head);font-size:22px;font-weight:800;color:' + c + '">' + v + '</div><div style="font-size:12px;color:var(--muted)">' + l + '</div></div>'; }
  function dv() { return '<div style="width:1px;background:var(--border);margin:4px 0"></div>'; }
  function modeCard(id, icon, bg, fg, title, sub) {
    return '<button class="card mode-card" id="m-' + id + '"><div class="mode-ic" style="background:' + bg + ';color:' + fg + '">' + icon + '</div><div><h2>' + title + '</h2><p style="color:var(--muted);font-size:14px;margin-top:4px">' + sub + '</p></div></button>';
  }
  function rev(id, icon, color, title, n) {
    return '<button class="card mode-card" id="rv-' + id + '" style="align-items:center"><div class="mode-ic" style="background:' + hexA(color, .16) + ';color:' + color + ';font-size:20px">' + icon + '</div><div style="flex:1"><h2 style="font-size:17px">' + title + '</h2></div><div style="color:' + color + ';font-weight:700">' + n + '</div></button>';
  }

  // ================= BANK SETUP =================
  var cfg = { skills: null, diffs: null, count: 15, shuffle: true, pace: "elapsed", expanded: null };
  function renderBankSetup() {
    clearTick();
    if (!cfg.skills) cfg.skills = new Set(allSkills());
    if (!cfg.diffs) cfg.diffs = new Set(DIFFS);
    if (!cfg.expanded) cfg.expanded = new Set(S().domains);
    var counts = [5, 10, 15, 25, 50, "All"];
    app.innerHTML = back("Question Bank · " + (SUBJECT === "rw" ? "Reading & Writing" : "Math")) +
      '<div class="section"><h3>Topics</h3>' + S().domains.map(domainCard).join("") + '</div>' +
      sect("Difficulty", DIFFS.map(function (x) { return chip("df", x, x, cfg.diffs.has(x), FCOLOR[x]); }).join("")) +
      sect("Number of questions", counts.map(function (c) { return chip("ct", c, c, String(cfg.count) === String(c), "#4F46E5"); }).join("")) +
      sect("Order", chip("or", "ordered", "In order", !cfg.shuffle, "#4F46E5") + chip("or", "shuffle", "Shuffle", cfg.shuffle, "#4F46E5")) +
      sect("Timer", chip("tm", "off", "Off", cfg.pace === "off", "#4F46E5") + chip("tm", "elapsed", "Elapsed", cfg.pace === "elapsed", "#4F46E5") + chip("tm", "pace", "1500+ Pace", cfg.pace === "pace", "#F59E0B")) +
      '<button class="btn" id="start"></button>';
    wireTable(); wireChips(); updateStart();
    byId("start").onclick = startBank;
  }
  function domainCard(domain) {
    var color = DCOLOR[domain] || "#4F46E5", skills = S().skills[domain] || [];
    var on = skills.filter(function (s) { return cfg.skills.has(SUBJECT + "::" + s); }).length;
    var state = on === skills.length ? "on" : (on ? "partial" : "off");
    var open = cfg.expanded.has(domain);
    var rows = open ? skills.map(function (s) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-top:1px solid var(--border)">' +
        cbx(cfg.skills.has(SUBJECT + "::" + s) ? "on" : "off", color, "sk", s) +
        '<span style="flex:1">' + s + '</span><span style="color:var(--muted);font-size:13px">' + (S().scount[domain + "||" + s] || 0) + 'q</span></div>';
    }).join("") : "";
    return '<div style="border:1.5px solid ' + hexA(color, .45) + ';border-radius:14px;overflow:hidden;margin-bottom:12px;background:var(--surface)">' +
      '<div style="display:flex;align-items:center;gap:10px;padding:13px 14px">' + cbx(state, color, "dm", domain) +
      '<span style="font-family:var(--head);font-weight:700">' + domain + '</span><span style="flex:1"></span>' +
      '<span class="badge" style="background:' + hexA(color, .14) + ';color:' + color + '">' + S().dcount[domain] + 'q</span>' +
      '<button data-exp="' + encodeURIComponent(domain) + '" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:4px 6px">' + (open ? "▲" : "▼") + '</button></div>' + rows + '</div>';
  }
  function cbx(state, color, group, val) {
    var inner = state === "on" ? "✓" : (state === "partial" ? "–" : "");
    return '<button class="cbx" data-g="' + group + '" data-v="' + encodeURIComponent(val) + '" style="width:22px;height:22px;border-radius:6px;border:1.5px solid ' + (state === "off" ? "var(--border)" : color) + ';background:' + (state === "off" ? "transparent" : color) + ';color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:0 0 auto">' + inner + '</button>';
  }
  function wireTable() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-exp]"), function (b) {
      b.onclick = function () { var dm = decodeURIComponent(b.dataset.exp); if (cfg.expanded.has(dm)) cfg.expanded.delete(dm); else cfg.expanded.add(dm); renderBankSetup(); };
    });
    Array.prototype.forEach.call(document.querySelectorAll(".cbx"), function (b) {
      b.onclick = function () {
        var g = b.dataset.g, v = decodeURIComponent(b.dataset.v);
        if (g === "sk") { var k = SUBJECT + "::" + v; if (cfg.skills.has(k)) cfg.skills.delete(k); else cfg.skills.add(k); }
        else { var sk = S().skills[v] || [], allOn = sk.every(function (s) { return cfg.skills.has(SUBJECT + "::" + s); }); sk.forEach(function (s) { var k = SUBJECT + "::" + s; if (allOn) cfg.skills.delete(k); else cfg.skills.add(k); }); }
        renderBankSetup();
      };
    });
  }
  function poolNow() { return S().all.filter(function (q) { return cfg.skills.has(SUBJECT + "::" + q.skill) && cfg.diffs.has(q.difficulty); }); }
  function selectionNow() { var p = poolNow(); if (cfg.shuffle) p = shuffle(p.slice()); var n = cfg.count === "All" ? p.length : Math.min(cfg.count, p.length); return p.slice(0, n); }
  function updateStart() { var n = selectionNow().length, b = byId("start"); b.textContent = n ? "Start — " + n + " questions" : "No questions match"; b.disabled = !n; }
  function wireChips() {
    Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (el) {
      el.onclick = function () {
        var g = el.dataset.g, v = el.dataset.v;
        if (g === "df") { if (cfg.diffs.has(v)) { if (cfg.diffs.size > 1) cfg.diffs.delete(v); } else cfg.diffs.add(v); }
        else if (g === "ct") cfg.count = (v === "All" ? "All" : parseInt(v, 10));
        else if (g === "or") cfg.shuffle = (v === "shuffle");
        else if (g === "tm") cfg.pace = v;
        renderBankSetup();
      };
    });
  }

  // ================= BANK PRACTICE =================
  var q = [], qi = 0, ans = {}, revealed = {}, elim = {}, elapsed = 0;
  function startBank() { startList(selectionNow()); }
  function startList(list) { if (!list.length) return; q = list; qi = 0; ans = {}; revealed = {}; elim = {}; renderBank(); }
  function renderBank() {
    clearTick(); elapsed = 0;
    var cur = q[qi], rev = revealed[cur.id], dc = DCOLOR[cur.domain] || "#4F46E5", paceTarget = PACE[cur.domain] || 60;
    app.innerHTML =
      '<div class="bar"><i style="width:' + ((qi + 1) / q.length * 100) + '%"></i></div>' +
      '<div class="toolbar">' + (cfg.pace !== "off" ? '<span id="tmr" class="timer">0:00</span>' : '<span>Question ' + (qi + 1) + ' / ' + q.length + '</span>') +
        '<button id="markbtn" style="background:none;border:1px solid var(--border);border-radius:8px;padding:6px 12px;color:' + (marked.has(cur.id) ? "var(--amber)" : "var(--muted)") + ';cursor:pointer;font-size:13px">' + (marked.has(cur.id) ? "★ Marked" : "☆ Mark") + '</button></div>' +
      '<div class="meta">' + badge(cur.domain, dc, true) + badge(cur.skill, dc, false) + badge(cur.difficulty, FCOLOR[cur.difficulty], false) + '</div>' +
      bodyHTML(cur, rev) + '<div class="actions" id="acts"></div>';
    renderActions(cur, rev);
    byId("markbtn").onclick = function () { toggleMark(cur.id); renderBank(); };
    if (cfg.pace !== "off" && !rev) tick = setInterval(function () { elapsed++; var t = byId("tmr"); if (!t) return; t.textContent = fmt(elapsed) + (cfg.pace === "pace" ? " / " + fmt(paceTarget) : ""); t.className = "timer" + (cfg.pace === "pace" && elapsed > paceTarget ? " over" : ""); }, 1000);
  }
  function bodyHTML(cur, rev) {
    if (cur.img) {
      var h = '<img class="qimg" src="data/math/' + cur.id + '_q.png" alt="question">';
      if (cur.type === "mcq") h += '<div id="choices">' + ["A", "B", "C", "D"].map(function (l) {
        var cls = "choice", sel = ans[cur.id] === l;
        if (rev) { if (l === cur.correct) cls += " correct"; else if (sel) cls += " wrong"; } else if (sel) cls += " sel";
        return '<div class="' + cls + '" data-l="' + l + '" style="justify-content:center"><div class="ltr">' + l + '</div></div>';
      }).join("") + '</div>';
      else h += '<p class="sub" style="font-size:13px">Student-response question — work it out, then reveal the answer.</p>';
      if (rev) h += '<img class="qimg" src="data/math/' + cur.id + '_r.png" alt="answer and rationale" style="margin-top:14px">';
      return h;
    }
    var t = (cur.passage ? '<div class="passage">' + cur.passage + '</div>' : '') + '<div class="stem">' + cur.question + '</div>';
    t += '<div id="choices">' + ["A", "B", "C", "D"].filter(function (l) { return cur.choices[l] != null; }).map(function (l) {
      var cls = "choice", sel = ans[cur.id] === l, isE = (elim[cur.id] || {})[l];
      if (rev) { if (l === cur.correct) cls += " correct"; else if (sel) cls += " wrong"; } else if (sel) cls += " sel";
      if (isE && !rev) cls += " eliminated";
      return '<div class="' + cls + '" data-l="' + l + '"><div class="ltr">' + l + '</div><div class="ctext">' + cur.choices[l] + '</div>' + (!rev ? '<button class="elim" data-elim="' + l + '">' + (isE ? "↩" : "✕") + '</button>' : '') + '</div>';
    }).join("") + '</div>';
    if (rev) { var ok = ans[cur.id] === cur.correct; t += '<div class="rationale"><div style="font-family:var(--head);font-weight:700;color:' + (ok ? "var(--success)" : "var(--text)") + ';margin-bottom:8px">' + (ok ? "✓ Correct" : "Answer: " + cur.correct) + ' · ' + cur.skill + '</div>' + cur.rationale + '</div>'; }
    return t;
  }
  function renderActions(cur, rev) {
    var acts = byId("acts"); var spr = cur.img && cur.type === "spr";
    acts.innerHTML = (qi > 0 ? '<button class="btn ghost sm" id="prev">←</button>' : '') +
      (rev ? '<button class="btn" id="next">' + (qi < q.length - 1 ? "Next question" : "Finish") + '</button>'
           : (spr ? '<button class="btn" id="reveal">Show answer</button>' : '<button class="btn" id="check" disabled>Check answer</button>'));
    if (!rev) wireChoices(cur);
    if (byId("prev")) byId("prev").onclick = function () { qi--; renderBank(); };
    if (byId("check")) byId("check").onclick = function () { revealed[cur.id] = true; record(cur.id, ans[cur.id] === cur.correct); renderBank(); };
    if (byId("reveal")) byId("reveal").onclick = function () { revealed[cur.id] = true; attempted.add(cur.id); sv("prepxa_attempted", attempted); renderBank(); };
    if (byId("next")) byId("next").onclick = function () { if (qi < q.length - 1) { qi++; renderBank(); } else renderHome(); };
  }
  function wireChoices(cur) {
    Array.prototype.forEach.call(document.querySelectorAll("#choices .choice"), function (el) {
      var l = el.dataset.l;
      el.onclick = function (e) {
        if (revealed[cur.id]) return;
        if (e.target.dataset.elim) { var m = elim[cur.id] = elim[cur.id] || {}; if (m[l]) delete m[l]; else { m[l] = 1; if (ans[cur.id] === l) delete ans[cur.id]; } renderBank(); return; }
        if ((elim[cur.id] || {})[l]) return;
        ans[cur.id] = l; var c = byId("check"); if (c) c.disabled = false; renderBank();
      };
    });
  }

  // ================= MODULE =================
  var mq = [], mi = 0, mans = {}, remaining = 0, mDur = 0;
  function startModuleForSubject() { var n = SUBJECT === "rw" ? 27 : 22, dur = (SUBJECT === "rw" ? 32 : 35) * 60; startModule(n, dur); }
  function startModule(n, dur) {
    mq = shuffle(S().all.slice()).slice(0, n); mi = 0; mans = {}; remaining = dur; mDur = dur; renderModule();
    tick = setInterval(function () { remaining--; var t = byId("mtmr"); if (t) { t.textContent = fmt(remaining); t.className = "timer" + (remaining <= 60 ? " over" : ""); } if (remaining <= 0) submitModule(); }, 1000);
  }
  function renderModule() {
    var cur = mq[mi];
    var body = cur.img ? '<img class="qimg" src="data/math/' + cur.id + '_q.png" alt="question">' +
        (cur.type === "mcq" ? '<div id="choices">' + ["A", "B", "C", "D"].map(function (l) { return '<div class="choice' + (mans[cur.id] === l ? " sel" : "") + '" data-l="' + l + '" style="justify-content:center"><div class="ltr">' + l + '</div></div>'; }).join("") + '</div>' : '<p class="sub" style="font-size:13px">Student-response — answer mentally.</p>')
      : (cur.passage ? '<div class="passage">' + cur.passage + '</div>' : '') + '<div class="stem">' + cur.question + '</div>' +
        '<div id="choices">' + ["A", "B", "C", "D"].filter(function (l) { return cur.choices[l] != null; }).map(function (l) { return '<div class="choice' + (mans[cur.id] === l ? " sel" : "") + '" data-l="' + l + '"><div class="ltr">' + l + '</div><div class="ctext">' + cur.choices[l] + '</div></div>'; }).join("") + '</div>';
    app.innerHTML =
      '<div class="toolbar"><span>Q ' + (mi + 1) + ' / ' + mq.length + '</span><span id="mtmr" class="timer">' + fmt(remaining) + '</span>' +
        '<button id="mmark" style="background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:' + (marked.has(cur.id) ? "var(--amber)" : "var(--muted)") + ';cursor:pointer;font-size:13px">' + (marked.has(cur.id) ? "★" : "☆") + ' Mark</button>' +
        '<button id="msub" style="background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--indigo-bright);cursor:pointer;font-size:13px">Submit</button></div>' +
      '<div class="bar"><i style="width:' + ((mi + 1) / mq.length * 100) + '%"></i></div>' + body +
      '<div class="actions">' + (mi > 0 ? '<button class="btn ghost sm" id="mprev">←</button>' : '') + '<button class="btn" id="mnext">' + (mi < mq.length - 1 ? "Next" : "Review &amp; submit") + '</button></div>' +
      '<div class="qmap-label">Question map</div><div class="qmap">' + mq.map(function (qq, i) {
        var st = i === mi ? " cur" : (marked.has(qq.id) ? " mk" : (mans[qq.id] ? " ans" : ""));
        return '<button class="qcell' + st + '" data-i="' + i + '">' + (i + 1) + '</button>';
      }).join("") + '</div>';
    Array.prototype.forEach.call(document.querySelectorAll("#choices .choice"), function (el) { el.onclick = function () { mans[cur.id] = el.dataset.l; renderModule(); }; });
    Array.prototype.forEach.call(document.querySelectorAll(".qcell"), function (el) { el.onclick = function () { mi = parseInt(el.dataset.i, 10); renderModule(); }; });
    byId("mmark").onclick = function () { toggleMark(cur.id); renderModule(); };
    if (byId("mprev")) byId("mprev").onclick = function () { mi--; renderModule(); };
    byId("mnext").onclick = function () { if (mi < mq.length - 1) { mi++; renderModule(); } else confirmSubmit(); };
    byId("msub").onclick = confirmSubmit;
  }
  function confirmSubmit() { var n = Object.keys(mans).length; if (n < mq.length && !confirm("Answered " + n + " of " + mq.length + ". Unanswered count as incorrect. Submit?")) return; submitModule(); }
  function submitModule() { clearTick(); mq.forEach(function (qq) { if (mans[qq.id]) record(qq.id, mans[qq.id] === qq.correct); }); renderSummary(); }
  function renderSummary() {
    var gradable = mq.filter(function (qq) { return !(qq.img && qq.type === "spr"); });
    var ok = gradable.filter(function (qq) { return mans[qq.id] === qq.correct; }).length;
    var pct = gradable.length ? Math.round(ok / gradable.length * 100) : 0, used = mDur - remaining, bySkill = {};
    gradable.forEach(function (qq) { if (mans[qq.id] !== qq.correct) bySkill[qq.skill] = (bySkill[qq.skill] || 0) + 1; });
    var topics = Object.keys(bySkill).map(function (k) { return [k, bySkill[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    app.innerHTML = '<span class="kicker">Score report</span>' +
      '<div class="card" style="text-align:center;margin-bottom:18px"><div class="score-big">' + pct + '%</div><div style="font-family:var(--head);font-weight:700;margin-top:6px">' + ok + ' of ' + gradable.length + ' correct</div><div class="sub" style="margin:6px 0 0">' + (SUBJECT === "rw" ? "Reading & Writing" : "Math") + ' · ' + fmt(used) + ' used</div></div>' +
      (topics.length ? '<div class="card" style="margin-bottom:18px"><h3 style="font-family:var(--head);margin-bottom:8px">Topics to review</h3>' + topics.slice(0, 6).map(function (t) { return '<div class="topic"><span style="color:var(--amber)">⚠</span><span style="flex:1">' + t[0] + '</span><span style="color:var(--error);font-weight:600;font-size:14px">' + t[1] + ' missed</span></div>'; }).join("") + '</div>' : '') +
      '<h2 style="margin-bottom:12px">Review</h2>' + mq.map(function (qq, i) { return reviewItem(qq, i + 1); }).join("") +
      '<button class="btn" style="margin-top:16px" id="done">Done</button>';
    byId("done").onclick = renderHome;
  }
  function reviewItem(qq, n) {
    var chosen = mans[qq.id], spr = qq.img && qq.type === "spr", ok = chosen === qq.correct;
    var icon = spr ? '<span style="color:var(--muted)">•</span>' : (ok ? '<span style="color:var(--success)">✓</span>' : (chosen ? '<span style="color:var(--error)">✕</span>' : '<span style="color:var(--muted)">–</span>'));
    var inner;
    if (qq.img) inner = '<img class="qimg" src="data/math/' + qq.id + '_q.png"><img class="qimg" src="data/math/' + qq.id + '_r.png" style="margin-top:10px">';
    else {
      var ch = ["A", "B", "C", "D"].filter(function (l) { return qq.choices[l] != null; }).map(function (l) { var col = l === qq.correct ? "var(--success)" : (l === chosen ? "var(--error)" : "var(--muted)"); return '<div style="color:' + col + ';margin-bottom:4px"><b>' + l + '.</b> ' + qq.choices[l] + '</div>'; }).join("");
      inner = (qq.passage ? '<div class="passage" style="font-size:14px">' + qq.passage + '</div>' : '') + '<div class="stem" style="font-size:15px">' + qq.question + '</div>' + ch + '<div class="rationale" style="margin-top:10px">' + qq.rationale + '</div>';
    }
    return '<details class="review"><summary>' + icon + '<span style="flex:1"><b style="font-weight:600">Q' + n + '</b> · ' + qq.skill + ' · ' + qq.difficulty + '</span>' + (spr ? '' : '<span style="color:var(--muted);font-size:13px">You: ' + (chosen || "–") + ' / Ans: ' + qq.correct + '</span>') + '</summary><div class="body">' + inner + '</div></details>';
  }

  // ---- shared ----
  function back(title) {
    var h = '<button class="back" id="home-link" style="background:none;border:none;color:var(--muted);font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;margin-bottom:14px">← Home</button><h1 style="font-size:24px;margin-bottom:18px">' + title + '</h1>';
    setTimeout(function () { var b = byId("home-link"); if (b) b.onclick = renderHome; }, 0);
    return h;
  }
  function sect(t, inner) { return '<div class="section"><h3>' + t + '</h3><div class="chips">' + inner + '</div></div>'; }
  function chip(g, v, label, on, color) { return '<button class="chip' + (on ? " on" : "") + '" data-g="' + g + '" data-v="' + v + '"' + (on ? ' style="background:' + color + '"' : '') + '>' + label + '</button>'; }
  function badge(text, color, filled) { return '<span class="badge" style="' + (filled ? "background:" + color + ";color:#fff" : "background:" + hexA(color, .15) + ";color:" + color) + '">' + text + '</span>'; }
})();
