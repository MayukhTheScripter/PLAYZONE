/* 8-Ball Pool - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, rrPath = Hub.rrPath, playerColors = Hub.playerColors, makeView = Hub.makeView, esc = Hub.esc;

  // ---------- 8-Ball Pool ----------
  ENGINES.pool = function (C) {
    var root = C.root, n = C.n, LW = 800, LH = 400, M = 30, R = 11, PR = [22, 22, 22, 22, 20, 20];
    var NEED = [1, 2, 3][C.lv];
    var BCOL = ["#f4f4f4", "#f2c230", "#2f64d8", "#d83a3a", "#8a44d8", "#ee7f1c", "#1fa24f", "#a02038", "#15151a", "#f2c230", "#2f64d8", "#d83a3a", "#8a44d8", "#ee7f1c", "#1fa24f", "#a02038"];
    var POCK = [{ x: M, y: M }, { x: LW - M, y: M }, { x: M, y: LH - M }, { x: LW - M, y: LH - M }, { x: LW / 2, y: M - 4 }, { x: LW / 2, y: LH - M + 4 }];
    var touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="arena"><canvas></canvas>' +
      '<div class="pwr" aria-label="Shot power"><span class="pwr-t">POWER</span><div class="pwr-track"><i class="pwr-fill"></i><b class="pwr-knob"></b></div><span class="pwr-h">Pull down, let go to shoot</span></div></div>';
    var arena = root.querySelector(".arena"), cv = root.querySelector("canvas"), pwr = root.querySelector(".pwr"), track = root.querySelector(".pwr-track"), fillEl = root.querySelector(".pwr-fill"), knobEl = root.querySelector(".pwr-knob");
    var view = makeView(arena, cv, LW, LH), g = view.g, pc = playerColors(C), ro = null, raf = 0, last = 0;
    var teams = [[], []], ptr = [0, 0], i;
    C.players.forEach(function (p, idx) { teams[idx % 2].push(idx); });
    function teamOf(idx) { return idx % 2; }
    var frames = [0, 0], balls = [], group = [null, null], ct = 0, shooter = 0, phase = "intro", hand = false, breakShot = true, breaker = 0;
    var parts = [], shot = null, cd = 2.2, thinkT = 0, placing = false, ended = false, tcol = [pc[teams[0][0]], pc[teams[1][0]]], pot = [[], []];
    var aimAng = 0, power = 0, cpuAim = null, charging = false, keysDown = {};
    // ----- online (see docs/GAMES.md): the HOST phone runs the physics and the rules; everyone else
    // only draws what the host streams. A guest's only power is to say where/how hard to shoot.
    var net = C.net, online = !!net, auth = !online || net.host, me = online ? net.me : -1;
    var remoteAim = null, lastMsg = null, shotQ = 0, shotFrames = 0, simT = 0, nextCap = 0, fIdx = 0, evq = [], outFr = [], outFrom = 0, sentAim = 0, haveState = !online || auth, waitT = 0;
    var pb = null, pendingSt = null, lastAimKey = "";
    function num(v, lo, hi, d) { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
    function say(a, w, b) {
      lastMsg = { a: a || "", w: w, b: b || "" };
      C.msg(esc(a || "") + (w >= 0 ? C.who(w) : "") + esc(b || ""));
    }
    function hud() { C.players.forEach(function (p, idx) { C.set(idx, frames[teamOf(idx)]); }); }
    hud();
    function layout() { view.resize(); }
    layout();
    if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(arena); }
    function spark(x, y, col, cnt, sp, life) {
      for (var k = 0; k < cnt; k++) parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * sp, vy: (Math.random() - 0.5) * sp, life: (life || 0.4) * (0.6 + Math.random() * 0.6), max: life || 0.4, col: col, s: 2 + Math.random() * 2.5 });
    }
    function rack() {
      balls = [{ n: 0, x: LW * 0.25, y: LH / 2, vx: 0, vy: 0, on: true }];
      var order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15], k = 0, c, r, x0 = LW * 0.68, d = R * 2.02;
      for (c = 0; c < 5; c++) for (r = 0; r <= c; r++) balls.push({ n: order[k++], x: x0 + c * d * 0.88, y: LH / 2 + (r - c / 2) * d, vx: 0, vy: 0, on: true });
      group = [null, null]; breakShot = true; pot = [[], []];
    }
    function ballOf(num) { for (var k = 0; k < balls.length; k++) if (balls[k].n === num) return balls[k]; return null; }
    function cue() { return balls[0]; }
    function isSolid(num) { return num >= 1 && num <= 7; }
    function grpOf(num) { return num === 8 ? "eight" : isSolid(num) ? "solid" : "stripe"; }
    function remaining(team) {
      if (!group[team]) return null;
      var k = 0; balls.forEach(function (b) { if (b.on && b.n && b.n !== 8 && grpOf(b.n) === group[team]) k++; });
      return k;
    }
    function legalTargets(team) {
      var out = [], rem = remaining(team);
      balls.forEach(function (b) {
        if (!b.on || b.n === 0) return;
        if (group[team] === null) { if (b.n !== 8) out.push(b); }
        else if (rem === 0) { if (b.n === 8) out.push(b); }
        else if (b.n !== 8 && grpOf(b.n) === group[team]) out.push(b);
      });
      return out;
    }
    function statusMsg(extra) {
      var gname = group[ct] ? (group[ct] === "solid" ? "solids (1–7)" : "stripes (9–15)") : "table open";
      if (group[ct] && remaining(ct) === 0) gname = "the 8-ball";
      say("", shooter, " · " + gname + (hand ? " · ball in hand" : "") + (extra ? " · " + extra : ""));
    }
    function pickShooter() { var list = teams[ct]; shooter = list[ptr[ct] % list.length]; ptr[ct]++; C.turn(shooter); }
    function aimAtNearest() {
      var c = cue(), ts = legalTargets(ct), t = ts[0] || balls[1];
      ts.forEach(function (b) { if (Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(t.x - c.x, t.y - c.y)) t = b; });
      if (t) aimAng = Math.atan2(t.y - c.y, t.x - c.x);
    }
    function startFrame() {
      rack(); ct = breaker; pickShooter(); hand = false; placing = false; aimAtNearest();
      say("", shooter, " breaks. " + (C.players[shooter].cpu ? "" : (touch ? "Drag on the table to aim, then pull the power bar down and let go." : "Drag on the table to aim (or ← →), then pull the power bar or hold Space.")));
      beginTurn();
    }
    function beginTurn() {
      shot = null; power = 0; cpuAim = null; setPwr(0);
      if (C.players[shooter].cpu) { thinkT = 1.0 + Math.random() * 0.6; phase = "think"; }
      else { phase = "aim"; placing = hand; if (!hand) aimAtNearest(); }
      pwr.style.display = (phase === "aim" && !placing && human()) ? "flex" : "none";
      remoteAim = null;
      sendState();
    }
    function setPwr(p) {
      power = p; fillEl.style.height = (p * 100) + "%"; knobEl.style.top = (p * 100) + "%";
    }
    // ----- online: host side -----
    function snd(kind, v, x, y, bn) {
      sfx(kind, v);
      if (online && auth && phase === "moving") evq.push([fIdx, kind, Math.round((v || 0) * 100) / 100, Math.round(x || 0), Math.round(y || 0), bn == null ? -1 : bn]);
    }
    function flat() {
      var o = [];
      balls.forEach(function (b) { if (b.on) o.push(Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10); else o.push(-1, -1); });
      return o;
    }
    function capture() { outFr.push(flat()); fIdx++; shotFrames = fIdx; if (outFr.length >= 4) flush(false); }
    function flush(end) {
      if (!online || !auth || (!outFr.length && !end)) return;
      net.send("fr", { q: shotQ, i: outFrom, f: outFr, e: evq, end: !!end });
      outFrom += outFr.length; outFr = []; evq = [];
    }
    function sendState() {
      if (!online || !auth) return;
      net.send("st", { q: shotQ, nf: phase === "moving" ? 0 : shotFrames, ph: phase, b: flat(), ct: ct, sh: shooter, hd: hand, pl: placing, brk: breakShot,
        gp: group, fr: frames, pt: pot, ca: Math.round(aimAng * 1000) / 1000, m: lastMsg, en: ended });
    }
    // ----- physics -----
    var DT = 1 / 240, acc = 0;
    function stepPhysics() {
      var k, l, a, b, moving = false;
      for (k = 0; k < balls.length; k++) {
        a = balls[k]; if (!a.on) continue;
        a.x += a.vx * DT; a.y += a.vy * DT;
        var sp = Math.hypot(a.vx, a.vy);
        if (sp > 0) { var f = Math.exp(-0.9 * DT); a.vx *= f; a.vy *= f; if (sp < 7) { a.vx = 0; a.vy = 0; } else moving = true; }
        for (l = 0; l < 6; l++) { if (Math.hypot(a.x - POCK[l].x, a.y - POCK[l].y) < PR[l]) { pocket(a, l); break; } }
        if (!a.on) continue;
        if (a.x < M + R) { a.x = M + R; if (Math.abs(a.vx) > 40) snd("cushion", Math.abs(a.vx) / 700, a.x, a.y); a.vx = Math.abs(a.vx) * 0.82; }
        if (a.x > LW - M - R) { a.x = LW - M - R; if (Math.abs(a.vx) > 40) snd("cushion", Math.abs(a.vx) / 700, a.x, a.y); a.vx = -Math.abs(a.vx) * 0.82; }
        if (a.y < M + R) { a.y = M + R; if (Math.abs(a.vy) > 40) snd("cushion", Math.abs(a.vy) / 700, a.x, a.y); a.vy = Math.abs(a.vy) * 0.82; }
        if (a.y > LH - M - R) { a.y = LH - M - R; if (Math.abs(a.vy) > 40) snd("cushion", Math.abs(a.vy) / 700, a.x, a.y); a.vy = -Math.abs(a.vy) * 0.82; }
      }
      for (k = 0; k < balls.length; k++) for (l = k + 1; l < balls.length; l++) {
        a = balls[k]; b = balls[l]; if (!a.on || !b.on) continue;
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R * 2 && d > 0.001) {
          var nx = dx / d, ny = dy / d, ov = R * 2 - d;
          a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
          var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            a.vx += vn * nx; a.vy += vn * ny; b.vx -= vn * nx; b.vy -= vn * ny;
            if (shot && a.n === 0 && shot.first === null) shot.first = b.n;
            if (shot && b.n === 0 && shot.first === null) shot.first = a.n;
            snd("ball", -vn / 900, (a.x + b.x) / 2, (a.y + b.y) / 2);
            if (-vn > 60) spark((a.x + b.x) / 2, (a.y + b.y) / 2, "#fff", 3, 120, 0.2);
          }
        }
      }
      return moving;
    }
    function pocket(b, l) {
      b.on = false; b.vx = b.vy = 0; snd("pocket", 1, POCK[l].x, POCK[l].y, b.n);
      spark(POCK[l].x, POCK[l].y, b.n === 0 ? "#fff" : BCOL[b.n], 14, 220, 0.5);
      if (shot) shot.potted.push(b.n);
    }
    // ----- rules -----
    function evaluate() {
      var team = ct, sh = shot, own = group[team], fouled = false, why = "", potted = sh.potted, wasRem = sh.remBefore;
      var scratch = potted.indexOf(0) >= 0, eight = potted.indexOf(8) >= 0;
      var legalFirst = function (num) {
        if (num === null) return false;
        if (!own) return num !== 8;
        if (wasRem === 0) return num === 8;
        return num !== 8 && grpOf(num) === own;
      };
      if (scratch) { fouled = true; why = "Scratch!"; }
      else if (sh.first === null) { fouled = true; why = "No ball was hit."; }
      else if (!legalFirst(sh.first)) { fouled = true; why = "Wrong ball hit first."; }
      var objPotted = potted.filter(function (x) { return x !== 0 && x !== 8; });
      if (eight) {
        if (breakShot) { var e = ballOf(8); e.on = true; e.x = LW * 0.68 + 4 * R * 1.78 * 0.88 / 2; e.y = LH / 2; e.vx = e.vy = 0; eight = false; }
        else {
          var win = own && wasRem === 0 && !fouled;
          endFrame(win ? team : 1 - team, win ? "potted the 8-ball" : (fouled ? "fouled while potting the 8-ball" : "potted the 8-ball too early"));
          return;
        }
      }
      if (!own && !fouled && objPotted.length) {
        var gr = grpOf(objPotted[0]);
        group[team] = gr; group[1 - team] = gr === "solid" ? "stripe" : "solid"; own = gr;
      }
      objPotted.forEach(function (x) { var tt = group[0] ? (grpOf(x) === group[0] ? 0 : 1) : team; pot[tt].push(x); });
      var good = own && objPotted.some(function (x) { return grpOf(x) === own; });
      if (!own && !fouled && objPotted.length) good = true;
      breakShot = false;
      if (scratch) { var c = cue(); c.on = true; c.x = LW * 0.25; c.y = LH / 2; c.vx = c.vy = 0; }
      if (fouled) { hand = true; ct = 1 - ct; pickShooter(); statusMsg("Foul: " + why); sfx("bad"); }
      else if (good) { hand = false; statusMsg("keep shooting"); sfx("good"); }
      else { hand = false; ct = 1 - ct; pickShooter(); statusMsg(""); }
      beginTurn();
    }
    function endFrame(winTeam, why) {
      phase = "over"; pwr.style.display = "none"; frames[winTeam]++; hud();
      var w = teams[winTeam];
      say("Team of ", w[0], " wins the frame (" + why + ").");
      if (frames[winTeam] >= NEED) { ended = true; C.later(function () { C.finish(w.slice(), "Won " + frames[0] + " – " + frames[1] + " frames."); }, 1700); }
      else { breaker = 1 - breaker; C.later(startFrame, 2200); }
      sendState();
    }
    function fire(ang, pw) {
      var c = cue(), sp = 260 + 1400 * pw;
      c.vx = Math.cos(ang) * sp; c.vy = Math.sin(ang) * sp;
      shot = { first: null, potted: [], remBefore: remaining(ct) };
      phase = "moving"; hand = false; placing = false; cpuAim = null; snd("cue", pw);
      pwr.style.display = "none"; setPwr(0);
      shotQ++; fIdx = 0; simT = 0; nextCap = 0; evq = []; outFr = []; outFrom = 0; remoteAim = null;
      if (online) { capture(); sendState(); }
      say("", shooter, " shoots…");
    }
    function rayFirst(sx, sy, ux, uy) {
      var best = null, bt = 1e9;
      balls.forEach(function (b) {
        if (!b.on || b.n === 0) return;
        var rx = b.x - sx, ry = b.y - sy, tt = rx * ux + ry * uy;
        if (tt <= 0) return;
        var px = rx - tt * ux, py = ry - tt * uy, d2 = px * px + py * py;
        if (d2 > 4 * R * R) return;
        var tc = tt - Math.sqrt(4 * R * R - d2);
        if (tc < bt) { bt = tc; best = b; }
      });
      return best ? { b: best, t: bt } : null;
    }
    // ----- CPU -----
    function segClear(x1, y1, x2, y2, ignoreA, ignoreB) {
      var dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
      for (var k = 0; k < balls.length; k++) {
        var b = balls[k]; if (!b.on || b === ignoreA || b === ignoreB) continue;
        var t = Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / L2)), px = x1 + dx * t, py = y1 + dy * t;
        if (Math.hypot(b.x - px, b.y - py) < R * 1.95) return false;
      }
      return true;
    }
    function bestShot(cx, cy) {
      var targets = legalTargets(ct), best = null, cb = cue();
      targets.forEach(function (tb) {
        for (var q = 0; q < 6; q++) {
          var pk = POCK[q], pdx = pk.x - tb.x, pdy = pk.y - tb.y, pl = Math.hypot(pdx, pdy) || 1, ux = pdx / pl, uy = pdy / pl;
          var gx = tb.x - ux * R * 2, gy = tb.y - uy * R * 2;
          if (gx < M + R || gx > LW - M - R || gy < M + R || gy > LH - M - R) continue;
          var cdx = gx - cx, cdy = gy - cy, cl = Math.hypot(cdx, cdy) || 1, cos = (cdx * ux + cdy * uy) / cl;
          if (cos < 0.25) continue;
          if (!segClear(cx, cy, gx, gy, cb, tb)) continue;
          if (!segClear(tb.x, tb.y, pk.x, pk.y, tb, cb)) continue;
          var sc = cos * 2 - (cl + pl) / 900;
          if (!best || sc > best.sc) best = { sc: sc, dx: cdx, dy: cdy, cl: cl, pl: pl, tb: tb };
        }
      });
      return best;
    }
    function cpuShoot() {
      var c = cue();
      if (hand) {
        var tries = C.lv === 0 ? 1 : 24, bp = null, bs = -9;
        for (var k = 0; k < tries; k++) {
          var x = M + R + 4 + Math.random() * (LW - 2 * M - 2 * R - 8), y = M + R + 4 + Math.random() * (LH - 2 * M - 2 * R - 8), okp = true;
          balls.forEach(function (b) { if (b !== c && b.on && Math.hypot(b.x - x, b.y - y) < R * 2.3) okp = false; });
          if (!okp) continue;
          var s = bestShot(x, y), sc = s ? s.sc : -5;
          if (sc > bs) { bs = sc; bp = { x: x, y: y }; }
        }
        if (!bp) bp = { x: LW * 0.25, y: LH / 2 };
        c.x = bp.x; c.y = bp.y; c.on = true; hand = false;
      }
      var s2 = bestShot(c.x, c.y), ang, pw, noise = [0.07, 0.032, 0.008][C.lv];
      if (s2) {
        ang = Math.atan2(s2.dy, s2.dx) + (Math.random() - 0.5) * 2 * noise;
        var v0 = 0.9 * (s2.cl + 1.9 * s2.pl) + 260;
        pw = Math.max(0.18, Math.min(1, (v0 - 260) / 1400));
        if (breakShot) pw = 1;
      } else {
        var ts = legalTargets(ct), tgt = ts.length ? ts[0] : balls[1];
        ts.forEach(function (b) { if (Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(tgt.x - c.x, tgt.y - c.y)) tgt = b; });
        ang = Math.atan2(tgt.y - c.y, tgt.x - c.x) + (Math.random() - 0.5) * noise * 2;
        pw = breakShot ? 1 : 0.35 + Math.random() * 0.3;
      }
      cpuAim = { ang: ang, pw: pw, t: 0 }; aimAng = ang; phase = "cpuaim"; thinkT = 0.9;
    }
    // ----- input -----
    var drag = null;
    function human() { return online ? (shooter === me && !ended) : (!C.players[shooter].cpu && !ended); }
    function onDown(e) {
      if (!human() || phase !== "aim" || e.button > 0) return;
      var pt = view.toLogical(e.clientX, e.clientY);
      if (placing) { drag = { id: e.pointerId, place: true }; movePlace(pt); }
      else { drag = { id: e.pointerId }; setAimTo(pt); }
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    }
    function setAimTo(pt) {
      var c = cue(), dx = pt.x - c.x, dy = pt.y - c.y;
      if (Math.hypot(dx, dy) > 14) aimAng = Math.atan2(dy, dx);
    }
    function movePlace(pt) {
      var c = cue(), x = Math.max(M + R, Math.min(LW - M - R, pt.x)), y = Math.max(M + R, Math.min(LH - M - R, pt.y));
      balls.forEach(function (b) {
        if (b === c || !b.on) return;
        var d = Math.hypot(b.x - x, b.y - y);
        if (d < R * 2.05) { x = b.x + (x - b.x) / (d || 1) * R * 2.05; y = b.y + (y - b.y) / (d || 1) * R * 2.05; }
      });
      c.x = x; c.y = y; c.on = true;
    }
    function finishPlace() {
      placing = false; hand = false; aimAtNearest(); pwr.style.display = human() ? "flex" : "none";
      statusMsg("aim, then pull the power bar down");
      if (online) { if (human()) sendPlace(true); sendState(); }
    }
    var placeT = 0;
    function sendPlace(done) {
      if (!online) return;
      var now = Date.now(), c = cue();
      if (!done && now - placeT < 80) return;
      placeT = now; net.send("place", { x: Math.round(c.x * 10) / 10, y: Math.round(c.y * 10) / 10, done: !!done });
    }
    function shoot(a, p) {
      if (online && !auth) { net.send("shot", { a: a, p: p }); sfx("cue", p); phase = "wait"; waitT = 0; pwr.style.display = "none"; setPwr(0); return; }
      fire(a, p);
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var pt = view.toLogical(e.clientX, e.clientY);
      if (drag.place) { movePlace(pt); sendPlace(false); } else setAimTo(pt);
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (d.place) {
        if (online && !auth) { sendPlace(true); placing = false; hand = false; aimAtNearest(); pwr.style.display = "flex"; }
        else finishPlace();
      }
    }
    cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);
    // power slider
    var pdrag = null;
    function pwrFrom(e) {
      var r = track.getBoundingClientRect();
      setPwr(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
    }
    pwr.addEventListener("pointerdown", function (e) {
      if (!human() || phase !== "aim" || placing) return;
      pdrag = e.pointerId; try { pwr.setPointerCapture(e.pointerId); } catch (x) {}
      pwrFrom(e); e.preventDefault();
    });
    pwr.addEventListener("pointermove", function (e) { if (e.pointerId === pdrag) pwrFrom(e); });
    function pend(e) {
      if (e.pointerId !== pdrag) return;
      pdrag = null;
      if (power > 0.07 && human() && phase === "aim") shoot(aimAng, power); else setPwr(0);
    }
    pwr.addEventListener("pointerup", pend); pwr.addEventListener("pointercancel", function (e) { if (e.pointerId === pdrag) { pdrag = null; setPwr(0); } });
    function kd(e) {
      if (!human() || phase !== "aim" || placing) return;
      if (e.code === "Space") { if (!e.repeat) { charging = true; setPwr(0.05); } e.preventDefault(); }
      else if (e.code === "ArrowLeft" || e.code === "KeyA") { keysDown.l = true; e.preventDefault(); }
      else if (e.code === "ArrowRight" || e.code === "KeyD") { keysDown.r = true; e.preventDefault(); }
    }
    function ku(e) {
      if (e.code === "Space" && charging) { charging = false; if (power > 0.07 && human() && phase === "aim") shoot(aimAng, power); else setPwr(0); }
      else if (e.code === "ArrowLeft" || e.code === "KeyA") keysDown.l = false;
      else if (e.code === "ArrowRight" || e.code === "KeyD") keysDown.r = false;
    }
    document.addEventListener("keydown", kd); document.addEventListener("keyup", ku);
    // ----- loop -----
    function update(dt) {
      if (online && !auth) return guestUpdate(dt);
      if (cd > 0) { cd -= dt; if (cd <= 0) startFrame(); }
      if (online && phase === "aim" && human() && !placing) {
        sentAim += dt;
        if (sentAim > 0.07) { var key = aimAng.toFixed(3) + "|" + power.toFixed(2); if (key !== lastAimKey) { lastAimKey = key; net.send("aim", { a: aimAng, p: power }); } sentAim = 0; }
      }
      if (phase === "think") { thinkT -= dt; if (thinkT <= 0) cpuShoot(); }
      else if (phase === "cpuaim") {
        thinkT -= dt; cpuAim.t += dt; setPwr(Math.min(cpuAim.pw, cpuAim.t / 0.7 * cpuAim.pw));
        if (thinkT <= 0) fire(cpuAim.ang, cpuAim.pw);
      } else if (phase === "aim" && human() && !placing) {
        if (keysDown.l) aimAng -= dt * (charging ? 0.25 : 0.9);
        if (keysDown.r) aimAng += dt * (charging ? 0.25 : 0.9);
        if (charging) setPwr(Math.min(1, power + dt * 0.8));
      }
      if (phase === "moving") {
        acc += dt; var moving = false, guard = 0;
        while (acc >= DT && guard++ < 40) {
          acc -= DT; if (stepPhysics()) moving = true;
          if (online) { simT += DT; if (simT >= nextCap) { nextCap += 1 / 30; capture(); } }
        }
        if (!moving) { if (online) { capture(); flush(true); } phase = "eval"; evaluate(); }
      }
      parts.forEach(function (q) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; });
      parts = parts.filter(function (q) { return q.life > 0; });
    }
    function drawBall(b) {
      var col = BCOL[b.n];
      g.save();
      g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(b.x + 2, b.y + 3, R, 0, 7); g.fill();
      g.fillStyle = b.n > 8 ? "#f2f2f2" : col; g.beginPath(); g.arc(b.x, b.y, R, 0, 7); g.fill();
      if (b.n > 8) { g.save(); g.beginPath(); g.arc(b.x, b.y, R, 0, 7); g.clip(); g.fillStyle = col; g.fillRect(b.x - R, b.y - R * 0.55, R * 2, R * 1.1); g.restore(); }
      if (b.n > 0) {
        g.fillStyle = "#fff"; g.beginPath(); g.arc(b.x, b.y, R * 0.46, 0, 7); g.fill();
        g.fillStyle = "#111"; g.font = "700 " + Math.round(R * 0.68) + "px 'Exo 2', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(b.n), b.x, b.y + 0.5); g.textBaseline = "alphabetic";
      }
      var gr = g.createRadialGradient(b.x - R * 0.35, b.y - R * 0.4, R * 0.1, b.x, b.y, R);
      gr.addColorStop(0, "rgba(255,255,255,0.7)"); gr.addColorStop(0.4, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,0.28)");
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, R, 0, 7); g.fill();
      g.restore();
    }
    function drawStick(c, ang, pw) {
      var ux = Math.cos(ang), uy = Math.sin(ang), gap = R + 6 + pw * 90, L = 340, x0 = c.x - ux * gap, y0 = c.y - uy * gap, x1 = x0 - ux * L, y1 = y0 - uy * L, nx = -uy, ny = ux;
      g.save();
      g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.moveTo(x0 + nx * 2 + 4, y0 + ny * 2 + 6); g.lineTo(x1 + nx * 6 + 4, y1 + ny * 6 + 6); g.lineTo(x1 - nx * 6 + 4, y1 - ny * 6 + 6); g.lineTo(x0 - nx * 2 + 4, y0 - ny * 2 + 6); g.closePath(); g.fill();
      var lg = g.createLinearGradient(x0, y0, x1, y1);
      lg.addColorStop(0, "#f2e4c4"); lg.addColorStop(0.45, "#d9b57a"); lg.addColorStop(0.62, "#5a3a22"); lg.addColorStop(1, "#2b1b10");
      g.fillStyle = lg; g.beginPath(); g.moveTo(x0 + nx * 2.2, y0 + ny * 2.2); g.lineTo(x1 + nx * 6.2, y1 + ny * 6.2); g.lineTo(x1 - nx * 6.2, y1 - ny * 6.2); g.lineTo(x0 - nx * 2.2, y0 - ny * 2.2); g.closePath(); g.fill();
      // tip + ferrule
      g.fillStyle = "#4a86c8"; g.beginPath(); g.arc(x0, y0, 2.4, 0, 7); g.fill();
      g.strokeStyle = "#e9eef5"; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 - ux * 3, y0 - uy * 3); g.lineTo(x0 - ux * 14, y0 - uy * 14); g.stroke();
      // team colour wraps
      g.strokeStyle = tcol[ct]; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 - ux * (L * 0.64), y0 - uy * (L * 0.64)); g.lineTo(x0 - ux * (L * 0.7), y0 - uy * (L * 0.7)); g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0 - ux * 20 + nx, y0 - uy * 20 + ny); g.lineTo(x1 + nx * 2, y1 + ny * 2); g.stroke();
      g.restore();
    }
    function drawAim(c, ang, pw) {
      var ux = Math.cos(ang), uy = Math.sin(ang), hit = rayFirst(c.x, c.y, ux, uy), len, tx, ty;
      tx = ux > 0 ? (LW - M - R - c.x) / ux : ux < 0 ? (M + R - c.x) / ux : 1e9; ty = uy > 0 ? (LH - M - R - c.y) / uy : uy < 0 ? (M + R - c.y) / uy : 1e9;
      var wall = Math.min(tx, ty);
      len = hit ? hit.t : wall;
      g.lineCap = "round";
      // main aim line
      g.setLineDash([2, 7]); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(c.x + ux * (R + 2), c.y + uy * (R + 2)); g.lineTo(c.x + ux * len, c.y + uy * len); g.stroke(); g.setLineDash([]);
      if (hit) {
        var gx = c.x + ux * hit.t, gy = c.y + uy * hit.t;
        g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 2; g.beginPath(); g.arc(gx, gy, R, 0, 7); g.stroke();
        var ox = hit.b.x - gx, oy = hit.b.y - gy, ol = Math.hypot(ox, oy) || 1, nx2 = ox / ol, ny2 = oy / ol;
        g.strokeStyle = "#ffe36b"; g.lineWidth = 3; g.beginPath(); g.moveTo(hit.b.x + nx2 * R, hit.b.y + ny2 * R); g.lineTo(hit.b.x + nx2 * (R + 30 + pw * 90), hit.b.y + ny2 * (R + 30 + pw * 90)); g.stroke();
        var dot = ux * nx2 + uy * ny2, cx2 = ux - dot * nx2, cy2 = uy - dot * ny2, cl = Math.hypot(cx2, cy2);
        if (cl > 0.05) { g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 2; g.beginPath(); g.moveTo(gx + cx2 / cl * R, gy + cy2 / cl * R); g.lineTo(gx + cx2 / cl * (R + 22 + 50 * cl), gy + cy2 / cl * (R + 22 + 50 * cl)); g.stroke(); }
      } else {
        var wx = c.x + ux * wall, wy = c.y + uy * wall, rx = ux, ry = uy;
        if (tx < ty) rx = -rx; else ry = -ry;
        g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 2; g.setLineDash([2, 7]); g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + rx * 140, wy + ry * 140); g.stroke(); g.setLineDash([]);
        g.strokeStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(wx, wy, R, 0, 7); g.stroke();
      }
      g.lineCap = "butt";
    }
    function draw() {
      view.screen();
      g.fillStyle = "#0d111a"; g.fillRect(0, 0, view.W, view.H);
      view.begin();
      g.fillStyle = "rgba(0,0,0,0.4)"; rrPath(g, 6, 12, LW, LH, 22); g.fill();
      var wood = g.createLinearGradient(0, 0, 0, LH); wood.addColorStop(0, "#5b3a22"); wood.addColorStop(1, "#3c2514");
      g.fillStyle = wood; rrPath(g, 0, 0, LW, LH, 22); g.fill();
      g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2; rrPath(g, 3, 3, LW - 6, LH - 6, 20); g.stroke();
      g.fillStyle = "#2e6e55"; rrPath(g, M - 8, M - 8, LW - 2 * M + 16, LH - 2 * M + 16, 6); g.fill();
      var fg = g.createRadialGradient(LW / 2, LH / 2, 40, LW / 2, LH / 2, LW * 0.6); fg.addColorStop(0, "#2f9a6c"); fg.addColorStop(1, "#1f6b4c");
      g.fillStyle = fg; g.fillRect(M, M, LW - 2 * M, LH - 2 * M);
      g.fillStyle = "rgba(255,255,255,0.035)"; for (var yy = M; yy < LH - M; yy += 4) g.fillRect(M, yy, LW - 2 * M, 1);
      g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 2; g.beginPath(); g.moveTo(LW * 0.25 + 25, M); g.lineTo(LW * 0.25 + 25, LH - M); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.arc(LW * 0.68, LH / 2, 3, 0, 7); g.fill();
      // diamonds on rails
      g.fillStyle = "#e8d9b8"; for (var dd = 1; dd < 8; dd++) { var dx2 = M + (LW - 2 * M) * dd / 8; g.fillRect(dx2 - 2, 10, 4, 4); g.fillRect(dx2 - 2, LH - 14, 4, 4); }
      for (dd = 1; dd < 4; dd++) { var dy2 = M + (LH - 2 * M) * dd / 4; g.fillRect(10, dy2 - 2, 4, 4); g.fillRect(LW - 14, dy2 - 2, 4, 4); }
      POCK.forEach(function (p, q) { g.fillStyle = "#07090d"; g.beginPath(); g.arc(p.x, p.y, PR[q], 0, 7); g.fill(); g.strokeStyle = "#c9a35c"; g.lineWidth = 3; g.stroke(); });
      var c = cue();
      balls.forEach(function (b) { if (b.on) drawBall(b); });
      if (c.on && human() && phase === "aim" && !placing) { drawAim(c, aimAng, power); drawStick(c, aimAng, power); }
      else if (c.on && online && phase === "aim" && !placing && remoteAim) { drawAim(c, remoteAim.a, remoteAim.p); drawStick(c, remoteAim.a, remoteAim.p); }
      if (c.on && phase === "cpuaim" && cpuAim) { drawAim(c, cpuAim.ang, 0.3); drawStick(c, cpuAim.ang, power); }
      if (c.on && (phase === "think")) { }
      if (placing && phase === "aim" && (human() || online)) { g.strokeStyle = "#ffe36b"; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(c.x, c.y, R + 7, 0, 7); g.stroke(); g.setLineDash([]); }
      // potted trays on the rails
      [0, 1].forEach(function (tm) {
        pot[tm].forEach(function (num, k) {
          var px = tm === 0 ? 70 + k * 17 : LW - 70 - k * 17, py = LH - 15;
          g.fillStyle = num > 8 ? "#f2f2f2" : BCOL[num]; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill();
          if (num > 8) { g.fillStyle = BCOL[num]; g.fillRect(px - 6, py - 2.5, 12, 5); }
        });
      });
      parts.forEach(function (q) { g.globalAlpha = Math.max(0, q.life / q.max); g.fillStyle = q.col; g.fillRect(q.x, q.y, q.s, q.s); });
      g.globalAlpha = 1;
    }

    // ----- online: guest side (draws what the host streams) -----
    var syncT = 0, pendingT = 0, PH = { intro: 1, aim: 1, moving: 1, over: 1 }, EVK = { cushion: 1, ball: 1, pocket: 1, cue: 1 };
    function pbFor(q) {
      if (!pb || q > pb.q) pb = { q: q, fr: [], first: -1, last: -1, t: -0.2, evs: [], end: false, done: false };
      return pb.q === q ? pb : null;
    }
    function applyBalls(b) {
      if (!Array.isArray(b) || b.length !== balls.length * 2) return;
      for (var k = 0; k < balls.length; k++) {
        var x = +b[2 * k], y = +b[2 * k + 1], o = balls[k];
        if (!isFinite(x) || !isFinite(y) || x < 0) o.on = false;
        else { o.on = true; o.x = x; o.y = y; }
        o.vx = o.vy = 0;
      }
    }
    function realApply(st) {
      var prev = phase, k;
      applyBalls(st.b);
      ct = num(st.ct, 0, 1, 0) | 0; shooter = num(st.sh, 0, n - 1, 0) | 0;
      hand = !!st.hd; placing = !!st.pl; breakShot = !!st.brk; ended = !!st.en;
      group = [0, 1].map(function (t) { var v = st.gp && st.gp[t]; return v === "solid" || v === "stripe" ? v : null; });
      frames = [0, 1].map(function (t) { return num(st.fr && st.fr[t], 0, 9, 0) | 0; });
      pot = [0, 1].map(function (t) { var a = st.pt && st.pt[t]; return Array.isArray(a) ? a.slice(0, 8).map(function (x) { return num(x, 1, 15, 1) | 0; }) : []; });
      phase = PH[st.ph] ? st.ph : "aim";
      hud();
      if (st.ph === "moving" && prev !== "moving") sfx("cue", 0.6);
      if (phase === "aim") {
        C.turn(shooter);
        if (shooter !== me || prev !== "aim") { aimAng = num(st.ca, -7, 7, 0); setPwr(0); remoteAim = null; }
        pwr.style.display = (human() && !placing) ? "flex" : "none";
      } else { pwr.style.display = "none"; if (phase !== "moving") setPwr(0); }
      var m = st.m;
      if (m && typeof m.a === "string" && typeof m.b === "string") C.msg(esc(m.a.slice(0, 200)) + (m.w >= 0 && m.w < n ? C.who(m.w | 0) : "") + esc(m.b.slice(0, 200)));
      haveState = true; syncT = 0;
    }
    function pendingReady() {
      if (!pendingSt) return false;
      if (pendingT > 4 || !pb || !pendingSt.nf) return true;
      if (pb.q > pendingSt.q) return true;
      if (pb.q < pendingSt.q) return false;
      return pb.done;
    }
    function playback(dt) {
      if (pb.last < 0) return;
      pb.t = Math.min(pb.t + dt, pb.last / 30);
      var idx = Math.max(pb.first, pb.t * 30), i0 = Math.floor(idx), f = idx - i0;
      var A = pb.fr[i0], B = pb.fr[i0 + 1] || A;
      if (!A) { for (var j = i0; j >= pb.first && !A; j--) A = pb.fr[j]; B = A; f = 0; }
      if (!A) return;
      for (var k = 0; k < balls.length; k++) {
        var ax = A[2 * k], bx = B[2 * k], o = balls[k];
        if (ax < 0) { o.on = false; continue; }
        o.on = true;
        o.x = ax + (bx >= 0 ? (bx - ax) * f : 0); o.y = A[2 * k + 1] + (bx >= 0 ? (B[2 * k + 1] - A[2 * k + 1]) * f : 0);
      }
      pb.evs.forEach(function (e) {
        if (e.p || e[0] > i0) return;
        e.p = true;
        if (e[1] === "pocket") { sfx("pocket"); spark(e[3], e[4], e[5] === 0 ? "#fff" : (BCOL[e[5]] || "#fff"), 14, 220, 0.5); }
        else if (e[1] === "ball") { sfx("ball", e[2]); if (e[2] * 900 > 60) spark(e[3], e[4], "#fff", 3, 120, 0.2); }
        else sfx(e[1], e[2]);
      });
      if (pb.end && pb.t >= pb.last / 30) pb.done = true;
    }
    function guestUpdate(dt) {
      if (phase === "aim" && human() && !placing) {
        if (keysDown.l) aimAng -= dt * (charging ? 0.25 : 0.9);
        if (keysDown.r) aimAng += dt * (charging ? 0.25 : 0.9);
        if (charging) setPwr(Math.min(1, power + dt * 0.8));
        sentAim += dt;
        if (sentAim > 0.07) { sentAim = 0; var key = aimAng.toFixed(3) + "|" + power.toFixed(2); if (key !== lastAimKey) { lastAimKey = key; net.send("aim", { a: aimAng, p: power }); } }
      }
      if (phase === "moving" && pb) playback(dt);
      if (pendingSt) { pendingT += dt; if (pendingReady()) { var st = pendingSt; pendingSt = null; realApply(st); } }
      // ask the host for the table if we have not got it, or if we seem stuck
      syncT += dt; waitT += dt;
      var stuck = !haveState || (phase === "wait" && waitT > 2.5) || (phase === "moving" && pb && pb.done && !pendingSt && waitT > 2.5);
      if (stuck && syncT > 1.5) { syncT = 0; net.send("sync", {}); }
      if (phase !== "wait" && !(phase === "moving" && pb && pb.done)) waitT = 0;
      parts.forEach(function (q) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; });
      parts = parts.filter(function (q) { return q.life > 0; });
    }
    if (online) {
      net.on("fr", function (d, from) {
        if (auth || from !== net.hostIdx || !d || !Array.isArray(d.f)) return;
        var q = num(d.q, 0, 1e9, 0) | 0;
        if (pb && q < pb.q) return;
        var p = pbFor(q); if (!p) return;
        var i0 = num(d.i, 0, 5000, 0) | 0;
        d.f.slice(0, 12).forEach(function (fr, k) {
          if (!Array.isArray(fr) || fr.length !== balls.length * 2) return;
          p.fr[i0 + k] = fr;
          if (p.first < 0) { p.first = i0 + k; p.t = (i0 + k) / 30 - 0.2; }
          if (i0 + k > p.last) p.last = i0 + k;
        });
        if (Array.isArray(d.e)) d.e.slice(0, 60).forEach(function (e) {
          if (Array.isArray(e) && e.length === 6 && EVK[e[1]] && isFinite(e[0]) && isFinite(e[2]) && isFinite(e[3]) && isFinite(e[4]) && isFinite(e[5])) p.evs.push(e);
        });
        if (d.end) p.end = true;
        if (phase !== "moving" && phase !== "over") { phase = "moving"; pwr.style.display = "none"; remoteAim = null; }
      });
      net.on("st", function (d, from) {
        if (auth || from !== net.hostIdx || !d || typeof d !== "object") return;
        var q = num(d.q, 0, 1e9, 0) | 0;
        if (pb && q < pb.q) return;
        if (d.ph === "moving") { pbFor(q); pendingSt = null; realApply(d); }
        else { pendingSt = d; pendingT = 0; }
      });
    }
    // The shooter's aim and cue-ball placement, as seen by everybody else
    if (online) {
      net.on("aim", function (d, from) {
        if (from < 0 || from !== shooter || phase !== "aim" || placing || human() || !d) return;
        remoteAim = { a: num(d.a, -7, 7, 0), p: num(d.p, 0, 1, 0) };
      });
      net.on("place", function (d, from) {
        if (from < 0 || from !== shooter || phase !== "aim" || !placing || human() || !d) return;
        var c = cue(); movePlace({ x: num(d.x, 0, LW, c.x), y: num(d.y, 0, LH, c.y) });
        if (d.done && auth) finishPlace();
      });
      if (auth) {
        // HOST: a guest may only ask to shoot; the host checks it is really their turn.
        net.on("shot", function (d, from) {
          if (from < 0 || from !== shooter || phase !== "aim" || placing || ended || !d) return;
          var a = +d.a, p = +d.p;
          if (!isFinite(a) || !isFinite(p) || p < 0.07 || p > 1) return;
          aimAng = a; fire(a, p);
        });
        net.on("sync", function (d, from) { if (from >= 0) sendState(); });
      }
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!last) last = ts;
      var dt = Math.min(0.033, (ts - last) / 1000); last = ts;
      update(dt); draw();
    }
    // test hook (read-only snapshot used by the automated tests)
    window.__PZ_TEST = { pool: function () { return { balls: balls.map(function (b) { return [b.x, b.y, b.on ? 1 : 0]; }), shooter: shooter, ct: ct, phase: phase, frames: frames.slice(), placing: placing }; } };
    rack(); pwr.style.display = "none";
    C.msg("First to " + NEED + " frame" + (NEED > 1 ? "s" : "") + " wins the match. Get ready…");
    raf = requestAnimationFrame(frame);
    return { destroy: function () { cancelAnimationFrame(raf); if (ro) ro.disconnect(); document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku); } };
  };

  Hub.register({
    "id": "pool",
    "name": "8-Ball Pool",
    "hue": 160,
    "kind": "Turns",
    "mins": 8,
    "rules": "Drag on the table to swing the cue to any angle. The dotted line shows where the cue ball will go, the ring shows where it will hit and the yellow line shows where the object ball will travel. Pull the power bar down and let go to shoot (on a computer you can also use the arrow keys to turn and hold Space for power). The first ball you pot sets your group (solids 1–7 or stripes 9–15). Pot all of your group, then the 8-ball, to win the frame. Scratching or hitting the wrong ball gives your rival ball in hand. Easy: 1 frame. Medium: first to 2. Hard: first to 3. With 3 or 4 players, Players 1 and 3 form a team against Players 2 and 4.",
    "desc": "Pot your group, then sink the 8-ball. Best of several frames.",
    "icon": "<circle class=\"st\" cx=\"40\" cy=\"40\" r=\"26\"/><circle class=\"fl\" cx=\"40\" cy=\"40\" r=\"9\"/><text x=\"40\" y=\"44\" font-size=\"11\" text-anchor=\"middle\" style=\"fill:var(--bg)\">8</text><circle class=\"soft\" cx=\"40\" cy=\"40\" r=\"26\"/>",
    "teams": false,
    "diff": "Easy: one frame. Medium: best of 3 frames. Hard: best of 5 frames. The computer aims better on harder levels."
  });
})();
