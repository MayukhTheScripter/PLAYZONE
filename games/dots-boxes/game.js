/* Dots & Boxes - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, SHAPES = Hub.SHAPES, pickOf = Hub.pickOf, maxIdx = Hub.maxIdx;

  // ---------- Dots & Boxes ----------
  ENGINES.dots = function (C) {
    var root = C.root, n = C.n, R = [3, 4, 5][C.lv], W = R, M = 10, S = (100 - 2 * M) / R;
    var Hh = [], Vv = [], bx = [], cur = 0, lock = false, last = "", filled = 0, rs = [], r, c;
    for (r = 0; r <= R; r++) { Hh[r] = []; for (c = 0; c < W; c++) Hh[r][c] = -1; }
    for (r = 0; r < R; r++) { Vv[r] = []; for (c = 0; c <= W; c++) Vv[r][c] = -1; bx[r] = []; for (c = 0; c < W; c++) bx[r][c] = -1; }
    C.players.forEach(function () { rs.push(0); });
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="boardwrap"><div class="sq"><svg class="dots-svg" viewBox="0 0 100 100" role="group" aria-label="Dots and boxes board"></svg></div></div>';
    var svg = root.querySelector(".dots-svg");
    function sides(br, bc) { return (Hh[br][bc] >= 0) + (Hh[br + 1][bc] >= 0) + (Vv[br][bc] >= 0) + (Vv[br][bc + 1] >= 0); }
    function adj(t, a, b) {
      var o = [];
      if (t === "h") { if (a > 0) o.push([a - 1, b]); if (a < R) o.push([a, b]); }
      else { if (b > 0) o.push([a, b - 1]); if (b < W) o.push([a, b]); }
      return o;
    }
    function draw() {
      var s = "", a, b, x1, y1;
      for (a = 0; a < R; a++) for (b = 0; b < W; b++) if (bx[a][b] >= 0) {
        var o = bx[a][b], cx = M + b * S + S / 2, cy = M + a * S + S / 2;
        s += '<rect x="' + (M + b * S) + '" y="' + (M + a * S) + '" width="' + S + '" height="' + S + '" style="fill:' + C.col(o) + ';opacity:.3"/>';
        s += '<g transform="translate(' + (cx - 5) + " " + (cy - 5) + ') scale(0.42)" style="fill:' + C.col(o) + '">' + SHAPES[C.players[o].slot] + "</g>";
      }
      function ln(t, ra, ca, own) {
        var xa = M + ca * S, ya = M + ra * S, xb = t === "h" ? xa + S : xa, yb = t === "h" ? ya : ya + S, key = t + ra + "_" + ca;
        if (own >= 0) return '<line x1="' + xa + '" y1="' + ya + '" x2="' + xb + '" y2="' + yb + '" style="stroke:' + C.col(own) + ";stroke-width:" + (key === last ? 3.4 : 2.4) + ';stroke-linecap:round"/>';
        return '<line x1="' + xa + '" y1="' + ya + '" x2="' + xb + '" y2="' + yb + '" style="stroke:var(--line);stroke-width:0.8"/>';
      }
      for (a = 0; a <= R; a++) for (b = 0; b < W; b++) s += ln("h", a, b, Hh[a][b]);
      for (a = 0; a < R; a++) for (b = 0; b <= W; b++) s += ln("v", a, b, Vv[a][b]);
      for (a = 0; a <= R; a++) for (b = 0; b <= W; b++) s += '<circle cx="' + (M + b * S) + '" cy="' + (M + a * S) + '" r="1.9" style="fill:var(--fg)"/>';
      for (a = 0; a <= R; a++) for (b = 0; b < W; b++) if (Hh[a][b] < 0) { x1 = M + b * S; y1 = M + a * S; s += '<line class="hit" data-t="h" data-r="' + a + '" data-c="' + b + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + (x1 + S) + '" y2="' + y1 + '"/>'; }
      for (a = 0; a < R; a++) for (b = 0; b <= W; b++) if (Vv[a][b] < 0) { x1 = M + b * S; y1 = M + a * S; s += '<line class="hit" data-t="v" data-r="' + a + '" data-c="' + b + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + (y1 + S) + '"/>'; }
      svg.innerHTML = s;
    }
    function undrawn() {
      var o = [], a, b;
      for (a = 0; a <= R; a++) for (b = 0; b < W; b++) if (Hh[a][b] < 0) o.push({ t: "h", r: a, c: b });
      for (a = 0; a < R; a++) for (b = 0; b <= W; b++) if (Vv[a][b] < 0) o.push({ t: "v", r: a, c: b });
      return o;
    }
    function completes(m) { return adj(m.t, m.r, m.c).filter(function (q) { return sides(q[0], q[1]) === 3; }).length; }
    function thirds(m) { return adj(m.t, m.r, m.c).filter(function (q) { return sides(q[0], q[1]) === 2; }).length; }
    function cpuMove() {
      var all = undrawn(), best = all.filter(function (m) { return completes(m) > 0; });
      if (best.length && Math.random() < [0.5, 0.8, 1][C.lv]) return pickOf(best);
      if (Math.random() < [0.4, 0.15, 0][C.lv]) return pickOf(all);
      var safe = all.filter(function (m) { return thirds(m) === 0; });
      if (safe.length) return pickOf(safe);
      var min = Math.min.apply(null, all.map(thirds));
      return pickOf(all.filter(function (m) { return thirds(m) === min; }));
    }
    function turn() {
      C.turn(cur);
      if (C.players[cur].cpu) { C.msg(C.who(cur) + " is thinking…"); C.later(function () { play1(cpuMove()); }, 750); }
      else C.msg(C.who(cur) + " — draw a line between two dots");
    }
    function play1(m) {
      var who = cur;
      if (m.t === "h") Hh[m.r][m.c] = who; else Vv[m.r][m.c] = who;
      last = m.t + m.r + "_" + m.c;
      var got = 0;
      adj(m.t, m.r, m.c).forEach(function (q) { if (bx[q[0]][q[1]] < 0 && sides(q[0], q[1]) === 4) { bx[q[0]][q[1]] = who; got++; filled++; } });
      if (got) { rs[who] += got; C.add(who, got); }
      draw();
      if (filled === R * W) { lock = true; C.later(function () { C.finish(maxIdx(rs), C.players.map(function (p, q) { return p.name + " " + rs[q]; }).join(" · ")); }, 600); return; }
      if (!got) cur = (cur + 1) % n;
      turn();
    }
    root.addEventListener("click", function (e) {
      var h = e.target.closest(".hit");
      if (!h || lock || C.players[cur].cpu) return;
      play1({ t: h.getAttribute("data-t"), r: +h.getAttribute("data-r"), c: +h.getAttribute("data-c") });
    });
    draw(); turn();
    return {};
  };

  Hub.register({
    "id": "dots",
    "name": "Dots & Boxes",
    "hue": 275,
    "kind": "Turns",
    "mins": 8,
    "rules": "Take turns drawing one line between two dots. Closing a box scores it and gives you another turn. Most boxes wins.",
    "desc": "Draw lines between dots. Close a box to claim it.",
    "icon": "<rect class=\"soft\" x=\"16\" y=\"16\" width=\"24\" height=\"24\"/><path class=\"st\" d=\"M16 16H40M16 16V40M40 16V40M16 40H40M40 40H64\"/><circle class=\"fl\" cx=\"16\" cy=\"16\" r=\"3.5\"/><circle class=\"fl\" cx=\"40\" cy=\"16\" r=\"3.5\"/><circle class=\"fl\" cx=\"64\" cy=\"16\" r=\"3.5\"/><circle class=\"fl\" cx=\"16\" cy=\"40\" r=\"3.5\"/><circle class=\"fl\" cx=\"40\" cy=\"40\" r=\"3.5\"/><circle class=\"fl\" cx=\"64\" cy=\"40\" r=\"3.5\"/><circle class=\"fl\" cx=\"16\" cy=\"64\" r=\"3.5\"/><circle class=\"fl\" cx=\"40\" cy=\"64\" r=\"3.5\"/><circle class=\"fl\" cx=\"64\" cy=\"64\" r=\"3.5\"/>",
    "teams": false,
    "diff": "Easy: 3 × 3 boxes. Medium: 4 × 4 boxes. Hard: 5 × 5 boxes."
  });
})();
