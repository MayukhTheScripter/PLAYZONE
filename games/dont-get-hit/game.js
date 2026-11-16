/* Don't Get Hit - a space-fighter shooter. Fight waves of NPC fighters and three bosses. Each pilot takes a run; best score wins. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var LW = 360, LH = 600, TAU = Math.PI * 2;
  var TYPES = {
    scout:    { hp: 3,  r: 13, pts: 100, fire: 2.3, spd: 95 },
    fighter:  { hp: 8,  r: 16, pts: 220, fire: 1.7, spd: 70 },
    gunship:  { hp: 20, r: 22, pts: 450, fire: 2.2, spd: 38 },
    kamikaze: { hp: 3,  r: 12, pts: 150, fire: 99,  spd: 0 },
    sniper:   { hp: 7,  r: 14, pts: 260, fire: 2.6, spd: 30 },
    splitter: { hp: 14, r: 18, pts: 320, fire: 2.8, spd: 45 },
    cruiser:  { hp: 42, r: 28, pts: 800, fire: 2.0, spd: 28 }
  };
  var BOSSES = [
    { name: "Warden Drone", hp: 420, sc: 1.0, pal: ["#1a0f24", "#6a3a8a"] },
    { name: "Hive Carrier", hp: 720, sc: 1.15, pal: ["#10241a", "#3a8a5a"] },
    { name: "Dreadnought Morvane", hp: 1150, sc: 1.4, pal: ["#2a0a0e", "#a83a3a"] }
  ];
  var WAVES = [
    { n: 6, t: ["scout", "scout", "fighter"] }, { n: 8, t: ["scout", "fighter", "kamikaze"] }, { boss: 0 },
    { n: 9, t: ["fighter", "sniper", "kamikaze"] }, { n: 10, t: ["fighter", "splitter", "gunship", "sniper"] }, { boss: 1 },
    { n: 11, t: ["gunship", "splitter", "kamikaze", "sniper", "fighter"] }, { n: 12, t: ["cruiser", "gunship", "fighter", "sniper", "splitter"] }, { boss: 2 }
  ];

  function pathPoly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
  function glow(g, x, y, r, c) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, "#0000"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function lin(g, x0, y0, x1, y1, stops) { var gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s, i) { gr.addColorStop(i / (stops.length - 1), s); }); return gr; }

  /* --- ship art (all drawn in canvas; nose points up, rotate for enemies) --- */
  function drawPlayer(g, t, flame, wl, big) {
    var fl = 16 + 9 * Math.sin(t * 40) + flame * 10;
    [-6, 6].forEach(function (ex) {
      var gr = g.createLinearGradient(0, 24, 0, 24 + fl * 1.6); gr.addColorStop(0, "#fff7c8"); gr.addColorStop(0.35, "#ffb23c"); gr.addColorStop(1, "#ff3b0000");
      g.fillStyle = gr; g.beginPath(); g.moveTo(ex - 4, 24); g.quadraticCurveTo(ex, 24 + fl * 1.7, ex + 4, 24); g.fill();
    });
    g.shadowColor = "#4fb4ff"; g.shadowBlur = 10;
    pathPoly(g, [0, -22, 9, -4, 30, 18, 30, 26, 12, 17, 8, 26, -8, 26, -12, 17, -30, 26, -30, 18, -9, -4]); g.fillStyle = lin(g, -30, 0, 30, 0, ["#1c2740", "#7f9bc9", "#2b3c61", "#7f9bc9", "#1c2740"]); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = "#0b1226"; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = "#ff4d5a"; g.fillRect(-27, 19, 8, 3); g.fillRect(19, 19, 8, 3);
    g.beginPath(); g.moveTo(0, -36); g.bezierCurveTo(7, -26, 9, -8, 8.5, 12); g.lineTo(5.5, 27); g.lineTo(-5.5, 27); g.lineTo(-8.5, 12); g.bezierCurveTo(-9, -8, -7, -26, 0, -36); g.closePath();
    g.fillStyle = lin(g, -9, 0, 9, 0, ["#8ea3c4", "#f4f8ff", "#9fb2d1", "#53668a"]); g.fill(); g.stroke();
    g.fillStyle = lin(g, 0, -20, 0, 2, ["#d6faff", "#1a82b8", "#0b3556"]); g.beginPath(); g.ellipse(0, -12, 4.6, 10, 0, 0, TAU); g.fill();
    g.fillStyle = "#ffffffaa"; g.beginPath(); g.ellipse(-1.4, -16, 1.4, 4.5, 0.1, 0, TAU); g.fill();
    g.fillStyle = "#222c44"; g.fillRect(-7.5, 16, 15, 3.5); g.fillStyle = "#4fb4ff"; g.fillRect(-1.2, -34, 2.4, 6);
    var gun = wl >= 2 || big; g.fillStyle = gun ? "#ffcf5a" : "#9aa6bd"; g.fillRect(-17, -4, 3.6, 14); g.fillRect(13.4, -4, 3.6, 14);
    if (wl >= 4) { g.fillStyle = "#ff8a5a"; g.fillRect(-25, 4, 3.4, 12); g.fillRect(21.6, 4, 3.4, 12); }
    if (big) { g.fillStyle = "#ff3b6b"; g.fillRect(-3.2, -42, 6.4, 12); }
    var bl = (Math.sin(t * 9) > 0); g.fillStyle = bl ? "#7dff9a" : "#2a6d3a"; g.beginPath(); g.arc(-29, 21, 1.8, 0, TAU); g.fill(); g.fillStyle = bl ? "#2a3a6d" : "#7dd0ff"; g.beginPath(); g.arc(29, 21, 1.8, 0, TAU); g.fill();
  }
  function drawEnemy(g, type, tier, t, flash) {
    var hueA = { scout: ["#2b0f2f", "#b34fd1"], fighter: ["#3a0f12", "#e2554f"], gunship: ["#1b2a14", "#7fbf4a"], kamikaze: ["#3a2a08", "#ffb02e"], sniper: ["#0e2a3a", "#3ec8ff"], splitter: ["#2a1a3a", "#e05aff"], cruiser: ["#2a2a30", "#9aa6b8"] }[type], sc = 0.88 + tier * 0.04;
    g.save(); g.rotate(Math.PI); g.scale(sc, sc);
    var fl = 10 + 6 * Math.sin(t * 36); g.fillStyle = lin(g, 0, 22, 0, 22 + fl * 1.6, ["#c9f0ff", "#4a9bff", "#4a9bff00"]);
    if (type === "gunship" || type === "cruiser") { [-12, 0, 12].forEach(function (ex) { g.beginPath(); g.moveTo(ex - 4, 22); g.quadraticCurveTo(ex, 22 + fl * 1.6, ex + 4, 22); g.fill(); }); } else { g.beginPath(); g.moveTo(-4, 22); g.quadraticCurveTo(0, 22 + fl * 1.7, 4, 22); g.fill(); }
    g.shadowColor = hueA[1]; g.shadowBlur = 8;
    if (type === "scout") {
      pathPoly(g, [0, -20, 8, 0, 24, 14, 24, 20, 8, 14, 0, 22, -8, 14, -24, 20, -24, 14, -8, 0]);
    } else if (type === "fighter") {
      pathPoly(g, [0, -24, 7, -8, 30, 6, 32, 16, 14, 12, 9, 24, -9, 24, -14, 12, -32, 16, -30, 6, -7, -8]);
    } else if (type === "kamikaze") {
      pathPoly(g, [0, -22, 6, -6, 14, 6, 8, 10, 4, 20, -4, 20, -8, 10, -14, 6, -6, -6]);
    } else if (type === "sniper") {
      pathPoly(g, [0, -30, 4, -10, 34, 4, 34, 10, 6, 6, 5, 22, -5, 22, -6, 6, -34, 10, -34, 4, -4, -10]);
    } else if (type === "splitter") {
      g.beginPath(); g.ellipse(0, 0, 21, 17, 0, 0, TAU); g.moveTo(-26, 6); g.lineTo(-18, -6); g.lineTo(-12, 8); g.moveTo(26, 6); g.lineTo(18, -6); g.lineTo(12, 8);
    } else if (type === "cruiser") {
      pathPoly(g, [0, -34, 10, -24, 22, -20, 44, -4, 46, 14, 30, 26, 14, 20, 0, 30, -14, 20, -30, 26, -46, 14, -44, -4, -22, -20, -10, -24]);
    } else {
      pathPoly(g, [0, -26, 12, -14, 36, -2, 38, 14, 22, 22, 12, 18, 0, 26, -12, 18, -22, 22, -38, 14, -36, -2, -12, -14]);
    }
    g.fillStyle = flash ? "#ffffff" : lin(g, -30, 0, 30, 0, [hueA[0], hueA[1], hueA[0]]); g.fill(); g.shadowBlur = 0; g.strokeStyle = "#000a"; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = "#0008"; g.beginPath(); g.ellipse(0, -2, type === "gunship" ? 9 : 5, type === "gunship" ? 13 : 9, 0, 0, TAU); g.fill();
    g.fillStyle = flash ? "#fff" : "#ff3b3b"; g.beginPath(); g.ellipse(0, -2, 2.4, 5.5, 0, 0, TAU); g.fill();
    if (type !== "scout") { g.fillStyle = "#222"; g.fillRect(-22, 4, 4, 12); g.fillRect(18, 4, 4, 12); }
    if (type === "gunship" || type === "cruiser") { g.fillStyle = "#333"; g.fillRect(-4, 10, 8, 14); g.fillStyle = "#ff9d2e"; g.beginPath(); g.arc(-26, 6, 3, 0, TAU); g.arc(26, 6, 3, 0, TAU); g.fill(); }
    if (tier > 0) { g.strokeStyle = "#ffd54a"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, 18); g.lineTo(0, 12 - tier); g.lineTo(6, 18); g.stroke(); }
    g.restore();
  }
  function drawBoss(g, t, flash, enraged, kind) {
    var BP = BOSSES[kind || 0].pal;
    var fl = 18 + 8 * Math.sin(t * 30);
    g.save(); g.scale(BOSSES[kind || 0].sc, BOSSES[kind || 0].sc); g.rotate(Math.PI);
    [-30, -14, 14, 30].forEach(function (ex) { g.fillStyle = lin(g, 0, 40, 0, 40 + fl * 2, ["#fff0c8", "#ff8a2e", "#ff3b0000"]); g.beginPath(); g.moveTo(ex - 6, 40); g.quadraticCurveTo(ex, 40 + fl * 2, ex + 6, 40); g.fill(); });
    g.shadowColor = enraged ? "#ff3b3b" : "#b34fd1"; g.shadowBlur = 16;
    pathPoly(g, [0, -48, 16, -32, 40, -20, 74, 6, 78, 34, 52, 36, 36, 26, 20, 44, -20, 44, -36, 26, -52, 36, -78, 34, -74, 6, -40, -20, -16, -32]);
    g.fillStyle = flash ? "#fff" : lin(g, -78, 0, 78, 0, [BP[0], BP[1], BP[0], BP[1], BP[0]]); g.fill(); g.shadowBlur = 0; g.strokeStyle = "#000b"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#0b0612"; pathPoly(g, [0, -34, 12, -10, 10, 22, -10, 22, -12, -10]); g.fill();
    g.fillStyle = enraged ? "#ff3030" : "#ff9d2e"; g.beginPath(); g.ellipse(0, 2, 6, 13, 0, 0, TAU); g.fill(); g.fillStyle = "#fff9"; g.beginPath(); g.ellipse(-1.5, -3, 1.8, 5, 0, 0, TAU); g.fill();
    [-56, -38, 38, 56].forEach(function (cx) { g.fillStyle = "#3a2450"; g.beginPath(); g.arc(cx, 18, 7, 0, TAU); g.fill(); g.fillStyle = "#ff3b6b"; g.fillRect(cx - 2, 18, 4, 14); });
    g.strokeStyle = "#b34fd1aa"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-60, 8); g.lineTo(-24, -14); g.moveTo(60, 8); g.lineTo(24, -14); g.stroke();
    if (kind === 1) { [-66, -46, 46, 66].forEach(function (px) { glow(g, px, 20, 11, "#7dff9aaa"); g.fillStyle = "#1c4a30"; g.beginPath(); g.arc(px, 20, 6, 0, TAU); g.fill(); }); }
    if (kind === 2) { g.fillStyle = "#d8c8a8"; for (var sp = -3; sp <= 3; sp++) { g.beginPath(); g.moveTo(sp * 9 - 4, -38); g.lineTo(sp * 9, -52 - (3 - Math.abs(sp)) * 4); g.lineTo(sp * 9 + 4, -38); g.fill(); } glow(g, 0, 2, 40, "#ff3b3b44"); }
    g.restore();
  }

  ENGINES.dodge = function (C) {
    var lv = C.lv, HPM = [0.8, 1, 1.35][lv], FR = [1.35, 1, 0.78][lv], BS = [0.85, 1, 1.15][lv], DM = [0.8, 1, 1.2][lv];
    return Kit.runTurns(C, {
      intro: "Drag your finger (or arrow keys / WASD) to fly - your ship fires automatically. Shoot down the enemy fleets, dodge their bullets and missiles, grab power-ups, and beat all six waves and the boss to win!",
      cpuScore: function (l) { return Math.round([1500, 3400, 6200][l] + Kit.rnd(-300, 500)); },
      sub: "Best pilot (points)",
      play: function (idx, box, done) {
        var view = Kit.tall(box, LW, LH), g = view.g, keys = Kit.keys(), stop, over = false, t = 0, score = 0, shake = 0;
        var P = { x: LW / 2, y: 500, hp: 100, inv: 0, shield: 0, wl: 1, big: 0, cd: 0, flame: 0 }, tgt = { x: P.x, y: P.y }, ptr = false;
        var bl = [], eb = [], en = [], ms = [], rocks = [], ups = [], pr = [], rings = [], stars = [], boss = null, popups = [];
        var wave = -1, toSpawn = 0, field = 0, waveWait = 1.2, rockT = 7, banner = { txt: "", t: 0 };
        for (var i = 0; i < 70; i++) stars.push({ x: Math.random() * LW, y: Math.random() * LH, z: 0.3 + Math.random() * 1.2 });
        view.cv.style.touchAction = "none";
        function pm(e) { var l = view.toLogical(e.clientX, e.clientY); tgt.x = Kit.clamp(l.x, 24, LW - 24); tgt.y = Kit.clamp(l.y - (e.pointerType === "mouse" ? 0 : 56), 120, LH - 30); ptr = true; }
        view.cv.addEventListener("pointermove", pm); view.cv.addEventListener("pointerdown", pm);
        function say(t2) { banner.txt = t2; banner.t = 2.2; }
        function boom(x, y, n, sz, col) { for (var i = 0; i < n; i++) { var a = Math.random() * TAU, s = Kit.rnd(30, 190) * sz; pr.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: Kit.rnd(0.3, 0.8), m: 0.8, r: Kit.rnd(2, 6) * sz, c: Math.random() < 0.5 ? "#ffcf5a" : (col || "#ff6a2a") }); } rings.push({ x: x, y: y, r: 4, l: 0.35, m: 0.35, mx: 30 * sz + 10 }); }
        function hurt(d, x, y) {
          if (P.inv > 0 || over) return; if (P.shield > 0) { P.shield = Math.max(0, P.shield - 1.2); sfx("clang"); return; }
          P.hp -= d * DM; P.inv = 0.45; shake = 0.25; sfx("hit"); boom(x, y, 6, 0.5, "#ff3b3b");
          if (P.hp <= 0) { P.hp = 0; over = true; sfx("boom"); boom(P.x, P.y, 50, 1.6); stop && stop(); setTimeout(function () { done(Math.round(score), "Shot down in wave " + Math.max(1, wave + 1) + "."); }, 700); }
        }
        function mkEnemy(type, tier) {
          var d = TYPES[type], e = { type: type, tier: tier, x: Kit.rnd(40, LW - 40), y: -30, x0: 0, hp: d.hp * HPM * (1 + tier * 0.22) * (1 + Math.max(0, wave) * 0.08), mhp: 0, cd: Kit.rnd(0.6, 1.8) * FR, t: Kit.rnd(0, 6), r: d.r, fl: 0, sy: type === "scout" ? -30 : type === "sniper" ? Kit.rnd(50, 100) : Kit.rnd(70, 190), ph: Math.random() < 0.5 ? 1 : -1 };
          e.mhp = e.hp; e.x0 = e.x; en.push(e); field++; return e;
        }
        function startWave() {
          wave++; var Wv = WAVES[wave]; if (!Wv) { startBoss(2); return; }
          if (Wv.boss !== undefined) { startBoss(Wv.boss); return; }
          toSpawn = Wv.n; say("Wave " + (wave + 1) + " / " + WAVES.length); sfx("go");
          var first = Math.min(toSpawn, 2 + Math.ceil(wave / 3)); for (var i = 0; i < first; i++) spawnOne(0);
        }
        function spawnOne(tier) { if (toSpawn <= 0) return; toSpawn--; var w = WAVES[wave]; mkEnemy(Kit.pick(w.t), tier); }
        function startBoss(k) { var d = BOSSES[k]; say("WARNING - " + d.name); sfx("lose"); var h = d.hp * HPM; boss = { kind: k, x: LW / 2, y: -90, hp: h, mhp: h, t: 0, cd: 1.6, a: 0, fl: 0, ent: true, r: 50 * d.sc }; }
        function minion(type) { var e = mkEnemy(type, 1); e.x = Kit.clamp(boss.x + Kit.rnd(-50, 50), 30, LW - 30); e.x0 = e.x; e.y = boss.y + 30; e.sy = 150 + Kit.rnd(0, 60); }
        function drop(x, y, force) {
          if (!force && Math.random() > 0.2) return;
          var r = Math.random(), k = r < 0.3 ? "G" : r < 0.5 ? "M" : r < 0.62 ? "B" : r < 0.84 ? "H" : "S"; ups.push({ x: x, y: y, k: k, t: 0 });
        }
        function killEnemy(e, i) {
          en.splice(i, 1); field--; score += TYPES[e.type].pts * (1 + e.tier * 0.25); boom(e.x, e.y, 18 + e.r / 2, e.r / 18); sfx("boom"); drop(e.x, e.y);
          if (e.type === "splitter") for (var q2 = 0; q2 < 2; q2++) { var mn = mkEnemy("scout", 0); mn.x = e.x + (q2 ? 16 : -16); mn.x0 = mn.x; mn.y = e.y; }
          var more = Math.random() < 0.55 ? 2 : 1; for (var k = 0; k < more; k++) spawnOne(Math.min(5, e.tier + 1));
        }
        function shootEnemy(e, aim, spd, dmg) {
          var a = aim ? Math.atan2(P.y - e.y, P.x - e.x) : Math.PI / 2; eb.push({ x: e.x, y: e.y + 12, vx: Math.cos(a) * spd * BS, vy: Math.sin(a) * spd * BS, r: 4, d: dmg });
        }
        function missile(x, y) { ms.push({ x: x, y: y, vx: 0, vy: 120, a: Math.PI / 2, hp: 2, l: 5, tr: [] }); }
        function fire() {
          var x = P.x, y = P.y - 20;
          if (P.big > 0) { bl.push({ x: x, y: y, vx: 0, vy: -520, r: 11, d: 5, pierce: true, big: true }); P.cd = 0.34; sfx("beep"); return; }
          var w = P.wl, sp = -620;
          if (w === 1) bl.push({ x: x, y: y, vx: 0, vy: sp, r: 3.4, d: 1 });
          else if (w === 2) { bl.push({ x: x - 9, y: y + 6, vx: 0, vy: sp, r: 3.4, d: 1 }); bl.push({ x: x + 9, y: y + 6, vx: 0, vy: sp, r: 3.4, d: 1 }); }
          else if (w === 3) { [-1, 0, 1].forEach(function (k) { bl.push({ x: x + k * 8, y: y + 4, vx: k * 90, vy: sp, r: 3.4, d: 1 }); }); }
          else if (w === 4) { [-2, -1, 0, 1, 2].forEach(function (k) { bl.push({ x: x + k * 6, y: y + 4, vx: k * 80, vy: sp, r: 3.4, d: 1 }); }); }
          else { [-2, -1, 0, 1, 2].forEach(function (k) { bl.push({ x: x + k * 6, y: y + 4, vx: k * 95, vy: sp, r: 4.2, d: 1.3 }); }); bl.push({ x: x - 24, y: y + 14, vx: -40, vy: sp, r: 3.4, d: 1 }); bl.push({ x: x + 24, y: y + 14, vx: 40, vy: sp, r: 3.4, d: 1 }); }
          P.cd = w >= 4 ? 0.17 : 0.19; sfx("tap");
        }
        function bossAttack() {
          var b = boss, K = b.kind, p2 = b.hp < b.mhp * 0.5, p3 = b.hp < b.mhp * 0.25, k, dmg = 9 + K * 2, n4 = K ? 4 : 3, m = (b.a++) % n4, sp = 1 + K * 0.1;
          function ring(n, sp2, off) { for (var r = 0; r < n; r++) { var s2 = r / n * TAU + off; eb.push({ x: b.x, y: b.y + 20, vx: Math.cos(s2) * sp2 * BS, vy: Math.sin(s2) * sp2 * BS + 30, r: 4, d: dmg - 1 }); } }
          if (m === 0) { var nn = 3 + K * 2 + (p2 ? 2 : 0); for (k = -nn; k <= nn; k++) { var a = Math.PI / 2 + k * (0.34 / (1 + K * 0.2)); eb.push({ x: b.x, y: b.y + 40 * BOSSES[K].sc, vx: Math.cos(a) * 185 * BS * sp, vy: Math.sin(a) * 185 * BS * sp, r: 5, d: dmg }); } }
          else if (m === 1) { var a0 = Math.atan2(P.y - b.y, P.x - b.x), c = 1 + K + (p2 ? 1 : 0); for (k = -c; k <= c; k++) eb.push({ x: b.x + k * 26, y: b.y + 36, vx: Math.cos(a0 + k * 0.08) * 250 * BS, vy: Math.sin(a0 + k * 0.08) * 250 * BS, r: 4.5, d: dmg + 1 }); }
          else if (m === 2) { missile(b.x - 50, b.y + 30); missile(b.x + 50, b.y + 30); if (K >= 1) missile(b.x, b.y + 40); if (p2) ring(10 + K * 2, 120, b.t); if (K >= 1 && field < 3) { minion("scout"); minion(K === 2 ? "fighter" : "scout"); } }
          else { ring(12 + K * 3, 135, b.t); if (K === 2) { for (k = 0; k < 3; k++) (function (d) { setTimeout(function () { if (boss === b && !over) { var aa = Math.atan2(P.y - b.y, P.x - b.x); eb.push({ x: b.x, y: b.y + 40, vx: Math.cos(aa) * 300 * BS, vy: Math.sin(aa) * 300 * BS, r: 5, d: dmg + 2 }); } }, d); })(k * 220); if (field < 4) minion("kamikaze"); } }
          b.cd = ([1.55, 1.3, 1.05][K]) * FR * (p3 ? 0.7 : p2 ? 0.85 : 1);
        }
        function update(dt) {
          t += dt; if (P.inv > 0) P.inv -= dt; if (P.shield > 0) P.shield -= dt; if (P.big > 0) P.big -= dt; if (shake > 0) shake -= dt; if (banner.t > 0) banner.t -= dt;
          // movement
          var kx = (keys.down.ArrowRight || keys.down.KeyD ? 1 : 0) - (keys.down.ArrowLeft || keys.down.KeyA ? 1 : 0), ky = (keys.down.ArrowDown || keys.down.KeyS ? 1 : 0) - (keys.down.ArrowUp || keys.down.KeyW ? 1 : 0);
          if (kx || ky) { tgt.x = Kit.clamp(P.x + kx * 200, 24, LW - 24); tgt.y = Kit.clamp(P.y + ky * 200, 120, LH - 30); }
          var ox = P.x, oy = P.y, k = Math.min(1, dt * 14); P.x += (tgt.x - P.x) * k; P.y += (tgt.y - P.y) * k; P.flame = Kit.clamp((oy - P.y) / (dt * 400 + 1e-6), -0.5, 1);
          P.cd -= dt; if (P.cd <= 0) fire();
          stars.forEach(function (s) { s.y += (60 + s.z * 120) * dt; if (s.y > LH) { s.y = -2; s.x = Math.random() * LW; } });
          // waves
          if (!boss) {
            if (wave < 0 || (field === 0 && toSpawn === 0)) { waveWait -= dt; if (waveWait <= 0) { startWave(); waveWait = 1.6; } }
            else if (field < 2 + Math.ceil(wave / 3) && toSpawn > 0) { waveWait -= dt; if (waveWait <= 0) { spawnOne(0); waveWait = 1.2; } }
          }
          rockT -= dt; if (rockT <= 0) { rockT = Kit.rnd(7, 11); if (rocks.length < 2) rocks.push({ x: Kit.rnd(30, LW - 30), y: -30, vx: Kit.rnd(-25, 25), vy: Kit.rnd(70, 110), r: Kit.rnd(16, 24), a: 0, va: Kit.rnd(-2, 2), hp: 5 }); }
          // player bullets
          bl.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; });
          bl = bl.filter(function (b) { return b.y > -30 && b.x > -20 && b.x < LW + 20; });
          // enemies
          for (var i = en.length - 1; i >= 0; i--) {
            var e = en[i]; e.t += dt; if (e.fl > 0) e.fl -= dt;
            if (e.type === "scout") { e.y += TYPES.scout.spd * dt * (1 + e.tier * 0.06); e.x = Kit.clamp(e.x0 + Math.sin(e.t * 2.2) * 46, 20, LW - 20); }
            else if (e.type === "fighter") { if (e.y < e.sy) e.y += 110 * dt; else { var dx = P.x - e.x; e.x += Kit.clamp(dx, -1, 1) * (TYPES.fighter.spd + e.tier * 8) * dt * 0.8; e.y = e.sy + Math.sin(e.t * 1.6) * 16; } }
            else if (e.type === "kamikaze") { if (!e.dv) { e.y = Math.min(e.y + 90 * dt, 70); e.x += Math.sin(e.t * 4) * 30 * dt; if (e.t > 1.1) { var an = Math.atan2(P.y - e.y, P.x - e.x), vv = (200 + e.tier * 15) * BS; e.dv = { x: Math.cos(an) * vv, y: Math.sin(an) * vv }; sfx("whoosh"); } } else { e.x += e.dv.x * dt; e.y += e.dv.y * dt; } if (e.x < -40 || e.x > LW + 40) e.y = LH + 99; }
            else if (e.type === "sniper") { if (e.y < e.sy) e.y += 90 * dt; else e.x += Math.sin(e.t * 0.8) * 40 * dt; e.x = Kit.clamp(e.x, 24, LW - 24); }
            else if (e.type === "splitter") { if (e.y < e.sy) e.y += 70 * dt; else { e.x += Kit.clamp(P.x - e.x, -1, 1) * 36 * dt; e.y = e.sy + Math.sin(e.t * 1.2) * 12; } }
            else { if (e.y < e.sy * 0.7 + 30) e.y += (e.type === "cruiser" ? 40 : 60) * dt; else { e.x += e.ph * 44 * dt; if (e.x < 40 || e.x > LW - 40) e.ph = -e.ph; } }
            e.cd -= dt;
            if (e.cd <= 0 && e.y > 10) {
              e.cd = TYPES[e.type].fire * FR * Kit.rnd(0.8, 1.2) * Math.pow(0.93, e.tier);
              if (e.type === "scout") shootEnemy(e, false, 190, 7);
              else if (e.type === "kamikaze") { }
              else if (e.type === "sniper") { shootEnemy(e, true, 330, 11); }
              else if (e.type === "splitter") { shootEnemy(e, true, 200, 8); }
              else if (e.type === "fighter") { shootEnemy(e, true, 230, 8); var ee = e; setTimeout(function () { if (!over && en.indexOf(ee) >= 0) shootEnemy(ee, true, 230, 8); }, 160); }
              else { var sn = e.type === "cruiser" ? 2 : 1; for (var s = -sn; s <= sn; s++) { var a = Math.PI / 2 + s * 0.26; eb.push({ x: e.x, y: e.y + 16, vx: Math.cos(a) * 190 * BS, vy: Math.sin(a) * 190 * BS, r: 4.5, d: 8 }); } if (Math.random() < 0.4 + e.tier * 0.08) missile(e.x, e.y + 20); }
            }
            if (e.y > LH + 40) { en.splice(i, 1); field--; spawnOne(e.tier); continue; }
            if (Math.hypot(P.x - e.x, P.y - e.y) < e.r + 9) { hurt(18, P.x, P.y); e.hp -= 3; e.fl = 0.1; if (e.hp <= 0) { killEnemy(e, i); continue; } }
            for (var j = bl.length - 1; j >= 0; j--) {
              var b = bl[j]; if (Math.abs(b.x - e.x) < e.r + b.r && Math.abs(b.y - e.y) < e.r + b.r) {
                e.hp -= b.d; e.fl = 0.08; sfx("clang"); boom(b.x, b.y, 2, 0.3, "#9fd0ff"); if (!b.pierce) bl.splice(j, 1);
                if (e.hp <= 0) { killEnemy(e, i); break; }
              }
            }
          }
          // boss
          if (boss) {
            var B = boss; B.t += dt; if (B.fl > 0) B.fl -= dt;
            if (B.ent) { B.y += 50 * dt; if (B.y >= 110) { B.ent = false; } } else { B.x = LW / 2 + Math.sin(B.t * (B.hp < B.mhp * 0.5 ? 1.1 : 0.7) * (1 + B.kind * 0.12)) * 105; B.cd -= dt; if (B.cd <= 0) bossAttack(); }
            for (var q = bl.length - 1; q >= 0; q--) { var bb = bl[q]; if (Math.abs(bb.x - B.x) < 62 * BOSSES[B.kind].sc && Math.abs(bb.y - B.y) < 38 * BOSSES[B.kind].sc) { B.hp -= bb.d; B.fl = 0.06; score += 2; if (!bb.pierce) bl.splice(q, 1); if (Math.random() < 0.2) boom(bb.x, bb.y, 1, 0.35, "#ffb0ff"); } }
            if (B.hp <= 0) {
              score += 2000 + 1500 * B.kind; boom(B.x, B.y, 90, 2.6); sfx("win"); var bn = BOSSES[B.kind].name; boss = null; eb = []; ms = []; en = []; field = 0; toSpawn = 0;
              if (wave >= WAVES.length - 1) { over = true; stop && stop(); var bonus = Math.round(P.hp * 15); score += bonus; draw(); setTimeout(function () { done(Math.round(score), "VICTORY! All three bosses defeated (+" + bonus + " HP bonus)."); }, 1400); }
              else { P.hp = Math.min(100, P.hp + 35); drop(LW / 2 - 40, 120, true); drop(LW / 2 + 40, 120, true); say(bn + " destroyed!  +35 HP"); waveWait = 2.4; }
            }
          }
          // enemy bullets
          for (var u = eb.length - 1; u >= 0; u--) { var o = eb[u]; o.x += o.vx * dt; o.y += o.vy * dt; if (o.y > LH + 20 || o.y < -20 || o.x < -20 || o.x > LW + 20) { eb.splice(u, 1); continue; } if (Math.hypot(o.x - P.x, o.y - P.y) < o.r + 7) { eb.splice(u, 1); hurt(o.d, o.x, o.y); } }
          // missiles (homing, shootable)
          for (var m = ms.length - 1; m >= 0; m--) {
            var mm = ms[m]; mm.l -= dt; var want = Math.atan2(P.y - mm.y, P.x - mm.x), da = Math.atan2(Math.sin(want - mm.a), Math.cos(want - mm.a)); mm.a += Kit.clamp(da, -1.7 * dt, 1.7 * dt);
            var sp = 150 + (4.5 - mm.l) * 12; mm.x += Math.cos(mm.a) * sp * dt; mm.y += Math.sin(mm.a) * sp * dt; mm.tr.push({ x: mm.x, y: mm.y, l: 0.5 }); if (mm.tr.length > 14) mm.tr.shift();
            var dead = mm.l <= 0;
            for (var j2 = bl.length - 1; j2 >= 0 && !dead; j2--) { var b2 = bl[j2]; if (Math.hypot(b2.x - mm.x, b2.y - mm.y) < b2.r + 8) { mm.hp -= b2.d; if (!b2.pierce) bl.splice(j2, 1); if (mm.hp <= 0) { dead = true; score += 25; } } }
            if (!dead && Math.hypot(mm.x - P.x, mm.y - P.y) < 12) { hurt(16, mm.x, mm.y); dead = true; }
            if (dead) { boom(mm.x, mm.y, 10, 0.7); ms.splice(m, 1); }
          }
          // rocks
          for (var r = rocks.length - 1; r >= 0; r--) {
            var rk = rocks[r]; rk.x += rk.vx * dt; rk.y += rk.vy * dt; rk.a += rk.va * dt;
            if (rk.y > LH + 40) { rocks.splice(r, 1); continue; }
            if (Math.hypot(P.x - rk.x, P.y - rk.y) < rk.r + 8) { hurt(14, P.x, P.y); rk.hp -= 2; }
            for (var j3 = bl.length - 1; j3 >= 0; j3--) { var b3 = bl[j3]; if (Math.hypot(b3.x - rk.x, b3.y - rk.y) < rk.r + b3.r) { rk.hp -= b3.d; if (!b3.pierce) bl.splice(j3, 1); } }
            if (rk.hp <= 0) { boom(rk.x, rk.y, 14, rk.r / 16, "#b8a080"); score += 50; drop(rk.x, rk.y, Math.random() < 0.5); rocks.splice(r, 1); }
          }
          // power-ups
          for (var w = ups.length - 1; w >= 0; w--) {
            var up = ups[w]; up.t += dt; up.y += 70 * dt; if (up.y > LH + 20) { ups.splice(w, 1); continue; }
            if (Math.hypot(up.x - P.x, up.y - P.y) < 22) {
              sfx("good"); var k2 = up.k, txt;
              if (k2 === "G") { P.wl = Math.min(5, P.wl + 1); txt = "GUN UPGRADE"; } else if (k2 === "M") { P.wl = Math.max(P.wl, 3); P.wl = Math.min(5, P.wl + (P.wl >= 3 ? 1 : 0)); txt = "MULTI-SHOT"; } else if (k2 === "B") { P.big = 9; txt = "BIG CANNON!"; } else if (k2 === "H") { P.hp = Math.min(100, P.hp + 30); txt = "+30 HP"; } else { P.shield = 6; txt = "SHIELD"; }
              score += 30; popups.push({ x: up.x, y: up.y, t: 1, s: txt }); ups.splice(w, 1);
            }
          }
          pr.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.l -= dt; }); pr = pr.filter(function (p) { return p.l > 0; });
          rings.forEach(function (r2) { r2.l -= dt; }); rings = rings.filter(function (r2) { return r2.l > 0; }); popups.forEach(function (p) { p.t -= dt; p.y -= 30 * dt; }); popups = popups.filter(function (p) { return p.t > 0; });
          C.set(idx, Math.round(score));
        }
        function draw() {
          view.begin("#050816");
          var bg = g.createLinearGradient(0, 0, 0, LH); bg.addColorStop(0, "#04061a"); bg.addColorStop(0.6, "#0d1236"); bg.addColorStop(1, "#1d1040"); g.fillStyle = bg; g.fillRect(0, 0, LW, LH);
          var neb = g.createRadialGradient(80 + Math.sin(t * 0.1) * 20, 160, 10, 80, 160, 190); neb.addColorStop(0, "#6b2fb344"); neb.addColorStop(1, "#6b2fb300"); g.fillStyle = neb; g.fillRect(0, 0, LW, LH);
          var neb2 = g.createRadialGradient(300, 420, 10, 300, 420, 170); neb2.addColorStop(0, "#1f8ab033"); neb2.addColorStop(1, "#1f8ab000"); g.fillStyle = neb2; g.fillRect(0, 0, LW, LH);
          stars.forEach(function (s) { g.fillStyle = "rgba(255,255,255," + (0.25 + s.z * 0.4) + ")"; g.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6 + s.z * 2); });
          if (shake > 0) g.translate(Kit.rnd(-3, 3), Kit.rnd(-3, 3));
          rocks.forEach(function (rk) { g.save(); g.translate(rk.x, rk.y); g.rotate(rk.a); g.fillStyle = lin(g, -rk.r, -rk.r, rk.r, rk.r, ["#8a7a68", "#4a4036", "#2a241e"]); g.beginPath(); for (var a = 0; a < 9; a++) { var rr = rk.r * (0.8 + 0.2 * Math.sin(a * 2.3 + rk.r)); g.lineTo(Math.cos(a / 9 * TAU) * rr, Math.sin(a / 9 * TAU) * rr); } g.closePath(); g.fill(); g.strokeStyle = "#0008"; g.stroke(); g.fillStyle = "#0004"; g.beginPath(); g.arc(rk.r * 0.2, -rk.r * 0.1, rk.r * 0.25, 0, TAU); g.fill(); g.restore(); });
          ups.forEach(function (u) { var c = { G: "#ffcf5a", M: "#7dff9a", B: "#ff5d83", H: "#5bd0ff", S: "#b894ff" }[u.k]; g.save(); g.translate(u.x, u.y + Math.sin(u.t * 4) * 3); g.shadowColor = c; g.shadowBlur = 12; g.fillStyle = "#101830"; g.strokeStyle = c; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill(); g.stroke(); g.shadowBlur = 0; g.fillStyle = c; g.font = "bold 15px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(u.k, 0, 1); g.restore(); });
          en.forEach(function (e) { g.save(); g.translate(e.x, e.y); drawEnemy(g, e.type, e.tier, e.t, e.fl > 0); g.restore(); if (e.hp < e.mhp) { g.fillStyle = "#0008"; g.fillRect(e.x - 16, e.y - e.r - 10, 32, 4); g.fillStyle = "#ff5d5d"; g.fillRect(e.x - 16, e.y - e.r - 10, 32 * Math.max(0, e.hp / e.mhp), 4); } });
          if (boss) { g.save(); g.translate(boss.x, boss.y); drawBoss(g, boss.t, boss.fl > 0, boss.hp < boss.mhp * 0.5, boss.kind); g.restore(); }
          ms.forEach(function (m) { m.tr.forEach(function (p, i2) { g.fillStyle = "rgba(255,200,150," + (i2 / m.tr.length * 0.35) + ")"; g.beginPath(); g.arc(p.x, p.y, 2 + i2 * 0.2, 0, TAU); g.fill(); }); g.save(); g.translate(m.x, m.y); g.rotate(m.a); g.fillStyle = "#d9dee8"; g.fillRect(-9, -3, 14, 6); g.fillStyle = "#e0453a"; g.beginPath(); g.moveTo(5, -3); g.lineTo(11, 0); g.lineTo(5, 3); g.fill(); g.fillStyle = "#7a8296"; g.fillRect(-9, -5, 4, 10); g.fillStyle = "#ffb23c"; g.beginPath(); g.moveTo(-9, 0); g.lineTo(-17 - Math.random() * 4, 0); g.lineTo(-9, 2.5); g.fill(); g.restore(); });
          g.globalCompositeOperation = "lighter";
          eb.forEach(function (o) { var gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3); gr.addColorStop(0, "#fff"); gr.addColorStop(0.35, "#ff6a5a"); gr.addColorStop(1, "#ff2a2a00"); g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y, o.r * 3, 0, TAU); g.fill(); });
          bl.forEach(function (b) { if (b.big) { var gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, 22); gr.addColorStop(0, "#fff"); gr.addColorStop(0.4, "#ff5d83"); gr.addColorStop(1, "#ff5d8300"); g.fillStyle = gr; g.beginPath(); g.ellipse(b.x, b.y, 14, 26, 0, 0, TAU); g.fill(); } else { var gr2 = g.createLinearGradient(0, b.y - 12, 0, b.y + 8); gr2.addColorStop(0, "#9fe8ff00"); gr2.addColorStop(0.6, "#7fe0ff"); gr2.addColorStop(1, "#fff"); g.fillStyle = gr2; g.fillRect(b.x - b.r * 0.6, b.y - 12, b.r * 1.2, 20); } });
          pr.forEach(function (p) { g.globalAlpha = Math.max(0, p.l / p.m); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (0.4 + p.l / p.m), 0, TAU); g.fill(); }); g.globalAlpha = 1;
          rings.forEach(function (r2) { var f = 1 - r2.l / r2.m; g.strokeStyle = "rgba(255,200,120," + (1 - f) + ")"; g.lineWidth = 3 * (1 - f) + 1; g.beginPath(); g.arc(r2.x, r2.y, r2.r + f * r2.mx, 0, TAU); g.stroke(); });
          g.globalCompositeOperation = "source-over";
          if (!over || P.hp > 0) { g.save(); g.translate(P.x, P.y); g.scale(0.72, 0.72); g.globalAlpha = P.inv > 0 && Math.floor(t * 20) % 2 ? 0.4 : 1; drawPlayer(g, t, P.flame, P.wl, P.big > 0); g.globalAlpha = 1;
            if (P.shield > 0) { g.strokeStyle = "rgba(160,120,255," + (0.5 + 0.3 * Math.sin(t * 12)) + ")"; g.lineWidth = 3; g.fillStyle = "rgba(140,100,255,0.15)"; g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.fill(); g.stroke(); } g.restore(); }
          popups.forEach(function (p) { g.globalAlpha = Math.min(1, p.t * 1.5); g.fillStyle = "#fff"; g.font = "bold 13px sans-serif"; g.textAlign = "center"; g.fillText(p.s, p.x, p.y); g.globalAlpha = 1; });
          // HUD
          g.fillStyle = "#0008"; g.fillRect(8, 8, 130, 14); var hpf = Math.min(1, P.hp / 100); g.fillStyle = hpf > 0.5 ? "#4cd964" : hpf > 0.25 ? "#ffcc33" : "#ff4d4d"; g.fillRect(10, 10, 126 * hpf, 10); g.strokeStyle = "#fff6"; g.strokeRect(8.5, 8.5, 129, 13);
          g.fillStyle = "#fff"; g.font = "bold 10px sans-serif"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText("HP " + Math.min(100, Math.ceil(P.hp)), 12, 34);
          g.textAlign = "right"; g.font = "bold 14px Orbitron, sans-serif"; g.fillText(String(Math.round(score)), LW - 10, 20); g.font = "10px sans-serif"; g.fillStyle = "#cfd8ff"; g.fillText(boss ? "BOSS" : "Wave " + Math.max(1, wave + 1) + "/" + WAVES.length + (P.big > 0 ? "  CANNON " + Math.ceil(P.big) : ""), LW - 10, 34);
          if (boss && !boss.ent) { g.fillStyle = "#0008"; g.fillRect(60, 44, 240, 10); g.fillStyle = "#c04aff"; g.fillRect(62, 46, 236 * Math.max(0, boss.hp / boss.mhp), 6); g.strokeStyle = "#fff6"; g.strokeRect(60.5, 44.5, 239, 9); }
          if (banner.t > 0) { g.globalAlpha = Math.min(1, banner.t); g.fillStyle = "#fff"; g.font = "bold 26px Orbitron, sans-serif"; g.textAlign = "center"; g.shadowColor = "#4fb4ff"; g.shadowBlur = 12; g.fillText(banner.txt, LW / 2, 230); g.shadowBlur = 0; g.globalAlpha = 1; }
          view.end();
        }
        say("Wave 1 / " + WAVES.length);
        stop = Kit.loop(function (dt) { if (over) return; update(dt); draw(); });
        window.__PZ_TEST = { P: P, st: function () { return { wave: wave, hp: P.hp, score: score, boss: !!boss, over: over, wl: P.wl, en: en.length }; }, god: function () { P.hp = 1e9; }, killAll: function () { en.length = 0; field = 0; toSpawn = 0; }, boss: function () { return boss; } };
        return function () { over = true; stop && stop(); keys.destroy(); view.destroy(); };
      }
    });
  };

  Hub.register({
    "id": "dodge",
    "name": "Don't Get Hit",
    "hue": 20,
    "kind": "Turns",
    "mins": 5,
    "rules": "You are a starfighter. Drag your finger (or arrow keys / WASD) to fly anywhere - the ship fires on its own. Shoot down the enemy fleets, dodge their bullets and homing missiles (you can shoot missiles down), and watch your HP bar. Every ship you destroy can bring in 1-2 stronger ones. Pick up G = gun upgrade, M = multi-shot, B = big cannon, H = repair, S = shield. Fight through three stages of waves with a boss at the end of each (3 bosses in all) - you recover some HP after each boss. Enemy types include scouts, fighters, gunships, kamikaze dive-bombers, snipers, splitters and heavy cruisers. Each pilot takes a run; the highest score wins. Asteroids drift by - shoot them to destroy them (they sometimes drop power-ups) or dodge them.",
    "desc": "Space-fighter battle: waves of enemy ships, power-ups and three bosses.",
    "icon": "<path class=\"st\" d=\"M40 12l8 24 20 16v8l-18-6-4 14h-12l-4-14-18 6v-8l20-16z\"/><circle class=\"fl\" cx=\"40\" cy=\"34\" r=\"3\"/>",
    "teams": false,
    "diff": "Easy: weaker, slower enemies. Medium: standard. Hard: tougher ships that shoot faster and hit harder."
  });
})();
