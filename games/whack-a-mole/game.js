/* Whack-a-Mole - cartoon garden, coloured moles, big hammer. Every player owns one colour; first to 50 of their own colour wins. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var GOAL = 50, COLS = 4, ROWS = 5;

  var CLAWS = '<path class="w-claw" d="M-4 0q1-8 5-9 0 5-1 9z"/><path class="w-claw" d="M0 1q2-9 6-9 -1 5-2 9z"/><path class="w-claw" d="M4 2q3-8 7-7 -2 5-4 8z"/>';
  var MOLE = '<svg class="w-svg" viewBox="0 0 100 110" aria-hidden="true">' +
    '<ellipse cx="50" cy="98" rx="34" ry="7" fill="#0003"/>' +
    '<path class="w-body" d="M12 102C8 60 22 22 50 22S92 60 88 102Z"/>' +
    '<g class="w-head"><ellipse class="w-body" cx="50" cy="46" rx="35" ry="30"/><ellipse class="w-ear" cx="19" cy="24" rx="8" ry="9"/><ellipse class="w-ear" cx="81" cy="24" rx="8" ry="9"/><ellipse cx="19" cy="25" rx="4" ry="5" fill="#ffb3c1"/><ellipse cx="81" cy="25" rx="4" ry="5" fill="#ffb3c1"/>' +
    '<ellipse cx="50" cy="60" rx="21" ry="15" fill="#f4dcc0" stroke="#0003" stroke-width="1.2"/>' +
    '<g class="w-eyes"><ellipse cx="37" cy="42" rx="8" ry="8.6" fill="#fff" stroke="#2a160a" stroke-width="2"/><ellipse cx="63" cy="42" rx="8" ry="8.6" fill="#fff" stroke="#2a160a" stroke-width="2"/><circle cx="39" cy="44" r="3.6" fill="#111"/><circle cx="61" cy="44" r="3.6" fill="#111"/><circle cx="40.2" cy="42.6" r="1.2" fill="#fff"/><circle cx="62.2" cy="42.6" r="1.2" fill="#fff"/>' +
    '<path d="M25 30L45 38" stroke="#2a160a" stroke-width="5.5" stroke-linecap="round"/><path d="M75 30L55 38" stroke="#2a160a" stroke-width="5.5" stroke-linecap="round"/></g>' +
    '<g class="w-xeyes" fill="none" stroke="#111" stroke-width="3.6" stroke-linecap="round"><path d="M30 36l14 14M44 36L30 50"/><path d="M56 36l14 14M70 36L56 50"/></g>' +
    '<ellipse cx="50" cy="55" rx="8" ry="5.4" fill="#e0527a" stroke="#7a1a38" stroke-width="1.6"/><circle cx="47" cy="53.4" r="1.8" fill="#fff9"/>' +
    '<g class="w-smile"><path d="M40 64Q50 71 60 64" fill="none" stroke="#2a160a" stroke-width="2.6" stroke-linecap="round"/><rect x="45" y="66" width="4.6" height="7" rx="1.2" fill="#fff" stroke="#2a160a" stroke-width="1"/><rect x="50.4" y="66" width="4.6" height="7" rx="1.2" fill="#fff" stroke="#2a160a" stroke-width="1"/></g>' +
    '<g class="w-tongue"><path d="M40 64Q50 70 60 64" fill="none" stroke="#2a160a" stroke-width="2.6" stroke-linecap="round"/><path d="M44.5 66h11v9a5.5 5.5 0 0 1-11 0z" fill="#ff5d83" stroke="#a02a4a" stroke-width="1.4"/><path d="M50 67v7" stroke="#a02a4a" stroke-width="1.1"/></g></g>' +
    '</svg>';
  var STARS = '<span class="w-stars"><i>★</i><i>★</i><i>★</i></span>';
  var CLAWHANDS = '<span class="w-hands"><svg viewBox="0 0 100 40"><g transform="translate(18 30)"><ellipse class="w-paw" cx="0" cy="0" rx="11" ry="7"/>' + CLAWS + '</g><g transform="translate(76 30)"><ellipse class="w-paw" cx="6" cy="0" rx="11" ry="7"/>' + CLAWS + '</g></svg></span>';
  var HAMMER = '<svg viewBox="0 0 120 190" class="w-hsvg"><defs><linearGradient id="whw" x1="0" x2="1"><stop offset="0" stop-color="#9a6a38"/><stop offset="0.45" stop-color="#d9a468"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient><linearGradient id="whh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a468"/><stop offset="0.5" stop-color="#b9824a"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient></defs>' +
    '<rect x="53" y="58" width="14" height="122" rx="6" fill="url(#whw)" stroke="#4a2a10" stroke-width="2.6"/><path d="M58 70v100" stroke="#7a4a20" stroke-width="1.2" opacity="0.6"/>' +
    '<rect x="8" y="8" width="104" height="62" rx="9" fill="url(#whh)" stroke="#4a2a10" stroke-width="3.2"/>' +
    '<g stroke="#7a4a20" stroke-width="1.6" fill="none" opacity="0.7" stroke-linecap="round"><path d="M22 22q30 6 70 0"/><path d="M18 38q40 8 84 0"/><path d="M24 54q36 6 72 0"/></g>' +
    '<rect x="8" y="8" width="14" height="62" rx="7" fill="#8a5a2b" stroke="#4a2a10" stroke-width="2.4"/><rect x="98" y="8" width="14" height="62" rx="7" fill="#8a5a2b" stroke="#4a2a10" stroke-width="2.4"/>' +
    '<rect x="30" y="12" width="60" height="7" rx="3.5" fill="#ffffff44"/></svg>';

  var COIN = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#ffd23a" stroke="#c98a0a" stroke-width="3"/><path d="M20 8l3.6 8 8.6.8-6.5 5.8 2 8.5L20 26.4 12.3 31l2-8.5-6.5-5.8 8.6-.8z" fill="#fff3a0" stroke="#c98a0a" stroke-width="1.4"/></svg>';
  var CLOCK = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" stroke="#2a5aa8" stroke-width="4"/><path d="M20 9v11l7 4" fill="none" stroke="#1d2b4a" stroke-width="3.2" stroke-linecap="round"/><rect x="16" y="1" width="8" height="4" rx="1.5" fill="#2a5aa8"/></svg>';
  var HEART = '<svg viewBox="0 0 40 40"><path d="M20 35C6 25 3 16 8 10c4-4 9-3 12 2 3-5 8-6 12-2 5 6 2 15-12 25z" fill="#ff3b4e" stroke="#a8101f" stroke-width="2.4"/><ellipse cx="13" cy="14" rx="3.4" ry="2.2" fill="#fff9" transform="rotate(-35 13 14)"/></svg>';

  ENGINES.whack = function (C) {
    var lv = C.lv, n = C.n, N = COLS * ROWS, SHOW = [1.5, 1.15, 0.85][lv], base = [560, 450, 360][lv], gap = base * Math.max(0.5, 2.2 / n);
    var maxUp = Math.min(8, Math.ceil(2.5 + n * 1.2)), RT = [[800, 1300], [560, 950], [380, 650]][lv], MISS = [0.28, 0.14, 0.05][lv];
    var over = false, running = false, paused = false, pend = [], scores = [], timers = [], holes = [], up = 0, secs = 0;
    for (var k = 0; k < n; k++) scores.push(0);
    var humans = C.players.filter(function (p) { return !p.cpu; }).length, solo = humans === 1, me = 0;
    C.players.some(function (p, i) { if (!p.cpu) { me = i; return true; } });

    C.root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="w-wrap"><div class="w-fence"><div class="w-lvl">Level<b>' + (lv + 1) + '</b></div><div class="w-pill"><i>' + CLOCK + '</i><span class="w-time">0:00</span></div><div class="w-pill"><i>' + COIN + '</i><span class="w-coin">0</span></div><button type="button" class="w-pause" aria-label="Pause"><span></span><span></span></button></div>' +
      '<div class="w-prog"></div><div class="w-field"></div><div class="w-grass"></div><div class="w-count"></div><div class="w-paused" hidden><b>Paused</b><span>Tap to resume</span></div></div>';
    var prog = C.root.querySelector(".w-prog"), grid = C.root.querySelector(".w-field"), count = C.root.querySelector(".w-count"), pausedEl = C.root.querySelector(".w-paused"), timeEl = C.root.querySelector(".w-time"), coinEl = C.root.querySelector(".w-coin");
    prog.innerHTML = C.players.map(function (p, i) { return '<div class="w-pb" style="--mc:' + C.col(i) + '"><i class="w-hi">' + HEART + '</i><div class="w-bar"><b></b></div><span class="w-pv">0</span><span class="w-pn">' + Hub.esc(p.name) + '</span></div>'; }).join("");
    var bars = prog.querySelectorAll(".w-bar b"), vals = prog.querySelectorAll(".w-pv");
    for (var i = 0; i < N; i++) {
      var h = document.createElement("div"), r = Math.floor(i / COLS), c = i % COLS;
      h.className = "w-hole"; h.setAttribute("role", "button"); h.setAttribute("aria-label", "hole " + (i + 1));
      var x = (c + 0.5) / COLS * 100; h.style.cssText = "left:" + x + "%;top:" + ((r + 0.52) / ROWS * 100) + "%;z-index:" + (r + 1) + ";--fx:" + (c % 2 === 0 ? -1 : 1);
      h.innerHTML = '<span class="w-pit"></span>' + CLAWHANDS + '<span class="w-slash"><i></i><i></i><i></i></span><span class="w-clip"><span class="w-mole">' + MOLE + STARS + '</span></span><span class="w-lip"></span>';
      h._o = -1; h._tm = 0; h._m = h.querySelector(".w-mole"); holes.push(h); grid.appendChild(h);
    }
    function later(fn, ms) { var t = setTimeout(function () { if (over) return; if (paused) pend.push(fn); else fn(); }, ms); timers.push(t); return t; }
    function setScore(i, v) { scores[i] = v; C.set(i, v); bars[i].style.width = Math.min(100, v / GOAL * 100) + "%"; vals[i].textContent = v; if (i === me) coinEl.textContent = v; }
    function hideMole(h) { if (h._o >= 0) up--; h._o = -1; clearTimeout(h._tm); h.classList.remove("up", "hit", "dig"); h._m.style.removeProperty("--mc"); h._m.classList.remove("dizzy"); }
    function dust(h) {
      for (var d = 0; d < 7; d++) { var p = document.createElement("i"); p.className = "w-dp"; p.style.setProperty("--dx", Kit.rnd(-34, 34) + "px"); p.style.setProperty("--dy", Kit.rnd(-46, -14) + "px"); p.style.left = (35 + Kit.rnd(0, 30)) + "%"; h.appendChild(p); (function (q) { setTimeout(function () { q.remove(); }, 520); })(p); }
    }
    function coinFly(h) { var el = document.createElement("i"); el.className = "w-cf"; el.innerHTML = COIN; h.appendChild(el); setTimeout(function () { el.remove(); }, 700); }
    function popOne() {
      if (over || !running) return;
      if (up < maxUp) {
        var free = holes.filter(function (h) { return h._o < 0; });
        if (free.length) {
          var h = Kit.pick(free), o = Kit.ri(0, n - 1);
          h._o = o; up++; h._m.style.setProperty("--mc", C.col(o)); h._m.classList.remove("dizzy"); h.classList.remove("hit"); h.classList.add("dig"); dust(h); sfx("roll");
          later(function () {
            if (h._o !== o) return; h.classList.remove("dig"); h.classList.add("up");
            h._tm = later(function () { if (h._o === o && !h.classList.contains("hit")) hideMole(h); }, SHOW * (0.85 + Math.random() * 0.35) * 1000);
            if (C.players[o].cpu) cpuWhack(h, o);
          }, 230);
        }
      }
      later(popOne, gap * (0.65 + Math.random() * 0.7));
    }
    function cpuWhack(h, o) {
      if (Math.random() < MISS) return;
      later(function () { if (h._o === o && !h.classList.contains("hit") && !over) whack(h, o, true); }, Kit.rnd(RT[0], RT[1]));
    }
    function swing(h) {
      var m = document.createElement("span"); m.className = "w-ham"; m.innerHTML = HAMMER + '<i class="w-boom"></i>'; h.appendChild(m);
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 520);
    }
    function whack(h, o, byCpu) {
      swing(h); sfx(byCpu ? "tap" : "hit");
      h.classList.add("hit"); h._m.classList.add("dizzy"); clearTimeout(h._tm); coinFly(h);
      setScore(o, scores[o] + 1);
      later(function () { if (h._o === o) hideMole(h); }, 760);
      if (scores[o] >= GOAL && !over) { over = true; sfx("win"); setTimeout(function () { if (!C.alive) return; C.finish([o], scores.map(function (s, i) { return C.players[i].name + " " + s; }).join(" · ")); }, 650); }
    }
    grid.addEventListener("pointerdown", function (e) {
      var h = e.target.closest(".w-hole"); if (!h || over || !running || paused) return; e.preventDefault();
      if (h._o < 0 || h.classList.contains("hit") || h.classList.contains("dig")) { swing(h); return; }
      var o = h._o;
      if (solo && C.players[o].cpu) { swing(h); h.classList.add("nope"); setTimeout(function () { h.classList.remove("nope"); }, 260); sfx("bad"); return; }
      whack(h, o, false);
    });
    function setPause(p) { if (over || !running) return; paused = p; pausedEl.hidden = !p; C.root.querySelector(".w-wrap").classList.toggle("is-paused", p); if (!p) { var q = pend; pend = []; q.forEach(function (fn, i) { setTimeout(function () { if (!over) fn(); }, 60 + i * 40); }); } }
    C.root.querySelector(".w-pause").addEventListener("click", function () { setPause(!paused); });
    pausedEl.addEventListener("click", function () { setPause(false); });
    var clock = setInterval(function () { if (running && !paused && !over) { secs++; timeEl.textContent = Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2); } }, 1000);
    C.msg(solo ? "Tap only <b>your</b> colour moles. First to " + GOAL + " wins!" : "Everyone taps only their own colour. First to " + GOAL + " wins!");
    var c3 = 3; count.textContent = c3; count.classList.add("on"); sfx("beep");
    (function tick() { c3--; if (c3 > 0) { count.textContent = c3; sfx("beep"); later(tick, 700); } else { count.textContent = "GO!"; sfx("go"); running = true; popOne(); C.turn(0); later(function () { count.classList.remove("on"); }, 600); } })();
    return { destroy: function () { over = true; clearInterval(clock); timers.forEach(clearTimeout); } };
  };

  Hub.register({
    "id": "whack",
    "name": "Whack-a-Mole",
    "hue": 35,
    "kind": "Reflex",
    "mins": 3,
    "rules": "Every player owns one mole colour (the colour of their name and bar). Moles of all colours dig their way out of 20 holes - tap only the ones in YOUR colour and the big hammer smacks them. A hit mole spins dizzy with crossed eyes and tongue out and pops a coin. First to 50 whacks wins. With the Computer, it whacks its own colour, and tapping its moles does nothing. Use the pause button if you need a break.",
    "desc": "Whack your colour of mole first - race to 50.",
    "icon": "<circle class=\"st\" cx=\"40\" cy=\"46\" r=\"22\"/><circle class=\"fl\" cx=\"32\" cy=\"40\" r=\"3\"/><circle class=\"fl\" cx=\"48\" cy=\"40\" r=\"3\"/><path class=\"st\" d=\"M18 62h44\"/><path class=\"soft\" d=\"M28 14l22 14\"/>",
    "teams": false,
    "diff": "Easy: slow moles and a slow Computer. Medium: quicker. Hard: very quick moles and a sharp Computer."
  });
})();
