/* Lantern Quest - monsters rule Lumora; one hero (and friends) fight back through 10 levels and 10 bosses.
   Full-screen landscape platformer. Host-authoritative co-op: the host runs the world, every phone sends its buttons and draws what the host sends. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit, LQ = window.LQ, A = LQ.art;
  var T = LQ.T, ROWS = LQ.ROWS, VH = 360, TAU = Math.PI * 2, ARENA = 32;
  var HC = ["#e5484d", "#4aa8ff", "#52d96b", "#ffd34a"];
  var MON = LQ.MON, BOSS = LQ.BOSS, rng = A.rng;
  var PK = [{ n: "arrow", own: 1, r: 4 }, { n: "spit", r: 6 }, { n: "fire", r: 7 }, { n: "ice", r: 6 }, { n: "spore", r: 7 }, { n: "bomb", r: 8 }, { n: "rock", r: 12 }, { n: "wave", r: 14 }, { n: "orb", r: 8 }, { n: "farrow", r: 4 }];
  var PROJ_BY_NAME = { arrow: 9, spit: 1, fire: 2, ice: 3, spore: 4 };
  var WILD = ["deer", "rabbit", "fox", "bird", "fish", "bat", "lizard", "camel", "goat"];
  function rd(v) { return Math.round(v); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ================================================================== LEVEL GENERATION (deterministic from the level number) */
  function genLevel(L) {
    var D = LQ.LEVELS[L], B = LQ.BIOMES[D.bio], r = rng(9000 + L * 97), tgt = 150 + L * 9, len = tgt + ARENA;
    var top = [], plat = new Uint8Array((len + 80) * ROWS), items = [], decor = [], spawns = [], wspawns = [], row = 9, nextCamp = 42, dK = decorKinds(D.bio);
    function pick(a) { return a[Math.floor(r() * a.length)]; }
    function flat(n) { for (var i = 0; i < n; i++) top.push(row); }
    function coin(x, y) { items.push({ t: "coin", x: x, y: y }); }
    function mon(col, fly) {
      var k = pick(B.mon), d = MON[k], isFly = d.bh === "fly" || d.bh === "bomber" || d.bh === "ghost";
      spawns.push({ k: k, x: col * T + T / 2, y: isFly ? (3 + r() * 3) * T : top[col] * T });
    }
    flat(14);
    items.push({ t: "npc", x: 8 * T, y: top[8] * T, g: L });
    var level = Math.min(9, L), density = 0.34 + L * 0.02;
    while (top.length < tgt) {
      var p = top.length, roll = r();
      if (p >= nextCamp) { flat(4); items.push({ t: "camp", x: (top.length - 2) * T, y: row * T }); nextCamp += 42; continue; }
      if (roll < 0.2 && p > 24) { // gap with a coin arc to show the jump
        var w = 3 + (r() < 0.5 ? 1 : 0), x0 = top.length; for (var i = 0; i < w; i++) top.push(99);
        for (i = 0; i < 5; i++) coin((x0 - 0.5 + i * (w + 1) / 4) * T, (row - 1.4 - Math.sin(i / 4 * Math.PI) * 2.2) * T);
        flat(3);
      } else if (roll < 0.34) { row = clamp(row + (r() < 0.5 ? -1 : 1), 8, 9); flat(6 + Math.floor(r() * 4)); mon(top.length - 3); }
      else if (roll < 0.6) { // platforms with loot
        var s = top.length; flat(11);
        var pr = row - 3, px = s + 2, pw = 3 + Math.floor(r() * 2);
        for (i = 0; i < pw; i++) plat[(px + i) * ROWS + pr] = 1;
        for (i = 0; i < pw; i++) coin((px + i + 0.5) * T, (pr - 0.7) * T);
        if (r() < 0.5) items.push({ t: "heart", x: (px + 1.5) * T, y: (pr - 0.5) * T });
        mon(s + 8); if (r() < density) mon(s + 6);
      } else { var s2 = top.length, n = 8 + Math.floor(r() * 6); flat(n); if (r() < 0.8) mon(s2 + n - 2); if (r() < density) mon(s2 + 3); if (r() < 0.25 + L * 0.03) mon(s2 + 6); }
    }
    var arenaX = top.length; for (var c = 0; c < ARENA; c++) top.push(9); // boss arena is always flat
    len = top.length; var mid = [];
    // cages, hearts, coins on the ground, wildlife, scenery
    var cages = 0;
    for (c = 26; c < arenaX - 6; c += 1) {
      if (top[c] === 99 || top[c - 1] === 99 || top[c + 1] === 99) continue;
      if (c % 47 === 30 && cages < 3) { items.push({ t: "cage", x: c * T + T / 2, y: top[c] * T }); cages++; }
      else if (c % 31 === 17) items.push({ t: "heart", x: c * T + T / 2, y: top[c] * T - 16 });
      else if (c % 5 === 2 && r() < 0.5) coin(c * T + T / 2, top[c] * T - 16);
    }
    for (c = 3; c < len - 4; c++) {
      if (top[c] === 99) continue;
      if (c % 3 === 0 && r() < 0.8) decor.push({ k: pick(dK), x: c * T + r() * T, y: top[c] * T, s: 0.8 + r() * 0.6, f: r() < 0.12 });
      if (c % 11 === 5 && r() < 0.8) wspawns.push({ k: pick(B.wild), x: c * T, y: top[c] * T });
    }
    if (D.bio === "river") for (c = 20; c < arenaX; c++) if (top[c] === 99 && top[c + 1] === 99) { wspawns.push({ k: "fish", x: c * T + T / 2, y: VH - 30 }); break; }
    for (c = 0; c < ARENA; c += 6) decor.push({ k: pick(dK), x: (arenaX + c + 1) * T, y: 9 * T, s: 1, f: false });
    var Lv = { L: L, D: D, B: B, bio: D.bio, len: len, top: top, plat: plat, items: items, decor: decor, spawns: spawns, wspawns: wspawns, arenaX: arenaX, gateX: (len - 3) * T, bossX: (len - 8) * T, name: D.name, layers: null };
    return Lv;
  }
  function decorKinds(b) {
    return { forest: ["tree", "tree", "bush", "flower", "pine", "rock", "flower"], river: ["tree", "reed", "reed", "bush", "flower", "rock"], caves: ["stalag", "crystal", "mush", "rock", "crystal"], ruins: ["pillar", "arch", "bush", "rock", "statue", "pillar"], temple: ["pillar", "statue", "brazier", "rock", "pillar"], mines: ["support", "lantern", "cart", "rock", "lantern"], desert: ["cactus", "bones", "obelisk", "rock", "cactus"], ice: ["pine", "icespike", "rock", "icespike", "pine"], citadel: ["spire", "brazier", "rock", "statue", "spire"] }[b];
  }

  /* ================================================================== THE ENGINE */
  ENGINES.lantern = function (C) {
    var root = C.root, net = C.net, online = !!net, auth = !online || net.host, myIdx = online ? net.me : -1, lvl = C.lv;
    var HPM = [1.3, 1, 0.85][lvl], EDM = [0.65, 1, 1.25][lvl], EHP = [0.8, 1, 1.25][lvl], REGCAP = [1, 1, 0.6][lvl], REG = [4.5, 3.2, 2][lvl];
    root.innerHTML = '<div class="k-stage"><div class="k-play" style="flex:1;position:relative"></div></div>';
    var box = root.querySelector(".k-play");
    var view = mkView(box), g = view.g, keys = Kit.keys(), alive = true, stopLoop = null;
    var Lv = null, W = null, ui = { hint: false, cards: [], bn: null, t: 0, sawTouch: false, cam: 0, shake: 0, flash: 0, fade: 0 };
    var heroes = [], fx = [], evq = [], ambient = [], sendT = 0, inpT = 0, lastInpKey = "", snapSeq = 0, nid = 1, rdy = false, sceneLv = -1;
    var localHeroes = [];   // heroes controlled by this device (local: 1 or 2 humans; online: me)

    /* ---------------- heroes ---------------- */
    function newHero(i) {
      var p = C.players[i];
      return { i: i, name: p.name, cpu: !!p.cpu && !online, col: HC[i % 4], x: 80 + i * 22, y: 9 * T, vx: 0, vy: 0, dir: 1, w: 18, h: 44, hp: 100 * HPM, mhp: 100 * HPM, onG: false, inv: 0, atk: 0, atkCd: 0, shoot: 0, shootCd: 0, beamCd: 0, en: 40, sc: 0, down: false, rev: 0,
        inp: { l: 0, r: 0, j: 0, a: 0, b: 0, c: 0 }, pj: 0, pc: 0, hurt: 0, lastHit: 9, coy: 0, jb: 0, gate: false, run: 0, an: 0, hitDone: false, sx: 80, sy: 9 * T, sT: 0, kills: 0, tw: 0, warp: 0, lastSc: -1, beamFx: 0 };
    }
    C.players.forEach(function (p, i) { heroes.push(newHero(i)); });
    (function assign() {
      if (online) { localHeroes = [heroes[myIdx]]; heroes.forEach(function (h) { h.cpu = false; }); return; }
      var hum = heroes.filter(function (h) { return !C.players[h.i].cpu; });
      localHeroes = hum.slice(0, 2); heroes.forEach(function (h) { h.cpu = C.players[h.i].cpu || hum.indexOf(h) > 1; });
    })();
    var camHero = localHeroes[0] || heroes[0];

    /* ---------------- world ---------------- */
    function loadLevel(L, first) {
      Lv = genLevel(L); Lv.layers = A.layers(Lv.bio, L);
      W = { L: L, time: 0, ph: "play", party: W ? W.party : { sw: 0, bw: 0, bm: 0 }, mons: [], boss: null, projs: [], beams: [], wild: [], tele: [], zones: [], drops: [], got: new Uint8Array(Lv.items.length), locked: false, cpX: 3 * T, rescued: W ? W.rescued : 0, wipe: 0, gateOpen: false, winT: 0, bossSeen: false, minionsCap: 4 };
      if (auth) {
        Lv.spawns.forEach(function (s) { addMon(s.k, s.x, s.y); });
        Lv.wspawns.forEach(function (s) { W.wild.push({ id: nid++, k: s.k, x: s.x, y: s.y, vx: 0, dir: Math.random() < 0.5 ? -1 : 1, t: Math.random() * 9, run: 0, by: s.y, sleep: 0 }); });
      }
      heroes.forEach(function (h, k) { h.x = 70 + k * 24; h.y = 9 * T; h.vx = h.vy = 0; h.gate = false; h.down = false; h.rev = 0; h.inv = 1.5; if (!first) h.hp = Math.min(h.mhp, h.hp + (h.mhp - h.hp) * 0.5 + 10); h.sx = h.x; h.sy = h.y; h.hp = Math.max(h.hp, 1); });
      fx.length = 0; ui.cam = 0; ui.flash = 1; ui.fade = 0; sceneLv = L;
      showCard(first ? LQ.INTRO.slice() : null, true);
      showCard(["LEVEL " + (L + 1) + " of 10 · " + Lv.name].concat(Lv.D.story), false);
      if (!first) banner("Level " + (L + 1) + ": " + Lv.name, 3.5);
      initAmbient();
    }
    function addMon(k, x, y, minion) {
      var d = MON[k], hp = d.hp * EHP * (1 + Math.min(9, W.L) * 0.06);
      var e = { id: nid++, k: k, x: x, y: y, vx: 0, vy: 0, w: d.w, h: d.h, dir: Math.random() < 0.5 ? -1 : 1, hp: hp, mhp: hp, t: Math.random() * 6, st: 0, cd: 1 + Math.random() * 2, fl: 0, by: y, alive: true, home: x, kb: 0, minion: !!minion, onG: false, hpf: 1 };
      W.mons.push(e); return e;
    }
    function initAmbient() {
      ambient = []; var n = Lv.B.fx === "snow" ? 60 : 28;
      for (var i = 0; i < n; i++) ambient.push({ x: Math.random() * 900, y: Math.random() * VH, v: 10 + Math.random() * 20, s: 1 + Math.random() * 2, p: Math.random() * 6 });
      ui.birds = []; if (/forest|river|ruins|temple|desert|ice/.test(Lv.bio)) for (i = 0; i < 4; i++) ui.birds.push({ x: Math.random() * 900, y: 40 + Math.random() * 70, v: 20 + Math.random() * 20, p: Math.random() * 6 });
    }
    function showCard(lines, intro) { if (!lines) return; ui.cards.push({ lines: lines, t: intro ? 8 : 5.5, max: intro ? 8 : 5.5, intro: intro }); }
    function banner(txt, ttl, sticky) { ui.bn = { txt: txt, t: ttl || 4, sticky: !!sticky }; if (auth && online) evq.push(["bn", txt, ttl || 4, sticky ? 1 : 0]); }
    function ev(k, x, y, a) { if (online && auth) evq.push([k, rd(x), rd(y), a || 0]); doFx(k, x, y, a); }

    /* ---------------- terrain ---------------- */
    function isSolid(tx, ty) { return tx < 0 || tx >= Lv.len || ty >= Lv.top[tx]; }
    function boxFree(x, y, w, h) {
      var x0 = Math.floor((x - w / 2) / T), x1 = Math.floor((x + w / 2 - 0.01) / T), y0 = Math.floor((y - h) / T), y1 = Math.floor((y - 0.01) / T);
      for (var tx = x0; tx <= x1; tx++) for (var ty = Math.max(0, y0); ty <= y1; ty++) if (isSolid(tx, ty)) return false;
      return true;
    }
    function moveBox(e, dt) {
      var nx = e.x + e.vx * dt; e.hitW = false;
      if (boxFree(nx, e.y, e.w, e.h)) e.x = nx;
      else {
        var ok = false;
        if (e.onG) for (var k = 6; k <= 34; k += 7) if (boxFree(nx, e.y - k, e.w, e.h)) { e.x = nx; e.y -= k; ok = true; break; }
        if (!ok) { e.hitW = true; e.vx = 0; }
      }
      var ny = e.y + e.vy * dt; e.onG = false;
      if (e.vy >= 0) {
        if (!boxFree(e.x, ny, e.w, e.h)) { e.y = Math.floor(ny / T) * T; e.vy = 0; e.onG = true; }
        else {
          var row = Math.floor(ny / T), t0 = Math.floor((e.x - e.w / 2) / T), t1 = Math.floor((e.x + e.w / 2) / T);
          for (var tx = t0; tx <= t1; tx++) if (tx >= 0 && tx < Lv.len && row >= 0 && row < ROWS && Lv.plat[tx * ROWS + row] && e.y <= row * T + 2 && ny >= row * T) { e.y = row * T; e.vy = 0; e.onG = true; break; }
          if (!e.onG) e.y = ny;
        }
      } else if (!boxFree(e.x, ny, e.w, e.h)) e.vy = 0; else e.y = ny;
    }

    /* ---------------- helpers ---------------- */
    function liveHeroes() { return heroes.filter(function (h) { return !h.down && !h.gate; }); }
    function nearestHero(x, y, maxd) { var b = null, bd = maxd || 1e9; heroes.forEach(function (h) { if (h.down || h.gate) return; var d = Math.abs(h.x - x) + Math.abs(h.y - 20 - y) * 0.5; if (d < bd) { bd = d; b = h; } }); return b; }
    function score(h, v) { h.sc += v; }
    function hurtHero(h, dmg, kx) {
      if (h.inv > 0 || h.down || h.gate || W.ph === "win") return;
      h.hp -= dmg * EDM; h.inv = 0.85; h.hurt = 0.3; h.lastHit = 0; h.vx = kx * 200; h.vy = -230; h.onG = false;
      ev("hurt", h.x, h.y - 24, 0); if (h.hp <= 0) { h.hp = 0; h.down = true; h.rev = 0; ev("down", h.x, h.y - 20, 0); }
    }
    function healHero(h, v) { if (h.down) return; h.hp = Math.min(h.mhp, h.hp + v); }
    function swordDmg(t) { return [7, 18, 27, 38][t]; }
    function bowDmg(t) { return [0, 13, 17, 15][t]; }
    function beamDmg(t) { return [0, 70, 100, 135][t]; }
    function hitMon(e, dmg, h, kx) {
      if (!e.alive) return;
      e.hp -= dmg; e.fl = 0.14; var d = MON[e.k]; if (d.bh !== "tank") e.vx += kx * 140; e.kb = 0.18;
      ev("hit", e.x, e.y - e.h * 0.6, 0);
      if (e.hp <= 0) killMon(e, h);
    }
    function killMon(e, h) {
      e.alive = false; ev("pop", e.x, e.y - e.h * 0.5, MON[e.k].hp > 60 ? 1 : 0);
      var v = Math.round(MON[e.k].hp / 4) + 4; if (h) { score(h, v); h.kills++; h.en = Math.min(100, h.en + 14); }
      for (var i = 0; i < 2; i++) W.drops.push({ x: e.x + (i - 0.5) * 10, y: e.y - e.h * 0.5, vx: (i - 0.5) * 80, vy: -200, t: "coin", life: 8 });
      if (Math.random() < 0.14) W.drops.push({ x: e.x, y: e.y - e.h * 0.5, vx: 0, vy: -240, t: "heart", life: 14 });
    }
    function hitBoss(b, dmg, h, kx) {
      if (!b || b.st === 4 || b.vis === 0) return;
      var d = BOSS[b.k], m = b.st === 3 ? 1.5 : d.armor; dmg *= m; b.hp -= dmg; b.fl = 0.1; if (h) score(h, Math.round(dmg / 6));
      ev("hit", b.x + (Math.random() - 0.5) * d.w * 0.5, b.y - d.h * (0.4 + Math.random() * 0.4), 0); sfx("clang", 0.5);
      if (b.hp <= 0) bossDie(b);
    }
    function proj(k, x, y, vx, vy, dm, life, own, grav) { var p = { k: k, x: x, y: y, vx: vx, vy: vy, dm: dm, life: life || 3, own: own ? 1 : 0, g: grav || 0, r: PK[k].r, hit: null }; W.projs.push(p); return p; }

    /* ---------------- input ---------------- */
    var KM_A = { l: ["ArrowLeft", "KeyA"], r: ["ArrowRight", "KeyD"], j: ["ArrowUp", "KeyW", "Space"], a: ["KeyJ", "KeyZ"], b: ["KeyK", "KeyX"], c: ["KeyL", "KeyC"] };
    var KM_P1 = { l: ["KeyA"], r: ["KeyD"], j: ["KeyW", "Space"], a: ["KeyF"], b: ["KeyG"], c: ["KeyH"] };
    var KM_P2 = { l: ["ArrowLeft"], r: ["ArrowRight"], j: ["ArrowUp"], a: ["KeyJ"], b: ["KeyK"], c: ["KeyL"] };
    function kd(list) { var d = keys.down; for (var i = 0; i < list.length; i++) if (d[list[i]]) return 1; return 0; }
    var touch = { l: 0, r: 0, j: 0, a: 0, b: 0, c: 0 }, ptr = {}, jBtn = 0, stickUp = 0;
    function readInputs() {
      if (!localHeroes.length) return;
      var two = !online && localHeroes.length > 1;
      localHeroes.forEach(function (h, k) {
        var m = two ? (k ? KM_P2 : KM_P1) : KM_A, i = h.inp;
        i.l = kd(m.l) | (k ? 0 : touch.l); i.r = kd(m.r) | (k ? 0 : touch.r); i.j = kd(m.j) | (k ? 0 : (jBtn | stickUp)); i.a = kd(m.a) | (k ? 0 : touch.a); i.b = kd(m.b) | (k ? 0 : touch.b); i.c = kd(m.c) | (k ? 0 : touch.c);
      });
    }
    function inpBits(i) { return i.l | i.r << 1 | i.j << 2 | i.a << 3 | i.b << 4 | i.c << 5; }
    function setBits(i, v) { i.l = v & 1; i.r = v >> 1 & 1; i.j = v >> 2 & 1; i.a = v >> 3 & 1; i.b = v >> 4 & 1; i.c = v >> 5 & 1; }
    var hintKey = function (code) { if (code === "KeyH" && !(localHeroes.length > 1) || code === "KeyI" || code === "Slash" || code === "Escape" && ui.hint) ui.hint = !ui.hint; };
    keys.destroy(); keys = Kit.keys(hintKey);

    /* ---------------- AI companion ---------------- */
    function ai(h, dt) {
      var i = h.inp; i.l = i.r = i.j = i.a = i.b = i.c = 0; if (h.down || h.gate) return;
      var humans = heroes.filter(function (q) { return !q.cpu && !q.down && !q.gate; }), lead = humans[0] || liveHeroes().filter(function (q) { return q !== h; })[0] || h;
      var tx = lead.x - (h.i % 2 ? -1 : 1) * 38, wantJump = false;
      // someone to revive?
      var dn = heroes.filter(function (q) { return q.down && q !== h; })[0];
      var foe = null, fd = 1e9;
      W.mons.forEach(function (e) { if (!e.alive) return; var d = Math.abs(e.x - h.x); if (d < fd && Math.abs(e.y - h.y) < 120) { fd = d; foe = e; } });
      var boss = W.boss && W.boss.st !== 4 && W.boss.vis !== 0 ? W.boss : null;
      if (boss && Math.abs(boss.x - h.x) < fd) { foe = boss; fd = Math.abs(boss.x - h.x); }
      if (W.ph === "clear") tx = Lv.gateX + (h.i - 1) * 6;
      else if (dn && Math.abs(dn.x - h.x) < 520) tx = dn.x;
      else if (foe && fd < 300) { var reach = foe === boss ? BOSS[boss.k].w * 0.5 + 40 : 46; tx = foe.x - Math.sign(foe.x - h.x) * (reach - 10); if (h.hp < h.mhp * 0.3) tx = h.x - Math.sign(foe.x - h.x) * 60; }
      var dx = tx - h.x;
      if (Math.abs(dx) > 14) { if (dx > 0) i.r = 1; else i.l = 1; }
      // jump over walls and pits, or up to a leader standing above
      var ahead = h.x + (dx > 0 ? 1 : -1) * 22, col = Math.floor(ahead / T);
      if (h.onG && (h.hitW || (col >= 0 && col < Lv.len && (Lv.top[col] === 99 || Lv.top[col] < Math.floor(h.y / T))) || (lead.y < h.y - 70 && Math.abs(lead.x - h.x) < 60))) wantJump = true;
      if (wantJump) i.j = 1;
      if (foe && h.atkCd <= 0) {
        var ddx = Math.abs(foe.x - h.x), facing = (foe.x - h.x) * h.dir > 0, ww = foe === boss ? BOSS[boss.k].w * 0.5 : 24;
        if (ddx < 44 + ww && facing && Math.abs(foe.y - h.y) < 70) i.a = 1;
        else if (W.party.bw && h.shootCd <= 0 && facing && ddx > 90 && ddx < 320 && Math.abs((foe.y - (foe === boss ? 40 : foe.h * 0.5)) - (h.y - 24)) < 50) i.b = 1;
      }
      if (W.party.bm && h.en >= 100 && foe && fd < 220 && (boss || (W.mons.filter(function (e) { return e.alive && Math.abs(e.x - h.x) < 230; }).length >= 2))) i.c = 1;
      if (lead !== h && (Math.abs(lead.x - h.x) > 520 || Math.abs(lead.y - h.y) > 200) && lead.onG) { h.warp += dt; if (h.warp > 1.6) { h.x = lead.x - 20; h.y = lead.y; h.vx = h.vy = 0; h.warp = 0; } } else h.warp = 0;
    }

    /* ---------------- hero step ---------------- */
    function updateHero(h, dt) {
      h.an += dt; if (h.cpu) ai(h, dt);
      h.inv = Math.max(0, h.inv - dt); h.hurt = Math.max(0, h.hurt - dt); h.lastHit += dt; h.atkCd = Math.max(0, h.atkCd - dt); h.shootCd = Math.max(0, h.shootCd - dt); h.shoot = Math.max(0, h.shoot - dt); h.beamFx = Math.max(0, h.beamFx - dt);
      h.en = Math.min(100, h.en + 5 * dt);
      if (h.gate) { h.vx = 0; return; }
      if (h.down) {
        h.vx *= 0.9; h.vy += 1500 * dt; moveBox(h, dt);
        var helper = heroes.filter(function (q) { return !q.down && !q.gate && Math.abs(q.x - h.x) < 52 && Math.abs(q.y - h.y) < 50; })[0];
        h.rev = helper ? h.rev + dt : Math.max(0, h.rev - dt * 0.5);
        if (h.rev >= 1.3) { h.down = false; h.hp = h.mhp * 0.5; h.inv = 1.5; h.rev = 0; ev("heal", h.x, h.y - 24, 0); banner(h.name + " is back on their feet!", 2.2); }
        return;
      }
      var i = h.inp, sp = 190;
      var tgt = (i.r - i.l) * sp; h.vx += (tgt - h.vx) * Math.min(1, dt * (h.onG ? 14 : 6)); if (h.hurt > 0.15) h.vx *= 0.96;
      if (i.r && !i.l) h.dir = 1; else if (i.l && !i.r) h.dir = -1;
      h.run = Math.abs(tgt) > 10 && h.onG ? 1 : 0;
      if (h.onG) h.coy = 0.1; else h.coy -= dt;
      if (i.j && !h.pj) h.jb = 0.12; h.jb -= dt; h.pj = i.j;
      if (h.jb > 0 && h.coy > 0) { h.vy = -560; h.jb = 0; h.coy = 0; h.onG = false; sfx("tick"); }
      if (!i.j && h.vy < -230) h.vy = -230;
      h.vy = Math.min(900, h.vy + 1500 * dt); moveBox(h, dt);
      if (W.locked) h.x = clamp(h.x, Lv.arenaX * T + 14, Lv.len * T - 14); else h.x = clamp(h.x, 12, Lv.len * T - 12);
      if (h.onG) { h.sT += dt; var col = Math.floor(h.x / T); if (h.sT > 0.4 && col > 2 && Lv.top[col - 2] !== 99 && Lv.top[col + 2] !== 99 && Lv.top[col - 1] !== 99 && Lv.top[col + 1] !== 99) { h.sx = h.x; h.sy = h.y; h.sT = 0; } }
      if (h.y > VH + 70) { h.x = h.sx; h.y = h.sy - 4; h.vx = h.vy = 0; hurtFall(h); }
      // sword
      var tier = W.party.sw;
      if (i.a && h.atkCd <= 0 && h.atk === 0) { h.atk = 0.001; h.atkCd = 0.36 - tier * 0.02; h.hitDone = false; sfx("whoosh"); }
      if (h.atk > 0) {
        h.atk += dt / 0.26; if (h.atk >= 1) h.atk = 0;
        if (!h.hitDone && h.atk > 0.35) { h.hitDone = true; swordHit(h, tier); }
      }
      if (i.b && W.party.bw && h.shootCd <= 0) {
        var bt = W.party.bw, n = bt === 3 ? 3 : 1; h.shootCd = bt === 2 ? 0.36 : bt === 3 ? 0.5 : 0.48; h.shoot = 0.22; sfx("tick");
        for (var k = 0; k < n; k++) { var an = (k - (n - 1) / 2) * 0.13; var p = proj(0, h.x + h.dir * 16, h.y - 28, h.dir * Math.cos(an) * 560, Math.sin(an) * 560, bowDmg(bt), 1.1, 1); p.h = h.i; }
      }
      if (i.c && !h.pc && W.party.bm && h.en >= 100) { h.en = 0; fireBeam(h); }
      h.pc = i.c;
      if (h.lastHit > 4.5 && h.hp < h.mhp * REGCAP) healHero(h, REG * dt);
    }
    function hurtFall(h) { h.hp -= 10; h.inv = 1.4; h.lastHit = 0; if (h.hp <= 0) { h.hp = 1; } ev("splash", h.x, h.y, 0); }
    function swordHit(h, tier) {
      var reach = 30 + tier * 8, x0 = h.dir > 0 ? h.x : h.x - reach - 10, x1 = h.dir > 0 ? h.x + reach + 10 : h.x, dmg = swordDmg(tier), any = false;
      W.mons.forEach(function (e) { if (e.alive && e.x + e.w / 2 > x0 && e.x - e.w / 2 < x1 && e.y > h.y - 70 && e.y - e.h < h.y) { hitMon(e, dmg, h, h.dir); any = true; } });
      var b = W.boss; if (b && b.st !== 4 && b.vis !== 0) { var bw = BOSS[b.k].w * 0.5; if (b.x + bw > x0 && b.x - bw < x1 && b.y > h.y - 90 && b.y - BOSS[b.k].h < h.y) { hitBoss(b, dmg, h, h.dir); any = true; } }
      W.projs.forEach(function (p) { if (!p.own && p.k !== 7 && p.k !== 6 && p.x > x0 && p.x < x1 && Math.abs(p.y - (h.y - 28)) < 36) { p.life = 0; ev("hit", p.x, p.y, 0); } });
      if (any) sfx("hit");
    }
    function fireBeam(h) {
      var tier = W.party.bm, len = 240 + tier * 70; W.beams.push({ x: h.x + h.dir * 16, y: h.y - 28, dir: h.dir, len: len, life: 0.4, t: tier, hit: {}, h: h.i }); h.beamFx = 0.4; sfx("boom"); ui.shake = 6;
    }

    /* ---------------- monsters ---------------- */
    function updateMon(e, dt) {
      var d = MON[e.k]; e.t += dt; e.fl = Math.max(0, e.fl - dt); e.hpf = e.hp / e.mhp;
      var h = nearestHero(e.x, e.y, 1e9); if (!h) return;
      if (Math.abs(h.x - e.x) > 820 && !e.minion) return;
      var dx = h.x - e.x, ad = Math.abs(dx), sd = dx > 0 ? 1 : -1, fly = d.bh === "fly" || d.bh === "bomber" || d.bh === "ghost", sp = d.sp * (1 + W.L * 0.025) * [0.85, 1, 1.12][lvl];
      e.cd -= dt; e.kb = Math.max(0, e.kb - dt);
      if (fly) {
        if (d.bh === "ghost") { var gy = h.y - 36 - e.y; e.vx += (sd * sp - e.vx) * dt * 2; e.vy += (gy * 0.8 - e.vy) * dt * 2; if (ad < 40) e.vx *= 0.8; e.dir = sd; }
        else if (d.bh === "bomber") { var ty = h.y - 130; e.vx += (clamp(dx, -1, 1) * sp * (ad > 30 ? 1 : 0.2) - e.vx) * dt * 2; e.vy += ((ty + Math.sin(e.t * 2) * 10 - e.y) * 1.2 - e.vy) * dt * 2; e.dir = sd; if (ad < 60 && e.cd <= 0) { e.cd = 2.2; proj(5, e.x, e.y + 6, 0, 40, d.dm, 3, 0, 700); } }
        else { // swoopers: hover, dive, retreat
          e.st = e.st || 0;
          if (e.st === 0) { e.vx += (clamp(dx, -1, 1) * sp * (ad > 40 ? 1 : 0.3) - e.vx) * dt * 2; e.vy += ((e.by + Math.sin(e.t * 3) * 14 - e.y) * 2 - e.vy) * dt * 2; if (ad < 230 && e.cd <= 0) { e.st = 2; e.cd = 1.1; } }
          else if (e.st === 2) { e.vx += (clamp(dx, -1, 1) * sp * 1.7 - e.vx) * dt * 3; e.vy += (((h.y - 22) - e.y) * 3 - e.vy) * dt * 3; if (e.cd <= 0) { e.st = 0; e.cd = 2.2 + Math.random(); } }
          e.dir = sd;
        }
        if (e.kb > 0) e.vx *= 0.9; e.x += e.vx * dt; e.y += e.vy * dt; e.y = Math.min(e.y, 9 * T - 12);
      } else {
        var moveDir = 0, near = ad < 250 && Math.abs(h.y - e.y) < 110;
        if (d.bh === "walk" || d.bh === "tank" || d.bh === "slither") { if (near) { moveDir = sd; } else { if (e.hitW || Math.random() < 0.004) e.dir = -e.dir; moveDir = e.dir * 0.5; if (Math.abs(e.x - e.home) > 160) e.dir = e.home > e.x ? 1 : -1; } e.vx += (moveDir * sp * (d.bh === "tank" ? 0.8 : 1) - e.vx) * Math.min(1, dt * 8); }
        else if (d.bh === "charge") {
          if (e.st === 0) { if (near && ad < 230 && e.cd <= 0) { e.st = 1; e.cd = 0.55; e.dir = sd; } else { if (e.hitW || Math.random() < 0.005) e.dir = -e.dir; moveDir = near ? sd * 0.5 : e.dir * 0.4; e.vx += (moveDir * sp - e.vx) * Math.min(1, dt * 8); } }
          else if (e.st === 1) { e.vx *= 0.8; if (e.cd <= 0) { e.st = 2; e.cd = 0.75; } }
          else if (e.st === 2) { e.vx = e.dir * sp * 3.2; if (e.cd <= 0 || e.hitW) { e.st = 3; e.cd = 0.9; } }
          else { e.vx *= 0.85; if (e.cd <= 0) { e.st = 0; e.cd = 1.4; } }
        }
        else if (d.bh === "hop") { e.vx *= 0.96; if (e.onG && e.cd <= 0 && (near || Math.random() < 0.02)) { e.vy = -380; e.vx = (near ? sd : e.dir) * sp * 2.8; e.cd = 1.1 + Math.random(); e.dir = near ? sd : e.dir; } if (e.onG && e.cd > 0.2) e.vx *= 0.8; }
        else if (d.bh === "shoot") {
          var want = d.sp > 0 ? (ad < 120 ? -sd : ad > 250 ? sd : 0) : 0; e.vx += (want * sp * 0.7 - e.vx) * Math.min(1, dt * 6); e.dir = sd;
          if (e.cd <= 0 && ad < 330 && Math.abs(h.y - e.y) < 130) { e.cd = 2.2 + Math.random() * 0.8; var pk = PROJ_BY_NAME[d.pr] || 1, sx = e.x + sd * 12, sy = e.y - e.h * 0.6, vx = sd * (pk === 4 ? 70 : 230);
            if (pk === 1) { proj(1, sx, sy, sd * 170, -190, d.dm, 3, 0, 700); } else if (pk === 4) { proj(4, sx, sy, vx, -30, d.dm, 4, 0, -20); } else proj(pk, sx, sy, vx, (h.y - 20 - sy) * 0.35, d.dm, 3, 0, 0); ev("shot", e.x, sy, 0); }
        }
        if (d.bh !== "charge") { if (Math.abs(e.vx) > 6) e.dir = e.vx > 0 ? 1 : -1; }
        e.vy = Math.min(900, e.vy + 1500 * dt);
        // do not walk off ledges when patrolling
        var ahead = Math.floor((e.x + e.dir * (e.w / 2 + 6)) / T);
        if (e.onG && ahead >= 0 && ahead < Lv.len && Lv.top[ahead] === 99 && (e.st !== 2)) { e.vx = 0; e.dir = -e.dir; e.hitW = true; }
        moveBox(e, dt);
        if (e.y > VH + 60) e.alive = false;
      }
      // touching a hero hurts
      heroes.forEach(function (q) { if (q.down || q.gate) return; if (Math.abs(q.x - e.x) < (q.w + e.w) / 2 - 3 && q.y > e.y - e.h + 4 && q.y - q.h < e.y) hurtHero(q, d.dm, q.x > e.x ? 1 : -1); });
    }

    /* ---------------- boss ---------------- */
    function startBoss() {
      var k = Lv.D.boss, d = BOSS[k], n = Math.max(1, heroes.length), hp = d.hp * EHP * (0.72 + 0.28 * n);
      W.boss = { k: k, x: Lv.bossX, y: 9 * T, vx: 0, vy: 0, dir: -1, hp: hp, mhp: hp, st: 0, t: 0, mv: "", mi: 0, mt: 1.6, ph: 0, fl: 0, vis: 1, w: d.w * 0.7, h: d.h, onG: true, n: 0, did: false, tg: null, dt: 0, hpf: 1 };
      W.bossSeen = true; banner("BOSS: " + d.n, 5); ui.hint = false; ui.bossTip = 9; ev("roar", Lv.bossX, 9 * T - 80, 0); sfx("ring");
    }
    function bossDie(b) {
      b.st = 4; b.dead = true; b.dt = 0; b.hp = 0; W.mons.forEach(function (e) { if (e.alive && e.minion) { e.alive = false; ev("pop", e.x, e.y - 10, 0); } });
      ev("boom", b.x, b.y - BOSS[b.k].h / 2, 0); sfx("boom"); ui.shake = 14;
      heroes.forEach(function (h) { score(h, 150); });
    }
    function bossPlan(b) {
      var d = BOSS[b.k], mv = d.moves[b.mi++ % d.moves.length]; if (Math.random() < 0.3) mv = d.moves[Math.floor(Math.random() * d.moves.length)];
      if (mv === "summon" && W.mons.filter(function (e) { return e.alive && e.minion; }).length >= W.minionsCap) mv = "fan";
      b.mv = mv; b.n = 0; b.did = false; b.st = 1; var f = b.ph ? 0.78 : 1;
      var wind = { charge: 0.85, slam: 0.7, leap: 0.55, fan: 0.6, rain: 0.8, summon: 0.8, roots: 0.8, burrow: 0.5, teleport: 0.4 }[mv] * f * [1.15, 1, 0.9][lvl];
      b.t = wind; var tg = nearestHero(b.x, b.y, 1e9); b.tg = tg ? tg.i : 0; if (tg) b.dir = tg.x > b.x ? 1 : -1;
      if (mv === "roots") heroes.forEach(function (h) { if (!h.down) W.tele.push({ x: h.x, t: 0.85, tot: 0.85, k: "root" }); });
      if (mv === "rain") for (var i = 0; i < 6 + b.ph * 3; i++) W.tele.push({ x: Lv.arenaX * T + 40 + Math.random() * (ARENA * T - 80), t: 0.9 + i * 0.1, tot: 0.9 + i * 0.1, k: "rock" });
      if (mv === "burrow") { b.vis = 0; b.tx = (heroes[b.tg] || b).x; }
    }
    function updateBoss(b, dt) {
      var d = BOSS[b.k], arL = Lv.arenaX * T + d.w * 0.4, arR = Lv.len * T - d.w * 0.4;
      b.fl = Math.max(0, b.fl - dt); b.hpf = Math.max(0, b.hp / b.mhp);
      if (b.st === 4) { b.dt += dt; if (Math.random() < 0.4) ev("pop", b.x + (Math.random() - 0.5) * d.w, b.y - Math.random() * d.h, 1); if (b.dt > 2.4 && !b.done) { b.done = true; W.boss = null; clearLevel(); } return; }
      if (!b.ph && b.hp < b.mhp * 0.5) { b.ph = 1; banner(d.n + " is ENRAGED!", 2.6); ev("roar", b.x, b.y - d.h / 2, 0); }
      b.t -= dt; var tgH = heroes[b.tg] || nearestHero(b.x, b.y, 1e9) || heroes[0], sd = tgH.x > b.x ? 1 : -1;
      b.vy = Math.min(900, b.vy + 1500 * dt);
      if (b.st === 0) { // chase
        b.dir = sd; b.vx += (sd * d.sp * (b.ph ? 1.35 : 1) * (Math.abs(tgH.x - b.x) > d.w * 0.4 ? 1 : 0) - b.vx) * Math.min(1, dt * 5);
        if (b.t <= 0) bossPlan(b);
      } else if (b.st === 1) { // wind-up
        b.vx *= 0.9; if ((b.mv === "slam" || b.mv === "leap") && b.onG && b.t < 0.45) { }
        if (b.mv === "burrow") { b.tx += (tgH.x - b.tx) * dt * 3; }
        if (b.t <= 0) { b.st = 2; startAct(b, d); }
      } else if (b.st === 2) { actBoss(b, d, dt, arL, arR); }
      else if (b.st === 3) { b.vx *= 0.9; if (b.t <= 0) { b.st = 0; b.t = (b.ph ? 0.7 : 1.2) * [1.3, 1, 0.85][lvl]; } }
      b.x += b.vx * dt; var ny = b.y + b.vy * dt; if (ny >= 9 * T) { if (!b.onG && b.vy > 0) landBoss(b, d); ny = 9 * T; b.vy = 0; b.onG = true; } else if (b.vy !== 0) b.onG = false; b.y = ny;
      b.x = clamp(b.x, arL, arR);
      // contact
      if (b.vis !== 0) heroes.forEach(function (q) {
        if (q.down || q.gate) return;
        if (Math.abs(q.x - b.x) < (d.w * 0.35 + q.w / 2) && q.y > b.y - d.h * 0.85 && q.y - q.h < b.y) hurtHero(q, d.dm * (b.st === 2 ? 1 : 0.55), q.x > b.x ? 1 : -1);
      });
    }
    function startAct(b, d) {
      var mv = b.mv, tg = heroes[b.tg] || b, n = 5 + b.ph * 2;
      if (mv === "charge") { b.vx = b.dir * (330 + b.ph * 60); b.t = 1.5; }
      else if (mv === "slam") { b.t = 1.4; b.vy = -560; b.onG = false; }
      else if (mv === "leap") { b.t = 1.6; b.vy = -560; b.onG = false; b.vx = clamp((tg.x - b.x) / 0.95, -340, 340); }
      else if (mv === "fan") { for (var i = 0; i < n; i++) { var a = (i - (n - 1) / 2) * 0.22, base = Math.atan2((tg.y - 28) - (b.y - d.h * 0.6), tg.x - b.x), k = b.k === 8 ? 3 : b.k === 9 ? 8 : b.k === 6 ? 1 : b.k === 2 ? 1 : 2; proj(k, b.x + b.dir * d.w * 0.3, b.y - d.h * 0.6, Math.cos(base + a) * 230, Math.sin(base + a) * 230, d.dm * 0.7, 3.2, 0, 0); } ev("shot", b.x, b.y - d.h * 0.6, 0); b.st = 3; b.t = 0.7; }
      else if (mv === "rain") { b.st = 3; b.t = 1.5; }
      else if (mv === "summon") { var pool = Lv.B.mon, c = 2 + b.ph; for (i = 0; i < c; i++) { var k2 = pool[Math.floor(Math.random() * pool.length)], dd = MON[k2]; var mx = clamp(b.x + (i - 1) * 90, Lv.arenaX * T + 30, Lv.len * T - 30), my = (dd.bh === "fly" || dd.bh === "bomber" || dd.bh === "ghost") ? 9 * T - 120 : 9 * T; var m = addMon(k2, mx, my, true); m.hp = m.mhp = Math.min(m.mhp, 60); ev("pop", mx, my - 20, 0); } b.st = 3; b.t = 1.3; }
      else if (mv === "roots") { b.t = 0.5; W.tele.forEach(function (t) { if (t.k === "root") { t.k = "rootAct"; } }); b.st = 3; b.t = 1.5; }
      else if (mv === "burrow") { b.t = 0.7; b.x = b.tx; b.vis = 0; }
      else if (mv === "teleport") { b.vis = 0; ev("pop", b.x, b.y - d.h / 2, 0); var nx; var tgx = tg.x, tries = 0; do { nx = Lv.arenaX * T + d.w * 0.5 + Math.random() * (ARENA * T - d.w); } while (Math.abs(nx - tgx) < 150 && tries++ < 8); b.x = nx; b.vis = 1; ev("pop", b.x, b.y - d.h / 2, 0); b.mv = "fan"; startAct(b, d); b.st = 3; b.t = 0.9; }
    }
    function actBoss(b, d, dt, arL, arR) {
      var mv = b.mv;
      if (mv === "charge") { if (b.x <= arL + 2 || b.x >= arR - 2) { b.vx = 0; b.st = 3; b.t = 3; ev("crash", b.x, b.y - d.h * 0.5, 0); ui.shake = 12; banner("STUNNED! Hit him now!", 2); sfx("crash"); } else if (b.t <= 0) { b.vx = 0; b.st = 3; b.t = 1.2; } }
      else if (mv === "slam" || mv === "leap") { if (b.t <= 0) { b.st = 3; b.t = 1; } }
      else if (mv === "burrow") { if (b.t > 0.5) b.vis = 0; else if (!b.did) { b.did = true; b.vis = 1; ev("crash", b.x, b.y, 0); ui.shake = 10; sfx("crash"); heroes.forEach(function (q) { if (!q.down && Math.abs(q.x - b.x) < 70 && q.y > b.y - 40) hurtHero(q, d.dm * 1.2, q.x > b.x ? 1 : -1); }); b.vy = -300; b.onG = false; } if (b.t <= 0) { b.st = 3; b.t = 2.2; if (!b.ph) banner("Hit him while he is out!", 1.8); } }
    }
    function landBoss(b, d) {
      ev("crash", b.x, b.y, 0); ui.shake = 9; sfx("thud", 1.4); b.vx = 0;
      if (b.mv === "slam") { for (var s = -1; s <= 1; s += 2) proj(7, b.x + s * d.w * 0.35, 9 * T - 8, s * 230, 0, d.dm * 0.8, 1.8, 0, 0); }
      else if (b.mv === "leap") { heroes.forEach(function (q) { if (!q.down && Math.abs(q.x - b.x) < d.w * 0.7 && q.y > b.y - 30) hurtHero(q, d.dm, q.x > b.x ? 1 : -1); }); }
      if (b.st === 2) { b.st = 3; b.t = 1.4; }
    }
    function clearLevel() {
      W.ph = "clear"; W.gateOpen = true; heroes.forEach(function (h) { if (h.down) { h.down = false; h.hp = h.mhp * 0.6; h.inv = 1.5; } healHero(h, h.mhp * 0.4); });
      if (Lv.L === 9) { W.ph = "win"; W.winT = 0; banner("MORVANE IS DEFEATED! Lumora is free!", 8, true); sfx("win"); return; }
      banner("LEVEL CLEARED!  A gate has opened: walk into the glowing gate to go on  →", 99, true); sfx("win");
      for (var i = 0; i < 3; i++) W.drops.push({ x: Lv.gateX - 70 + i * 40, y: 8 * T, vx: 0, vy: -150, t: "heart", life: 60 });
    }

    /* ---------------- projectiles, beams, zones ---------------- */
    function updateProjs(dt) {
      W.projs.forEach(function (p) {
        p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 7) { p.y = 9 * T - 10; }
        var col = Math.floor(p.x / T), row = Math.floor(p.y / T);
        if (p.k !== 7 && (col < 0 || col >= Lv.len || (row >= 0 && row < 40 && isSolid(col, row)))) { p.life = 0; if (p.k === 5 || p.k === 6) ev("boom2", p.x, p.y, 0); return; }
        if (p.own) {
          W.mons.forEach(function (e) { if (p.life > 0 && e.alive && Math.abs(p.x - e.x) < e.w / 2 + 4 && p.y > e.y - e.h - 4 && p.y < e.y + 4) { hitMon(e, p.dm, heroes[p.h], p.vx > 0 ? 1 : -1); p.life = 0; } });
          var b = W.boss; if (p.life > 0 && b && b.st !== 4 && b.vis !== 0 && Math.abs(p.x - b.x) < BOSS[b.k].w * 0.4 && p.y > b.y - BOSS[b.k].h && p.y < b.y) { hitBoss(b, p.dm, heroes[p.h], p.vx > 0 ? 1 : -1); p.life = 0; }
        } else heroes.forEach(function (h) {
          if (p.life <= 0 || h.down || h.gate) return;
          var dd = Math.abs(p.x - h.x) < p.r + h.w / 2 && p.y > h.y - h.h - p.r && p.y < h.y + p.r; if (p.k === 7) dd = Math.abs(p.x - h.x) < p.r + 8 && h.y > p.y - 22;
          if (dd) { hurtHero(h, p.dm, p.vx >= 0 ? 1 : -1); if (p.k !== 7) p.life = 0; }
        });
      });
      W.projs = W.projs.filter(function (p) { return p.life > 0; });
      W.beams.forEach(function (b) {
        b.life -= dt; var x0 = b.dir > 0 ? b.x : b.x - b.len, x1 = b.dir > 0 ? b.x + b.len : b.x, dm = beamDmg(b.t);
        W.mons.forEach(function (e) { if (e.alive && !b.hit["m" + e.id] && e.x + e.w / 2 > x0 && e.x - e.w / 2 < x1 && e.y - e.h < b.y + 22 && e.y > b.y - 22) { b.hit["m" + e.id] = 1; hitMon(e, dm, heroes[b.h], b.dir); } });
        var bs = W.boss; if (bs && bs.st !== 4 && bs.vis !== 0 && !b.hit.b && bs.x + BOSS[bs.k].w * 0.4 > x0 && bs.x - BOSS[bs.k].w * 0.4 < x1 && bs.y - BOSS[bs.k].h < b.y + 20 && bs.y > b.y - 20) { b.hit.b = 1; hitBoss(bs, dm * (BOSS[bs.k].armor < 0.5 ? 1.8 : 1.2), heroes[b.h], b.dir); }
        W.projs.forEach(function (p) { if (!p.own && p.k !== 7 && p.x > x0 && p.x < x1 && Math.abs(p.y - b.y) < 24) p.life = 0; });
      });
      W.beams = W.beams.filter(function (b) { return b.life > 0; });
      W.tele.forEach(function (t) {
        t.t -= dt;
        if (t.t <= 0 && !t.done) {
          t.done = true;
          if (t.k === "rock") { proj(BOSS[Lv.D.boss].body === "dragon" ? 3 : 6, t.x, -20, 0, 380, BOSS[Lv.D.boss].dm * 0.8, 3, 0, 500); }
          else if (t.k === "rootAct" || t.k === "root") W.zones.push({ x: t.x, w: 40, h: 80, life: 0.45, dm: BOSS[Lv.D.boss].dm, k: "root" });
        }
      });
      W.tele = W.tele.filter(function (t) { return !t.done; });
      W.zones.forEach(function (z) { z.life -= dt; heroes.forEach(function (h) { if (!h.down && !h.gate && Math.abs(h.x - z.x) < z.w / 2 + 8 && h.y > 9 * T - z.h) hurtHero(h, z.dm, h.x > z.x ? 1 : -1); }); });
      W.zones = W.zones.filter(function (z) { return z.life > 0; });
    }
    /* collectible drops that bounce on the floor */
    function updateDrops(dt) {
      W.drops.forEach(function (d) {
        d.life -= dt; d.vy = Math.min(600, d.vy + 1200 * dt); d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.98;
        var col = Math.floor(d.x / T); if (col >= 0 && col < Lv.len) { var fl = Lv.top[col] * T - 8; if (d.y > fl && Lv.top[col] !== 99) { d.y = fl; d.vy = -d.vy * 0.4; if (Math.abs(d.vy) < 40) d.vy = 0; } }
        heroes.forEach(function (h) { if (d.life > 0 && !h.down && !h.gate && Math.abs(h.x - d.x) < 22 && Math.abs((h.y - 20) - d.y) < 34) { d.life = 0; if (d.t === "coin") { score(h, 5); sfx("score"); } else { healHero(h, 35); ev("heal", h.x, h.y - 24, 0); sfx("good"); } } });
      });
      W.drops = W.drops.filter(function (d) { return d.life > 0; });
    }

    /* ---------------- items, npcs, camps, gate ---------------- */
    function updateItems(dt) {
      Lv.items.forEach(function (it, id) {
        if (W.got[id] && it.t !== "camp") return;
        heroes.forEach(function (h) {
          if (h.down || h.gate) return; var dx = Math.abs(h.x - it.x), dy = (h.y - 20) - (it.t === "coin" || it.t === "heart" ? it.y : it.y - 20);
          if (it.t === "coin" && dx < 20 && Math.abs(dy) < 30 && !W.got[id]) { W.got[id] = 1; score(h, 5); sfx("score"); }
          else if (it.t === "heart" && dx < 22 && Math.abs(dy) < 34 && !W.got[id]) { W.got[id] = 1; healHero(h, 35); ev("heal", h.x, h.y - 24, 0); sfx("good"); }
          else if (it.t === "cage" && dx < 30 && Math.abs(dy) < 40 && !W.got[id]) { W.got[id] = 1; W.rescued++; score(h, 50); healHero(h, 30); ev("heal", it.x, it.y - 20, 0); banner("Villager rescued! (" + W.rescued + ")  +30 health", 2.4); sfx("win"); }
          else if (it.t === "camp") { if (!W.got[id] && dx < 40) { W.got[id] = 1; W.cpX = it.x; banner("Campfire lit: rest here to heal!", 2.4); ev("heal", it.x, it.y - 20, 0); } if (W.got[id] && dx < 90 && !h.down) healHero(h, 22 * dt); }
          else if (it.t === "npc" && dx < 60 && !W.got[id]) {
            W.got[id] = 1; var gf = LQ.GIFTS[it.g]; if (gf.slot === "hp") { heroes.forEach(function (q) { q.mhp += 40; q.hp = q.mhp; }); W.party.sw = Math.max(W.party.sw, 3); } else W.party[gf.slot] = Math.max(W.party[gf.slot], gf.tier);
            banner(gf.who + ': "' + gf.say + '"  Received: ' + gf.name + "!", 6); sfx("win"); ev("heal", it.x, it.y - 30, 0);
          }
        });
      });
    }
    function updateGate(dt) {
      if (W.ph !== "clear") return;
      var all = true, any = false;
      heroes.forEach(function (h) { if (h.gate) { any = true; return; } if (h.down) return; if (Math.abs(h.x - Lv.gateX) < 26 && h.y > 9 * T - 20) { h.gate = true; ev("tp", h.x, h.y - 30, 0); any = true; sfx("go"); } else all = false; });
      if (any && all && !W.next) { W.next = 1; W.nextT = 0.8; }
      if (W.next) { W.nextT -= dt; ui.fade = Math.min(1, ui.fade + dt * 1.4); if (W.nextT <= 0) { W.next = 0; var nl = Lv.L + 1; loadLevel(nl, false); } }
    }

    /* ---------------- wildlife (harmless: they only run away) ---------------- */
    function updateWild(dt) {
      W.wild.forEach(function (a) {
        a.t += dt; var h = nearestHero(a.x, a.y, 1e9), dist = h ? Math.abs(h.x - a.x) : 999, away = h ? (a.x > h.x ? 1 : -1) : 0;
        if (a.k === "bird") { var fl = a.run; if (h && dist < 150) { a.run = 1; } if (a.run) { a.vx = away * 160; a.y -= 70 * dt; a.x += a.vx * dt; if (a.y < -30) a.dead = true; } return; }
        if (a.k === "bat") { a.y = a.by - 60 + Math.sin(a.t * 3) * 20; a.x += Math.cos(a.t * 1.3) * 36 * dt; if (h && dist < 120) a.x += away * 120 * dt; return; }
        if (a.k === "fish") { a.cyc = (a.cyc || 0) + dt; var u = (a.cyc % 3.2) / 1.2; a.y = u < 1 ? VH - 24 - Math.sin(u * Math.PI) * 90 : VH + 40; return; }
        if (h && dist < 170) { a.run = 1; a.dir = away; a.vx = away * (a.k === "deer" ? 210 : 160); } else if (a.run && dist > 320) { a.run = 0; a.vx = 0; } else if (!a.run) { a.vx = Math.sin(a.t * 0.4) > 0.85 ? a.dir * 22 : 0; if (a.vx) a.dir = Math.sign(a.vx); }
        var nx = a.x + a.vx * dt, col = Math.floor((nx + a.vx * 0.12) / T);
        if (col < 1 || col >= Lv.len - 1 || Lv.top[col] === 99 || Math.abs(Lv.top[col] * T - a.by) > 40) { a.vx = 0; if (a.run) a.vx = 0; } else { a.x = nx; }
      });
      W.wild = W.wild.filter(function (a) { return !a.dead; });
    }

    /* ---------------- fx (visual only) ---------------- */
    function doFx(k, x, y, a) {
      var n = k === "pop" ? 16 : k === "hit" ? 7 : k === "hurt" ? 10 : k === "heal" ? 10 : k === "crash" || k === "boom" ? 22 : k === "tp" ? 20 : k === "roar" ? 14 : k === "boom2" ? 12 : 8;
      var col = k === "heal" ? "#7dff9a" : k === "hurt" ? "#ff4a4a" : k === "tp" ? "#9fe8ff" : k === "pop" ? (a ? "#ffb04a" : "#ffe28a") : k === "splash" ? "#8fd4ff" : "#ffe9b0";
      if (k === "hit") sfx("hit"); else if (k === "hurt") sfx("bad"); else if (k === "pop") sfx("thud", 0.7); else if (k === "boom2") sfx("crash"); else if (k === "shot") sfx("whoosh"); else if (k === "roar") ui.shake = 7; else if (k === "down") sfx("lose"); else if (k === "splash") sfx("splash");
      for (var i = 0; i < n; i++) { var an = Math.random() * TAU, sp = 40 + Math.random() * (k === "crash" || k === "boom" ? 280 : 160); fx.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 60, l: 0.5 + Math.random() * 0.5, m: 1, c: col, s: 2 + Math.random() * 3, g: k === "heal" || k === "tp" ? -60 : 500 }); }
      if (k === "hit" || k === "pop") fx.push({ x: x, y: y, vx: 0, vy: 0, l: 0.18, m: 0.18, c: "#fff", s: 14, g: 0, ring: 1 });
    }
    function updateFx(dt) { fx.forEach(function (f) { f.l -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += f.g * dt; }); fx = fx.filter(function (f) { return f.l > 0; }); if (fx.length > 260) fx.splice(0, fx.length - 260); }

    /* ================================================================== SIMULATION STEP (host / local only) */
    function step(dt) {
      W.time += dt; if (!W.drops) W.drops = [];
      heroes.forEach(function (h) { updateHero(h, dt); });
      W.mons.forEach(function (e) { if (e.alive) updateMon(e, dt); });
      W.mons = W.mons.filter(function (e) { return e.alive; });
      if (W.boss) updateBoss(W.boss, dt);
      updateProjs(dt); updateDrops(dt); updateItems(dt); updateWild(dt); updateGate(dt);
      // boss arena trigger
      if (!W.locked && W.ph === "play" && heroes.some(function (h) { return h.x > Lv.arenaX * T + 90; })) { W.locked = true; startBoss(); }
      // team wipe: everybody down -> restart from the last campfire with full health
      if (heroes.every(function (h) { return h.down; })) { W.wipe += dt; if (W.wipe > 2.2) { W.wipe = 0; heroes.forEach(function (h, k) { h.down = false; h.hp = h.mhp; h.inv = 2; h.x = (W.locked ? Lv.arenaX * T + 60 : W.cpX) + k * 16; h.y = 9 * T; h.vx = h.vy = 0; h.sx = h.x; }); if (W.boss) { W.boss.hp = Math.min(W.boss.mhp, W.boss.hp + W.boss.mhp * 0.2); } banner("The party rises again! Use the hint button (?) if you need boss tips.", 4); } } else W.wipe = 0;
      if (W.ph === "win") { W.winT += dt; if (W.winT > 5 && !W.fin) { W.fin = 1; var all = heroes.map(function (h) { return h.i; }); C.finish(all, "Morvane is defeated and Lumora is free! Villagers rescued: " + W.rescued + "."); } }
      heroes.forEach(function (h) { if (h.sc !== h.lastSc) { h.lastSc = h.sc; C.set(h.i, h.sc); } });
    }

    /* ================================================================== NETWORK */
    function snapshot() {
      var near = []; heroes.forEach(function (h) { if (!h.down || true) near.push(h.x); });
      function isNear(x) { for (var i = 0; i < near.length; i++) if (Math.abs(x - near[i]) < 520) return true; return false; }
      var s = { lv: W.L, ph: W.ph === "play" ? 0 : W.ph === "clear" ? 1 : 2, lk: W.locked ? 1 : 0, p: [W.party.sw, W.party.bw, W.party.bm], rs: W.rescued, sq: ++snapSeq, tm: rd(W.time * 10) / 10 };
      s.h = heroes.map(function (h) { return [rd(h.x), rd(h.y), h.dir, Math.ceil(h.hp), rd(h.mhp), (h.down ? 1 : 0) | (h.gate ? 2 : 0) | (h.inv > 0 ? 4 : 0) | (h.run ? 8 : 0) | (h.shoot > 0 ? 16 : 0) | (h.onG ? 32 : 0) | (h.hurt > 0 ? 64 : 0), rd(h.en), h.sc, rd(h.atk * 100), rd(h.rev * 10), h.beamFx > 0 ? 1 : 0]; });
      s.e = []; W.mons.forEach(function (e) { if (isNear(e.x) && s.e.length < 24) s.e.push([e.id, e.k, rd(e.x), rd(e.y), e.dir, Math.ceil(e.hpf * 100), e.st, e.fl > 0 ? 1 : 0]); });
      if (W.boss) { var b = W.boss; s.b = [b.k, rd(b.x), rd(b.y), b.dir, Math.ceil(b.hpf * 1000), b.st, b.fl > 0 ? 1 : 0, b.vis, rd(b.dt * 10), b.ph]; }
      s.pr = []; W.projs.forEach(function (p) { if (isNear(p.x) && s.pr.length < 30) s.pr.push([p.k, rd(p.x), rd(p.y), rd(p.vx / 10), rd(p.vy / 10)]); });
      s.bm = W.beams.map(function (b) { return [rd(b.x), rd(b.y), b.dir, b.len, b.t, rd(b.life * 10)]; });
      s.tl = W.tele.slice(0, 10).map(function (t) { return [rd(t.x), rd(t.t * 10), t.k === "rock" ? 1 : 0]; });
      s.zn = W.zones.slice(0, 6).map(function (z) { return [rd(z.x), rd(z.life * 10)]; });
      s.w = []; W.wild.forEach(function (a) { if (isNear(a.x) && s.w.length < 14) s.w.push([a.id, WILD.indexOf(a.k), rd(a.x), rd(a.y), a.dir, a.run ? 1 : 0]); });
      s.dr = []; W.drops.forEach(function (d) { if (s.dr.length < 12) s.dr.push([d.t === "coin" ? 0 : 1, rd(d.x), rd(d.y)]); });
      var hx = "", v = 0, nb = 0; for (var i = 0; i < W.got.length; i++) { v |= W.got[i] << nb; if (++nb === 4) { hx += v.toString(16); v = 0; nb = 0; } } if (nb) hx += v.toString(16); s.g = hx;
      if (ui.bn && ui.bn.t > 0) s.bn = [ui.bn.txt, rd(ui.bn.t * 10), ui.bn.sticky ? 1 : 0];
      if (evq.length) { s.ev = evq.slice(0, 14); evq.length = 0; }
      return s;
    }
    var gmap = {};   // guest render objects keyed by id
    function applySnap(s) {
      if (!s || typeof s.lv !== "number") return;
      if (!Lv || W.L !== s.lv) { loadLevel(s.lv, W == null && s.lv === 0); }
      W.party = { sw: s.p[0], bw: s.p[1], bm: s.p[2] }; W.ph = s.ph === 0 ? "play" : s.ph === 1 ? "clear" : "win"; W.locked = !!s.lk; W.gateOpen = s.ph >= 1; W.rescued = s.rs; W.time = s.tm;
      s.h.forEach(function (a, i) {
        var h = heroes[i]; if (!h) return;
        if (h.tw === 0 || Math.abs(h.x - a[0]) > 160) { h.x = a[0]; h.y = a[1]; } h.tx = a[0]; h.ty = a[1]; h.tw = 1; h.dir = a[2]; h.hp = a[3]; h.mhp = a[4];
        var f = a[5]; h.down = !!(f & 1); h.gate = !!(f & 2); h.inv = f & 4 ? 1 : 0; h.run = f & 8 ? 1 : 0; h.shoot = f & 16 ? 1 : 0; h.onG = !!(f & 32); h.hurt = f & 64 ? 1 : 0; h.en = a[6]; h.sc = a[7]; h.atk = a[8] / 100; h.rev = a[9] / 10; h.beamFx = a[10];
        if (h.sc !== h.lastSc) { h.lastSc = h.sc; C.set(i, h.sc); }
      });
      var seen = {}; W.mons = s.e.map(function (a) {
        var o = gmap[a[0]]; if (!o) { o = gmap[a[0]] = { id: a[0], k: a[1], x: a[2], y: a[3], t: Math.random() * 6, w: MON[a[1]].w, h: MON[a[1]].h, alive: true }; }
        o.tx = a[2]; o.ty = a[3]; o.dir = a[4]; o.hpf = a[5] / 100; o.st = a[6]; o.fl = a[7] ? 0.1 : 0; seen[a[0]] = 1; return o;
      });
      for (var id in gmap) if (!seen[id]) delete gmap[id];
      if (s.b) { var bb = s.b; if (!W.boss) W.boss = { k: bb[0], x: bb[1], y: bb[2], t: 0, tw: 0 }; var B = W.boss; B.k = bb[0]; B.tx = bb[1]; B.ty = bb[2]; B.dir = bb[3]; B.hpf = bb[4] / 1000; B.st = bb[5]; B.fl = bb[6] ? 0.1 : 0; B.vis = bb[7]; B.dt = bb[8] / 10; B.dead = bb[5] === 4; B.ph = bb[9]; B.mhp = 1; B.hp = B.hpf; if (!B.tw) { B.x = bb[1]; B.y = bb[2]; B.tw = 1; } } else W.boss = null;
      W.projs = s.pr.map(function (a) { return { k: a[0], x: a[1], y: a[2], vx: a[3] * 10, vy: a[4] * 10, r: PK[a[0]].r }; });
      W.beams = s.bm.map(function (a) { return { x: a[0], y: a[1], dir: a[2], len: a[3], t: a[4], life: a[5] / 10 }; });
      W.tele = s.tl.map(function (a) { return { x: a[0], t: a[1] / 10, tot: 1, k: a[2] ? "rock" : "root" }; }); W.zones = s.zn.map(function (a) { return { x: a[0], life: a[1] / 10, w: 40, h: 80 }; });
      W.wild = s.w.map(function (a) { var o = gmap["w" + a[0]]; if (!o) o = gmap["w" + a[0]] = { id: a[0], x: a[2], y: a[3], t: Math.random() * 9 }; o.k = WILD[a[1]]; o.tx = a[2]; o.ty = a[3]; o.dir = a[4]; o.run = a[5]; return o; });
      W.drops = s.dr.map(function (a) { return { t: a[0] ? "heart" : "coin", x: a[1], y: a[2] }; });
      for (var i = 0; i < W.got.length; i++) W.got[i] = parseInt(s.g.charAt(i >> 2) || "0", 16) >> (i & 3) & 1;
      if (s.bn) { if (!ui.bn || ui.bn.txt !== s.bn[0]) ui.bn = { txt: s.bn[0], t: s.bn[1] / 10, sticky: !!s.bn[2] }; else ui.bn.t = Math.max(ui.bn.t, s.bn[1] / 10); }
      if (s.ev) s.ev.forEach(function (e) { if (e[0] === "bn") { ui.bn = { txt: e[1], t: e[2], sticky: !!e[3] }; } else doFx(e[0], e[1], e[2], e[3]); });
      if (W.boss && !ui.bossTipSeen && W.boss.st !== undefined) { ui.bossTipSeen = 1; ui.bossTip = 9; }
    }
    function smoothGuest(dt) {
      var k = 1 - Math.exp(-dt * 16);
      heroes.forEach(function (h) { if (h.tx !== undefined) { h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k; } h.an += dt; });
      W.mons.forEach(function (e) { if (e.tx !== undefined) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; } e.t += dt; if (e.fl > 0) e.fl -= dt; });
      if (W.boss && W.boss.tx !== undefined) { W.boss.x += (W.boss.tx - W.boss.x) * k; W.boss.y += (W.boss.ty - W.boss.y) * k; W.boss.t += dt; }
      W.wild.forEach(function (a) { if (a.tx !== undefined) { a.x += (a.tx - a.x) * k; a.y += (a.ty - a.y) * k; } a.t += dt; });
      W.projs.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; });
    }
    if (online) {
      net.on("sn", function (d, from) { if (!auth && from === net.hostIdx) applySnap(d); });
      if (auth) net.on("in", function (d, from) { var h = heroes[from]; if (h && !h.cpu && typeof d === "number") setBits(h.inp, d | 0); });
    }

    /* ================================================================== RENDER */
    function mkView(parent) {
      var arena = document.createElement("div"); arena.className = "arena"; arena.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;touch-action:none;background:#000;overflow:hidden";
      var cv = document.createElement("canvas"); cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none"; arena.appendChild(cv); parent.appendChild(arena);
      var ctx = cv.getContext("2d"), v = { W: 0, H: 0, s: 1, port: false, VW: 640, ox: 0, oy: 0, dpr: 1, g: ctx, cv: cv, arena: arena }, ro = null;
      v.resize = function () {
        var r = arena.getBoundingClientRect(), Wd = Math.max(200, Math.floor(r.width)), Hd = Math.max(200, Math.floor(r.height)), dpr = Math.min(2, window.devicePixelRatio || 1);
        if (Wd === v.W && Hd === v.H && dpr === v.dpr) return;
        cv.width = Math.floor(Wd * dpr); cv.height = Math.floor(Hd * dpr);
        v.port = Hd > Wd * 1.08; var lw = v.port ? Hd : Wd, lh = v.port ? Wd : Hd;
        v.s = Math.min(lh / VH, lw / 540); v.VW = Math.min(920, lw / v.s); var cw = v.VW * v.s, ch = VH * v.s;
        if (v.port) { v.ox = (Wd - ch) / 2; v.oy = (Hd - cw) / 2; } else { v.ox = (Wd - cw) / 2; v.oy = (Hd - ch) / 2; }
        v.W = Wd; v.H = Hd; v.dpr = dpr;
      };
      v.begin = function () {
        var d = v.dpr, s = v.s; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, v.W, v.H);
        if (v.port) ctx.setTransform(0, -s * d, s * d, 0, v.ox * d, (v.oy + v.VW * s) * d); else ctx.setTransform(s * d, 0, 0, s * d, v.ox * d, v.oy * d);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.VW, VH); ctx.clip();
      };
      v.end = function () { ctx.restore(); };
      v.toLogical = function (cx, cy) { var r = cv.getBoundingClientRect(), sx = cx - r.left, sy = cy - r.top; return v.port ? { x: v.VW - (sy - v.oy) / v.s, y: (sx - v.ox) / v.s } : { x: (sx - v.ox) / v.s, y: (sy - v.oy) / v.s }; };
      v.resize(); if (window.ResizeObserver) { ro = new ResizeObserver(function () { v.resize(); }); ro.observe(arena); }
      v.destroy = function () { if (ro) ro.disconnect(); };
      return v;
    }
    function drawProj(p, t) {
      g.save(); g.translate(p.x, p.y); var k = PK[p.k].n;
      if (k === "arrow" || k === "farrow") { g.rotate(Math.atan2(p.vy, p.vx)); g.fillStyle = k === "arrow" ? "#f4e8c8" : "#d8c8a0"; g.fillRect(-9, -1, 16, 2); g.fillStyle = "#cfd4de"; g.beginPath(); g.moveTo(7, -3); g.lineTo(13, 0); g.lineTo(7, 3); g.fill(); g.fillStyle = "#c04a3a"; g.fillRect(-10, -2, 4, 4); if (k === "arrow" && W && W.party.bw === 3) { g.fillStyle = "rgba(160,120,255,0.5)"; g.fillRect(-16, -2, 12, 4); } }
      else if (k === "wave") { g.fillStyle = "rgba(255,230,160,0.8)"; g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(0, -34, 14, 0); g.fill(); g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.moveTo(-7, 0); g.quadraticCurveTo(0, -20, 7, 0); g.fill(); }
      else if (k === "rock") { g.rotate(t * 4); g.fillStyle = "#807a74"; g.beginPath(); g.moveTo(-10, -6); g.lineTo(-2, -12); g.lineTo(11, -4); g.lineTo(8, 9); g.lineTo(-8, 10); g.fill(); g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(-4, -8, 6, 3); }
      else if (k === "bomb") { g.fillStyle = "#222"; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.fillStyle = Math.sin(t * 30) > 0 ? "#ff6a3a" : "#ffd04a"; g.fillRect(-1, -11, 2, 5); }
      else { var col = { spit: "#9be05a", fire: "#ff8a2a", ice: "#9fe8ff", spore: "#f2a0e0", orb: "#c88aff" }[k] || "#fff"; var gg = g.createRadialGradient(0, 0, 1, 0, 0, p.r * 1.7); gg.addColorStop(0, "#fff"); gg.addColorStop(0.35, col); gg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gg; g.beginPath(); g.arc(0, 0, p.r * 1.7, 0, TAU); g.fill(); }
      g.restore();
    }
    function drawSky(cam) {
      var B = Lv.B, gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, B.sky[0]); gr.addColorStop(1, B.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, view.VW, VH);
      if (!B.dark) { var sx = view.VW * 0.78, sy = 62; g.fillStyle = "rgba(255,250,210,0.9)"; g.beginPath(); g.arc(sx, sy, 22, 0, TAU); g.fill(); var sg = g.createRadialGradient(sx, sy, 10, sx, sy, 90); sg.addColorStop(0, "rgba(255,245,190,0.5)"); sg.addColorStop(1, "rgba(255,245,190,0)"); g.fillStyle = sg; g.fillRect(sx - 90, sy - 90, 180, 180); }
      else { g.fillStyle = "rgba(255,255,255,0.5)"; for (var i = 0; i < 26; i++) g.fillRect((i * 97) % view.VW, (i * 53) % 150, 1.5, 1.5); }
      function lay(c, f, a) { var off = -((cam * f) % 1024); g.globalAlpha = a; for (var x = off; x < view.VW; x += 1024) g.drawImage(c, x, 0); g.globalAlpha = 1; }
      lay(Lv.layers.far, 0.12, 1); lay(Lv.layers.mid, 0.32, 0.95);
      ui.birds && ui.birds.forEach(function (b) { b.x += b.v * 0.016; var bx = ((b.x - cam * 0.05) % (view.VW + 120)) - 40; g.save(); g.translate(bx, b.y + Math.sin(b.p + ui.t * 2) * 6); g.scale(1.1, 1.1); A.wild(g, "bird", ui.t + b.p, true); g.restore(); });
    }
    function drawTiles(cam) {
      var B = Lv.B, c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(Lv.len - 1, Math.floor((cam + view.VW) / T) + 1), i, row;
      var pit = Lv.bio === "river" ? ["#4aa6e0", "#2a6aa8"] : Lv.bio === "mines" ? ["#ff8a2a", "#a02a0a"] : Lv.bio === "citadel" ? ["#7a4ad8", "#1a0c3a"] : ["#14101e", "#050408"];
      for (i = c0; i <= c1; i++) {
        var tp = Lv.top[i], x = i * T;
        if (tp === 99) {
          var pg = g.createLinearGradient(0, VH - 70, 0, VH); pg.addColorStop(0, pit[0]); pg.addColorStop(1, pit[1]); g.fillStyle = pg; g.fillRect(x, VH - 70, T + 1, 70);
          if (Lv.bio === "river" || Lv.bio === "mines") { g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + ((ui.t * 20 + i * 9) % T), VH - 68 + Math.sin(ui.t * 3 + i) * 2, 10, 2); }
          continue;
        }
        var y = tp * T;
        g.fillStyle = B.dirt[0]; g.fillRect(x, y, T + 1, VH - y); g.fillStyle = B.dirt[1]; g.fillRect(x, y + 14, T + 1, VH - y);
        g.fillStyle = "rgba(0,0,0,0.18)"; var hs = (i * 2654435761) >>> 0; g.fillRect(x + (hs % 20), y + 12 + (hs >> 5) % 22, 7, 4); g.fillRect(x + ((hs >> 8) % 20), y + 36 + (hs >> 3) % 20, 5, 3);
        g.fillStyle = B.top; g.fillRect(x, y, T + 1, 9); g.fillStyle = A.shade(B.top, -0.25); g.fillRect(x, y + 7, T + 1, 3);
        g.fillStyle = A.shade(B.top, 0.2); for (var k = 0; k < 3; k++) g.fillRect(x + 4 + k * 9, y - 2, 3, 3);
        if (i > 0 && Lv.top[i - 1] > tp) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x, y + 9, 3, VH); }
      }
      for (i = c0; i <= c1; i++) for (row = 0; row < ROWS; row++) if (Lv.plat[i * ROWS + row]) { var px = i * T, py = row * T; g.fillStyle = B.plank; g.fillRect(px, py, T + 1, 10); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(px, py + 8, T + 1, 3); g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(px, py, T + 1, 2); if (!Lv.plat[(i - 1) * ROWS + row] && i > 0) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(px, py, 2, 10); } }
    }
    function drawWorld() {
      var cam = ui.cam, t = ui.t;
      drawSky(cam);
      g.save(); g.translate(-Math.round(cam), 0);
      var vx0 = cam - 80, vx1 = cam + view.VW + 80;
      Lv.decor.forEach(function (d) { if (d.f || d.x < vx0 || d.x > vx1) return; g.save(); g.translate(d.x, d.k === "chain" ? 0 : d.y); A.decor(g, d.k, t, d.s, Lv.B); g.restore(); });
      drawTiles(cam);
      // arena magic wall
      if (W.locked) { var wx = Lv.arenaX * T + 4, wg = g.createLinearGradient(wx, 0, wx + 20, 0); wg.addColorStop(0, "rgba(200,140,255,0.55)"); wg.addColorStop(1, "rgba(200,140,255,0)"); g.fillStyle = wg; g.fillRect(wx, 0, 20, VH); }
      // items
      Lv.items.forEach(function (it, id) {
        if (it.x < vx0 || it.x > vx1) return; var got = W.got[id];
        g.save(); g.translate(it.x, it.y);
        if (it.t === "coin" && !got) { var s = Math.abs(Math.cos(t * 4 + it.x)); g.fillStyle = "#ffd34a"; g.beginPath(); g.ellipse(0, Math.sin(t * 3 + it.x) * 2, 7 * Math.max(0.25, s), 7, 0, 0, TAU); g.fill(); g.strokeStyle = "#b8860b"; g.lineWidth = 1.5; g.stroke(); }
        else if (it.t === "heart" && !got) { g.translate(0, Math.sin(t * 3 + it.x) * 3); g.fillStyle = "#e5303c"; g.beginPath(); g.arc(-4, -3, 5, 0, TAU); g.arc(4, -3, 5, 0, TAU); g.moveTo(-9, -1); g.lineTo(0, 9); g.lineTo(9, -1); g.fill(); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(-6, -6, 2, 3); }
        else if (it.t === "cage") A.cage(g, t, !!got);
        else if (it.t === "camp") A.camp(g, t, !!got);
        else if (it.t === "npc") { g.scale(1, 1); A.npc(g, it.g, t, !!got); }
        g.restore();
      });
      // gate
      if (W.gateOpen || Lv.L >= 0) { g.save(); g.translate(Lv.gateX, 9 * T); A.gate(g, t, W.gateOpen, Lv.bio); g.restore(); }
      // wildlife
      W.wild.forEach(function (a) { if (a.x < vx0 || a.x > vx1) return; g.save(); g.translate(a.x, a.y); if (a.k !== "fish") g.scale(a.dir >= 0 ? 1 : -1, 1); A.wild(g, a.k, a.t, a.run); g.restore(); });
      // telegraphs
      W.tele.forEach(function (tl) { var f = Math.max(0, tl.t / (tl.tot || 1)); g.fillStyle = tl.k === "rock" ? "rgba(255,80,60," + (0.25 + 0.4 * (1 - f)) + ")" : "rgba(255,200,60," + (0.25 + 0.4 * (1 - f)) + ")"; g.beginPath(); g.ellipse(tl.x, 9 * T - 2, 26, 6, 0, 0, TAU); g.fill(); });
      W.zones.forEach(function (z) { g.fillStyle = "#5a3a1e"; for (var k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(z.x + k * 14 - 8, 9 * T); g.lineTo(z.x + k * 14, 9 * T - 70); g.lineTo(z.x + k * 14 + 8, 9 * T); g.fill(); } });
      // monsters
      W.mons.forEach(function (e) { if (e.x < vx0 - 40 || e.x > vx1 + 40) return; g.save(); g.translate(e.x, e.y); g.scale(e.dir >= 0 ? 1 : -1, 1); A.mon(g, MON[e.k], e, e.t); g.restore(); if (e.hpf < 0.995) { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(e.x - 14, e.y - e.h - 10, 28, 4); g.fillStyle = "#e5484d"; g.fillRect(e.x - 14, e.y - e.h - 10, 28 * Math.max(0, e.hpf), 4); } });
      // boss
      var b = W.boss; if (b && b.vis !== 0) { g.save(); g.translate(b.x, b.y); g.scale(b.dir >= 0 ? 1 : -1, 1); A.boss(g, b, t); g.restore(); }
      if (b && b.vis === 0 && b.mv === "burrow") { g.fillStyle = "rgba(0,0,0,0.5)"; g.beginPath(); g.ellipse(b.tx || b.x, 9 * T - 2, 34, 7, 0, 0, TAU); g.fill(); }
      W.drops.forEach(function (d) { if (d.t === "coin") { g.fillStyle = "#ffd34a"; g.beginPath(); g.arc(d.x, d.y, 5, 0, TAU); g.fill(); } else { g.fillStyle = "#e5303c"; g.beginPath(); g.arc(d.x - 3, d.y - 2, 4, 0, TAU); g.arc(d.x + 3, d.y - 2, 4, 0, TAU); g.moveTo(d.x - 7, d.y); g.lineTo(d.x, d.y + 7); g.lineTo(d.x + 7, d.y); g.fill(); } });
      // heroes
      heroes.forEach(function (h) {
        if (h.gate) return;
        g.save(); g.translate(h.x, h.y); if (h.inv > 0 && !h.down && Math.floor(ui.t * 16) % 2) g.globalAlpha = 0.5;
        g.scale(h.dir >= 0 ? 1.25 : -1.25, 1.25);
        A.hero(g, { t: h.an, run: h.run, ground: h.onG, dir: h.dir, col: h.col, sw: W.party.sw, bw: W.party.bw, atk: h.atk, shoot: h.shoot, beam: h.beamFx, down: h.down });
        g.restore();
        if (h.down) { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(h.x - 18, h.y - 36, 36, 5); g.fillStyle = "#7dff9a"; g.fillRect(h.x - 18, h.y - 36, 36 * Math.min(1, h.rev / 1.3), 5); g.fillStyle = "#fff"; g.font = "bold 10px sans-serif"; g.textAlign = "center"; g.fillText("stay close to revive", h.x, h.y - 42); }
        g.fillStyle = h.col; g.font = "bold 9px sans-serif"; g.textAlign = "center"; if (heroes.length > 1) { g.fillText(h.name, h.x, h.y - 66 - (h.i % 2) * 11); }
      });
      W.projs.forEach(function (p) { drawProj(p, t); });
      W.beams.forEach(function (bm) { var a = Math.min(1, bm.life / 0.15), col = bm.t === 1 ? ["#bff4ff", "#3ac8ff"] : bm.t === 2 ? ["#fff0c0", "#ff8a2a"] : ["#e8ffff", "#6ad0ff"], x0 = bm.dir > 0 ? bm.x : bm.x - bm.len, h = 14 + (1 - bm.life / 0.4) * 10; var bg = g.createLinearGradient(0, bm.y - h, 0, bm.y + h); bg.addColorStop(0, "rgba(255,255,255,0)"); bg.addColorStop(0.5, col[0]); bg.addColorStop(1, "rgba(255,255,255,0)"); g.globalAlpha = a; g.fillStyle = bg; g.fillRect(x0, bm.y - h, bm.len, h * 2); g.fillStyle = col[1]; g.globalAlpha = a * 0.35; g.fillRect(x0, bm.y - h * 1.7, bm.len, h * 3.4); g.globalAlpha = 1; });
      fx.forEach(function (f) { var a = Math.max(0, f.l / (f.m || 1)); g.globalAlpha = a; g.fillStyle = f.c; if (f.ring) { g.strokeStyle = f.c; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, f.s * (2 - a), 0, TAU); g.stroke(); } else g.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); }); g.globalAlpha = 1;
      // foreground leaves
      Lv.decor.forEach(function (d) { if (!d.f || d.x < vx0 || d.x > vx1) return; g.save(); g.translate(d.x, d.y + 6); g.globalAlpha = 0.95; A.decor(g, d.k === "tree" || d.k === "pillar" || d.k === "spire" ? "bush" : d.k, t, d.s * 1.3, Lv.B); g.restore(); });
      g.restore();
      // ambient particles
      ambient.forEach(function (p) { var x = ((p.x - cam * (0.4 + p.s * 0.1)) % (view.VW + 20) + view.VW + 20) % (view.VW + 20); var y = (p.y + ui.t * p.v) % VH; g.fillStyle = Lv.B.fx === "snow" ? "rgba(255,255,255,0.85)" : Lv.B.fx === "leaf" ? "rgba(120,190,80,0.7)" : Lv.B.fx === "ember" ? "rgba(255,150,60,0.8)" : Lv.B.fx === "spark" ? "rgba(160,230,255,0.8)" : "rgba(230,210,170,0.5)"; g.fillRect(x, Lv.B.fx === "ember" || Lv.B.fx === "spark" ? VH - y : y, p.s, p.s); });
      if (Lv.B.dark) { var vg = g.createRadialGradient(view.VW / 2, VH / 2, VH * 0.35, view.VW / 2, VH / 2, view.VW * 0.7); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,10,0.5)"); g.fillStyle = vg; g.fillRect(0, 0, view.VW, VH); }
    }

    /* ---------------- HUD & touch controls ---------------- */
    var ctlL = {}; function layoutCtl() { var w = view.VW; ctlL = { j: { x: w - 64, y: VH - 66, r: 36 }, a: { x: w - 142, y: VH - 44, r: 30 }, b: { x: w - 120, y: VH - 118, r: 27 }, c: { x: w - 192, y: VH - 104, r: 27 }, hint: { x: w - 92, y: 24, r: 16 }, stick: { x: 86, y: VH - 78, r: 52 } }; }
    function circle(c, label, on, col, dim) { g.globalAlpha = (on ? 0.62 : 0.3) * (dim ? 0.5 : 1); g.fillStyle = col || "#fff"; g.beginPath(); g.arc(c.x, c.y, c.r, 0, TAU); g.fill(); g.globalAlpha = (on ? 0.9 : 0.55) * (dim ? 0.5 : 1); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.fillStyle = "#0b1020"; g.font = "bold " + Math.round(c.r * 0.5) + "px 'Exo 2',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(label, c.x, c.y + 1); g.textBaseline = "alphabetic"; g.globalAlpha = 1; }
    function drawControls() {
      if (!(Kit.touch || ui.sawTouch)) return; layoutCtl();
      var s = ptr.stick; var st = ctlL.stick, bx = s ? s.bx : st.x, by = s ? s.by : st.y, kx = s ? s.kx : st.x, ky = s ? s.ky : st.y;
      g.globalAlpha = s ? 0.4 : 0.22; g.fillStyle = "#fff"; g.beginPath(); g.arc(bx, by, st.r, 0, TAU); g.fill(); g.globalAlpha = 0.5; g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.globalAlpha = s ? 0.7 : 0.4; g.fillStyle = "#fff"; g.beginPath(); g.arc(kx, ky, 22, 0, TAU); g.fill(); g.globalAlpha = 1;
      circle(ctlL.j, "JUMP", jBtn, "#7dd3ff"); circle(ctlL.a, "SLASH", touch.a, "#ffd36a"); circle(ctlL.b, "BOW", touch.b, "#a8e87a", !W.party.bw); circle(ctlL.c, "BEAM", touch.c, "#c5a0ff", !W.party.bm || (camHero && camHero.en < 100));
    }
    function wrapText(txt, maxW) { var words = String(txt).split(" "), lines = [], cur = ""; words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
    function box9(x, y, w, h, a) { g.globalAlpha = a || 0.78; g.fillStyle = "#0a0f1e"; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 10) : g.rect(x, y, w, h); g.fill(); g.globalAlpha = 0.9; g.strokeStyle = "rgba(255,210,120,0.8)"; g.lineWidth = 1.5; g.stroke(); g.globalAlpha = 1; }
    function drawHud() {
      var w = view.VW, me = camHero || heroes[0];
      // hero bars
      heroes.forEach(function (h, k) {
        var x = 10, y = 8 + k * 30; g.globalAlpha = 0.85; g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(x, y, 150, 26); g.globalAlpha = 1;
        g.fillStyle = h.col; g.beginPath(); g.arc(x + 12, y + 13, 8, 0, TAU); g.fill();
        g.fillStyle = "#3a1015"; g.fillRect(x + 26, y + 4, 110, 8); g.fillStyle = h.hp / h.mhp < 0.3 ? "#ff5a4a" : "#4ade5a"; g.fillRect(x + 26, y + 4, 110 * Math.max(0, h.hp / h.mhp), 8);
        g.fillStyle = "#10203a"; g.fillRect(x + 26, y + 15, 110, 5); g.fillStyle = h.en >= 100 && W.party.bm ? "#c5a0ff" : "#4aa8ff"; g.fillRect(x + 26, y + 15, 110 * (h.en / 100), 5);
        g.fillStyle = "#fff"; g.font = "bold 9px sans-serif"; g.textAlign = "left"; g.fillText(String(h.sc), x + 138, y + 22 - 10); g.textAlign = "center";
      });
      // title + boss bar
      var bsb = W.boss && W.boss.st !== undefined ? W.boss : null;
      g.textAlign = "center"; g.font = "bold 11px Orbitron,'Exo 2',sans-serif"; g.fillStyle = "rgba(255,255,255,0.8)"; g.fillText("L" + (Lv.L + 1) + " · " + Lv.name.toUpperCase(), w / 2, 14);
      if (bsb) { var bw = Math.min(300, w * 0.42), bx = w / 2 - bw / 2; g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(bx - 2, 19, bw + 4, 14); g.fillStyle = "#3a0a0a"; g.fillRect(bx, 21, bw, 10); var f = Math.max(0, bsb.hpf !== undefined ? bsb.hpf : bsb.hp / bsb.mhp); g.fillStyle = bsb.st === 3 ? "#ffd34a" : "#e5303c"; g.fillRect(bx, 21, bw * f, 10); g.fillStyle = "#fff"; g.font = "bold 10px 'Exo 2',sans-serif"; g.fillText(BOSS[bsb.k].n + (bsb.st === 3 ? "  - STUNNED!" : ""), w / 2, 45); }
      // right side: hint button + weapons
      layoutCtl(); circle(ctlL.hint, "?", ui.hint, "#ffd36a");
      g.font = "bold 9px 'Exo 2',sans-serif"; g.fillStyle = "rgba(255,255,255,0.8)"; g.textAlign = "right"; g.fillText("Sword " + ["fists", "I", "II", "III"][W.party.sw] + "  Bow " + (W.party.bw ? ["", "I", "II", "III"][W.party.bw] : "-") + "  Beam " + (W.party.bm ? ["", "I", "II", "III"][W.party.bm] : "-") + "  Rescued " + W.rescued, w - 118, 16); g.textAlign = "center";
      // keyboard hint for PC
      if (!(Kit.touch || ui.sawTouch) && ui.t < 12) { g.globalAlpha = Math.min(1, (12 - ui.t) / 2) * 0.85; g.fillStyle = "#fff"; g.font = "12px 'Exo 2',sans-serif"; g.fillText(localHeroes.length > 1 ? "P1: A/D move, W jump, F slash, G bow, H beam   P2: arrows, J slash, K bow, L beam   ?: hint" : "Arrows / WASD move, Space jump, J slash, K bow, L beam, H hint", w / 2, VH - 14); g.globalAlpha = 1; }
      // banner message box (top, below title)
      if (ui.bn && (ui.bn.t > 0 || ui.bn.sticky)) {
        g.font = "bold 13px 'Exo 2',sans-serif"; var ls = wrapText(ui.bn.txt, Math.min(520, w - 120)), bh = ls.length * 17 + 14, bw2 = Math.min(560, w - 100), by2 = bsb ? 56 : 40;
        g.globalAlpha = Math.min(1, ui.bn.sticky ? 1 : ui.bn.t * 2); box9(w / 2 - bw2 / 2, by2, bw2, bh, 0.82); g.fillStyle = ui.bn.sticky ? "#ffe58a" : "#fff"; ls.forEach(function (l, i) { g.fillText(l, w / 2, by2 + 20 + i * 17); }); g.globalAlpha = 1;
      }
      // story card
      var c = ui.cards[0];
      if (c) {
        var a = Math.min(1, c.t * 2, (c.max - c.t) * 3); g.globalAlpha = a; g.fillStyle = "rgba(4,6,16,0.72)"; g.fillRect(0, 0, w, VH); g.fillStyle = "#ffd98a"; g.font = "bold 22px Orbitron,'Exo 2',sans-serif"; g.fillText(c.lines[0], w / 2, VH / 2 - 44);
        g.fillStyle = "#fff"; g.font = "15px 'Exo 2',sans-serif"; c.lines.slice(1).forEach(function (l, i) { g.fillText(l, w / 2, VH / 2 - 8 + i * 22); }); g.fillStyle = "rgba(255,255,255,0.6)"; g.font = "11px sans-serif"; g.fillText("tap / press a key to continue", w / 2, VH / 2 + 8 + c.lines.length * 22); g.globalAlpha = 1;
      }
      // boss tip auto message
      if (ui.bossTip > 0 && bsb && !ui.hint) { g.globalAlpha = Math.min(1, ui.bossTip); g.font = "12px 'Exo 2',sans-serif"; var tl = wrapText("How to win: " + BOSS[bsb.k].hint, Math.min(560, w - 120)), th = tl.length * 15 + 12; box9(w / 2 - 290, VH - th - 14, 580, th, 0.7); g.fillStyle = "#e8f2ff"; tl.forEach(function (l, i) { g.fillText(l, w / 2, VH - th + 4 + i * 15); }); g.globalAlpha = 1; }
      // hint panel
      if (ui.hint) {
        box9(w / 2 - 270, 52, 540, VH - 100, 0.9); g.fillStyle = "#ffd98a"; g.font = "bold 15px Orbitron,'Exo 2',sans-serif"; g.fillText("HINTS", w / 2, 78);
        g.fillStyle = "#fff"; g.font = "12px 'Exo 2',sans-serif"; var yy = 98, B2 = BOSS[Lv.D.boss];
        [["This level's boss: " + B2.n, "#ff9a8a"], [B2.hint, "#fff"], ["Heal: campfires, apples (hearts), freed villagers, or just rest a few seconds after a fight.", "#9fe8b0"], ["Beam: when the purple meter is full, press BEAM to blast through many monsters.", "#c5a0ff"], ["Friendly animals only run away. Only monsters and bosses hurt you.", "#cfe0ff"], ["Fallen friends get up if you stand next to them. Use the glowing gate after a boss falls.", "#cfe0ff"]].forEach(function (p) { g.fillStyle = p[1]; wrapText(p[0], 500).forEach(function (l) { g.fillText(l, w / 2, yy); yy += 16; }); yy += 5; });
        g.fillStyle = "rgba(255,255,255,0.6)"; g.fillText("tap ? again to close", w / 2, VH - 58);
      }
      if (W.wipe > 0) { g.fillStyle = "rgba(0,0,0," + Math.min(0.6, W.wipe / 2.2) + ")"; g.fillRect(0, 0, w, VH); g.fillStyle = "#fff"; g.font = "bold 20px Orbitron,sans-serif"; g.fillText("Everyone fell... getting back up", w / 2, VH / 2); }
      if (ui.flash > 0) { g.fillStyle = "rgba(255,255,255," + ui.flash * 0.6 + ")"; g.fillRect(0, 0, w, VH); }
      if (ui.fade > 0) { g.fillStyle = "rgba(255,255,255," + ui.fade + ")"; g.fillRect(0, 0, w, VH); }
      if (W.ph === "win") { var q = Math.min(1, W.winT / 3); g.fillStyle = "rgba(255,240,180," + q * 0.25 + ")"; g.fillRect(0, 0, w, VH); }
    }

    /* ---------------- pointer controls ---------------- */
    function pdown(e) {
      if (e.pointerType === "touch") ui.sawTouch = true; if (!W) return; layoutCtl();
      var p = view.toLogical(e.clientX, e.clientY);
      if (ui.cards.length) { ui.cards.shift(); return; }
      if (Math.hypot(p.x - ctlL.hint.x, p.y - ctlL.hint.y) < ctlL.hint.r + 10) { ui.hint = !ui.hint; return; }
      if (ui.hint && p.y > 40) { ui.hint = false; return; }
      if (!(Kit.touch || ui.sawTouch || e.pointerType === "touch")) return;
      var id = e.pointerId, hit = null;
      ["j", "a", "b", "c"].forEach(function (k) { if (Math.hypot(p.x - ctlL[k].x, p.y - ctlL[k].y) < ctlL[k].r + 10) hit = k; });
      if (hit) { if (hit === "j") jBtn = 1; else touch[hit] = 1; ptr[id] = { k: hit }; }
      else if (p.x < view.VW * 0.45) { ptr.stick = { id: id, bx: p.x, by: Math.max(p.y, 120), kx: p.x, ky: Math.max(p.y, 120) }; ptr[id] = { k: "stick" }; }
      try { view.cv.setPointerCapture(id); } catch (x) { }
    }
    function pmove(e) {
      var q = ptr[e.pointerId]; if (!q || q.k !== "stick") return; var p = view.toLogical(e.clientX, e.clientY), s = ptr.stick; if (!s) return;
      var dx = p.x - s.bx, dy = p.y - s.by, d = Math.hypot(dx, dy), m = 52; if (d > m) { dx = dx / d * m; dy = dy / d * m; } s.kx = s.bx + dx; s.ky = s.by + dy;
      touch.l = dx < -14 ? 1 : 0; touch.r = dx > 14 ? 1 : 0; stickUp = dy < -30 ? 1 : 0;
    }
    function pup(e) {
      var q = ptr[e.pointerId]; if (!q) return; delete ptr[e.pointerId];
      if (q.k === "stick") { ptr.stick = null; touch.l = touch.r = 0; stickUp = 0; } else if (q.k === "j") jBtn = 0; else touch[q.k] = 0;
    }
    view.cv.addEventListener("pointerdown", pdown); view.cv.addEventListener("pointermove", pmove); view.cv.addEventListener("pointerup", pup); view.cv.addEventListener("pointercancel", pup);
    view.cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    var anyKey = function () { if (ui.cards.length) ui.cards.shift(); };
    document.addEventListener("keydown", anyKey);

    /* ================================================================== MAIN LOOP */
    loadLevel(0, true);
    if (online && !auth) { W.mons = []; }
    function tick(dt) {
      if (!alive || !W) return; ui.t += dt; view.resize();
      ui.flash = Math.max(0, ui.flash - dt * 1.5); if (!W.next) ui.fade = Math.max(0, ui.fade - dt * 1.2); ui.shake = Math.max(0, ui.shake - dt * 30); ui.bossTip = Math.max(0, (ui.bossTip || 0) - dt * 0.12);
      if (ui.bn) { ui.bn.t -= dt; if (ui.bn.t <= 0 && !ui.bn.sticky) ui.bn = null; }
      if (ui.cards.length) { var cd = ui.cards[0]; cd.t -= dt; if (cd.t <= 0) ui.cards.shift(); }
      readInputs();
      if (auth) { step(dt); }
      else {
        smoothGuest(dt); inpT += dt; var h = localHeroes[0], bits = h ? inpBits(h.inp) : 0;
        if (h && (bits !== lastInpKey || inpT > 0.4)) { lastInpKey = bits; inpT = 0; net.send("in", bits); }
      }
      if (online && auth) { sendT += dt; if (sendT >= 0.095) { sendT = 0; net.send("sn", snapshot()); } }
      updateFx(dt);
      if (auth) { W.drops = W.drops || []; }
      // camera follows the local hero (online) / the human (local)
      var follow = online ? heroes[myIdx] : (localHeroes[0] && !localHeroes[0].down ? localHeroes[0] : liveHeroes()[0] || heroes[0]); camHero = follow || camHero;
      if (follow) { var tx = follow.x - view.VW / 2 + follow.dir * 50, lo = W.locked ? Lv.arenaX * T : 0, hi = Lv.len * T - view.VW; ui.cam += (clamp(tx, lo, Math.max(lo, hi)) - ui.cam) * Math.min(1, dt * 5); ui.cam = clamp(ui.cam, 0, Math.max(0, hi)); }
      view.begin(); if (ui.shake > 0) g.translate((Math.random() - 0.5) * ui.shake, (Math.random() - 0.5) * ui.shake);
      drawWorld(); drawHud(); drawControls(); view.end();
    }
    window.__PZ_TEST = { st: function () { return { L: W.L, ph: W.ph, heroes: heroes.map(function (h) { return { x: h.x, hp: h.hp, down: h.down, sc: h.sc }; }), mons: W.mons.length, boss: W.boss ? { k: W.boss.k, hp: W.boss.hp, st: W.boss.st } : null, party: W.party, locked: W.locked, rescued: W.rescued, cam: ui.cam, VW: view.VW }; }, god: function () { heroes.forEach(function (h) { h.mhp = h.hp = 9999; }); }, go: function (n) { loadLevel(n, false); }, tele: function (x) { heroes.forEach(function (h, k) { h.x = x + k * 16; h.y = 9 * T - 1; h.vy = 0; }); }, arm: function () { W.party = { sw: 3, bw: 3, bm: 3 }; }, killAll: function () { W.mons.forEach(function (e) { e.alive = false; }); }, killBoss: function () { if (W.boss) hitBoss(W.boss, 99999, heroes[0], 1); }, press: function (i, k, v) { heroes[i].inp[k] = v; heroes[i].cpu = false; }, inp: function (i) { return heroes[i].inp; }, W: function () { return W; }, Lv: function () { return Lv; }, heroes: heroes, skip: function () { ui.cards.length = 0; } };
    stopLoop = Kit.loop(tick);
    return { destroy: function () { alive = false; if (stopLoop) stopLoop(); keys.destroy(); document.removeEventListener("keydown", anyKey); view.destroy(); } };
  };

  Hub.register({
    id: "lantern", name: "Lantern Quest", hue: 38, kind: "Turns", mins: 25,
    rules: "Monsters have taken over Lumora. Fight through 10 levels and beat 10 bosses to rescue the villagers. Move with the stick (or arrows/WASD), jump, slash your sword (J), shoot your bow (K) and fire the Beam (L) when its meter is full. Friendly NPCs give you weapons. Heal at campfires, with apples and by freeing villagers. Animals are harmless. After a boss falls, walk into the glowing gate to reach the next level. Tap ? for boss hints. Play alone with a Computer friend, or together online.",
    desc: "10 levels, 10 bosses, 30 monsters: a full-screen sword-and-bow adventure to free Lumora. Co-op with friends or the Computer.",
    icon: "<path class=\"st\" d=\"M40 18l4 26h-8z\"/><path class=\"st\" d=\"M32 46h16\"/><path class=\"st\" d=\"M40 46v10\"/><circle class=\"fl\" cx=\"40\" cy=\"60\" r=\"3\"/>",
    teams: false,
    diff: "Easy: more health, weaker monsters, fast healing. Medium: standard. Hard: tougher monsters and less healing."
  });
})();
