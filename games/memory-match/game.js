/* Memory Match - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, pickOf = Hub.pickOf, shuffle = Hub.shuffle, maxIdx = Hub.maxIdx;

  // ---------- Memory Match ----------
  ENGINES.memory = function (C) {
    var root = C.root, n = C.n, pairs = [8, 12, 18][C.lv];
    var SYMS = ["🐶", "🐱", "🦊", "🐼", "🐸", "🦁", "🐵", "🐧", "🦄", "🐙", "🐢", "🦋", "🚀", "🛸", "🤖", "👾", "🔮", "⚡", "🌙", "🍕"];
    var syms = shuffle(SYMS).slice(0, pairs), deck = shuffle(syms.concat(syms)), total = deck.length;
    var up = [], done = [], first = -1, lock = false, cur = 0, found = 0, mem = {}, rs = [], i;
    for (i = 0; i < total; i++) { up.push(false); done.push(false); }
    C.players.forEach(function () { rs.push(0); });
    var cards = "";
    for (i = 0; i < total; i++) cards += '<button type="button" class="mc" data-i="' + i + '" aria-label="Card ' + (i + 1) + ', face down"><span class="in"><span class="f back"></span><span class="f front">' + deck[i] + "</span></span></button>";
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="boardwrap"><div class="mem">' + cards + "</div></div>";
    var wrap = root.querySelector(".boardwrap"), grid = root.querySelector(".mem");
    function fit() {
      var W = wrap.clientWidth, H = wrap.clientHeight, gap = 8, best = null;
      if (!W || !H) return;
      for (var cols = 3; cols <= 8; cols++) {
        var rows = Math.ceil(total / cols), sz = Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows);
        if (!best || sz > best.sz) best = { cols: cols, rows: rows, sz: sz };
      }
      var sz2 = Math.max(24, Math.floor(best.sz));
      grid.style.gridTemplateColumns = "repeat(" + best.cols + ", " + sz2 + "px)";
      grid.style.gridTemplateRows = "repeat(" + best.rows + ", " + sz2 + "px)";
      grid.style.width = (best.cols * sz2 + gap * (best.cols - 1)) + "px";
      grid.style.height = (best.rows * sz2 + gap * (best.rows - 1)) + "px";
      grid.style.setProperty("--fs", Math.round(sz2 * 0.52) + "px");
    }
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(wrap); }
    window.addEventListener("resize", fit);
    fit();
    function cardEl(k) { return grid.children[k]; }
    function paint(k) {
      var e = cardEl(k);
      e.classList.toggle("up", up[k]);
      e.classList.toggle("done", done[k]);
      e.setAttribute("aria-label", up[k] || done[k] ? "Card " + (k + 1) + ": " + deck[k] : "Card " + (k + 1) + ", face down");
    }
    function remember(k) { if (Math.random() < [0.4, 0.7, 0.95][C.lv]) mem[k] = deck[k]; }
    function turn() {
      C.turn(cur);
      if (C.players[cur].cpu) { C.msg(C.who(cur) + " is picking…"); C.later(cpuFirst, 800); }
      else C.msg(C.who(cur) + " — flip two cards");
    }
    function flip(k) { sfx("flip");
      if (lock || done[k] || up[k]) return;
      up[k] = true; paint(k); remember(k);
      if (first < 0) {
        first = k;
        if (C.players[cur].cpu) C.later(cpuSecond, 750);
      } else {
        lock = true;
        var a = first, b = k;
        C.later(function () { resolve(a, b); }, 950);
      }
    }
    function resolve(a, b) {
      if (deck[a] === deck[b]) {
        done[a] = done[b] = true; up[a] = up[b] = false;
        cardEl(a).style.setProperty("--oc", C.col(cur)); cardEl(b).style.setProperty("--oc", C.col(cur));
        paint(a); paint(b); delete mem[a]; delete mem[b];
        rs[cur]++; C.add(cur, 1); found++;
        first = -1; lock = false;
        if (found === pairs) { C.later(function () { C.finish(maxIdx(rs), C.players.map(function (p, q) { return p.name + " " + rs[q]; }).join(" · ")); }, 600); return; }
        turn();
      } else {
        up[a] = up[b] = false; paint(a); paint(b);
        cur = (cur + 1) % n; first = -1; lock = false; turn();
      }
    }
    function unknownPool(except) {
      var pool = [], k;
      for (k = 0; k < total; k++) if (!done[k] && !up[k] && k !== except && !(k in mem)) pool.push(k);
      if (!pool.length) for (k = 0; k < total; k++) if (!done[k] && !up[k] && k !== except) pool.push(k);
      return pool;
    }
    function cpuFirst() {
      var seen = {}, pr = null;
      Object.keys(mem).forEach(function (k) {
        k = +k; var s = mem[k];
        if (done[k]) return;
        if (seen[s] !== undefined && seen[s] !== k) pr = [seen[s], k]; else seen[s] = k;
      });
      if (pr && Math.random() < [0.4, 0.75, 1][C.lv]) { flip(pr[0]); return; }
      flip(pickOf(unknownPool(-1)));
    }
    function cpuSecond() {
      var f = first, s = deck[f], hit = -1;
      Object.keys(mem).forEach(function (k) { k = +k; if (k !== f && !done[k] && !up[k] && mem[k] === s) hit = k; });
      if (hit >= 0 && Math.random() < [0.5, 0.8, 1][C.lv]) { flip(hit); return; }
      flip(pickOf(unknownPool(f)));
    }
    root.addEventListener("click", function (e) {
      var c = e.target.closest(".mc");
      if (c && !C.players[cur].cpu) flip(+c.getAttribute("data-i"));
    });
    turn();
    return { destroy: function () { if (ro) ro.disconnect(); window.removeEventListener("resize", fit); } };
  };

  Hub.register({
    "id": "memory",
    "name": "Memory Match",
    "hue": 195,
    "kind": "Turns",
    "mins": 5,
    "rules": "Flip two cards on your turn. A matching pair scores a point and gives you another turn. Most pairs when the board is clear wins.",
    "desc": "Flip cards, find pairs, and keep your turn when you match.",
    "icon": "<rect class=\"st\" x=\"10\" y=\"16\" width=\"28\" height=\"40\" rx=\"5\" transform=\"rotate(-8 24 36)\"/><rect class=\"soft\" x=\"42\" y=\"22\" width=\"28\" height=\"40\" rx=\"5\" transform=\"rotate(8 56 42)\"/><rect class=\"st\" x=\"42\" y=\"22\" width=\"28\" height=\"40\" rx=\"5\" transform=\"rotate(8 56 42)\"/><circle class=\"fl\" cx=\"56\" cy=\"42\" r=\"6\"/>",
    "teams": false,
    "diff": "Easy: 16 cards. Medium: 24 cards. Hard: 36 cards."
  });
})();
