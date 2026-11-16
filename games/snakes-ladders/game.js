/* Snakes & Ladders - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, pawn = Hub.pawn, rnd = Hub.rnd, dieSvg = Hub.dieSvg;

  // ---------- Snakes & Ladders ----------
  ENGINES.snakes = function (C) {
    var PRE = [
      [{ 17: 7, 54: 34, 62: 19, 87: 33, 93: 73, 98: 79 }, { 2: 38, 4: 14, 8: 30, 9: 31, 15: 44, 21: 42, 28: 84, 36: 57, 43: 77, 51: 67, 58: 79, 63: 81, 71: 91, 80: 99 }],
      [{ 16: 6, 26: 10, 47: 25, 49: 11, 56: 53, 62: 19, 64: 60, 74: 46, 87: 24, 89: 68, 93: 73, 95: 75, 98: 78, 34: 12, 44: 18 }, { 2: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 45, 51: 67, 71: 91, 80: 99, 5: 27, 15: 46, 33: 52, 54: 75, 63: 83 }],
      [{ 14: 4, 22: 3, 27: 8, 31: 9, 38: 15, 47: 25, 49: 11, 56: 53, 62: 19, 64: 60, 70: 50, 74: 46, 79: 41, 87: 24, 89: 68, 93: 73, 96: 75, 98: 78, 66: 35, 45: 17 }, { 2: 23, 6: 25, 20: 59, 28: 77, 52: 72, 57: 94, 71: 92, 80: 99 }]
    ];
    var SN = PRE[C.lv][0], LD = PRE[C.lv][1];
    var root = C.root, n = C.n, pos = [], cur = 0, busy = false, i;
    for (i = 0; i < n; i++) pos.push(0);
    function xy(s) {
      if (s < 1) s = 1;
      var r = Math.floor((s - 1) / 10), c = (s - 1) % 10;
      if (r % 2) c = 9 - c;
      return [c * 10 + 5, (9 - r) * 10 + 5];
    }
    var cells = "", x, y;
    for (y = 0; y < 10; y++) for (x = 0; x < 10; x++) {
      var r0 = 9 - y, s0 = r0 * 10 + (r0 % 2 === 0 ? x + 1 : 10 - x);
      cells += '<div class="sl-c' + ((x + y) % 2 ? " alt" : "") + '">' + s0 + "</div>";
    }
    function ladder(a, b) {
      var A = xy(a), B = xy(b), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L, nx = -uy * 1.7, ny = ux * 1.7;
      var s = '<g style="stroke:var(--p3);stroke-width:0.9;stroke-linecap:round;fill:none">';
      s += '<line x1="' + (A[0] + nx) + '" y1="' + (A[1] + ny) + '" x2="' + (B[0] + nx) + '" y2="' + (B[1] + ny) + '"/>';
      s += '<line x1="' + (A[0] - nx) + '" y1="' + (A[1] - ny) + '" x2="' + (B[0] - nx) + '" y2="' + (B[1] - ny) + '"/>';
      var steps = Math.max(2, Math.floor(L / 5));
      for (var k = 1; k < steps; k++) { var t = k / steps, px = A[0] + dx * t, py = A[1] + dy * t; s += '<line x1="' + (px + nx) + '" y1="' + (py + ny) + '" x2="' + (px - nx) + '" y2="' + (py - ny) + '"/>'; }
      return s + "</g>";
    }
    function snake(h, t) {
      var H = xy(h), T = xy(t), dx = T[0] - H[0], dy = T[1] - H[1], L = Math.sqrt(dx * dx + dy * dy), nx = -dy / L, ny = dx / L, pts = [];
      for (var k = 0; k <= 16; k++) { var f = k / 16, off = Math.sin(f * Math.PI * 3) * 2.2 * (1 - 0.35 * f); pts.push((H[0] + dx * f + nx * off).toFixed(2) + " " + (H[1] + dy * f + ny * off).toFixed(2)); }
      return '<g><path d="M' + pts.join(" L") + '" style="fill:none;stroke:var(--p1);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;opacity:.8"/><circle cx="' + H[0] + '" cy="' + H[1] + '" r="2.2" style="fill:var(--p1)"/><circle cx="' + (H[0] - 0.9) + '" cy="' + (H[1] - 0.7) + '" r="0.6" style="fill:var(--surface)"/><circle cx="' + (H[0] + 0.9) + '" cy="' + (H[1] - 0.7) + '" r="0.6" style="fill:var(--surface)"/></g>';
    }
    var art = "";
    Object.keys(LD).forEach(function (k) { art += ladder(+k, LD[k]); });
    Object.keys(SN).forEach(function (k) { art += snake(+k, SN[k]); });
    var pawns = "";
    for (i = 0; i < n; i++) pawns += '<div class="sl-p" data-i="' + i + '">' + pawn(C.players[i].slot, 40) + "</div>";
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="boardwrap"><div class="sq"><div class="sl-grid">' + cells + '</div><svg class="sl-over" viewBox="0 0 100 100" aria-hidden="true">' + art + "</svg>" + pawns + '</div></div><div class="dock"><span class="dieslot"></span><button type="button" class="btn big" data-go="roll">Roll</button></div>';
    var btn = root.querySelector('[data-go="roll"]'), slot = root.querySelector(".dieslot");
    function setPos(k) {
      var p = xy(pos[k]), dx = (k % 2 ? 1 : -1) * 1.4, dy = (k > 1 ? 1 : -1) * 1.4, e = root.querySelector('.sl-p[data-i="' + k + '"]');
      e.style.left = (p[0] + dx) + "%"; e.style.top = (p[1] + dy) + "%";
    }
    function face(v) { slot.innerHTML = dieSvg(v, 64); }
    function ready(on) { btn.disabled = !on; btn.style.visibility = C.players[cur].cpu ? "hidden" : "visible"; }
    for (i = 0; i < n; i++) setPos(i);
    face(0);
    function begin() {
      busy = false; C.turn(cur);
      if (C.players[cur].cpu) { C.msg(C.who(cur) + " is rolling…"); ready(false); C.later(roll, 800); }
      else { C.msg(C.who(cur) + " — roll the die"); ready(true); }
    }
    function next() { cur = (cur + 1) % n; begin(); }
    function roll() {
      if (busy) return;
      busy = true; ready(false);
      var k = 0;
      (function flick() { sfx("tick");
        if (k < 9) { face(1 + rnd(6)); k++; C.later(flick, 65); return; }
        var r = 1 + rnd(6); face(r);
        C.later(function () { afterRoll(r); }, 250);
      })();
    }
    function walk(k, to, done) {
      (function step() {
        if (pos[k] === to) { done(); return; }
        pos[k] += to > pos[k] ? 1 : -1; setPos(k); C.set(k, pos[k]);
        C.later(step, 130);
      })();
    }
    function afterRoll(r) {
      var from = pos[cur], to = from + r;
      if (to > 100) { C.msg(C.who(cur) + " rolled " + r + ". Needs exactly " + (100 - from) + " to finish."); C.later(next, 1300); return; }
      C.msg(C.who(cur) + " rolled " + r);
      function after() {
        if (pos[cur] === 100) { C.later(function () { C.finish([cur], "Reached square 100 first."); }, 400); return; }
        C.later(next, 600);
      }
      walk(cur, to, function () {
        var j = SN[to] || LD[to];
        if (j) {
          C.msg(C.who(cur) + (SN[to] ? " is bitten by a snake! Down to " : " found a ladder! Up to ") + j);
          C.later(function () { pos[cur] = j; setPos(cur); C.set(cur, j); C.later(after, 800); }, 500);
        } else after();
      });
    }
    root.addEventListener("click", function (e) {
      if (e.target.closest('[data-go="roll"]') && !busy && !C.players[cur].cpu) roll();
    });
    begin();
    return {};
  };

  Hub.register({
    "id": "snakes",
    "name": "Snakes & Ladders",
    "hue": 150,
    "kind": "Turns",
    "mins": 10,
    "rules": "Roll one die each turn and move that many squares. A ladder lifts you up, a snake drops you down. Reach square 100 first.",
    "desc": "Roll, climb ladders, slide down snakes. First to square 100 wins.",
    "icon": "<path class=\"st\" d=\"M16 10V70M34 10V70M16 22H34M16 36H34M16 50H34M16 64H34\"/><path class=\"st\" d=\"M62 12C46 22 76 32 58 42C44 50 74 58 60 70\"/><circle class=\"fl\" cx=\"62\" cy=\"12\" r=\"3.5\"/>",
    "teams": false,
    "diff": "Easy: fewer snakes. Medium: the classic board. Hard: more snakes and fewer ladders."
  });
})();
