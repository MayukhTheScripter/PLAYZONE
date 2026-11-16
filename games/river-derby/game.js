/* River Derby - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, GLOW = Hub.GLOW, sfx = Hub.sfx, pickOf = Hub.pickOf, makeControls = Hub.makeControls, rrPath = Hub.rrPath, shapePath = Hub.shapePath, playerColors = Hub.playerColors;

  // ---------- River Derby (cars) ----------
  ENGINES.cars = function (C) {
    var root = C.root, n = C.n, HP = 20;
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="arena"><canvas></canvas></div>';
    var arena = root.querySelector(".arena"), cv = root.querySelector("canvas"), g = cv.getContext("2d");
    var ctl = makeControls(C, arena), pc = playerColors(C);
    var W = 0, H = 0, roadW = 0, roadL = 0, roadR = 0, cx = 0, carW = 20, carH = 36, K = 1;
    var cars = [], npcs = [], parts = [], rings = [], t = 0, cd = 3.4, off = 0, spawnT = 0, ended = false, raf = 0, last = 0, ro = null;
    var NPCC = ["#8c97a3", "#b08968", "#6d8fb0", "#b06d8f", "#80a86d", "#c2b280"];
    function layout() {
      var r = arena.getBoundingClientRect(), nw = Math.max(240, Math.floor(r.width)), nh = Math.max(240, Math.floor(r.height)), dpr = window.devicePixelRatio || 1;
      cv.width = Math.floor(nw * dpr); cv.height = Math.floor(nh * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (W > 0) { var sx = nw / W, sy = nh / H; cars.concat(npcs).forEach(function (c) { c.x *= sx; c.y *= sy; }); }
      W = nw; H = nh;
      roadW = Math.min(W * 0.74, 460); cx = W / 2; roadL = cx - roadW / 2; roadR = cx + roadW / 2;
      carW = Math.min(roadW / 8.5, 40); carH = carW * 1.75; K = roadW / 420;
    }
    layout();
    var i;
    for (i = 0; i < n; i++) cars.push({ i: i, x: roadL + roadW * (i + 1) / (n + 1), y: H * 0.74, vx: 0, vy: 0, ang: 0, hp: HP, alive: true, fall: 0, flash: 0, m: 1, boom: 0 });
    cars.forEach(function (c) { C.set(c.i, HP); });
    C.msg(ctl.hint("Knock rivals into the river!"));
    if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(arena); }

    function spark(x, y, col, cnt, sp, life) {
      for (var k = 0; k < cnt; k++) parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * sp, vy: (Math.random() - 0.5) * sp, life: (life || 0.45) * (0.6 + Math.random() * 0.6), max: life || 0.45, col: col, s: 1.5 + Math.random() * 2.5 });
    }
    function inGame(c) { return c.alive && !c.fall; }
    function circ(c) { var o = carH * 0.2; return [{ x: c.x, y: c.y - o }, { x: c.x, y: c.y + o }]; }
    function bump(a, b) {
      var ca = circ(a), cb = circ(b), rr = carW * 0.56, k, l;
      for (k = 0; k < 2; k++) for (l = 0; l < 2; l++) {
        var dx = cb[l].x - ca[k].x, dy = cb[l].y - ca[k].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < rr * 2 && d > 0.01) {
          var nx = dx / d, ny = dy / d, ov = rr * 2 - d, tot = a.m + b.m;
          a.x -= nx * ov * b.m / tot; a.y -= ny * ov * b.m / tot; b.x += nx * ov * a.m / tot; b.y += ny * ov * a.m / tot;
          var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) { var j = -(1.85) * vn / (1 / a.m + 1 / b.m); a.vx -= j * nx / a.m; a.vy -= j * ny / a.m; b.vx += j * nx / b.m; b.vy += j * ny / b.m; }
          var sep = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny, mn = 300 * K;
          if (sep < mn) { var add = mn - sep; a.vx -= nx * add * b.m / tot; a.vy -= ny * add * b.m / tot; b.vx += nx * add * a.m / tot; b.vy += ny * add * a.m / tot; }
          spark((ca[k].x + cb[l].x) / 2, (ca[k].y + cb[l].y) / 2, "#ffd36b", 5, 220 * K, 0.35); sfx("thud", 0.8);
          return true;
        }
      }
      return false;
    }
    function damage(c) {
      c.hp--; c.flash = 0.25; C.set(c.i, c.hp); sfx("crash");
      if (c.hp <= 0) {
        c.alive = false; c.boom = 1; sfx("boom");
        spark(c.x, c.y, "#ffb347", 40, 460 * K, 0.9); spark(c.x, c.y, "#ff5a1f", 26, 320 * K, 0.8); spark(c.x, c.y, "#222", 18, 260 * K, 1.1);
        rings.push({ x: c.x, y: c.y, r: carW * 0.4, life: 0.6 });
        npcs.push({ x: c.x, y: c.y, vx: c.vx * 0.5, vy: c.vy * 0.5 + 40 * K, base: (200 + Math.min(220, t * 4)) * K * 0.55, ang: c.ang, m: 2.4, col: "#2a2623", cd: {}, flash: 0, wreck: true, pc: pc[c.i], fx: 0 });
      }
    }
    function ai(c) {
      var lv = C.lv, hard = lv === 2, u = { x: 0, y: 0 }, look = carH * [3, 3.8, 4.6][lv], near = null, nd = 1e9;
      npcs.forEach(function (p) {
        var dy = c.y - p.y;
        if (dy > -carH * 0.9 && dy < look && Math.abs(p.x - c.x) < carW * 1.5) { var d = Math.abs(dy); if (d < nd) { nd = d; near = p; } }
      });
      if (near) { u.x = c.x >= near.x ? 1 : -1; u.y = 0.2; }
      else {
        var tgt = null, td = 1e9;
        cars.forEach(function (o) { if (o !== c && inGame(o)) { var d = Math.abs(o.x - c.x) + Math.abs(o.y - c.y); if (d < td) { td = d; tgt = o; } } });
        if (tgt) {
          var side = (tgt.x - cx) >= 0 ? 1 : -1, bx = tgt.x - side * carW * 1.05;
          if (Math.abs(c.x - bx) > carW * 0.45 || Math.abs(c.y - tgt.y) > carH * 0.9) { u.x = Math.max(-1, Math.min(1, (bx - c.x) / (carW * 1.2))); u.y = Math.max(-1, Math.min(1, (tgt.y - c.y) / (carH * 1.2))); }
          else u.x = side;
          if (lv < 2) { var fct = lv ? 0.7 : 0.45; u.x *= fct; u.y *= fct; }
        }
      }
      if (lv < 2) { if (!c._dz || t > c._dz.until) c._dz = { until: t + 0.8 + Math.random() * 1.2, on: Math.random() < (lv ? 0.28 : 0.5), vx: Math.random() * 2 - 1 }; if (c._dz.on && !near) { u.x = c._dz.vx * 0.5; u.y = 0; } }
      var mg = carW * [0.45, 0.9, 1.3][lv], st = [0.45, 0.75, 0.9][lv];
      if (c.x < roadL + mg) u.x = Math.max(u.x, st);
      if (c.x > roadR - mg) u.x = Math.min(u.x, -st);
      u.y += (H * 0.72 - c.y) / H * 1.2;
      var l = Math.sqrt(u.x * u.x + u.y * u.y);
      if (l > 1) { u.x /= l; u.y /= l; }
      return u;
    }
    function spawn() {
      for (var tries = 0; tries < 6; tries++) {
        var x = roadL + carW * 0.9 + Math.random() * (roadW - carW * 1.8), ok = true;
        npcs.forEach(function (p) { if (p.y < carH * 2.6 && Math.abs(p.x - x) < carW * 1.5) ok = false; });
        if (!ok) continue;
        var scroll = 200 + Math.min(220, t * 4), base = scroll * K * (0.3 + Math.random() * 0.35);
        npcs.push({ x: x, y: -carH, vx: 0, vy: base, base: base, ang: 0, m: 1.5, col: pickOf(NPCC), cd: {}, flash: 0 });
        return;
      }
    }
    function checkEnd() {
      if (ended || cd > 0) return;
      var live = cars.filter(inGame);
      if (live.length > 1) return;
      ended = true; C.turn(-1);
      if (live.length === 1) {
        var w = live[0].i;
        C.msg(C.who(w) + " is the last car standing!");
        C.later(function () { C.finish([w], "Last car on the road."); }, 1600);
      } else {
        C.msg("Everyone is out!");
        C.later(function () { C.finish([], "All cars were lost.", "Nobody wins"); }, 1600);
      }
    }
    function update(dt) {
      var scroll = (200 + Math.min(220, Math.max(0, t) * 4)) * K * [0.85, 1, 1.18][C.lv];
      off += scroll * dt;
      if (cd <= 0 && cd > -1) cd -= dt; if (cd > 0) { var c0 = cd; cd -= dt; if (Math.ceil(c0) !== Math.ceil(cd)) sfx(cd > 0 ? "beep" : "go"); if (cd <= 0) { t = 0; spawnT = 0.4; } }
      else {
        t += dt; spawnT -= dt;
        if (spawnT <= 0) { spawn(); spawnT = Math.max(0.3, ([1.5, 1.1, 0.8][C.lv]) - t * 0.012); }
      }
      cars.forEach(function (c) {
        if (c.flash > 0) c.flash -= dt;
        if (!c.alive) return;
        if (c.fall) { c.fall += dt; c.x += c.vx * dt * 0.4; c.y += c.vy * dt * 0.4; if (c.fall > 0.8) c.alive = false; return; }
        var u = cd > 0 ? { x: 0, y: 0 } : (C.players[c.i].cpu ? ai(c) : ctl.read(c.i)), ACC = 800 * K, dm = Math.exp(-2.6 * dt);
        c.vx += u.x * ACC * dt; c.vy += u.y * ACC * dt; c.vx *= dm; c.vy *= dm;
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.ang += (c.vx * 0.0016 / K - c.ang) * Math.min(1, 10 * dt);
        var mn = carH * 0.65;
        if (c.y < mn) { c.y = mn; if (c.vy < 0) c.vy = 0; }
        if (c.y > H - mn) { c.y = H - mn; if (c.vy > 0) c.vy = 0; }
        if (c.x < roadL + 2 || c.x > roadR - 2) { c.fall = 0.001; sfx("splash"); spark(c.x, c.y, "#bfe6ff", 20, 300 * K, 0.7); }
      });
      npcs.forEach(function (p) {
        p.vy += (p.base - p.vy) * Math.min(1, 2 * dt); p.vx *= Math.exp(-1.6 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt; p.ang += (p.vx * 0.0016 / K - p.ang) * Math.min(1, 8 * dt);
        if (p.flash > 0) p.flash -= dt;
      });
      for (var a = 0; a < cars.length; a++) {
        if (!inGame(cars[a])) continue;
        for (var b = a + 1; b < cars.length; b++) if (inGame(cars[b])) bump(cars[a], cars[b]);
        for (var q = 0; q < npcs.length; q++) {
          if (bump(cars[a], npcs[q])) {
            npcs[q].flash = 0.15;
            if (!npcs[q].wreck && t - (npcs[q].cd[a] === undefined ? -9 : npcs[q].cd[a]) > 0.5) { npcs[q].cd[a] = t; damage(cars[a]); }
          }
        }
      }
      for (var z = 0; z < npcs.length; z++) {
        for (var y2 = z + 1; y2 < npcs.length; y2++) bump(npcs[z], npcs[y2]);
      }
      npcs = npcs.filter(function (p) { return p.y < H + carH * 2 && p.x > roadL - carW * 2 && p.x < roadR + carW * 2; });
      npcs.forEach(function (p) {
        if (!p.wreck) return;
        p.fx -= dt;
        if (p.fx <= 0) {
          p.fx = 0.035;
          parts.push({ x: p.x + (Math.random() - 0.5) * carW * 0.6, y: p.y + (Math.random() - 0.5) * carH * 0.4, vx: (Math.random() - 0.5) * 30 * K, vy: -60 * K - Math.random() * 60 * K, life: 0.45, max: 0.45, col: Math.random() < 0.5 ? "#ffb347" : "#ff4d1f", s: 3 + Math.random() * 4, glow: 1 });
          if (Math.random() < 0.7) parts.push({ x: p.x + (Math.random() - 0.5) * carW * 0.5, y: p.y - carH * 0.2, vx: (Math.random() - 0.5) * 25 * K, vy: -40 * K - Math.random() * 50 * K, life: 1.5, max: 1.5, col: "#555", s: 5 + Math.random() * 5, grow: 14 * K, smoke: 1 });
        }
      });
      rings.forEach(function (r) { r.life -= dt; r.r += 260 * K * dt; });
      rings = rings.filter(function (r) { return r.life > 0; });
      parts.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; if (p.grow) p.s += p.grow * dt; });
      parts = parts.filter(function (p) { return p.life > 0; });
      checkEnd();
    }
    function drawWreck(c) {
      g.save(); g.translate(c.x, c.y); g.rotate(c.ang + 0.35);
      g.fillStyle = "rgba(0,0,0,0.4)"; rrPath(g, -carW / 2 + 3, -carH / 2 + 4, carW, carH, carW * 0.3); g.fill();
      g.fillStyle = "#26221f"; rrPath(g, -carW / 2, -carH / 2, carW, carH, carW * 0.3); g.fill();
      g.fillStyle = c.pc; g.globalAlpha = 0.35; rrPath(g, -carW / 2, -carH * 0.1, carW * 0.55, carH * 0.4, 3); g.fill(); g.globalAlpha = 1;
      g.fillStyle = "#100e0d"; rrPath(g, -carW * 0.34, carH * 0.14, carW * 0.7, carH * 0.2, 3); g.fill();
      g.strokeStyle = "rgba(220,230,255,0.55)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-carW * 0.3, -carH * 0.3); g.lineTo(carW * 0.05, -carH * 0.16); g.lineTo(carW * 0.3, -carH * 0.3); g.moveTo(carW * 0.05, -carH * 0.16); g.lineTo(-carW * 0.05, -carH * 0.08); g.stroke();
      g.strokeStyle = "#7a3a12"; g.lineWidth = 2; g.beginPath(); g.moveTo(-carW / 2, -carH / 2); g.lineTo(-carW * 0.1, -carH * 0.34); g.moveTo(carW / 2, carH / 2); g.lineTo(carW * 0.12, carH * 0.3); g.stroke();
      g.restore();
    }
    function drawCar(c, col, name, slot) {
      if (c.wreck) { drawWreck(c); return; }
      var s = c.fall ? Math.max(0.05, 1 - c.fall / 0.8) : 1;
      g.save();
      g.translate(c.x, c.y); g.rotate(c.ang); g.scale(s, s);
      if (c.fall) g.globalAlpha = Math.max(0.1, s);
      g.fillStyle = "rgba(0,0,0,0.3)"; rrPath(g, -carW / 2 + 3, -carH / 2 + 4, carW, carH, carW * 0.3); g.fill();
      g.fillStyle = "#111";
      g.fillRect(-carW / 2 - 2, -carH * 0.34, 3, carH * 0.22); g.fillRect(carW / 2 - 1, -carH * 0.34, 3, carH * 0.22);
      g.fillRect(-carW / 2 - 2, carH * 0.14, 3, carH * 0.22); g.fillRect(carW / 2 - 1, carH * 0.14, 3, carH * 0.22);
      if (slot >= 0) { g.shadowColor = col; g.shadowBlur = (14) * GLOW; }
      g.fillStyle = col; rrPath(g, -carW / 2, -carH / 2, carW, carH, carW * 0.3); g.fill(); g.shadowBlur = 0;
      g.lineWidth = 1.5; g.strokeStyle = "rgba(0,0,0,0.55)"; g.stroke();
      g.fillStyle = "rgba(10,18,30,0.65)"; rrPath(g, -carW * 0.36, -carH * 0.3, carW * 0.72, carH * 0.2, 3); g.fill();
      rrPath(g, -carW * 0.34, carH * 0.14, carW * 0.68, carH * 0.14, 3); g.fill();
      g.fillStyle = "#ffe9a8"; g.shadowColor = "#fff2b8"; g.shadowBlur = (10) * GLOW; g.fillRect(-carW * 0.4, -carH / 2, carW * 0.22, 3); g.fillRect(carW * 0.18, -carH / 2, carW * 0.22, 3); g.shadowBlur = 0;
      g.fillStyle = "#ff3a3a"; g.fillRect(-carW * 0.4, carH / 2 - 3, carW * 0.2, 3); g.fillRect(carW * 0.2, carH / 2 - 3, carW * 0.2, 3);
      if (slot >= 0) { g.fillStyle = "rgba(255,255,255,0.92)"; shapePath(g, slot, 0, -carH * 0.02, carW * 0.2); g.fill(); }
      if (c.flash > 0) { g.fillStyle = "rgba(255,255,255,0.6)"; rrPath(g, -carW / 2, -carH / 2, carW, carH, carW * 0.3); g.fill(); }
      g.restore();
      if (name && !c.fall) {
        g.font = "700 11px 'Exo 2', Arial, sans-serif"; g.textAlign = "center";
        g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,0.7)"; g.strokeText(name, c.x, c.y - carH * 0.75 - 7); g.fillStyle = "#fff"; g.fillText(name, c.x, c.y - carH * 0.75 - 7);
        var bw = carW * 1.1, bx = c.x - bw / 2, by = c.y - carH * 0.75 - 4;
        g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(bx, by, bw, 3); g.fillStyle = c.hp > 6 ? "#4ade80" : "#f87171"; g.fillRect(bx, by, bw * Math.max(0, c.hp) / HP, 3);
      }
    }
    function draw() {
      var y, k, o;
      var rg = g.createLinearGradient(0, 0, W, 0); rg.addColorStop(0, "#06203f"); rg.addColorStop(0.5, "#0a3a6b"); rg.addColorStop(1, "#06203f");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(120,220,255,0.22)";
      var step = 46; o = off % step;
      for (y = -step; y < H + step; y += step) for (k = 0; k < 3; k++) {
        var yy = y + o + k * 15, xl = (roadL - 24) * (0.15 + 0.3 * k), xr = roadR + 6 + (W - roadR - 24) * (0.15 + 0.3 * k);
        g.fillRect(xl, yy, 18, 3); g.fillRect(xr, yy + 9, 18, 3);
      }
      g.fillStyle = "#16181f"; g.fillRect(roadL, 0, roadW, H);
      g.fillStyle = "rgba(255,255,255,0.03)"; for (y = 0; y < H; y += 4) g.fillRect(roadL, y, roadW, 1);
      var cs2 = 24; o = off % (cs2 * 2);
      for (y = -cs2 * 2; y < H + cs2 * 2; y += cs2) {
        var odd = Math.round((y) / cs2) % 2 === 0;
        g.fillStyle = odd ? "#c25a78" : "#5aa9bd"; g.shadowColor = g.fillStyle; g.shadowBlur = (10) * GLOW;
        g.fillRect(roadL, y + o, 6, cs2); g.fillRect(roadR - 6, y + o, 6, cs2);
      }
      g.shadowBlur = 0;
      g.fillStyle = "rgba(255,255,255,0.4)"; o = off % 64;
      for (k = 1; k < 4; k++) for (y = -64; y < H + 64; y += 64) g.fillRect(roadL + roadW * k / 4 - 2, y + o, 4, 30);
      npcs.forEach(function (p) { drawCar(p, p.col, "", -1); });
      cars.forEach(function (c) { if (c.alive && !c.boom) drawCar(c, pc[c.i], C.players[c.i].name, C.players[c.i].slot); });
      rings.forEach(function (r) { g.globalAlpha = Math.max(0, r.life / 0.6); g.strokeStyle = "#ffb347"; g.lineWidth = 3; g.shadowColor = "#ff7a2a"; g.shadowBlur = (14) * GLOW; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.stroke(); });
      g.shadowBlur = 0; g.globalAlpha = 1;
      parts.forEach(function (p) {
        var a = Math.max(0, p.life / p.max);
        if (p.smoke) { g.globalAlpha = a * 0.5; g.fillStyle = "#6b6b70"; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); return; }
        g.globalAlpha = a; g.fillStyle = p.col;
        if (p.glow) { g.shadowColor = p.col; g.shadowBlur = (10) * GLOW; g.beginPath(); g.arc(p.x, p.y, p.s * a + 1, 0, 7); g.fill(); g.shadowBlur = 0; }
        else g.fillRect(p.x, p.y, p.s, p.s);
      });
      g.globalAlpha = 1;
      if (cd > -0.45) {
        var txt = cd > 2.4 ? "3" : cd > 1.4 ? "2" : cd > 0.4 ? "1" : "GO!";
        g.font = "800 " + Math.round(Math.min(W, H) * 0.2) + "px 'Exo 2', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 8; g.strokeStyle = "rgba(0,0,0,0.6)"; g.strokeText(txt, W / 2, H * 0.4); g.fillStyle = "#fff"; g.fillText(txt, W / 2, H * 0.4);
        g.textBaseline = "alphabetic";
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
    "id": "cars",
    "name": "River Derby",
    "hue": 215,
    "kind": "Real-time",
    "mins": 5,
    "rules": "Drive on the road and dodge the other cars. Every crash with a traffic car damages yours, and 20 hits destroy it (a burning wreck stays on the road). Ram rival players toward the river on either side. A car that falls in is out. Last car on the road wins. Computer: W A S D. Phone: drag your wheel.",
    "desc": "Dodge traffic and shove rival cars into the river.",
    "icon": "<path class=\"st\" d=\"M20 8L14 72M60 8L66 72\"/><path class=\"soft\" d=\"M4 8H18L12 72H4ZM62 8H76V72H68Z\"/><rect class=\"fl\" x=\"30\" y=\"40\" width=\"18\" height=\"30\" rx=\"6\"/><rect class=\"st\" x=\"36\" y=\"10\" width=\"16\" height=\"26\" rx=\"5\"/>",
    "teams": false,
    "diff": "Harder levels bring more traffic on a faster road, and a sharper computer driver."
  });
})();
