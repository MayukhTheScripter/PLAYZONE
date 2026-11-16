/* Pass the Bomb - hidden fuse, hot-seat elimination. First to 2 round wins. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, esc = Hub.esc, Kit = Hub.Kit;

  ENGINES.bomb = function (C) {
    var n = C.n, WIN = 2, FUSE = [[9, 22], [6, 17], [4, 12]][C.lv], REACT = [[0.9, 2.1], [0.6, 1.5], [0.35, 1.0]][C.lv];
    var wins = [], alive = [], holder = 0, fuseLeft = 0, fuseTotal = 1, running = false, tickT = 0, passT = 0, round = 0, kd;
    for (var i = 0; i < n; i++) wins.push(0);
    C.root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="b-stage"><div class="b-ring"></div><div class="b-bomb" aria-hidden="true">💣</div><div class="b-hold"></div><button type="button" class="btn b-pass" disabled>PASS</button><div class="b-note"></div></div>';
    var ring = C.root.querySelector(".b-ring"), bomb = C.root.querySelector(".b-bomb"), hold = C.root.querySelector(".b-hold"), pass = C.root.querySelector(".b-pass"), note = C.root.querySelector(".b-note"), stage = C.root.querySelector(".b-stage");
    C.players.forEach(function (p, i) { C.set(i, 0); });

    function drawRing() {
      ring.innerHTML = C.players.map(function (p, i) {
        return '<span class="b-chip' + (alive[i] ? "" : " out") + (i === holder && alive[i] ? " has" : "") + '" style="--pc:' + C.col(i) + '">' + Hub.esc(p.name) + (alive[i] ? "" : " ✖") + "</span>";
      }).join("");
    }
    function nextAlive(from) { for (var k = 1; k <= n; k++) { var j = (from + k) % n; if (alive[j]) return j; } return from; }
    function aliveCount() { return alive.filter(Boolean).length; }
    function newRound() {
      round++; alive = []; for (var i = 0; i < n; i++) alive.push(true);
      holder = Math.floor(Math.random() * n); armBomb();
    }
    function armBomb() {
      fuseTotal = fuseLeft = Kit.rnd(FUSE[0], FUSE[1]); running = true; bomb.className = "b-bomb"; stage.classList.remove("boom");
      C.msg("Round " + round + " · " + C.who(holder) + " has the bomb!"); showHolder(); tick();
    }
    function showHolder() {
      drawRing(); C.turn(holder);
      var cpu = C.players[holder].cpu;
      hold.innerHTML = C.who(holder) + (cpu ? " is thinking…" : " — pass it on!");
      pass.disabled = cpu || !running; note.textContent = cpu ? "" : "Press PASS (or Space) before it blows.";
      clearTimeout(passT);
      if (cpu && running) passT = setTimeout(doPass, Kit.rnd(REACT[0], REACT[1]) * 1000);
    }
    function doPass() {
      if (!running || !C.alive) return;
      sfx("whoosh"); holder = nextAlive(holder); bomb.classList.remove("toss"); void bomb.offsetWidth; bomb.classList.add("toss"); showHolder();
    }
    function tick() {
      clearTimeout(tickT);
      if (!running || !C.alive) return;
      var frac = fuseLeft / fuseTotal, gap = 110 + 650 * frac;
      sfx("tick"); bomb.classList.toggle("hot", frac < 0.35);
      fuseLeft -= gap / 1000;
      if (fuseLeft <= 0) { tickT = setTimeout(explode, gap); return; }
      tickT = setTimeout(tick, gap);
    }
    function explode() {
      if (!C.alive) return;
      running = false; clearTimeout(passT); pass.disabled = true; sfx("boom"); bomb.className = "b-bomb gone"; stage.classList.add("boom");
      var out = holder; alive[out] = false; drawRing();
      C.msg("💥 BOOM! " + C.who(out) + " is out!");
      if (aliveCount() <= 1) {
        var w = alive.indexOf(true); wins[w]++; C.add(w, 1);
        C.later(function () {
          if (wins[w] >= WIN) { var win = []; wins.forEach(function (v, i) { if (v >= WIN) win.push(i); }); C.finish(win, "First to " + WIN + " round wins."); return; }
          C.msg(C.who(w) + " wins round " + round + "!"); C.later(newRound, 1800);
        }, 1400);
      } else { holder = nextAlive(out); C.later(armBomb, 1700); }
    }
    pass.addEventListener("click", function () { if (!C.players[holder].cpu) doPass(); });
    kd = function (e) { if ((e.code === "Space" || e.code === "Enter") && running && !C.players[holder].cpu && !pass.disabled) { e.preventDefault(); doPass(); } };
    document.addEventListener("keydown", kd);
    newRound();
    return { destroy: function () { running = false; clearTimeout(tickT); clearTimeout(passT); document.removeEventListener("keydown", kd); } };
  };

  Hub.register({
    "id": "bomb", "name": "Pass the Bomb", "hue": 15, "kind": "Turns", "mins": 5,
    "rules": "A bomb with a secret fuse is passed around. When it is your turn, tap PASS (or press Space) to hand it to the next player still in. Whoever holds it when it explodes is out. The last player left wins the round. First to 2 round wins takes the game.",
    "desc": "Do not be holding it when it explodes.",
    "icon": "<circle class=\"st\" cx=\"38\" cy=\"46\" r=\"20\"/><path class=\"st\" d=\"M50 28l8-8\"/><path class=\"soft\" d=\"M60 16l4 4M66 12l2 6\"/>",
    "teams": false,
    "diff": "Easy: long fuses, slow Computer. Medium: shorter fuses. Hard: short fuses and a fast Computer."
  });
})();
