/* Mystery Box - 3 rounds, pick one of 6 boxes each turn. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, esc = Hub.esc, Kit = Hub.Kit;
  var POOL = [
    { k: "p100", t: "+100", e: "🪙", v: 100 }, { k: "p200", t: "+200", e: "💰", v: 200 }, { k: "p300", t: "+300", e: "💎", v: 300 }, { k: "p500", t: "+500", e: "👑", v: 500 },
    { k: "jack", t: "JACKPOT +1000", e: "🏆", v: 1000 }, { k: "trap", t: "TRAP −300", e: "🪤", v: -300 }, { k: "bomb", t: "BOMB −100", e: "💣", v: -100 },
    { k: "steal", t: "STEAL 200", e: "🦹", v: 0 }, { k: "shield", t: "SHIELD", e: "🛡️", v: 0 }
  ];
  ENGINES.mystery = function (C) {
    var n = C.n, ROUNDS = 3, total = ROUNDS * n, turn = 0, pts = [], shield = [], locked = false, i;
    for (i = 0; i < n; i++) { pts.push(0); shield.push(false); C.set(i, 0); }
    C.root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="m-stage"><div class="m-meta"></div><div class="m-grid"></div></div>';
    var meta = C.root.querySelector(".m-meta"), grid = C.root.querySelector(".m-grid");
    function setP(p, v) { pts[p] = Math.max(0, v); C.set(p, pts[p]); }
    function next() {
      if (!C.alive) return;
      if (turn >= total) { var best = Math.max.apply(null, pts), w = []; pts.forEach(function (v, k) { if (v === best) w.push(k); }); return C.finish(w, "Top total: " + best + "."); }
      var p = turn % n, round = Math.floor(turn / n) + 1; locked = false; C.turn(p);
      var items = Hub.shuffle(POOL.slice()).slice(0, 6);
      if (!items.some(function (x) { return x.v < 0; }) ) items[Kit.ri(0, 5)] = POOL[5];
      meta.innerHTML = "Round " + round + " of " + ROUNDS + " · " + C.who(p) + (shield[p] ? " · 🛡️ shielded" : "");
      C.msg(C.players[p].cpu ? C.who(p) + " is choosing…" : C.who(p) + ", pick a box!");
      grid.innerHTML = items.map(function (it, k) { return '<button type="button" class="m-box" data-k="' + k + '" aria-label="Box ' + (k + 1) + '"><span class="m-lid">🎁</span><span class="m-in"></span></button>'; }).join("");
      grid.classList.toggle("off", !!C.players[p].cpu);
      grid._items = items; grid._p = p;
      if (C.players[p].cpu) C.later(function () { open(p, Kit.ri(0, 5)); }, 900 + Math.random() * 700);
    }
    function open(p, k) {
      if (locked || !C.alive) return; locked = true;
      var it = grid._items[k], boxes = grid.querySelectorAll(".m-box");
      boxes.forEach(function (b, j) { b.disabled = true; if (j !== k) b.classList.add("dim"); });
      var b = boxes[k]; b.classList.add("open"); b.querySelector(".m-in").innerHTML = '<span class="m-e">' + it.e + '</span><span class="m-t">' + esc(it.t) + "</span>";
      var msg;
      if (it.v > 0) { sfx("score"); setP(p, pts[p] + it.v); msg = C.who(p) + " found " + esc(it.t) + "!"; }
      else if (it.k === "trap" || it.k === "bomb") {
        if (it.k === "trap" && shield[p]) { shield[p] = false; sfx("clang"); msg = C.who(p) + " is saved by the shield!"; }
        else { sfx(it.k === "bomb" ? "boom" : "bad"); setP(p, pts[p] + it.v); msg = C.who(p) + " hit a " + it.k.toUpperCase() + " (" + it.v + ")."; }
      } else if (it.k === "shield") { shield[p] = true; sfx("good"); msg = C.who(p) + " gets a shield against the next trap."; }
      else {
        var tgt = -1; pts.forEach(function (v, j) { if (j !== p && v > 0 && (tgt < 0 || v > pts[tgt])) tgt = j; });
        if (tgt < 0) { sfx("score"); setP(p, pts[p] + 100); msg = C.who(p) + " tries to steal but nobody has points: +100."; }
        else { var take = Math.min(200, pts[tgt]); setP(tgt, pts[tgt] - take); setP(p, pts[p] + take); sfx("capture"); msg = C.who(p) + " steals " + take + " from " + C.who(tgt) + "!"; }
      }
      C.msg(msg); turn++; C.later(next, 2000);
    }
    grid.addEventListener("click", function (e) { var b = e.target.closest(".m-box"); if (b && !locked && !C.players[grid._p].cpu) open(grid._p, +b.getAttribute("data-k")); });
    next();
    return { destroy: function () {} };
  };
  Hub.register({
    "id": "mystery", "name": "Mystery Box", "hue": 300, "kind": "Turns", "mins": 5,
    "rules": "Three rounds. On your turn, open one of six boxes. Inside: coins (+100 to +500), a JACKPOT (+1000), a SHIELD that blocks your next trap, a STEAL (take 200 from the player who leads), or bad luck: a TRAP (−300) or a BOMB (−100). Highest total after three rounds wins.",
    "desc": "Pick a box. Treasure or trap?",
    "icon": "<rect class=\"st\" x=\"16\" y=\"34\" width=\"48\" height=\"32\" rx=\"4\"/><rect class=\"st\" x=\"12\" y=\"24\" width=\"56\" height=\"12\" rx=\"3\"/><path class=\"st\" d=\"M40 24v42\"/><path class=\"soft\" d=\"M40 24c-8-14-22-8-14 0M40 24c8-14 22-8 14 0\"/>",
    "teams": false,
    "diff": "The levels only change the Computer's opponent mood, not the boxes: it is a game of luck."
  });
})();
