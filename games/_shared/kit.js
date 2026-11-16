/* PLAYZONE game kit - small helpers shared by the newer games (Whack-a-Mole, Fast Math, ...).
   Load AFTER hub-runtime.js and BEFORE the game's own game.js:
     <script src="../_shared/kit.js"></script>
   Nothing here touches the network or the original classic games. */
(function () {
  var Hub = window.Hub, esc = Hub.esc, sfx = Hub.sfx;
  var Kit = Hub.Kit = {};

  Kit.touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  Kit.rnd = function (a, b) { return a + Math.random() * (b - a); };
  Kit.ri = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  Kit.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  Kit.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  /* Track which keys are held. Returns {down:{code:true}, destroy()} */
  Kit.keys = function (onPress) {
    var k = { down: {}, destroy: function () { document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku); window.removeEventListener("blur", bl); } };
    function kd(e) {
      if (/^(Arrow|Space|Key[A-Z])/.test(e.code) && !(e.target && /input|textarea/i.test(e.target.tagName))) e.preventDefault();
      if (!k.down[e.code] && onPress) onPress(e.code);
      k.down[e.code] = true;
    }
    function ku(e) { k.down[e.code] = false; }
    function bl() { k.down = {}; }
    document.addEventListener("keydown", kd); document.addEventListener("keyup", ku); window.addEventListener("blur", bl);
    return k;
  };

  /* requestAnimationFrame loop with a clamped dt (seconds). Returns a stop function. */
  Kit.loop = function (fn) {
    var raf = 0, last = 0, on = true;
    function f(ts) {
      if (!on) return;
      raf = requestAnimationFrame(f);
      if (!last) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      fn(dt);
    }
    raf = requestAnimationFrame(f);
    return function () { on = false; cancelAnimationFrame(raf); };
  };

  /* A canvas that fills `box`, scaled (and turned on portrait phones) by Hub.makeView.
     Returns {arena, cv, view, g, destroy()}. Draw between view.screen()/view.begin(). */
  Kit.canvas = function (box, LW, LH) {
    var arena = document.createElement("div"); arena.className = "arena";
    var cv = document.createElement("canvas"); arena.appendChild(cv); box.appendChild(arena);
    var view = Hub.makeView(arena, cv, LW, LH), ro = null;
    function layout() { view.resize(); }
    layout();
    if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(arena); }
    return { arena: arena, cv: cv, view: view, g: view.g, destroy: function () { if (ro) ro.disconnect(); } };
  };


  /* A portrait ("tall") canvas that never rotates. Logical size W0 x H0 is scaled to fit and centred.
     v.begin() clears + sets the transform, v.end() restores; v.toLogical(clientX, clientY) -> {x,y}. */
  Kit.tall = function (box, W0, H0) {
    var arena = document.createElement("div"); arena.className = "arena k-tall";
    var cv = document.createElement("canvas"); arena.appendChild(cv); box.appendChild(arena);
    var g = cv.getContext("2d"), v = { s: 1, ox: 0, oy: 0, W: 0, H: 0, dpr: 1, g: g, cv: cv, arena: arena }, ro = null;
    v.resize = function () {
      var W = arena.clientWidth, H = arena.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (W < 10 || H < 10 || (W === v.W && H === v.H && dpr === v.dpr)) return;
      v.W = W; v.H = H; v.dpr = dpr; cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      v.s = Math.min(W / W0, H / H0); v.ox = (W - W0 * v.s) / 2; v.oy = (H - H0 * v.s) / 2;
    };
    v.begin = function (bg) {
      g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); g.fillStyle = bg || "#0b1220"; g.fillRect(0, 0, v.W, v.H);
      g.setTransform(v.s * v.dpr, 0, 0, v.s * v.dpr, v.ox * v.dpr, v.oy * v.dpr);
      g.save(); g.beginPath(); g.rect(0, 0, W0, H0); g.clip();
    };
    v.end = function () { g.restore(); };
    v.toLogical = function (cx, cy) { var r = cv.getBoundingClientRect(); return { x: (cx - r.left - v.ox) / v.s, y: (cy - r.top - v.oy) / v.s }; };
    v.destroy = function () { if (ro) ro.disconnect(); };
    v.resize();
    if (window.ResizeObserver) { ro = new ResizeObserver(v.resize); ro.observe(arena); }
    return v;
  };

  /* ---------------------------------------------------------------------------
     Kit.runTurns - "everybody takes a run, best score wins".
       o.intro            one line shown on the ready card ("Whack as many moles as you can in 30 s")
       o.play(idx, box, done) -> optional cleanup function
            idx   player index (C.players[idx])
            box   an empty <div class="k-play"> to build the game in
            done(score, text?)  call exactly once when this player's run is over
       o.cpuScore(lv)     score the Computer gets (lv 0 easy, 1 medium, 2 hard)
       o.low              true if a LOWER score wins (default: higher wins)
       o.fmt(score)       how to print a score (default: the number)
       o.sub              text under the final result
     --------------------------------------------------------------------------- */
  Kit.runTurns = function (C, o) {
    var root = C.root, pos = 0, scores = [], cleanup = null, fmt = o.fmt || function (s) { return String(s); };
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="k-stage"></div>';
    var stage = root.querySelector(".k-stage");
    C.players.forEach(function (p, i) { C.set(i, 0); });
    function clean() { if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; } }
    function next() {
      if (!C.alive) return;
      if (pos >= C.n) return finish();
      var idx = pos; C.turn(idx);
      if (C.players[idx].cpu) {
        C.msg(C.who(idx) + " is playing…"); stage.innerHTML = '<div class="k-over"><div class="k-card"><h3>' + esc(C.players[idx].name) + '</h3><p>Playing…</p></div></div>';
        C.later(function () { record(idx, o.cpuScore(C.lv)); }, 1400);
        return;
      }
      C.msg(C.who(idx) + ", you are up.");
      stage.innerHTML = '<div class="k-over"><div class="k-card"><h3>' + C.who(idx) + '</h3><p>' + esc(o.intro || "") + '</p><button type="button" class="btn" data-go>' + (C.n > 1 ? "I am ready" : "Start") + '</button></div></div>';
      stage.querySelector("[data-go]").addEventListener("click", function () { play(idx); });
    }
    function play(idx) {
      stage.innerHTML = "";
      var box = document.createElement("div"); box.className = "k-play"; stage.appendChild(box);
      var fin = false;
      C.msg(C.who(idx) + " · go!");
      cleanup = o.play(idx, box, function (score, text) {
        if (fin || !C.alive) return; fin = true;
        C.later(function () { clean(); record(idx, score, text); }, 700);
      }) || null;
    }
    function record(idx, s, text) {
      scores[idx] = s; C.set(idx, s);
      stage.innerHTML = '<div class="k-over"><div class="k-card"><h3>' + C.who(idx) + '</h3><p class="k-big">' + esc(fmt(s)) + '</p><p>' + esc(text || "") + '</p></div></div>';
      C.msg(C.who(idx) + " scored " + esc(fmt(s)) + ".");
      pos++; C.later(next, 1500);
    }
    function finish() {
      var best = o.low ? Math.min.apply(null, scores) : Math.max.apply(null, scores), w = [];
      scores.forEach(function (s, i) { if (s === best) w.push(i); });
      stage.innerHTML = "";
      C.finish(w, (o.sub || "Best score") + ": " + fmt(best) + ".");
    }
    next();
    return { destroy: clean };
  };

  /* ---------------------------------------------------------------------------
     Kit.quiz - hot-seat multiple choice, each player answers `rounds` questions.
       o.rounds           questions per player (default 5)
       o.time             seconds per question, by level, e.g. [14, 10, 7]
       o.make(lv)         -> { q: "html (trusted, built by the game)", opts: ["a","b","c","d"], ans: 2, hint?: "" }
       o.cpuAcc           chance (0-1) the Computer answers right, by level
       Scoring: right answer = 10 + up to 10 speed bonus.
     --------------------------------------------------------------------------- */
  Kit.quiz = function (C, o) {
    var root = C.root, rounds = o.rounds || 5, total = rounds * C.n, qn = 0, timer = 0, locked = false, cur = null, t0 = 0, tmax = 10, sc = [];
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="k-stage"><div class="k-quiz"><div class="k-qmeta"></div><div class="k-qbar"><i></i></div><div class="k-qtext"></div><div class="k-opts"></div></div></div>';
    var meta = root.querySelector(".k-qmeta"), bar = root.querySelector(".k-qbar i"), qt = root.querySelector(".k-qtext"), ob = root.querySelector(".k-opts");
    C.players.forEach(function (p, i) { C.set(i, 0); sc[i] = 0; });
    function stopT() { clearInterval(timer); timer = 0; }
    function ask() {
      if (!C.alive) return;
      if (qn >= total) return end();
      var idx = qn % C.n, round = Math.floor(qn / C.n) + 1;
      cur = o.make(C.lv); locked = false; C.turn(idx);
      meta.innerHTML = C.who(idx) + " · question " + round + " of " + rounds;
      C.msg(C.who(idx) + ", your question.");
      qt.innerHTML = cur.q;
      ob.innerHTML = cur.opts.map(function (t, i) { return '<button type="button" class="k-opt" data-i="' + i + '">' + esc(t) + "</button>"; }).join("");
      tmax = o.time ? o.time[C.lv] : 10; t0 = performance.now(); bar.style.width = "100%";
      var cpu = C.players[idx].cpu;
      if (cpu) {
        ob.classList.add("off");
        C.later(function () { var right = Math.random() < o.cpuAcc[C.lv]; var pickI = right ? cur.ans : (cur.ans + 1 + Math.floor(Math.random() * (cur.opts.length - 1))) % cur.opts.length; answer(idx, pickI); }, 900 + Math.random() * 1400);
      } else ob.classList.remove("off");
      stopT();
      timer = setInterval(function () {
        var left = Math.max(0, 1 - (performance.now() - t0) / 1000 / tmax); bar.style.width = (left * 100) + "%";
        if (left <= 0 && !locked) answer(idx, -1);
      }, 80);
    }
    function answer(idx, i) {
      if (locked || !C.alive) return; locked = true; stopT();
      var left = Math.max(0, 1 - (performance.now() - t0) / 1000 / tmax), ok = i === cur.ans;
      ob.querySelectorAll(".k-opt").forEach(function (b, k) { b.classList.add(k === cur.ans ? "right" : (k === i ? "wrong" : "dim")); });
      if (ok) { var pts = 10 + Math.round(left * 10); sc[idx] += pts; C.add(idx, pts); C.msg(C.who(idx) + " is right!"); }
      else { sfx("bad"); C.msg(i < 0 ? "Too slow! It was " + esc(cur.opts[cur.ans]) + "." : "Not quite. It was " + esc(cur.opts[cur.ans]) + "."); }
      if (cur.hint) C.msg(root.querySelector(".msg").innerHTML + " " + esc(cur.hint));
      qn++; C.later(ask, 1700);
    }
    ob.addEventListener("click", function (e) {
      var b = e.target.closest(".k-opt"); if (!b || locked) return;
      var idx = qn % C.n; if (C.players[idx].cpu) return;
      answer(idx, +b.getAttribute("data-i"));
    });
    function end() {
      var w = [], best = Math.max.apply(null, sc); sc.forEach(function (s, k) { if (s === best) w.push(k); });
      C.finish(w, "Top score: " + best + ".");
    }
    ask();
    return { destroy: stopT };
  };
})();
