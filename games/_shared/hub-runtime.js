/* =============================================================================
 * hub-runtime.js - shared runtime for the classic games
 *
 * Every classic game (Snakes & Ladders, Ludo, ...) is a small "engine" in its own
 * folder. This file holds everything they share, so nothing is duplicated:
 * sounds, the scoreboard bar, touch controls, confetti, the setup screen and
 * the play screen.
 *
 * It runs in two modes:
 *   STANDALONE - you open games/<id>/index.html yourself. A setup screen lets you
 *                pick 1-4 players, names and difficulty.
 *   EMBEDDED   - PLAYZONE shows the game in a sandboxed iframe and tells it who is
 *                playing. Scores and the winner are sent back through playzone-sdk.js.
 *
 * Engines are copied from the original single-file game hub unchanged.
 * ========================================================================== */
(function (root) {
  var Hub = { ENGINES: null };
  root.Hub = Hub;

  // Small settings storage. Inside the sandboxed iframe localStorage is not
  // allowed, so the settings (sound volume) go through PLAYZONE instead.
  var store = {
    get: function (k) {
      if (root.PlayZone && PlayZone.embedded) return PlayZone.getPref(k);
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      if (root.PlayZone && PlayZone.embedded) { PlayZone.setPref(k, v); return; }
      try { localStorage.setItem(k, v); } catch (e) {}
    }
  };

  var SHAPES = [
    '<circle cx="12" cy="12" r="9"/>',
    '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/>',
    '<path d="M12 3L22 20H2Z" stroke-linejoin="round"/>',
    '<path d="M12 2L22 12L12 22L2 12Z"/>',
    '<path d="M12 2.5L20.5 7.25V16.75L12 21.5L3.5 16.75V7.25Z"/>'
  ];


  // ---------- sound (synthesised, no files) ----------
  var GLOW = 0.28;
  var SFX = (function () {
    var ac = null, master = null, vol = 0.6, muted = false, lastT = {}, nbuf = null;
    try { var sv = JSON.parse(store.get("mg-sound") || "{}"); if (typeof sv.v === "number") vol = Math.max(0, Math.min(1, sv.v)); muted = !!sv.m; } catch (e) {}
    function save() { store.set("mg-sound", JSON.stringify({ v: vol, m: muted })); }
    function apply() { if (master) master.gain.value = muted ? 0 : vol * vol * 0.9; }
    function ctx() {
      if (!ac) {
        try {
          var A = window.AudioContext || window.webkitAudioContext; ac = new A(); master = ac.createGain(); master.connect(ac.destination); apply();
          nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { ac = null; }
      }
      if (ac && ac.state === "suspended") { try { ac.resume(); } catch (e) {} }
      return ac;
    }
    function tone(f, d, type, g, to, delay) {
      var a = ctx(); if (!a) return;
      var t = a.currentTime + (delay || 0), o = a.createOscillator(), gn = a.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + d);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, g || 0.2), t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn); gn.connect(master); o.start(t); o.stop(t + d + 0.03);
    }
    function noise(d, g, fc, q, type, delay) {
      var a = ctx(); if (!a || !nbuf) return;
      var t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain();
      s.buffer = nbuf; f.type = type || "lowpass"; f.frequency.value = fc || 1200; f.Q.value = q || 0.7;
      gn.gain.setValueAtTime(Math.max(0.0002, g || 0.2), t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f); f.connect(gn); gn.connect(master); s.start(t); s.stop(t + d + 0.03);
    }
    var L = {
      click: function () { tone(620, 0.05, "triangle", 0.12, 480); },
      tick: function () { tone(900, 0.03, "square", 0.05); },
      flip: function () { noise(0.07, 0.12, 2500, 1, "bandpass"); tone(380, 0.05, "triangle", 0.07); },
      good: function () { tone(660, 0.12, "sine", 0.18); tone(880, 0.16, "sine", 0.18, 0, 0.09); },
      bad: function () { tone(220, 0.22, "sawtooth", 0.1, 140); },
      score: function () { tone(740, 0.08, "triangle", 0.14); tone(988, 0.1, "triangle", 0.12, 0, 0.06); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, k) { tone(f, 0.28, "triangle", 0.18, 0, k * 0.13); }); },
      lose: function () { [392, 330, 262].forEach(function (f, k) { tone(f, 0.3, "triangle", 0.15, 0, k * 0.16); }); },
      roll: function () { for (var k = 0; k < 6; k++) noise(0.035, 0.1, 1800 + k * 150, 2, "bandpass", k * 0.06); },
      step: function () { tone(520, 0.05, "triangle", 0.09); },
      ladder: function () { [392, 494, 587, 784].forEach(function (f, k) { tone(f, 0.12, "triangle", 0.15, 0, k * 0.07); }); },
      snake: function () { tone(520, 0.5, "sawtooth", 0.1, 120); noise(0.4, 0.06, 900, 1, "highpass"); },
      capture: function () { tone(300, 0.18, "square", 0.1, 110); },
      beep: function () { tone(520, 0.14, "sine", 0.18); },
      go: function () { tone(880, 0.3, "sine", 0.22); },
      thud: function (v) { v = v || 1; noise(0.09, 0.22 * v, 420, 0.8); tone(110, 0.1, "sine", 0.2 * v, 60); },
      crash: function () { noise(0.2, 0.3, 1600, 0.6, "lowpass"); tone(150, 0.2, "sawtooth", 0.12, 70); },
      boom: function () { noise(0.7, 0.4, 500, 0.5); tone(90, 0.6, "sine", 0.3, 38); },
      splash: function () { noise(0.4, 0.2, 2200, 0.6, "bandpass"); },
      whoosh: function () { noise(0.35, 0.14, 900, 1, "bandpass"); tone(500, 0.3, "sine", 0.05, 160); },
      clang: function (v) { v = v || 1; tone(1300, 0.18, "square", 0.07 * v, 900); tone(1850, 0.12, "triangle", 0.06 * v); noise(0.04, 0.12 * v, 4000, 1, "highpass"); },
      hit: function (v) { v = v || 1; noise(0.03, 0.22, 3200, 1, "highpass"); tone(1500, 0.05, "square", 0.08 * v, 900); },
      bounce: function (v) { v = v || 1; tone(760, 0.05, "sine", 0.12 * v, 500); },
      net: function () { noise(0.12, 0.14, 700, 1); tone(260, 0.1, "triangle", 0.08, 160); },
      tap: function () { tone(130, 0.09, "sine", 0.28, 70); noise(0.05, 0.12, 600, 1); },
      ring: function () { tone(330, 0.5, "sawtooth", 0.1, 90); noise(0.3, 0.12, 700, 1); },
      cue: function (v) { v = v || 0.5; noise(0.04, 0.2 + 0.2 * v, 3000, 1, "highpass"); tone(240 + 200 * v, 0.07, "square", 0.1 + 0.1 * v, 140); },
      ball: function (v) { v = Math.min(1, v || 0.5); tone(1700 + 600 * v, 0.045, "triangle", 0.06 + 0.12 * v, 1300); },
      cushion: function (v) { v = Math.min(1, v || 0.5); noise(0.06, 0.06 + 0.1 * v, 500, 1); },
      pocket: function () { tone(300, 0.18, "sine", 0.16, 120); noise(0.12, 0.1, 400, 1); }
    };
    var gaps = { tick: 25, ball: 30, cushion: 50, thud: 80, clang: 70, bounce: 35, step: 30 };
    return {
      play: function (name, v) {
        if (muted || vol <= 0 || !L[name]) return;
        var now = performance.now(), gp = gaps[name] || 20;
        if (lastT[name] && now - lastT[name] < gp) return;
        lastT[name] = now;
        try { L[name](v); } catch (e) {}
      },
      unlock: function () { ctx(); },
      reload: function () { try { var sv = JSON.parse(store.get("mg-sound") || "{}"); if (typeof sv.v === "number") vol = Math.max(0, Math.min(1, sv.v)); muted = !!sv.m; } catch (e) {} apply(); },
      get vol() { return vol; }, get muted() { return muted; },
      setVol: function (v) { vol = Math.max(0, Math.min(1, v)); save(); apply(); },
      setMuted: function (m) { muted = !!m; save(); apply(); }
    };
  })();
  function sfx(n, v) { SFX.play(n, v); }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { SFX.unlock(); }, { passive: true }); });


  var state = { embedded: false, online: false, isHost: true, hostId: null, meId: null, me: -1, players: [], game: null, count: 2, level: "medium", mode: "1v1", names: ["", "", "", ""], screen: "lobby" };
  var el = function (id) { return document.getElementById(id); };

  // ---- page skeleton (built here so every game's index.html stays tiny) ----
  var app = document.getElementById("app") || document.body;
  app.innerHTML =
    '<div class="wrap">' +
    '<section id="screen-lobby" class="screen" aria-label="Game setup"></section>' +
    '<section id="screen-play" class="screen" hidden aria-label="Game"></section></div>' +
    '<div class="overlay" id="settings" hidden><div class="sheet" role="dialog" aria-modal="true" aria-label="Sound settings"></div></div>' +
    '<div class="overlay" id="info" hidden><div class="sheet" role="dialog" aria-modal="true"></div></div>';
  var lobby = el("screen-lobby"), play = el("screen-play"), setBox = el("settings");

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pawn(i, size) {
    var col = i < 4 ? "var(--p" + (i + 1) + ")" : "var(--cpu)";
    var s = size || 22;
    return '<svg class="pawn" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" style="fill:' + col + ';color:' + col + '" aria-hidden="true">' + SHAPES[i] + "</svg>";
  }
  function icon(g) { return '<svg viewBox="0 0 80 80" aria-hidden="true">' + g.icon + "</svg>"; }
  function defaultName(i) { return i === 0 && state.count === 1 ? "You" : "Player " + (i + 1); }
  function nm(i) { return state.names[i].trim() || defaultName(i); }

  var ENGINES = {};
  var P = [], scores = [], ctx = null, game = null;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pickOf(a) { return a[rnd(a.length)]; }
  function shuffle(a) { var b = a.slice(); for (var i = b.length - 1; i > 0; i--) { var j = rnd(i + 1), t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
  function colOf(slot) { return slot < 4 ? "var(--p" + (slot + 1) + ")" : "var(--cpu)"; }
  function maxIdx(arr) { var m = Math.max.apply(null, arr), r = []; arr.forEach(function (v, i) { if (v === m) r.push(i); }); return r; }

  function dieSvg(n, size) {
    var pos = [[15, 15], [30, 15], [45, 15], [15, 30], [30, 30], [45, 30], [15, 45], [30, 45], [45, 45]];
    var pat = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    var s = '<svg class="die" width="' + size + '" height="' + size + '" viewBox="0 0 60 60" aria-hidden="true"><rect x="3" y="3" width="54" height="54" rx="11" style="fill:var(--surface);stroke:var(--fg);stroke-width:3"/>';
    (pat[n] || []).forEach(function (k) { s += '<circle cx="' + pos[k][0] + '" cy="' + pos[k][1] + '" r="4.6" style="fill:var(--fg)"/>'; });
    return s + "</svg>";
  }

  function goFull() {
    try {
      var d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen;
      if (f && !document.fullscreenElement && !document.webkitFullscreenElement) { var r = f.call(d); if (r && r.catch) r.catch(function () {}); }
    } catch (e) {}
  }
  function leaveFull() {
    try {
      var f = document.exitFullscreen || document.webkitExitFullscreen;
      if ((document.fullscreenElement || document.webkitFullscreenElement) && f) { var r = f.call(document); if (r && r.catch) r.catch(function () {}); }
    } catch (e) {}
  }

  function confetti(host, cols, c) {
    var cv = document.createElement("canvas"), g = cv.getContext("2d"), parts = [], t0 = 0, W, H;
    host.insertBefore(cv, host.firstChild);
    var cs = getComputedStyle(document.documentElement), pal = [];
    cols.forEach(function (v) { var m = /var\((--[a-z0-9]+)\)/.exec(v); pal.push(m ? cs.getPropertyValue(m[1]).trim() : "#fff"); });
    pal.push("#ffffff", cs.getPropertyValue("--accent").trim() || "#7df", cs.getPropertyValue("--accent2").trim() || "#f6c");
    var r = host.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    W = Math.max(200, r.width); H = Math.max(200, r.height);
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i = 0; i < 110; i++) parts.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.42, vx: (Math.random() - 0.5) * 520, vy: -180 - Math.random() * 520, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, s: 4 + Math.random() * 6, col: pal[Math.floor(Math.random() * pal.length)] });
    var last = 0;
    (function tick(ts) {
      if (!c.alive || !cv.isConnected) return;
      if (!last) last = ts;
      var dt = Math.min(0.04, (ts - last) / 1000); last = ts; t0 += dt;
      g.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 0.995;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.max(0, 1 - t0 / 3.2); g.fillStyle = p.col; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
      });
      if (t0 < 3.2) requestAnimationFrame(tick); else cv.remove();
    })(performance.now());
  }


  var info = el("info");
  function openInfo() {
    var g = state.game;
    info.querySelector(".sheet").innerHTML = '<div class="sheet-head"><span class="art" style="--h:' + g.hue + '">' + icon(g) + '</span><div><h2>' + esc(g.name) + '</h2><p class="q">How to play</p></div></div><p class="rules">' + esc(g.rules) + '</p><div class="sheet-foot"><button type="button" class="btn" data-act="closeinfo">Got it</button></div>';
    info.hidden = false;
    info.querySelector("button").focus();
  }
  info.addEventListener("click", function (e) { if (e.target === info || e.target.closest('[data-act="closeinfo"]')) info.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !info.hidden) info.hidden = true; });


  function stopGame() {
    if (ctx) { ctx.alive = false; ctx.timers.forEach(clearTimeout); ctx.timers = []; if (ctx.net) ctx.net.close(); }
    if (game && game.destroy) { try { game.destroy(); } catch (e) {} }
    game = null; ctx = null;
  }


  function makeCtx(root) {
    var c = { root: root, n: P.length, players: P, level: state.level, lv: { easy: 0, medium: 1, hard: 2 }[state.level], mode: state.mode, alive: true, timers: [] };
    // Online play: each phone is one player. c.net lets a game exchange messages with the
    // other phones (through PLAYZONE). The HOST's copy is the referee (see docs/GAMES.md).
    c.net = null;
    if (state.online) {
      var subs = [];
      var idxOf = function (id) { for (var i = 0; i < P.length; i++) if (P[i].id === id) return i; return -1; };
      c.net = {
        host: state.isHost, me: state.me, hostIdx: idxOf(state.hostId),
        send: function (name, data) { PlayZone.send(name, data); },
        on: function (name, cb) { var f = function (d, from) { cb(d, idxOf(from)); }; subs.push([name, f]); PlayZone.on(name, f); },
        close: function () { subs.forEach(function (x) { PlayZone.off(x[0], x[1]); }); subs = []; }
      };
    }
    c.later = function (fn, ms) { var t = setTimeout(function () { if (c.alive) fn(); }, ms); c.timers.push(t); return t; };
    c.msg = function (h) {
      var m = root.querySelector(".msg"); if (m) m.innerHTML = h;
      var tx = String(h).replace(/<[^>]*>/g, "").toLowerCase();
      if (/ladder/.test(tx)) sfx("ladder");
      else if (/bitten/.test(tx)) sfx("snake");
      else if (/captur|sent home|back to the yard/.test(tx)) sfx("capture");
      else if (/correct|right answer|great/.test(tx)) sfx("good");
      else if (/wrong|too early|out of guesses|foul|scratch|too slow/.test(tx)) sfx("bad");
      else if (/rolled/.test(tx)) sfx("roll");
    };
    c.who = function (i) { return '<span class="who">' + pawn(P[i].slot, 18) + esc(P[i].name) + "</span>"; };
    c.col = function (i) { return colOf(P[i].slot); };
    c.turn = function (i) {
      if (state.embedded) PlayZone.turn(i >= 0 && P[i] ? P[i].id : null);
      var els = play.querySelectorAll(".score");
      for (var k = 0; k < els.length; k++) els[k].classList.toggle("on", k === i);
    };
    c.set = function (i, v) {
      scores[i] = v;
      if (state.embedded) PlayZone.setScore(P[i].id, v);
      var e = play.querySelector('.score[data-i="' + i + '"] .pts');
      if (e) e.textContent = v;
    };
    c.add = function (i, d) { if (d > 0) sfx("score"); c.set(i, scores[i] + d); };
    c.finish = function (winners, sub, noneTitle, custom) {
      c.turn(-1);
      if (state.embedded) { sfx(winners.length ? "win" : "lose"); c.over = true; PlayZone.finish(winners.map(function (x) { return P[x].id; }), custom || sub || ""); return; }
      var title, pw = "";
      if (!winners.length) title = noneTitle || "No winner";
      else if (winners.length === 1) { var w = P[winners[0]].name; title = w + (w === "You" ? " win!" : " wins!"); }
      else title = "Tie: " + winners.map(function (x) { return P[x].name; }).join(" & ");
      if (custom) title = custom;
      sfx(winners.length ? "win" : "lose");
      winners.forEach(function (x) { pw += pawn(P[x].slot, 34); });
      var d = document.createElement("div");
      d.className = "end";
      d.innerHTML = '<div class="endcard"><div class="pw">' + pw + "</div><h2>" + esc(title) + "</h2><p>" + esc(sub || "") + '</p><div class="actions"><button type="button" class="btn" data-act="again">Play again</button><button type="button" class="btn alt" data-act="lobby">Change setup</button></div></div>';
      root.appendChild(d);
      d.querySelector("button").focus();
      if (winners.length) confetti(d, winners.map(function (x) { return colOf(P[x].slot); }), c);
    };
    return c;
  }


  function renderPlay() {
    stopGame();
    P = [];
    if (state.embedded) {
      // PLAYZONE decides who plays (and whether a Computer joins).
      state.players.forEach(function (q, i) { P.push({ id: q.id, name: q.name, cpu: !!q.cpu, slot: q.cpu ? 4 : (q.index != null ? q.index : i) }); });
    } else {
      for (var i = 0; i < state.count; i++) P.push({ id: "p" + (i + 1), name: nm(i), cpu: false, slot: i });
      if (state.count === 1) P.push({ id: "cpu", name: "Computer", cpu: true, slot: 4 });
    }
    state.me = -1;
    if (state.online) P.forEach(function (q, i) { if (q.id === state.meId) state.me = i; });
    scores = P.map(function () { return 0; });
    var chips = "";
    P.forEach(function (p, i) {
      chips += '<div class="score" data-i="' + i + '" style="--pc:' + colOf(p.slot) + '">' + pawn(p.slot, 22) + '<span class="nm">' + esc(p.name) + '</span><span class="pts">0</span></div>';
    });
    play.innerHTML =
      '<div class="hud"><div class="scoreboard" aria-label="Scores">' + chips + '</div>' +
      '<div class="hud-actions"><button type="button" class="btn alt sm" data-act="settings" aria-label="Sound settings" title="Sound"><svg width="18" height="16" viewBox="0 0 24 22" aria-hidden="true" style="vertical-align:middle"><path d="M3 8h4l6-5v16l-6-5H3z" fill="currentColor"/><path d="M16 7q3 4 0 8M19 4q6 7 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<button type="button" class="btn alt sm" data-act="info" aria-label="How to play" title="How to play"><span class="lbl">How to play</span><span class="ico" aria-hidden="true">?</span></button>' +
      (state.embedded ? "" : '<button type="button" class="btn alt sm" data-act="lobby">Change setup</button>') + '</div></div>' +
      '<div class="game"></div>';
    play.classList.toggle("embedded", !!state.embedded);
    ctx = makeCtx(play.querySelector(".game"));
    game = ENGINES[state.game.id](ctx);
  }


  // ---------- shared real-time controls (wheel on touch, keys on computer) ----------
  var KEYSETS = [
    { u: "KeyW", d: "KeyS", l: "KeyA", r: "KeyD" },
    { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight" },
    { u: "KeyI", d: "KeyK", l: "KeyJ", r: "KeyL" },
    { u: "KeyT", d: "KeyG", l: "KeyF", r: "KeyH" }
  ];
  var KEYNAMES = ["W A S D", "Arrow keys", "I J K L", "T F G H"];
  function makeControls(C, arena, opts) {
    opts = opts || {};
    var n = C.n, vec = [], keys = {}, i;
    var touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    for (i = 0; i < n; i++) vec.push({ x: 0, y: 0 });
    var humans = []; C.players.forEach(function (p, idx) { if (!p.cpu) humans.push(idx); });
    var H = humans.length;
    var RECTS = { 1: [[0, 0, 1, 1]], 2: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]], 3: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], 4: [[0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5], [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5]] };
    var useTouch = touch && !opts.noTouch;
    if (useTouch) {
      arena.classList.add("touch");
      var wrap = document.createElement("div");
      wrap.className = "joys";
      arena.appendChild(wrap);
      humans.forEach(function (idx, rank) {
        var rc = RECTS[Math.min(4, H)][rank], z = document.createElement("div"), j = document.createElement("div"), kn = document.createElement("i"), act = null, M = 52, org = null;
        z.className = "zone"; z.style.cssText = "left:" + rc[0] * 100 + "%;top:" + rc[1] * 100 + "%;width:" + rc[2] * 100 + "%;height:" + rc[3] * 100 + "%";
        z.style.setProperty("--pc", C.col(idx));
        z.innerHTML = '<span class="zlabel">' + pawn(C.players[idx].slot, 14) + esc(C.players[idx].name) + (H === 1 ? " · touch and drag anywhere" : " · touch and drag here") + "</span>";
        j.className = "joy"; j.style.setProperty("--pc", C.col(idx));
        kn.style.cssText = "position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:var(--pc);opacity:0.88";
        j.appendChild(kn); wrap.appendChild(z); wrap.appendChild(j);
        function upd(e) {
          var dx = e.clientX - org.x, dy = e.clientY - org.y, l = Math.sqrt(dx * dx + dy * dy);
          if (l > M) { dx *= M / l; dy *= M / l; }
          vec[idx] = { x: dx / M, y: dy / M };
          kn.style.transform = "translate(" + dx + "px," + dy + "px)";
        }
        function rel(e) { if (e.pointerId !== act) return; act = null; vec[idx] = { x: 0, y: 0 }; kn.style.transform = ""; j.classList.remove("on"); }
        z.addEventListener("pointerdown", function (e) {
          if (act !== null) return;
          act = e.pointerId; try { z.setPointerCapture(e.pointerId); } catch (x) {}
          org = { x: e.clientX, y: e.clientY };
          var r = arena.getBoundingClientRect(), cx = Math.max(60, Math.min(r.width - 60, e.clientX - r.left)), cy = Math.max(60, Math.min(r.height - 60, e.clientY - r.top));
          org = { x: r.left + cx, y: r.top + cy };
          j.style.left = (cx - 56) + "px"; j.style.top = (cy - 56) + "px"; j.classList.add("on"); z.classList.add("used");
          upd(e); e.preventDefault();
        });
        z.addEventListener("pointermove", function (e) { if (e.pointerId === act) upd(e); });
        z.addEventListener("pointerup", rel);
        z.addEventListener("pointercancel", rel);
      });
    }
    var all = {};
    KEYSETS.forEach(function (k) { Object.keys(k).forEach(function (a) { all[k[a]] = 1; }); });
    function kd(e) { if (all[e.code]) { keys[e.code] = true; e.preventDefault(); } }
    function ku(e) { if (all[e.code]) keys[e.code] = false; }
    function blur() { keys = {}; }
    document.addEventListener("keydown", kd);
    document.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    return {
      read: function (idx) {
        var ks = KEYSETS[idx], x = vec[idx].x, y = vec[idx].y;
        if (keys[ks.l]) x -= 1; if (keys[ks.r]) x += 1; if (keys[ks.u]) y -= 1; if (keys[ks.d]) y += 1;
        var l = Math.sqrt(x * x + y * y);
        if (l > 1) { x /= l; y /= l; }
        return { x: x, y: y };
      },
      hint: function (extra) {
        var parts = [];
        C.players.forEach(function (p, idx) { if (!p.cpu) parts.push(C.who(idx) + " " + KEYNAMES[idx]); });
        if (touch) return (H === 1 ? "Touch and drag anywhere to steer. " : "Touch and drag inside your coloured box to steer. ") + (extra || "");
        return parts.join(" · ") + (extra ? " · " + extra : "");
      },
      destroy: function () {
        document.removeEventListener("keydown", kd);
        document.removeEventListener("keyup", ku);
        window.removeEventListener("blur", blur);
      }
    };
  }
  function rrPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function shapePath(g, slot, x, y, r) {
    g.beginPath();
    if (slot === 0) g.arc(x, y, r, 0, Math.PI * 2);
    else if (slot === 1) g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
    else if (slot === 2) { g.moveTo(x, y - r); g.lineTo(x + r, y + r * 0.8); g.lineTo(x - r, y + r * 0.8); g.closePath(); }
    else if (slot === 3) { g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); }
    else { for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k - Math.PI / 6; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  }
  function cssColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888"; }
  function playerColors(C) { return C.players.map(function (p) { return cssColor(p.slot < 4 ? "--p" + (p.slot + 1) : "--cpu"); }); }


  // ---------- shared court view (landscape, or rotated for portrait phones) ----------
  function makeView(arena, cv, LW, LH) {
    var g = cv.getContext("2d"), v = { W: 0, H: 0, s: 1, port: false, ox: 0, oy: 0, g: g, dpr: 1 };
    v.resize = function () {
      var r = arena.getBoundingClientRect(), W = Math.max(200, Math.floor(r.width)), H = Math.max(200, Math.floor(r.height)), dpr = window.devicePixelRatio || 1;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      var sl = Math.min(W / LW, H / LH), sp = Math.min(W / LH, H / LW);
      v.port = sp > sl * 1.02; v.s = v.port ? sp : sl; v.W = W; v.H = H; v.dpr = dpr;
      var cw = (v.port ? LH : LW) * v.s, ch = (v.port ? LW : LH) * v.s;
      v.ox = (W - cw) / 2; v.oy = (H - ch) / 2;
    };
    v.begin = function () {
      var d = v.dpr, s = v.s;
      if (v.port) g.setTransform(0, -s * d, s * d, 0, v.ox * d, (v.oy + LW * s) * d);
      else g.setTransform(s * d, 0, 0, s * d, v.ox * d, v.oy * d);
    };
    v.screen = function () { g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); };
    v.toLogical = function (cx, cy) {
      var r = cv.getBoundingClientRect(), sx = cx - r.left, sy = cy - r.top;
      return v.port ? { x: LW - (sy - v.oy) / v.s, y: (sx - v.ox) / v.s } : { x: (sx - v.ox) / v.s, y: (sy - v.oy) / v.s };
    };
    v.vec = function (u) { return v.port ? { x: -u.y, y: u.x } : u; };
    return v;
  }
  function countdownText(view, g, cd, W, H) {
    if (cd <= -0.6) return;
    var txt = cd > 2 ? "3" : cd > 1 ? "2" : cd > 0 ? "1" : "GO!";
    view.screen();
    g.font = "800 " + Math.round(Math.min(view.W, view.H) * 0.2) + "px Orbitron, 'Exo 2', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#4fe8ff"; g.shadowBlur = (24) * GLOW; g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,0.6)"; g.strokeText(txt, view.W / 2, view.H / 2); g.fillStyle = "#fff"; g.fillText(txt, view.W / 2, view.H / 2);
    g.shadowBlur = 0; g.textBaseline = "alphabetic";
  }


  // ===================== SETUP SCREEN =====================
  function diffBlock(g) {
    return '<div><p class="label">Difficulty</p><div class="seg" role="group" aria-label="Difficulty">' +
      ["easy", "medium", "hard"].map(function (l) { return '<button type="button" data-level="' + l + '" aria-pressed="' + (state.level === l) + '">' + l.charAt(0).toUpperCase() + l.slice(1) + "</button>"; }).join("") +
      '</div><p class="diffnote">' + esc(g.diff || "") + "</p></div>";
  }
  function teamBlock(g) {
    if (!g.modes) return "";
    var c = state.count, note;
    if (c <= 2) {
      note = c === 1 ? (state.mode === "2v2" ? "You and a computer partner play against two computers." : "You play against the computer.")
                     : (state.mode === "2v2" ? "You two team up against two computers." : "You two play each other.");
      return '<div><p class="label">Teams</p><div class="seg" role="group" aria-label="Teams">' +
        [["1v1", "1 vs 1"], ["2v2", "2 vs 2"]].map(function (m) { return '<button type="button" data-mode="' + m[0] + '" aria-pressed="' + (state.mode === m[0]) + '">' + m[1] + "</button>"; }).join("") +
        '</div><p class="diffnote">' + note + "</p></div>";
    }
    note = c === 3 ? "Two teams of two. Player 1 and Player 2 are a team. Player 3 teams up with a computer." : "Two teams of two. Player 1 and Player 2 against Player 3 and Player 4.";
    return '<div><p class="label">Teams</p><p class="diffnote" style="margin:0">' + note + "</p></div>";
  }

  function countBlock() {
    var html = "";
    for (var n = 1; n <= 4; n++) {
      html += '<button type="button" data-count="' + n + '" aria-pressed="' + (state.count === n) + '">' + (n === 1 ? "1 · vs computer" : n + " players") + "</button>";
    }
    return '<div><p class="label">Players</p><div class="seg" role="group" aria-label="Number of players">' + html + "</div></div>";
  }

  function renderLobby() {
    var g = state.game, rows = "", i, guest = state.online && !state.isHost;
    if (!state.embedded) {
      for (i = 0; i < state.count; i++) {
        rows += '<li>' + pawn(i, 26) +
          '<div class="who"><label class="label" style="margin:0 0 4px;display:block" for="name-' + i + '">Player ' + (i + 1) + '</label>' +
          '<input id="name-' + i + '" type="text" maxlength="14" data-i="' + i + '" value="' + esc(state.names[i]) + '" placeholder="' + esc(defaultName(i)) + '" autocomplete="off"></div></li>';
      }
      if (state.count === 1) {
        rows += '<li>' + pawn(4, 26) + '<div class="who"><span class="label" style="margin:0 0 4px;display:block">Opponent</span><span class="cpu-name">Computer</span></div></li>';
      }
    } else {
      state.players.forEach(function (q, k) {
        rows += '<li>' + pawn(q.cpu ? 4 : (q.index != null ? q.index : k), 26) + '<div class="who"><span class="cpu-name">' + esc(q.name) + "</span></div></li>";
      });
    }
    lobby.innerHTML =
      '<div class="lobby-head"><span class="art" style="--h:' + g.hue + '">' + icon(g) + '</span>' +
      '<div><h2>' + esc(g.name) + '</h2><p class="rules">' + esc(g.rules) + '</p></div></div>' +
      (state.embedded ? "" : countBlock()) +
      '<div><p class="label">' + (state.embedded ? "Players" : (state.count === 1 ? "1 player vs computer" : state.count + " players")) + '</p><ul class="roster">' + rows + '</ul></div>' +
      (guest ? '<p class="rules" style="text-align:center">Waiting for the host to choose the difficulty and start…</p>' : teamBlock(g) + diffBlock(g)) +
      '<div class="actions">' + (guest ? "" : '<button type="button" class="btn" data-act="start">Start game</button>') +
      '<button type="button" class="btn alt" data-act="settings">Sound</button></div>';
  }

  function show(s) {
    state.screen = s;
    lobby.hidden = s !== "lobby";
    play.hidden = s !== "play";
    if (s !== "play") { stopGame(); leaveFull(); }
    document.documentElement.classList.toggle("playing", s === "play");
    if (s === "lobby") renderLobby();
    if (s === "play") renderPlay();
    window.scrollTo(0, 0);
    var target = (s === "lobby" ? lobby : play).querySelector("h2");
    if (target) { target.setAttribute("tabindex", "-1"); try { target.focus({ preventScroll: true }); } catch (e) {} }
  }

  // ===================== EVENTS =====================
  lobby.addEventListener("click", function (e) {
    if (state.online && !state.isHost && !e.target.closest("[data-act=settings]")) return;
    var lv = e.target.closest("[data-level]");
    if (lv) { state.level = lv.getAttribute("data-level"); renderLobby(); return; }
    var md = e.target.closest("[data-mode]");
    if (md) { state.mode = md.getAttribute("data-mode"); renderLobby(); return; }
    var ct = e.target.closest("[data-count]");
    if (ct) { state.count = Number(ct.getAttribute("data-count")); renderLobby(); return; }
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "start") {
      if (!state.embedded) goFull();
      if (state.online) { startedCfg = { level: state.level, mode: state.mode }; PlayZone.send("hub:start", startedCfg); }
      show("play");
    }
    else if (act === "settings") openSettings();
  });
  lobby.addEventListener("input", function (e) {
    var inp = e.target.closest("input[data-i]");
    if (inp) state.names[Number(inp.getAttribute("data-i"))] = inp.value;
  });

  play.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "lobby") show("lobby");
    else if (a === "again") renderPlay();
    else if (a === "info") openInfo();
    else if (a === "settings") openSettings();
  });

  function openSettings() {
    var sh = setBox.querySelector(".sheet");
    sh.innerHTML = '<div class="sheet-head"><div><h2>Sound</h2><p class="q">Applies to every game.</p></div></div>' +
      '<label class="vol"><span>Volume <b id="vol-n">' + Math.round(SFX.vol * 100) + '%</b></span><input type="range" id="vol" min="0" max="100" value="' + Math.round(SFX.vol * 100) + '" aria-label="Volume"></label>' +
      '<div class="actions"><button type="button" class="btn alt" data-act="mute" aria-pressed="' + SFX.muted + '">' + (SFX.muted ? "Unmute" : "Mute") + '</button><button type="button" class="btn alt" data-act="testsound">Test sound</button></div>' +
      '<div class="sheet-foot"><button type="button" class="btn" data-act="closeset">Done</button></div>';
    setBox.hidden = false; sh.querySelector('[data-act="closeset"]').focus();
  }
  setBox.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (e.target === setBox || (b && b.getAttribute("data-act") === "closeset")) { setBox.hidden = true; return; }
    if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "mute") { SFX.setMuted(!SFX.muted); b.textContent = SFX.muted ? "Unmute" : "Mute"; b.setAttribute("aria-pressed", SFX.muted); }
    if (a === "testsound") { sfx("win"); }
  });
  setBox.addEventListener("input", function (e) {
    if (e.target.id !== "vol") return;
    var v = Number(e.target.value) / 100; SFX.setVol(v); if (SFX.muted && v > 0) SFX.setMuted(false);
    el("vol-n").textContent = Math.round(v * 100) + "%"; sfx("score");
  });
  document.addEventListener("click", function (e) { if (e.target.closest("button, .card")) sfx("click"); }, true);

  // ===================== EXPORTS + START =====================
  Hub.ENGINES = ENGINES;
  Hub.store = store; Hub.state = state; Hub.el = el;
  Hub.SHAPES = SHAPES; Hub.GLOW = GLOW; Hub.SFX = SFX; Hub.sfx = sfx; Hub.esc = esc; Hub.pawn = pawn; Hub.icon = icon; Hub.rnd = rnd; Hub.pickOf = pickOf; Hub.shuffle = shuffle; Hub.colOf = colOf; Hub.maxIdx = maxIdx; Hub.dieSvg = dieSvg; Hub.goFull = goFull; Hub.leaveFull = leaveFull; Hub.confetti = confetti; Hub.KEYSETS = KEYSETS; Hub.KEYNAMES = KEYNAMES; Hub.makeControls = makeControls; Hub.rrPath = rrPath; Hub.shapePath = shapePath; Hub.cssColor = cssColor; Hub.playerColors = playerColors; Hub.makeView = makeView; Hub.countdownText = countdownText; Hub.nm = nm;

  // ---- online: the host starts the game; everybody else follows ----
  var startedCfg = null;
  function startOnlineHandshake() {
    if (state.isHost) {
      // A phone that loaded late asks "what did the host choose?"
      PlayZone.on("hub:need", function () { if (startedCfg) PlayZone.send("hub:start", startedCfg); });
      return;
    }
    PlayZone.on("hub:start", function (d, from) {
      if (!d || state.screen === "play" || (state.hostId && from !== state.hostId)) return;
      if (["easy", "medium", "hard"].indexOf(d.level) >= 0) state.level = d.level;
      if (typeof d.mode === "string" && d.mode.length < 12) state.mode = d.mode;
      show("play");
    });
    (function ask() { if (state.screen !== "lobby") return; PlayZone.send("hub:need", {}); setTimeout(ask, 1500); })();
  }

  // A game file calls Hub.register(...) once. Then we wait for PLAYZONE (or standalone mode).
  Hub.register = function (meta) {
    state.game = meta;
    PlayZone.onInit(function (init) {
      state.embedded = !init.standalone;
      state.online = state.embedded && init.mode === "online";
      state.isHost = state.online ? !!init.isHost : true;
      state.meId = init.me ? init.me.id : null;
      state.hostId = init.hostId || null;
      if (state.embedded) {
        state.players = init.players || [];
        state.count = state.players.filter(function (q) { return !q.cpu; }).length || 1;
        SFX.reload();
      } else {
        state.count = Math.max(1, Math.min(4, (init.players || []).length || 2));
      }
      document.documentElement.classList.toggle("embedded", state.embedded);
      show("lobby");
      if (state.online) startOnlineHandshake();
    });
  };
})(window);
