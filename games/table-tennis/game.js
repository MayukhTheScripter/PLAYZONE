/* Table Tennis - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, state = Hub.state, esc = Hub.esc, makeControls = Hub.makeControls, rrPath = Hub.rrPath, shapePath = Hub.shapePath, cssColor = Hub.cssColor, playerColors = Hub.playerColors, makeView = Hub.makeView, countdownText = Hub.countdownText;

  // ---------- Table Tennis ----------
  ENGINES.tennis = function (C) {
    var root = C.root, n = C.n, LW = 900, LH = 520, TX0 = 100, TX1 = 800, TY0 = 105, TY1 = 415, MID = 450, NETH = 34, G = 1500, RB = 9, BR = 34, FLOOR = -95;
    var TARGET = [5, 10, 20][C.lv], touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="arena"><canvas></canvas></div>';
    var arena = root.querySelector(".arena"), cv = root.querySelector("canvas");
    var view = makeView(arena, cv, LW, LH), g = view.g, ctl = makeControls(C, arena, { noTouch: true }), pc = playerColors(C);
    var two = C.mode === "2v2" || n >= 3;
    function teamOf(i) { return n >= 3 ? (i < 2 ? 0 : 1) : (two && state.count === 2 ? 0 : i); }
    var teams = [[], []], bats = [], sc = [0, 0], ball = { x: 0, y: 0, z: 60, vx: 0, vy: 0, vz: 0, on: false }, trail = [], parts = [], marks = [];
    var phase = "wait", wait = 3.2, lastHit = null, landedOpp = false, serverTeam = Math.random() < 0.5 ? 0 : 1, firstServer = serverTeam, ended = false, raf = 0, last = 0, ro = null, netWig = 0, pred = null, predSeq = 0, seq = 0, cdPrev = 4;
    C.players.forEach(function (p, idx) { teams[teamOf(idx)].push({ idx: idx }); });
    if (two) [0, 1].forEach(function (k) { while (teams[k].length < 2) teams[k].push({ idx: -1 }); });
    var cpuCol = cssColor("--cpu"), tcol = [cpuCol, cpuCol];
    [0, 1].forEach(function (k) {
      var first = teams[k].filter(function (q) { return q.idx >= 0; })[0];
      if (first) tcol[k] = pc[first.idx];
      teams[k].forEach(function (q, slot) {
        var bx = k === 0 ? 70 : LW - 70, by = teams[k].length === 2 ? (slot ? LH * 0.66 : LH * 0.34) : LH / 2;
        bats.push({ t: k, idx: q.idx, slot: slot, human: q.idx >= 0 && !C.players[q.idx].cpu, x: bx, y: by, tx: bx, ty: by, vx: 0, vy: 0, hist: [], col: q.idx >= 0 ? pc[q.idx] : tcol[k], cool: 0, sw: 0, errx: 0, erry: 0, two: teams[k].length === 2, home: { x: bx, y: by } });
      });
    });
    function tname(t) {
      var nm = teams[t].filter(function (q) { return q.idx >= 0; }).map(function (q) { return C.players[q.idx].name; });
      return nm.length ? nm.join(" & ") : "The computers";
    }
    function hud() { C.players.forEach(function (p, idx) { C.set(idx, sc[teamOf(idx)]); }); }
    hud();
    var hints = touch ? "Drag your bat with your finger. " : ctl.hint("") + " or drag the bat with the mouse. ";
    C.msg(hints + "First to " + TARGET + " points.");
    function layout() { view.resize(); }
    layout();
    if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(arena); }
    function spark(x, y, col, cnt, sp, life) {
      for (var k = 0; k < cnt; k++) parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * sp, vy: (Math.random() - 0.5) * sp, life: (life || 0.35) * (0.6 + Math.random() * 0.6), max: life || 0.35, col: col, s: 2 + Math.random() * 2 });
    }
    function inTable(x, y) { return x >= TX0 && x <= TX1 && y >= TY0 && y <= TY1; }
    // ----- launching -----
    function launch(tx, ty, T) {
      var x0 = ball.x, y0 = ball.y, z0 = ball.z, vx, vz, k;
      for (k = 0; k < 8; k++) {
        vx = (tx - x0) / T; vz = (-z0 + 0.5 * G * T * T) / T;
        var tn = vx !== 0 ? (MID - x0) / vx : -1;
        if (tn > 0 && tn < T) { var zn = z0 + vz * tn - 0.5 * G * tn * tn; if (zn < NETH + 16) { T *= 1.1; continue; } }
        break;
      }
      ball.vx = (tx - x0) / T; ball.vy = (ty - y0) / T; ball.vz = (-z0 + 0.5 * G * T * T) / T;
    }
    function serve() {
      var t = serverTeam;
      ball.x = t === 0 ? TX0 + 20 : TX1 - 20; ball.y = TY0 + 60 + Math.random() * (TY1 - TY0 - 120); ball.z = 64; ball.on = true; trail = [];
      var tx = t === 0 ? MID + 150 + Math.random() * 190 : MID - 150 - Math.random() * 190, ty = TY0 + 40 + Math.random() * (TY1 - TY0 - 80);
      launch(tx, ty, 0.95);
      lastHit = { team: t }; landedOpp = false; seq++;
      sfx("hit", 0.6);
      bats.forEach(function (b) { if (!b.human) setErr(b); });
    }
    function setErr(b) {
      var e = [60, 30, 10][C.lv] * (Math.random() < [0.3, 0.12, 0.03][C.lv] ? 3 : 1);
      b.errx = (Math.random() - 0.5) * e; b.erry = (Math.random() - 0.5) * e;
    }
    // ----- rules -----
    function pointTo(team, why) {
      if (phase !== "rally") return;
      phase = "point"; sc[team]++; hud();
      C.msg("<strong>" + esc(tname(team)) + "</strong> win the point · " + why);
      sfx("score");
      if (sc[team] >= TARGET) { endGame(team); return; }
      serverTeam = Math.floor((sc[0] + sc[1]) / 2) % 2 === 0 ? firstServer : 1 - firstServer; wait = 1.4;
    }
    function fault(team, why) { pointTo(1 - team, why); }
    function onBounce(side) {
      if (!lastHit) return;
      if (side === lastHit.team) { if (!landedOpp) fault(lastHit.team, "bounced on their own side"); return; }
      if (!landedOpp) { landedOpp = true; return; }
      pointTo(lastHit.team, "the ball bounced twice");
    }
    function endGame(team) {
      ended = true;
      var w = []; C.players.forEach(function (p, idx) { if (teamOf(idx) === team) w.push(idx); });
      var sub = "Final score " + sc[0] + " – " + sc[1] + (two ? " (Team 1 vs Team 2)" : "");
      C.later(function () { if (w.length) C.finish(w, sub); else C.finish([], sub, "The computers win"); }, 1500);
    }
    function hitBall(b) {
      var dx = b.t === 0 ? 1 : -1, s = 0, sf = 0, i;
      if (b.human) {
        for (i = 0; i < b.hist.length; i++) { s += Math.hypot(b.hist[i][0], b.hist[i][1]); sf += b.hist[i][0] * dx; }
        if (b.hist.length) { s /= b.hist.length; sf /= b.hist.length; }
      } else {
        s = [620, 860, 1000][C.lv] + Math.random() * 180; sf = s;
      }
      var se = Math.min(2300, s * 0.55 + Math.max(0, sf) * 0.55);
      var k = 0.2 + se / 1250, ty;
      if (b.human) {
        // Friendly physics: a bat placed on the ball always returns it over the net and onto the table.
        // Swing speed only adds a little power and a little sideways steer (both clamped).
        k = Math.max(0.5, Math.min(0.92, 0.5 + se / 3600));
        var steer = Math.max(-40, Math.min(40, b.vy * 0.05)) + Math.max(-36, Math.min(36, (ball.y - b.y) * 0.8));
        ty = Math.max(TY0 + 28, Math.min(TY1 - 28, ball.y + steer));
        if (Math.abs(b.vy) > 2200 && Math.abs(b.vy) < 1e9) ty = ball.y + (b.vy > 0 ? 1 : -1) * (TY1 - TY0) * 0.55;   // only a wild swipe can send it wide
      }
      else {
        k = 0.55 + Math.random() * 0.38;
        if (Math.random() < [0.2, 0.08, 0.02][C.lv]) k = 1.13;
        var foes = bats.filter(function (o) { return o.t !== b.t && o.human; }), fy = foes.length ? foes[0].y : LH / 2;
        ty = (fy < LH / 2 ? TY1 - 40 : TY0 + 40) + (Math.random() - 0.5) * 80;
        if (Math.random() < [0.16, 0.06, 0.015][C.lv]) ty = Math.random() < 0.5 ? TY0 - 30 : TY1 + 30;
      }
      var depth = 50 + k * (b.t === 0 ? TX1 - MID - 60 : MID - TX0 - 60);
      var tx = b.t === 0 ? MID + depth : MID - depth;
      var hs = 480 + se * 0.2, T = Math.max(0.42, Math.hypot(tx - ball.x, ty - ball.y) / hs);
      launch(tx, ty, T);
      lastHit = { team: b.t, bat: b }; landedOpp = false; seq++;
      b.cool = 0.3; b.sw = 0.18;
      spark(ball.x, ball.y, b.col, 10, 300, 0.3);
      sfx("hit", Math.min(1.2, 0.5 + se / 1500));
      bats.forEach(function (o) { if (!o.human && o.t !== b.t) setErr(o); });
    }
    // ----- prediction for computer bats -----
    function predict(t) {
      var s = { x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vy: ball.vy, vz: ball.vz }, h = 1 / 90, bounced = false, i, pz;
      for (i = 0; i < 400; i++) {
        pz = s.z; s.vz -= G * h; s.x += s.vx * h; s.y += s.vy * h; s.z += s.vz * h;
        if (s.z <= 0 && pz > 0 && s.vz < 0 && inTable(s.x, s.y)) {
          if ((s.x < MID ? 0 : 1) === t) bounced = true;
          s.z = 0; s.vz = -s.vz * 0.86;
        }
        if (bounced && s.z <= 58 && s.vz < 0) return { x: s.x, y: s.y };
        if (s.z < FLOOR) return null;
      }
      return null;
    }
    // ----- input -----
    var drags = {};
    function pickBat(pt) {
      var hum = bats.filter(function (b) { return b.human; });
      if (hum.length === 1) return hum[0];
      var team = pt.x < MID ? 0 : 1, cand = hum.filter(function (b) { return b.t === team; });
      if (!cand.length) cand = hum;
      if (cand.length === 1) return cand[0];
      cand.sort(function (a, c) { return Math.abs(a.y - pt.y) - Math.abs(c.y - pt.y); });
      return cand[0];
    }
    function onDown(e) {
      if (e.button > 0 || ended) return;
      var pt = view.toLogical(e.clientX, e.clientY), b = pickBat(pt);
      if (!b) return;
      var near = Math.hypot(b.x - pt.x, b.y - pt.y) < 90;
      drags[e.pointerId] = { b: b, ox: near ? b.x - pt.x : 0, oy: near ? b.y - pt.y : 0 };
      b.tx = pt.x + drags[e.pointerId].ox; b.ty = pt.y + drags[e.pointerId].oy;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    }
    function onMove(e) {
      var d = drags[e.pointerId]; if (!d) return;
      var pt = view.toLogical(e.clientX, e.clientY);
      d.b.tx = pt.x + d.ox; d.b.ty = pt.y + d.oy;
    }
    function onUp(e) { delete drags[e.pointerId]; }
    cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);
    // ----- update -----
    function moveBat(b, dt) {
      var ox = b.x, oy = b.y, k;
      if (b.human) {
        var u = view.vec(ctl.read(b.idx));
        if (Math.hypot(u.x, u.y) > 0.05) { b.x += u.x * 700 * dt; b.y += u.y * 700 * dt; b.tx = b.x; b.ty = b.y; }
        else follow(b, dt, 16, 2800);
      } else {
        var tg = b.home;
        if (phase === "rally" && lastHit && lastHit.team !== b.t && ball.on) {
          if (pred === null || predSeq !== seq) { pred = predict(b.t); predSeq = seq; }
          if (pred) {
            var closer = true;
            if (b.two) bats.forEach(function (o) { if (o !== b && o.t === b.t && Math.abs(o.y - pred.y) < Math.abs(b.y - pred.y)) closer = false; });
            if (closer) tg = { x: pred.x + b.errx + (b.t === 0 ? -14 : 14), y: pred.y + b.erry };
          }
        }
        b.tx = tg.x; b.ty = tg.y;
        follow(b, dt, [8, 13, 20][C.lv], [900, 1500, 2400][C.lv]);
      }
      var lo = b.t === 0 ? 24 : MID + 18, hi = b.t === 0 ? MID - 18 : LW - 24;
      b.x = Math.max(lo, Math.min(hi, b.x)); b.y = Math.max(24, Math.min(LH - 24, b.y));
      b.hist.push([(b.x - ox) / dt, (b.y - oy) / dt]); if (b.hist.length > 5) b.hist.shift();
      b.vx = b.hist[b.hist.length - 1][0]; b.vy = b.hist[b.hist.length - 1][1];
      if (b.cool > 0) b.cool -= dt; if (b.sw > 0) b.sw -= dt;
    }
    function follow(b, dt, gain, maxv) {
      var dx = b.tx - b.x, dy = b.ty - b.y, sx = dx * Math.min(1, gain * dt), sy = dy * Math.min(1, gain * dt), l = Math.hypot(sx, sy), mx = maxv * dt;
      if (l > mx) { sx *= mx / l; sy *= mx / l; }
      b.x += sx; b.y += sy;
    }
    function update(dt) {
      var i;
      if (phase === "wait" && !ended) {
        wait -= dt;
        var cc = Math.ceil(wait); if (cc !== cdPrev) { cdPrev = cc; if (wait > 0) sfx("beep"); }
        if (wait <= 0) { sfx("go"); phase = "rally"; serve(); }
      }
      bats.forEach(function (b) { moveBat(b, dt); });
      if (netWig > 0) netWig -= dt;
      if ((phase === "rally" || phase === "point") && ball.on) {
        var sub = 4, h = dt / sub;
        for (var s = 0; s < sub; s++) {
          var px = ball.x, pz = ball.z;
          if (phase === "rally" && ball.on) {
            for (i = 0; i < bats.length; i++) {
              var hb = bats[i], onMySide = hb.t === 0 ? ball.x < MID : ball.x > MID;
              if (hb.cool > 0 || lastHit.team === hb.t || !(landedOpp || onMySide)) continue;
              if (Math.hypot(ball.x - hb.x, ball.y - hb.y) < BR + RB + 14 && ball.z < 130 && ball.z > -60) { if (!landedOpp) landedOpp = true; hitBall(hb); break; }
            }
          }
          ball.vz -= G * h; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.z += ball.vz * h;
          if (phase === "rally") {
            if ((px - MID) * (ball.x - MID) <= 0 && ball.z < NETH && ball.z > -30 && ball.y > TY0 - 14 && ball.y < TY1 + 14) {
              ball.vx *= -0.12; ball.vy *= 0.2; ball.x = MID + (px < MID ? -4 : 4); netWig = 0.45; sfx("net"); spark(MID, ball.y, "#ffffff", 8, 120, 0.3);
              fault(lastHit.team, "the ball hit the net"); continue;
            }
          }
          if (ball.z <= 0 && pz > 0 && ball.vz < 0 && inTable(ball.x, ball.y)) {
            ball.z = 0; ball.vz = -ball.vz * 0.86; ball.vx *= 0.985; ball.vy *= 0.985;
            marks.push({ x: ball.x, y: ball.y, life: 0.6 }); sfx("bounce", Math.min(1, Math.abs(ball.vz) / 500)); spark(ball.x, ball.y, "#ffffff", 3, 80, 0.2);
            if (phase === "rally") onBounce(ball.x < MID ? 0 : 1);
          }
          if (ball.z < FLOOR) {
            ball.on = false;
            if (phase === "rally") { if (landedOpp) pointTo(lastHit.team, "the ball was missed"); else fault(lastHit.team, "the ball went out"); }
            break;
          }
        }
        trail.push({ x: ball.x, y: ball.y, z: ball.z }); if (trail.length > 10) trail.shift();
        if (phase === "rally" && ball.on) {
          for (i = 0; i < bats.length; i++) {
            var b = bats[i];
            if (b.cool > 0 || !landedOpp || lastHit.team === b.t) continue;
            if (Math.hypot(ball.x - b.x, ball.y - b.y) < BR + RB + 4 && ball.z < 100 && ball.z > -40) { hitBall(b); break; }
          }
        }
      }
      if (phase === "point" && !ended) {
        wait -= dt;
        if (wait <= 0) { phase = "wait"; wait = 1.2; cdPrev = 4; ball.on = false; trail = []; bats.forEach(function (b) { if (!b.human) { b.tx = b.home.x; b.ty = b.home.y; } }); }
      }
      marks.forEach(function (m) { m.life -= dt; }); marks = marks.filter(function (m) { return m.life > 0; });
      parts.forEach(function (q) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.95; q.vy *= 0.95; });
      parts = parts.filter(function (q) { return q.life > 0; });
    }
    // ----- drawing -----
    function drawBat(b) {
      var dx = b.t === 0 ? -1 : 1, sc2 = 1 + (b.sw > 0 ? b.sw * 1.2 : 0);
      g.save(); g.translate(b.x, b.y); g.scale(sc2, sc2);
      g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.arc(5, 7, BR, 0, 7); g.fill();
      var ang = Math.atan2(0.45, dx);
      g.save(); g.rotate(ang);
      g.fillStyle = "#b98a54"; rrPath(g, BR - 6, -7, 42, 14, 5); g.fill();
      g.fillStyle = "#8d6638"; g.fillRect(BR + 14, -7, 4, 14);
      g.restore();
      g.fillStyle = "#d3a46a"; g.beginPath(); g.arc(0, 0, BR, 0, 7); g.fill();
      g.fillStyle = b.col; g.beginPath(); g.arc(0, 0, BR - 4, 0, 7); g.fill();
      var gr = g.createRadialGradient(-BR * 0.3, -BR * 0.35, 2, 0, 0, BR); gr.addColorStop(0, "rgba(255,255,255,0.3)"); gr.addColorStop(1, "rgba(0,0,0,0.22)");
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, BR - 4, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,0.9)"; if (b.idx >= 0) { shapePath(g, C.players[b.idx].slot, 0, 0, BR * 0.26); g.fill(); }
      g.restore();
    }
    function draw() {
      view.screen();
      g.fillStyle = "#0f131c"; g.fillRect(0, 0, view.W, view.H);
      view.begin();
      g.fillStyle = "#171d2a"; rrPath(g, 8, 8, LW - 16, LH - 16, 18); g.fill();
      g.strokeStyle = "rgba(255,255,255,0.07)"; g.lineWidth = 2; g.stroke();
      // team areas
      [0, 1].forEach(function (k) { g.fillStyle = tcol[k]; g.globalAlpha = 0.06; g.fillRect(k ? MID : 8, 8, k ? LW - 8 - MID : MID - 8, LH - 16); g.globalAlpha = 1; });
      // table
      g.fillStyle = "rgba(0,0,0,0.35)"; rrPath(g, TX0 + 10, TY0 + 18, TX1 - TX0, TY1 - TY0, 6); g.fill();
      g.fillStyle = "#12354f"; rrPath(g, TX0, TY0 + 9, TX1 - TX0, TY1 - TY0, 6); g.fill();
      var tg = g.createLinearGradient(0, TY0, 0, TY1); tg.addColorStop(0, "#2a7aa8"); tg.addColorStop(1, "#1f628a");
      g.fillStyle = tg; rrPath(g, TX0, TY0, TX1 - TX0, TY1 - TY0, 6); g.fill();
      g.strokeStyle = "#eef4f8"; g.lineWidth = 4; rrPath(g, TX0 + 2, TY0 + 2, TX1 - TX0 - 4, TY1 - TY0 - 4, 5); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(TX0 + 4, (TY0 + TY1) / 2); g.lineTo(TX1 - 4, (TY0 + TY1) / 2); g.stroke();
      // bounce marks
      marks.forEach(function (m) { g.globalAlpha = Math.max(0, m.life / 0.6) * 0.8; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(m.x, m.y, 6 + (0.6 - m.life) * 40, 0, 7); g.stroke(); });
      g.globalAlpha = 1;
      // ball shadow
      var up = view.port ? { x: 1, y: 0 } : { x: 0, y: -1 };
      if (ball.on) {
        var onT = inTable(ball.x, ball.y), sa = onT ? Math.max(0.12, 0.42 - Math.max(0, ball.z) / 400) : 0.1, sr = RB * (onT ? 1.1 + Math.max(0, ball.z) / 220 : 0.8);
        g.fillStyle = "rgba(0,0,0," + sa + ")"; g.beginPath(); g.ellipse(ball.x, ball.y, sr, sr * 0.8, 0, 0, 7); g.fill();
      }
      // bats behind net side first
      bats.forEach(function (b) { if (b.t === 0) drawBat(b); });
      // net
      var wig = netWig > 0 ? Math.sin(netWig * 50) * netWig * 12 : 0;
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(MID + 6 + wig, TY0 - 14, 7, TY1 - TY0 + 28);
      g.fillStyle = "rgba(235,242,248,0.28)"; g.fillRect(MID - 4 + wig, TY0 - 14, 8, TY1 - TY0 + 28);
      g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1; g.beginPath();
      for (var yy = TY0 - 12; yy < TY1 + 14; yy += 8) { g.moveTo(MID - 4 + wig, yy); g.lineTo(MID + 4 + wig, yy); }
      g.stroke();
      g.fillStyle = "#fff"; g.fillRect(MID - 2 + wig, TY0 - 14, 4, TY1 - TY0 + 28);
      g.fillStyle = "#8a93a2"; g.beginPath(); g.arc(MID, TY0 - 14, 7, 0, 7); g.arc(MID, TY1 + 14, 7, 0, 7); g.fill();
      bats.forEach(function (b) { if (b.t === 1) drawBat(b); });
      // ball
      if (ball.on) {
        for (var k = 0; k < trail.length; k++) {
          var tr = trail[k], a = k / trail.length * 0.25, zz = Math.max(0, tr.z);
          g.globalAlpha = a; g.fillStyle = "#ffb347"; g.beginPath(); g.arc(tr.x + up.x * zz * 0.45, tr.y + up.y * zz * 0.45, RB * 0.7, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
        var zz2 = Math.max(-40, ball.z), bx = ball.x + up.x * zz2 * 0.45, by = ball.y + up.y * zz2 * 0.45, br = RB * (1 + Math.max(0, ball.z) / 280);
        g.fillStyle = "#ffa83a"; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,0.65)"; g.beginPath(); g.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, 7); g.fill();
      }
      parts.forEach(function (q) { g.globalAlpha = Math.max(0, q.life / q.max); g.fillStyle = q.col; g.fillRect(q.x, q.y, q.s, q.s); });
      g.globalAlpha = 1;
      if (phase === "wait" && sc[0] + sc[1] === 0 && wait > -0.6) countdownText(view, g, wait, view.W, view.H);
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!last) last = ts;
      var dt = Math.min(0.033, (ts - last) / 1000); last = ts;
      update(dt); draw();
    }
    raf = requestAnimationFrame(frame);
    window.__PZ_TEST = { ball: function () { return ball; }, bats: function () { return bats; }, sc: function () { return sc.slice(); }, phase: function () { return phase; } };
    return { destroy: function () { cancelAnimationFrame(raf); if (ro) ro.disconnect(); ctl.destroy(); } };
  };

  Hub.register({
    "id": "tennis",
    "name": "Table Tennis",
    "hue": 195,
    "kind": "Real-time",
    "mins": 5,
    "rules": "Drag your bat with a finger or mouse (or use the keys on a computer) and hit the ball so it bounces once on the other side of the table. Missing the table, hitting the net or letting the ball bounce twice loses the point. You can play 1 vs 1 or 2 vs 2 with partners on the same team. First to 5 points on Easy, 10 on Medium, 20 on Hard.",
    "desc": "Rally the ball past your opponent. 1 vs 1 or 2 vs 2 teams.",
    "icon": "<circle class=\"st\" cx=\"26\" cy=\"46\" r=\"15\"/><path class=\"st\" d=\"M36 57L48 70\"/><circle class=\"fl\" cx=\"58\" cy=\"22\" r=\"6\"/><path class=\"st\" d=\"M52 28L40 38\" stroke-dasharray=\"3 4\"/>",
    "teams": true,
    "diff": "First to 5 points on Easy, 10 on Medium and 20 on Hard."
  });
})();
