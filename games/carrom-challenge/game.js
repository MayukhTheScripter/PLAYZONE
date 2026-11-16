/* Carrom Challenge - flick the striker, pocket the coins. 1-4 players, hot-seat (the board turns to face you). */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, esc = Hub.esc, Kit = Hub.Kit;
  var S = 400, CX = 200, CY = 200, IN = 22, POCK = 21, RC = 10.5, RS = 13, DT = 1 / 240, BASE = 135, SLIDE = 105;
  var THETA = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
  var PTS = { b: 10, w: 20, q: 50 };
  var CORNERS = [[IN, IN], [S - IN, IN], [IN, S - IN], [S - IN, S - IN]];

  function newCoins() {
    var c = [{ x: CX, y: CY, vx: 0, vy: 0, t: "q", on: true }], i, a;
    for (i = 0; i < 6; i++) { a = i * Math.PI / 3; c.push({ x: CX + Math.cos(a) * 22.5, y: CY + Math.sin(a) * 22.5, vx: 0, vy: 0, t: i % 2 ? "w" : "b", on: true }); }
    for (i = 0; i < 12; i++) { a = i * Math.PI / 6 + 0.26; c.push({ x: CX + Math.cos(a) * 44, y: CY + Math.sin(a) * 44, vx: 0, vy: 0, t: i % 2 ? "b" : "w", on: true }); }
    return c;
  }
  /* advance the world by one fixed step. W = {coins, st}; ev collects {k:'wall'|'hit'|'pocket', c}. */
  function step(W, ev) {
    var all = W.coins.concat([W.st]), i, j, a, b, f = Math.exp(-1.7 * DT);
    for (i = 0; i < all.length; i++) {
      a = all[i]; if (!a.on) continue; a.x += a.vx * DT; a.y += a.vy * DT; a.vx *= f; a.vy *= f;
      if (Math.abs(a.vx) + Math.abs(a.vy) < 5) a.vx = a.vy = 0;
      var r = a.r || RC, lo = IN + 0 + r - 4 + 4, hi = S - IN - r + 0;
      lo = 16 + r; hi = S - 16 - r;
      if (a.x < lo) { a.x = lo; a.vx = Math.abs(a.vx) * 0.82; ev && ev.push({ k: "wall", v: Math.abs(a.vx) }); } else if (a.x > hi) { a.x = hi; a.vx = -Math.abs(a.vx) * 0.82; ev && ev.push({ k: "wall", v: Math.abs(a.vx) }); }
      if (a.y < lo) { a.y = lo; a.vy = Math.abs(a.vy) * 0.82; ev && ev.push({ k: "wall", v: Math.abs(a.vy) }); } else if (a.y > hi) { a.y = hi; a.vy = -Math.abs(a.vy) * 0.82; ev && ev.push({ k: "wall", v: Math.abs(a.vy) }); }
      for (j = 0; j < 4; j++) if (Math.hypot(a.x - CORNERS[j][0], a.y - CORNERS[j][1]) < POCK) { a.on = false; a.vx = a.vy = 0; ev && ev.push({ k: "pocket", c: a }); break; }
    }
    for (i = 0; i < all.length; i++) for (j = i + 1; j < all.length; j++) {
      a = all[i]; b = all[j]; if (!a.on || !b.on) continue;
      var dx = b.x - a.x, dy = b.y - a.y, rr = (a.r || RC) + (b.r || RC), d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 === 0) continue;
      var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ma = a.m || 1, mb = b.m || 1, ov = rr - d;
      a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb); b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
      var rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { var imp = -(1 + 0.92) * rv / (1 / ma + 1 / mb); a.vx -= imp * nx / ma; a.vy -= imp * ny / ma; b.vx += imp * nx / mb; b.vy += imp * ny / mb; ev && ev.push({ k: "hit", v: -rv }); }
    }
  }
  function moving(W) { return W.coins.concat([W.st]).some(function (a) { return a.on && (a.vx || a.vy); }); }
  function clone(coins) { return coins.map(function (c) { return { x: c.x, y: c.y, vx: 0, vy: 0, t: c.t, on: c.on }; }); }
  function mkStriker(x, y, vx, vy) { return { x: x, y: y, vx: vx || 0, vy: vy || 0, r: RS, m: 2.2, on: true, t: "s" }; }

  ENGINES.carrom = function (C) {
    var n = C.n, lv = C.lv, coins = newCoins(), scores = [], cur = 0, sx = 0, phase = "aim", W = null, drag = null, pocketed = [], foul = false, lastPocketed = [], over = false, stopLoop, evBuf = [], thinking = false, i;
    for (i = 0; i < n; i++) { scores.push(0); C.set(i, 0); }
    C.root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="cr-wrap"><div class="cr-board"></div><div class="cr-ctl"><label>Slide the striker <input type="range" class="cr-sl" min="-' + SLIDE + '" max="' + SLIDE + '" value="0" step="1"></label><button type="button" class="btn cr-go">Shoot ▶ (hold power)</button></div></div>';
    var board = C.root.querySelector(".cr-board"), sl = C.root.querySelector(".cr-sl"), ctl = C.root.querySelector(".cr-ctl"), goB = C.root.querySelector(".cr-go");
    goB.style.display = "none";
    var view = Kit.tall(board, S, S), g = view.g;
    function th() { return THETA[cur % 4]; }
    function strikerPos(o) { var t = th(), vx = o, vy = BASE, c = Math.cos(t), s = Math.sin(t); return { x: CX + vx * c - vy * s, y: CY + vx * s + vy * c }; }
    function toBoard(cx, cy) { var l = view.toLogical(cx, cy), t = th(), vx = l.x - CX, vy = l.y - CY, c = Math.cos(t), s = Math.sin(t); return { x: CX + vx * c - vy * s, y: CY + vx * s + vy * c }; }
    function free(o) { var p = strikerPos(o); return !coins.some(function (c) { return c.on && Math.hypot(c.x - p.x, c.y - p.y) < RC + RS + 1; }); }
    function nearestFree() { if (free(sx)) return; for (var d = 3; d <= 2 * SLIDE; d += 3) { if (sx + d <= SLIDE && free(sx + d)) { sx += d; return; } if (sx - d >= -SLIDE && free(sx - d)) { sx -= d; return; } } }
    function turnMsg() { C.turn(cur); C.msg(C.who(cur) + (C.players[cur].cpu ? " is aiming…" : ": slide the striker, then pull back anywhere and let go to flick.")); }
    function startTurn() {
      if (over) return; phase = "aim"; foul = false; pocketed = []; sx = 0; sl.value = 0; nearestFree(); sl.value = sx; drag = null; ctl.style.display = C.players[cur].cpu ? "none" : ""; turnMsg();
      if (C.players[cur].cpu) { thinking = true; C.later(cpuShoot, 700); }
    }
    function shoot(ang, pw) {
      var p = strikerPos(sx); if (!free(sx)) { C.msg("A coin is in the way - slide the striker."); return false; }
      var sp = 260 + pw * 1250; W = { coins: coins, st: mkStriker(p.x, p.y, Math.cos(ang) * sp, Math.sin(ang) * sp) }; phase = "moving"; pocketed = []; foul = false; evBuf = []; sfx("cue"); ctl.style.display = "none"; return true;
    }
    function endShot() {
      var pts = 0, got = [], k;
      pocketed.forEach(function (c) { if (c.t === "s") return; pts += PTS[c.t]; got.push(c); });
      var fl = !W.st.on;
      if (fl) {
        scores[cur] = Math.max(0, scores[cur] - 10); got = [];
        var back = lastPocketed.length ? lastPocketed.pop() : null;
        if (back && !back.on) { back.on = true; back.x = CX; back.y = CY; back.vx = back.vy = 0; if (!free2(back)) { back.x = CX + 18; back.y = CY + 12; } }
        C.msg(C.who(cur) + " pocketed the striker: foul, −10" + (back ? " and a coin returns to the centre." : "."));
        sfx("bad");
      } else if (pts) { scores[cur] += pts; got.forEach(function (c) { lastPocketed.push(c); }); sfx("score"); C.msg(C.who(cur) + " scores " + pts + "! Shoot again."); }
      C.set(cur, scores[cur]);
      if (!coins.some(function (c) { return c.on; })) return finish();
      var again = !fl && pts > 0; if (!again) cur = (cur + 1) % n;
      C.later(startTurn, 1100); phase = "wait";
    }
    function free2(c) { return !coins.some(function (o) { return o !== c && o.on && Math.hypot(o.x - c.x, o.y - c.y) < 2 * RC; }); }
    function finish() { over = true; var b = Math.max.apply(null, scores), w = []; scores.forEach(function (s, k) { if (s === b) w.push(k); }); C.finish(w, "Top score: " + b + "."); }
    // ---- Computer ----
    function simShot(sxv, ang, pw) {
      var p = strikerPos(sxv), cc = clone(coins), sp = 260 + pw * 1250, Wd = { coins: cc, st: mkStriker(p.x, p.y, Math.cos(ang) * sp, Math.sin(ang) * sp) }, ev = [], pts = 0, k = 0;
      while (moving(Wd) && k++ < 1500) step(Wd, ev);
      ev.forEach(function (e) { if (e.k === "pocket" && e.c.t !== "s") pts += PTS[e.c.t]; });
      return pts - (Wd.st.on ? 0 : 40);
    }
    function cpuShoot() {
      if (over) return; var best = null, tries = [6, 16, 34][lv], live = coins.filter(function (c) { return c.on; }), k;
      for (k = 0; k < tries; k++) {
        var s = Kit.rnd(-SLIDE, SLIDE); if (!free(s)) continue; var p = strikerPos(s), c = Kit.pick(live), pk = CORNERS[Kit.ri(0, 3)];
        var dx = pk[0] - c.x, dy = pk[1] - c.y, d = Math.hypot(dx, dy) || 1, gx = c.x - dx / d * (RC + RS), gy = c.y - dy / d * (RC + RS);
        var ang = Math.atan2(gy - p.y, gx - p.x), pw = Kit.rnd(0.45, 0.95), sc = simShot(s, ang, pw);
        if (!best || sc > best.sc) best = { sx: s, ang: ang, pw: pw, sc: sc };
      }
      if (!best) { for (var s2 = -SLIDE; s2 <= SLIDE; s2 += 15) if (free(s2)) { best = { sx: s2, ang: Math.atan2(CY - strikerPos(s2).y, CX - strikerPos(s2).x), pw: 0.7, sc: 0 }; break; } }
      if (!best) { thinking = false; cur = (cur + 1) % n; return startTurn(); }
      sx = best.sx; sl.value = sx;
      var err = [0.09, 0.035, 0.008][lv] * (Math.random() * 2 - 1); thinking = false; shoot(best.ang + err, best.pw);
    }
    // ---- input ----
    board.style.touchAction = "none";
    function canAim() { return phase === "aim" && !C.players[cur].cpu && !over; }
    board.addEventListener("pointerdown", function (e) {
      if (!canAim()) return; var b = toBoard(e.clientX, e.clientY), sp = strikerPos(sx), pb = toLocalX(b);
      drag = Math.hypot(b.x - sp.x, b.y - sp.y) < RS * 2.4 ? { slide: true } : { a: b, b: b };
      board.setPointerCapture && board.setPointerCapture(e.pointerId);
    });
    function toLocalX(b) { var t = th(), dx = b.x - CX, dy = b.y - CY; return dx * Math.cos(t) + dy * Math.sin(t); }
    board.addEventListener("pointermove", function (e) {
      if (!drag) return; var b = toBoard(e.clientX, e.clientY);
      if (drag.slide) { var v = Kit.clamp(Math.round(toLocalX(b)), -SLIDE, SLIDE); sx = v; sl.value = v; } else drag.b = b;
    });
    function release() {
      if (!drag) return; var d = drag; drag = null; if (d.slide) return; var vx = d.a.x - d.b.x, vy = d.a.y - d.b.y, len = Math.hypot(vx, vy);
      if (len < 12) return; shoot(Math.atan2(vy, vx), Kit.clamp(len / 85, 0.12, 1));
    }
    board.addEventListener("pointerup", release); board.addEventListener("pointercancel", function () { drag = null; });
    sl.addEventListener("input", function () { if (canAim()) { sx = +sl.value; } });
    var keys = Kit.keys(function () {});
    // ---- loop + draw ----
    function draw() {
      view.begin("#0b1220");
      g.save(); g.translate(CX, CY); g.rotate(-th()); g.translate(-CX, -CY);
      g.fillStyle = "#5b3a1e"; g.fillRect(0, 0, S, S); g.fillStyle = "#e3c288"; g.fillRect(16, 16, S - 32, S - 32);
      g.strokeStyle = "#8b5a2b"; g.lineWidth = 2; g.strokeRect(16, 16, S - 32, S - 32);
      g.beginPath(); g.arc(CX, CY, 56, 0, 7); g.stroke(); g.beginPath(); g.arc(CX, CY, 8, 0, 7); g.fillStyle = "#c33"; g.fill();
      for (var q = 0; q < 4; q++) { g.save(); g.translate(CX, CY); g.rotate(q * Math.PI / 2); g.strokeStyle = "#8b5a2b"; g.beginPath(); g.moveTo(-SLIDE - 15, BASE + 14); g.lineTo(SLIDE + 15, BASE + 14); g.moveTo(-SLIDE - 15, BASE - 14); g.lineTo(SLIDE + 15, BASE - 14); g.stroke(); g.fillStyle = "#b33"; g.beginPath(); g.arc(-SLIDE - 15, BASE, 7, 0, 7); g.arc(SLIDE + 15, BASE, 7, 0, 7); g.fill(); g.restore(); }
      CORNERS.forEach(function (c) { g.fillStyle = "#1a0f08"; g.beginPath(); g.arc(c[0] - (c[0] < CX ? 6 : -6), c[1] - (c[1] < CY ? 6 : -6), POCK, 0, 7); g.fill(); });
      coins.forEach(function (c) { if (!c.on) return; coin(c.x, c.y, RC, c.t === "b" ? "#242424" : c.t === "w" ? "#f6efdd" : "#d8302c"); });
      var st = W && phase === "moving" ? W.st : null, sp = strikerPos(sx);
      if (st) { if (st.on) coin(st.x, st.y, RS, "#4aa3ff"); } else if (phase === "aim") {
        coin(sp.x, sp.y, RS, free(sx) ? "#4aa3ff" : "#ff5b5b");
        if (drag && !drag.slide) {
          var vx = drag.a.x - drag.b.x, vy = drag.a.y - drag.b.y, len = Math.hypot(vx, vy);
          if (len > 6) {
            var u = Math.min(1, len / 85), a = Math.atan2(vy, vx), dx = Math.cos(a), dy = Math.sin(a), tHit = 1e9, hc = null, lo = 16 + RS, hi = S - 16 - RS;
            coins.forEach(function (c) { if (!c.on) return; var rx = c.x - sp.x, ry = c.y - sp.y, pr = rx * dx + ry * dy; if (pr <= 0) return; var d2 = rx * rx + ry * ry - pr * pr, R = RC + RS; if (d2 > R * R) return; var t = pr - Math.sqrt(R * R - d2); if (t < tHit) { tHit = t; hc = c; } });
            [dx > 0 ? (hi - sp.x) / dx : dx < 0 ? (lo - sp.x) / dx : 1e9, dy > 0 ? (hi - sp.y) / dy : dy < 0 ? (lo - sp.y) / dy : 1e9].forEach(function (t) { if (t > 0 && t < tHit) { tHit = t; hc = null; } });
            var ex = sp.x + dx * tHit, ey = sp.y + dy * tHit;
            g.strokeStyle = "rgba(255,255,255,0.85)"; g.setLineDash([7, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
            g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 2; g.beginPath(); g.arc(ex, ey, RS, 0, 7); g.stroke();
            if (hc) { var nx = hc.x - ex, ny = hc.y - ey, nl = Math.hypot(nx, ny) || 1; g.strokeStyle = "#ffd54a"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(hc.x, hc.y); g.lineTo(hc.x + nx / nl * 46, hc.y + ny / nl * 46); g.stroke(); }
            g.fillStyle = "hsl(" + (120 - u * 120) + ",90%,55%)"; g.fillRect(sp.x - 30, sp.y + 22, 60 * u, 6); g.strokeStyle = "#fff8"; g.lineWidth = 1; g.strokeRect(sp.x - 30, sp.y + 22, 60, 6);
          }
        }
      }
      g.restore(); view.end();
    }
    function coin(x, y, r, c) { g.fillStyle = "#0005"; g.beginPath(); g.arc(x + 1.5, y + 2, r, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = "#0006"; g.lineWidth = 1.2; g.stroke(); g.fillStyle = "#ffffff44"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7); g.fill(); }
    var acc = 0;
    stopLoop = Kit.loop(function (dt) {
      if (over) return;
      if (phase === "aim" && !C.players[cur].cpu) { var kx = (keys.down.ArrowLeft || keys.down.KeyA ? -1 : 0) + (keys.down.ArrowRight || keys.down.KeyD ? 1 : 0); if (kx) { sx = Kit.clamp(sx + kx * 120 * dt, -SLIDE, SLIDE); sl.value = sx; } }
      if (phase === "moving") {
        acc += dt; var guard = 0, ev = [];
        while (acc >= DT && guard++ < 60) { acc -= DT; step(W, ev); }
        ev.forEach(function (e) { if (e.k === "pocket") { pocketed.push(e.c); sfx("pocket"); } else if (e.k === "hit" && e.v > 40) sfx("ball", Math.min(1, e.v / 600)); else if (e.k === "wall" && e.v > 60) sfx("cushion", Math.min(1, e.v / 600)); });
        if (!moving(W)) endShot();
      }
      draw();
    });
    window.__PZ_TEST = { st: function () { return { phase: phase, cur: cur, scores: scores.slice(), left: coins.filter(function (c) { return c.on; }).length }; }, shoot: function (a, p) { return shoot(a, p); } };
    startTurn();
    return { destroy: function () { over = true; stopLoop && stopLoop(); keys.destroy(); view.destroy(); } };
  };

  Hub.register({
    "id": "carrom", "name": "Carrom Challenge", "hue": 28, "kind": "Turns", "mins": 12,
    "rules": "Slide the striker along your baseline (slider or ← →), then drag anywhere on the table (pull back like a slingshot) and let go to flick - a dotted line previews the shot. Every coin you pocket scores for you: black 10, white 20, the red queen 50. Score and you shoot again. Pocketing the striker is a foul: −10 and a coin returns to the centre. The board turns to face each player. When all coins are gone, the highest score wins.",
    "desc": "Flick the striker and pocket the coins.",
    "icon": "<rect class=\"st\" x=\"14\" y=\"14\" width=\"52\" height=\"52\" rx=\"6\"/><circle class=\"st\" cx=\"40\" cy=\"40\" r=\"10\"/><circle class=\"fl\" cx=\"22\" cy=\"22\" r=\"5\"/><circle class=\"fl\" cx=\"58\" cy=\"58\" r=\"5\"/>",
    "teams": false,
    "diff": "Easy: the Computer aims loosely. Medium: it checks a few shots first. Hard: it tries many shots and aims precisely."
  });
})();
