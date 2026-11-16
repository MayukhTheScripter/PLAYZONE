/* Spin Arena - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, GLOW = Hub.GLOW, sfx = Hub.sfx, el = Hub.el, makeControls = Hub.makeControls, shapePath = Hub.shapePath, playerColors = Hub.playerColors;

  // ---------- Spin Arena (battle tops) ----------
  ENGINES.spin = function (C) {
    var root = C.root, n = C.n;
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="arena"><canvas></canvas></div>';
    var arena = root.querySelector(".arena"), cv = root.querySelector("canvas"), g = cv.getContext("2d");
    var ctl = makeControls(C, arena), pc = playerColors(C);
    var W = 0, H = 0, cx = 0, cy = 0, R0 = 100, R = 100, r = 16, K = 1;
    var tops = [], parts = [], rings = [], t = 0, cd = 3.2, ended = false, raf = 0, last = 0, ro = null, i;
    function layout() {
      var b = arena.getBoundingClientRect(), nw = Math.max(240, Math.floor(b.width)), nh = Math.max(240, Math.floor(b.height)), dpr = window.devicePixelRatio || 1;
      cv.width = Math.floor(nw * dpr); cv.height = Math.floor(nh * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var oldCx = cx, oldCy = cy, oldR = R0;
      W = nw; H = nh; cx = W / 2; cy = H / 2;
      R0 = Math.min(W, H) * 0.44; r = Math.max(13, R0 * 0.085); K = R0 / 230;
      if (oldR && tops.length) { var s = R0 / oldR; tops.forEach(function (p) { p.x = cx + (p.x - oldCx) * s; p.y = cy + (p.y - oldCy) * s; }); }
      R = R0;
    }
    layout();
    for (i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n - Math.PI / 2 + (n === 2 ? Math.PI / 2 : 0);
      tops.push({ i: i, x: cx + Math.cos(a) * R0 * 0.55, y: cy + Math.sin(a) * R0 * 0.55, vx: 0, vy: 0, ang: Math.random() * 6, alive: true, fall: 0, flash: 0, lastHit: -1, lastT: -9, m: 1 });
    }
    tops.forEach(function (p) { C.set(p.i, 0); });
    C.msg(ctl.hint("Knock rivals out of the arena!"));
    if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(arena); }

    function spark(x, y, col, cnt, sp, life) {
      for (var k = 0; k < cnt; k++) parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * sp, vy: (Math.random() - 0.5) * sp, life: (life || 0.4) * (0.6 + Math.random() * 0.6), max: life || 0.4, col: col, s: 1.5 + Math.random() * 2.5 });
    }
    function inGame(p) { return p.alive && !p.fall; }
    function ai(p) {
      var lv = C.lv, hard = lv === 2, u = { x: 0, y: 0 }, tgt = null, td = 1e9;
      tops.forEach(function (o) { if (o !== p && inGame(o)) { var d = Math.hypot(o.x - p.x, o.y - p.y); if (d < td) { td = d; tgt = o; } } });
      var dc = Math.hypot(p.x - cx, p.y - cy);
      if (dc > R * [0.9, 0.8, 0.72][lv]) { var rs = [0.5, 0.8, 1][lv]; u.x = (cx - p.x) / dc * rs; u.y = (cy - p.y) / dc * rs; }
      else if (tgt) {
        var ex = tgt.x - cx, ey = tgt.y - cy, el = Math.hypot(ex, ey) || 1, ux = ex / el, uy = ey / el;
        var bx = tgt.x - ux * r * 2.3, by = tgt.y - uy * r * 2.3, dist = Math.hypot(tgt.x - p.x, tgt.y - p.y);
        var aligned = Math.hypot(bx - p.x, by - p.y) < r * 1.6 || dist < r * 3.2;
        var gx = aligned ? tgt.x : bx, gy = aligned ? tgt.y : by, gl = Math.hypot(gx - p.x, gy - p.y) || 1;
        u.x = (gx - p.x) / gl; u.y = (gy - p.y) / gl;
        if (lv < 2) { if (!p._dz || t > p._dz.until) p._dz = { until: t + 0.8 + Math.random() * 1.2, on: Math.random() < (lv ? 0.25 : 0.5), a: Math.random() * 6.28 }; var fct = lv ? 0.8 : 0.55, jit = lv ? 0.3 : 0.6; if (p._dz.on) { u.x = Math.cos(p._dz.a); u.y = Math.sin(p._dz.a); fct = 0.45; } u.x = u.x * fct + (Math.random() - 0.5) * jit; u.y = u.y * fct + (Math.random() - 0.5) * jit; }
      }
      var l = Math.hypot(u.x, u.y);
      if (l > 1) { u.x /= l; u.y /= l; }
      return u;
    }
    function checkEnd() {
      if (ended || cd > 0) return;
      var live = tops.filter(inGame);
      if (live.length > 1) return;
      ended = true; C.turn(-1);
      if (live.length === 1) {
        var w = live[0].i;
        C.msg(C.who(w) + " is the last one spinning!");
        C.later(function () { C.finish([w], "Last blade standing."); }, 1600);
      } else {
        C.msg("Everyone fell out!");
        C.later(function () { C.finish([], "All blades left the arena.", "Nobody wins"); }, 1600);
      }
    }
    function update(dt) {
      if (cd <= 0 && cd > -1) cd -= dt; if (cd > 0) { var c0 = cd; cd -= dt; if (Math.ceil(c0) !== Math.ceil(cd)) sfx(cd > 0 ? "beep" : "go"); } else t += dt;
      R = R0 * Math.max(0.5, 1 - Math.max(0, t - [35, 25, 15][C.lv]) * 0.012);
      var A = 900 * K, dm = Math.exp(-2.2 * dt);
      tops.forEach(function (p) {
        if (p.flash > 0) p.flash -= dt;
        if (!p.alive) return;
        if (p.fall) { p.fall += dt; p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5; if (p.fall > 0.8) p.alive = false; return; }
        var u = cd > 0 ? { x: 0, y: 0 } : (C.players[p.i].cpu ? ai(p) : ctl.read(p.i));
        p.vx += u.x * A * dt; p.vy += u.y * A * dt;
        var d = Math.hypot(p.x - cx, p.y - cy);
        if (d > 1) { var pull = 120 * K * (d / R0); p.vx -= (p.x - cx) / d * pull * dt; p.vy -= (p.y - cy) / d * pull * dt; }
        p.vx *= dm; p.vy *= dm;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.ang += (16 + Math.hypot(p.vx, p.vy) * 0.03) * dt;
        if (Math.hypot(p.x - cx, p.y - cy) > R + r * 0.35) {
          p.fall = 0.001; sfx("whoosh"); spark(p.x, p.y, "#9fd0ff", 14, 260 * K, 0.6);
          if (p.lastHit >= 0 && t - p.lastT < 3 && tops[p.lastHit].alive) C.add(p.lastHit, 1);
        }
      });
      for (var a = 0; a < tops.length; a++) {
        if (!inGame(tops[a])) continue;
        for (var b = a + 1; b < tops.length; b++) {
          if (!inGame(tops[b])) continue;
          var A1 = tops[a], B1 = tops[b], dx = B1.x - A1.x, dy = B1.y - A1.y, d2 = Math.sqrt(dx * dx + dy * dy);
          if (d2 < r * 2 && d2 > 0.01) {
            var nx = dx / d2, ny = dy / d2, ov = r * 2 - d2, sA = Math.hypot(A1.vx, A1.vy), sB = Math.hypot(B1.vx, B1.vy);
            A1.x -= nx * ov / 2; A1.y -= ny * ov / 2; B1.x += nx * ov / 2; B1.y += ny * ov / 2;
            var vn = (B1.vx - A1.vx) * nx + (B1.vy - A1.vy) * ny;
            if (vn < 0) { A1.vx += vn * nx; A1.vy += vn * ny; B1.vx -= vn * nx; B1.vy -= vn * ny; }
            var sep = (B1.vx - A1.vx) * nx + (B1.vy - A1.vy) * ny, mn = 560 * K;
            if (sep < mn) { var add = (mn - sep) / 2; A1.vx -= nx * add; A1.vy -= ny * add; B1.vx += nx * add; B1.vy += ny * add; }
            var stot = sA + sB + 1, kA = (120 + 330 * sA / stot) * K, kB = (120 + 330 * sB / stot) * K;
            B1.vx += nx * kA; B1.vy += ny * kA; A1.vx -= nx * kB; A1.vy -= ny * kB;
            rings.push({ x: (A1.x + B1.x) / 2, y: (A1.y + B1.y) / 2, r: r * 0.5, life: 0.35 }); sfx("clang", Math.min(1, 0.35 + (sA + sB) / (1600 * K)));
            A1.lastHit = B1.i; A1.lastT = t; B1.lastHit = A1.i; B1.lastT = t; A1.flash = B1.flash = 0.18;
            spark((A1.x + B1.x) / 2, (A1.y + B1.y) / 2, "#ffe08a", 8, 380 * K, 0.35);
          }
        }
      }
      rings.forEach(function (q) { q.life -= dt; q.r += 300 * K * dt; });
      rings = rings.filter(function (q) { return q.life > 0; });
      parts.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; });
      parts = parts.filter(function (p) { return p.life > 0; });
      checkEnd();
    }
    function drawTop(p) {
      var s = p.fall ? Math.max(0.05, 1 - p.fall / 0.8) : 1, col = pc[p.i], k;
      g.save();
      g.translate(p.x, p.y);
      if (p.fall) g.globalAlpha = Math.max(0.15, s);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(3, 5, r * s, 0, 7); g.fill();
      g.scale(s, s);
      g.shadowColor = col; g.shadowBlur = (18) * GLOW; g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.shadowBlur = 0;
      g.lineWidth = 2; g.strokeStyle = "rgba(0,0,0,0.55)"; g.stroke();
      g.rotate(p.ang);
      g.fillStyle = "rgba(255,255,255,0.55)";
      for (k = 0; k < 4; k++) {
        g.rotate(Math.PI / 2);
        g.beginPath(); g.moveTo(r * 0.45, -r * 0.08); g.lineTo(r * 0.98, -r * 0.34); g.lineTo(r * 0.98, r * 0.02); g.closePath(); g.fill();
      }
      g.rotate(-p.ang - 2 * Math.PI);
      g.fillStyle = "#18202c"; g.beginPath(); g.arc(0, 0, r * 0.46, 0, 7); g.fill();
      g.fillStyle = "#fff"; shapePath(g, C.players[p.i].slot, 0, 0, r * 0.28); g.fill();
      if (p.flash > 0) { g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); }
      g.restore();
      if (!p.fall) {
        var name = C.players[p.i].name;
        g.font = "700 11px 'Exo 2', Arial, sans-serif"; g.textAlign = "center";
        g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,0.7)"; g.strokeText(name, p.x, p.y - r - 7); g.fillStyle = "#fff"; g.fillText(name, p.x, p.y - r - 7);
      }
    }
    function draw() {
      g.fillStyle = "#0e131a"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#06090d"; g.beginPath(); g.arc(cx, cy, R0 + r * 1.6, 0, 7); g.fill();
      var gr = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
      gr.addColorStop(0, "#5a6879"); gr.addColorStop(1, "#2b3541");
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = "rgba(255,255,255,0.09)";
      [0.33, 0.66].forEach(function (f) { g.beginPath(); g.arc(cx, cy, R * f, 0, 7); g.stroke(); });
      g.lineWidth = 4; g.strokeStyle = "#cfd8e3"; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
      g.lineWidth = 3; g.strokeStyle = "rgba(235,70,70,0.75)"; g.setLineDash([10, 8]); g.beginPath(); g.arc(cx, cy, R + 7, 0, 7); g.stroke(); g.setLineDash([]);
      tops.forEach(function (p) { if (p.alive) drawTop(p); });
      rings.forEach(function (r) { g.globalAlpha = Math.max(0, r.life / 0.35); g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.shadowColor = "#7df"; g.shadowBlur = (14) * GLOW; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.stroke(); });
      g.shadowBlur = 0;
      parts.forEach(function (p) { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.col; g.shadowColor = p.col; g.shadowBlur = (8) * GLOW; g.fillRect(p.x, p.y, p.s, p.s); });
      g.shadowBlur = 0;
      g.globalAlpha = 1;
      if (cd > -0.45) {
        var txt = cd > 2.2 ? "3" : cd > 1.2 ? "2" : cd > 0.2 ? "1" : "GO!";
        g.font = "800 " + Math.round(Math.min(W, H) * 0.2) + "px 'Exo 2', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 8; g.strokeStyle = "rgba(0,0,0,0.6)"; g.strokeText(txt, W / 2, H * 0.12 + 20); g.fillStyle = "#fff"; g.fillText(txt, W / 2, H * 0.12 + 20);
        g.textBaseline = "alphabetic";
      }
      if (t > [35, 25, 15][C.lv] && R > R0 * 0.505 && !ended) {
        g.font = "600 13px 'Exo 2', Arial, sans-serif"; g.textAlign = "center"; g.fillStyle = "#ffb4b4"; g.fillText("The arena is shrinking!", W / 2, H - 12);
      }
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!last) last = ts;
      var dt = Math.min(0.033, (ts - last) / 1000); last = ts;
      update(dt); draw();
    }
    raf = requestAnimationFrame(frame);
    return { destroy: function () { cancelAnimationFrame(raf); if (ro) ro.disconnect(); ctl.destroy(); } };
  };

  Hub.register({
    "id": "spin",
    "name": "Spin Arena",
    "hue": 5,
    "kind": "Real-time",
    "mins": 4,
    "rules": "Steer your spinning blade and crash into rivals to knock them out of the round stadium. Anyone who leaves the arena is out, and the arena shrinks as time passes. Last blade spinning wins. Computer: W A S D. Phone: drag your wheel.",
    "desc": "Ram rival spinning blades out of the stadium.",
    "icon": "<circle class=\"st\" cx=\"40\" cy=\"40\" r=\"28\"/><circle class=\"soft\" cx=\"40\" cy=\"40\" r=\"17\"/><path class=\"st\" d=\"M40 10V22M40 58V70M10 40H22M58 40H70\"/><circle class=\"fl\" cx=\"40\" cy=\"40\" r=\"5\"/>",
    "teams": false,
    "diff": "Harder levels make the computer quicker and shrink the arena sooner."
  });
})();
