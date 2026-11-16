/* Ludo - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, esc = Hub.esc, pawn = Hub.pawn, rnd = Hub.rnd, pickOf = Hub.pickOf, dieSvg = Hub.dieSvg;

  // ---------- Ludo ----------
  ENGINES.ludo = function (C) {
    var root = C.root, n = C.n;
    var seats = n === 2 ? [0, 2] : (n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);
    var LOOP = [], x, y, i, k;
    function add(a, b) { LOOP.push([a, b]); }
    for (x = 1; x <= 5; x++) add(x, 6);
    for (y = 5; y >= 0; y--) add(6, y);
    add(7, 0); add(8, 0);
    for (y = 1; y <= 5; y++) add(8, y);
    for (x = 9; x <= 14; x++) add(x, 6);
    add(14, 7); add(14, 8);
    for (x = 13; x >= 9; x--) add(x, 8);
    for (y = 9; y <= 14; y++) add(8, y);
    add(7, 14); add(6, 14);
    for (y = 13; y >= 9; y--) add(6, y);
    for (x = 5; x >= 0; x--) add(x, 8);
    add(0, 7); add(0, 6);
    function rotc(a, b, t) { for (var q = 0; q < t; q++) { var z = a; a = 15 - b; b = z; } return [a, b]; }
    var YS = [[2, 2], [4, 2], [2, 4], [4, 4]];
    function posOf(c, p, kk) {
      if (p === 0) return rotc(YS[kk][0], YS[kk][1], c);
      if (p <= 51) { var t = LOOP[(c * 13 + p - 1) % 52]; return [t[0] + 0.5, t[1] + 0.5]; }
      if (p <= 56) return rotc(p - 52 + 1.5, 7.5, c);
      return rotc(6.9, 7.5 + (kk - 1.5) * 0.2, c);
    }
    var trackSet = {}, homeSet = {};
    LOOP.forEach(function (t, idx) { trackSet[t[0] + "," + t[1]] = idx; });
    for (var c0 = 0; c0 < 4; c0++) for (k = 0; k < 5; k++) { var pt = rotc(k + 1.5, 7.5, c0); homeSet[Math.floor(pt[0]) + "," + Math.floor(pt[1])] = c0; }
    var seatCol = ["var(--line)", "var(--line)", "var(--line)", "var(--line)"];
    seats.forEach(function (s, idx) { seatCol[s] = C.col(idx); });
    var cells = "";
    for (y = 0; y < 15; y++) for (x = 0; x < 15; x++) {
      var cls = "lc", st = "", yc = -1;
      if (x < 6 && y < 6) yc = 0; else if (x > 8 && y < 6) yc = 1; else if (x > 8 && y > 8) yc = 2; else if (x < 6 && y > 8) yc = 3;
      if (yc >= 0) {
        var lx = x < 6 ? x : x - 9, ly = y < 6 ? y : y - 9;
        cls += (lx >= 1 && lx <= 4 && ly >= 1 && ly <= 4) ? " yard-in" : " yard";
        st = "--yc:" + seatCol[yc];
      } else if (x >= 6 && x <= 8 && y >= 6 && y <= 8) cls += " mid";
      else {
        var key = x + "," + y;
        if (key in trackSet) {
          var ix = trackSet[key]; cls += " tr";
          if (ix % 13 === 0) { cls += " st safe"; st = "--yc:" + seatCol[ix / 13]; }
          else if (ix % 13 === 8) cls += " safe";
        } else if (key in homeSet) { cls += " hc"; st = "--yc:" + seatCol[homeSet[key]]; }
      }
      cells += '<div class="' + cls + '"' + (st ? ' style="' + st + '"' : "") + "></div>";
    }
    var prog = [], els = {}, pawnsHtml = "";
    for (i = 0; i < n; i++) { prog.push([0, 0, 0, 0]); for (k = 0; k < 4; k++) pawnsHtml += '<button type="button" class="lp" data-i="' + i + '" data-k="' + k + '" aria-label="' + esc(C.players[i].name) + " pawn " + (k + 1) + '">' + pawn(C.players[i].slot, 30) + "</button>"; }
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="boardwrap"><div class="sq" style="--c0:' + seatCol[0] + ";--c1:" + seatCol[1] + ";--c2:" + seatCol[2] + ";--c3:" + seatCol[3] + '"><div class="ludo-grid">' + cells + '</div><div class="ludo-ctr"></div>' + pawnsHtml + '</div></div><div class="dock"><span class="dieslot"></span><button type="button" class="btn big" data-go="roll">Roll</button></div>';
    var btn = root.querySelector('[data-go="roll"]'), slot = root.querySelector(".dieslot");
    Array.prototype.forEach.call(root.querySelectorAll(".lp"), function (e) { els[e.getAttribute("data-i") + "_" + e.getAttribute("data-k")] = e; });
    function place() {
      var groups = {};
      for (var a = 0; a < n; a++) for (var b = 0; b < 4; b++) {
        var p = posOf(seats[a], prog[a][b], b), key = Math.round(p[0] * 4) + "," + Math.round(p[1] * 4);
        (groups[key] = groups[key] || []).push({ i: a, k: b, pt: p });
      }
      Object.keys(groups).forEach(function (key) {
        var g = groups[key];
        g.forEach(function (o, j) {
          var dx = 0, dy = 0;
          if (g.length > 1) { var ang = (Math.PI * 2 * j) / g.length; dx = Math.cos(ang) * 0.22; dy = Math.sin(ang) * 0.22; }
          var e = els[o.i + "_" + o.k];
          e.style.left = ((o.pt[0] + dx) / 15 * 100) + "%"; e.style.top = ((o.pt[1] + dy) / 15 * 100) + "%";
        });
      });
    }
    place();
    var cur = 0, busy = false, tries = 0, pickList = [], lastRoll = 0;
    function face(v) { slot.innerHTML = dieSvg(v, 64); }
    face(0);
    function setBtn(on) { btn.disabled = !on; btn.style.visibility = C.players[cur].cpu ? "hidden" : "visible"; }
    function homeCount(a) { var c = 0; prog[a].forEach(function (p) { if (p === 57) c++; }); return c; }
    function canMove(a, b, r) { var p = prog[a][b]; if (p === 0) return r === 6; if (p === 57) return false; return p + r <= 57; }
    function clearCan() { Object.keys(els).forEach(function (key) { els[key].classList.remove("can"); }); }
    function begin(again) {
      busy = false; C.turn(cur); clearCan(); pickList = [];
      if (C.players[cur].cpu) { C.msg(C.who(cur) + (again ? " rolls again…" : " is rolling…")); setBtn(false); C.later(roll, 800); }
      else { C.msg(C.who(cur) + (again ? " — roll again" : " — roll the die")); setBtn(true); }
    }
    function nextPlayer() { cur = (cur + 1) % n; tries = 0; begin(false); }
    function roll() {
      if (busy) return;
      busy = true; setBtn(false);
      var f = 0;
      (function flick() { sfx("tick");
        if (f < 9) { face(1 + rnd(6)); f++; C.later(flick, 65); return; }
        var r = 1 + rnd(6); face(r);
        C.later(function () { afterRoll(r); }, 250);
      })();
    }
    function scoreMove(a, b, r) {
      var p = prog[a][b], np = p === 0 ? 1 : p + r, v = np;
      if (np === 57) v += 60;
      if (p === 0) v += 45;
      if (np >= 1 && np <= 51) {
        var gi = (seats[a] * 13 + np - 1) % 52;
        if (gi % 13 === 0 || gi % 13 === 8) v += 15;
        else for (var j = 0; j < n; j++) { if (j === a) continue; for (var m = 0; m < 4; m++) { var q = prog[j][m]; if (q >= 1 && q <= 51 && (seats[j] * 13 + q - 1) % 52 === gi) v += 70 + q * 0.5; } }
      }
      return v;
    }
    function chooseCpu(mv, r) {
      if (C.lv === 0 || (C.lv === 1 && Math.random() < 0.4)) return pickOf(mv);
      var best = -1, bs = -1e9;
      mv.forEach(function (b) { var s = scoreMove(cur, b, r) + Math.random(); if (s > bs) { bs = s; best = b; } });
      return best;
    }
    function afterRoll(r) {
      lastRoll = r;
      var mv = [], b;
      for (b = 0; b < 4; b++) if (canMove(cur, b, r)) mv.push(b);
      if (!mv.length) {
        var onTrack = prog[cur].some(function (p) { return p > 0 && p < 57; });
        if (!onTrack && r !== 6 && tries < 2) {
          tries++;
          C.msg(C.who(cur) + " rolled " + r + ". Needs a 6 to start. Try " + (tries + 1) + " of 3.");
          C.later(function () { begin(true); }, 1100);
        } else {
          C.msg(C.who(cur) + " rolled " + r + ". No move possible.");
          C.later(nextPlayer, 1100);
        }
        return;
      }
      if (mv.length === 1 || C.players[cur].cpu) {
        var kk = C.players[cur].cpu ? chooseCpu(mv, r) : mv[0];
        C.msg(C.who(cur) + " rolled " + r);
        C.later(function () { move(kk, r); }, 450);
      } else {
        pickList = mv;
        mv.forEach(function (q) { els[cur + "_" + q].classList.add("can"); });
        C.msg(C.who(cur) + " rolled " + r + ". Tap a glowing pawn to move it.");
      }
    }
    function move(b, r) {
      busy = true; clearCan(); pickList = [];
      var a = cur, target = prog[a][b] === 0 ? 1 : prog[a][b] + r;
      (function step() {
        if (prog[a][b] === target) { landed(b, r); return; }
        prog[a][b]++; place();
        C.later(step, 130);
      })();
    }
    function landed(b, r) {
      var a = cur, p = prog[a][b], extra = r === 6, why = "a six";
      if (p >= 1 && p <= 51) {
        var gi = (seats[a] * 13 + p - 1) % 52;
        if (gi % 13 !== 0 && gi % 13 !== 8) {
          for (var j = 0; j < n; j++) {
            if (j === a) continue;
            for (var m = 0; m < 4; m++) { var q = prog[j][m]; if (q >= 1 && q <= 51 && (seats[j] * 13 + q - 1) % 52 === gi) { prog[j][m] = 0; extra = true; why = "a capture"; } }
          }
        }
      }
      if (p === 57) { extra = true; why = "getting a pawn home"; C.set(a, homeCount(a)); }
      place();
      if (p === 57 && homeCount(a) === 4) { C.later(function () { C.finish([a], "All four pawns are home."); }, 500); return; }
      if (extra) { tries = 0; C.msg(C.who(a) + " gets another turn for " + why + "."); C.later(function () { begin(true); }, 900); }
      else C.later(nextPlayer, 450);
    }
    root.addEventListener("click", function (e) {
      if (e.target.closest('[data-go="roll"]') && !busy && !C.players[cur].cpu) { roll(); return; }
      var pw = e.target.closest(".lp.can");
      if (pw && pickList.length && +pw.getAttribute("data-i") === cur) move(+pw.getAttribute("data-k"), lastRoll);
    });
    begin(false);
    return {};
  };

  Hub.register({
    "id": "ludo",
    "name": "Ludo",
    "hue": 25,
    "kind": "Turns",
    "mins": 20,
    "rules": "Roll a 6 to bring a pawn out. Move each pawn once around the board and into the centre. First to get all four pawns home wins.",
    "desc": "Race four pawns around the board and into the centre.",
    "icon": "<rect class=\"st\" x=\"12\" y=\"12\" width=\"56\" height=\"56\" rx=\"8\"/><circle class=\"fl\" cx=\"28\" cy=\"28\" r=\"6\"/><circle class=\"st\" cx=\"52\" cy=\"28\" r=\"6\"/><circle class=\"st\" cx=\"28\" cy=\"52\" r=\"6\"/><circle class=\"fl\" cx=\"52\" cy=\"52\" r=\"6\"/><path class=\"st\" d=\"M40 31L49 40L40 49L31 40Z\"/>",
    "teams": false,
    "diff": "Sets how clever the computer is when it picks which pawn to move."
  });
})();
