/* Sumo Tap - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, esc = Hub.esc;

  // ---------- Sumo Tap ----------
  function sumoSvg(slot, belt) {
    var skin = ["#e9b794", "#dba37b", "#f0c4a1", "#cf9a72", "#d8a984"][slot % 5], dark = "rgba(90,40,20,0.22)";
    return '<svg viewBox="0 0 150 160" aria-hidden="true">' +
      '<ellipse cx="72" cy="153" rx="52" ry="7" fill="rgba(0,0,0,0.35)"/>' +
      // legs in a wide stance
      '<path d="M38 112 Q22 128 26 150 L58 150 Q60 128 64 112Z" fill="' + skin + '"/><path d="M106 112 Q122 128 118 150 L86 150 Q84 128 80 112Z" fill="' + skin + '"/>' +
      '<ellipse cx="40" cy="151" rx="19" ry="7" fill="' + skin + '"/><ellipse cx="104" cy="151" rx="19" ry="7" fill="' + skin + '"/>' +
      '<path d="M30 140 Q40 146 52 140M96 140 Q106 146 118 140" stroke="' + dark + '" stroke-width="3" fill="none"/>' +
      // rear arm
      '<path d="M52 66 Q74 70 100 84" stroke="' + skin + '" stroke-width="15" stroke-linecap="round" fill="none"/>' +
      // torso
      '<ellipse cx="72" cy="88" rx="44" ry="42" fill="' + skin + '"/>' +
      '<ellipse cx="74" cy="98" rx="34" ry="28" fill="rgba(255,255,255,0.10)"/>' +
      '<path d="M44 70 Q72 82 100 70" stroke="' + dark + '" stroke-width="3" fill="none"/>' +
      '<circle cx="58" cy="66" r="2.2" fill="' + dark + '"/><circle cx="86" cy="66" r="2.2" fill="' + dark + '"/><circle cx="72" cy="96" r="2" fill="' + dark + '"/>' +
      // mawashi belt and apron
      '<path d="M30 104 Q72 128 114 104 L112 118 Q72 142 32 118Z" fill="' + belt + '" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>' +
      '<path d="M54 122 L90 122 L86 146 L58 146Z" fill="' + belt + '" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>' +
      '<path d="M60 126V146M66 126V146M72 126V146M78 126V146M84 126V146" stroke="rgba(0,0,0,0.3)" stroke-width="1.4"/>' +
      // front arm pushing
      '<path d="M96 70 Q116 72 134 88" stroke="' + skin + '" stroke-width="17" stroke-linecap="round" fill="none"/>' +
      '<circle cx="136" cy="90" r="10" fill="' + skin + '"/>' +
      // head
      '<circle cx="76" cy="38" r="22" fill="' + skin + '"/>' +
      '<path d="M54 34 Q56 14 78 14 Q98 14 98 34 Q90 24 76 24 Q62 24 54 34Z" fill="#1c1410"/>' +
      '<ellipse cx="78" cy="10" rx="11" ry="7" fill="#1c1410"/><rect x="73" y="3" width="10" height="8" rx="3" fill="#1c1410"/><rect x="70" y="14" width="16" height="3" fill="' + belt + '"/>' +
      '<circle cx="54" cy="40" r="5" fill="' + skin + '"/>' +
      '<path d="M66 33 L76 36M92 33 L82 36" stroke="#1c1410" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="71" cy="40" r="2.6" fill="#1c1410"/><circle cx="87" cy="40" r="2.6" fill="#1c1410"/>' +
      '<path d="M70 52 Q79 56 88 52" stroke="#7a3a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="64" cy="48" r="4" fill="rgba(220,90,80,0.28)"/><circle cx="92" cy="48" r="4" fill="rgba(220,90,80,0.28)"/>' +
      "</svg>";
  }

  ENGINES.sumo = function (C) {
    var root = C.root, n = C.n, STEP = 0.03, RATE = [3.4, 5.2, 7.6][C.lv], touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    root.innerHTML =
      '<div class="msg" aria-live="polite"></div>' +
      '<div class="sumo"><div class="s-head"><span class="s-round"></span></div>' +
      '<div class="s-ring"><div class="s-base"></div><div class="s-surface"></div><div class="s-rope"></div><i class="s-line a"></i><i class="s-line b"></i><div class="s-fighter" data-f="0"></div><div class="s-fighter" data-f="1"></div><div class="s-count"></div></div>' +
      '<div class="s-bar"><i></i></div><div class="s-pads"><div class="s-pad" data-p="0"></div><div class="s-pad" data-p="1"></div></div><div class="s-queue"></div></div>';
    var sumo = root.querySelector(".sumo"), fl = [root.querySelector('[data-f="0"]'), root.querySelector('[data-f="1"]')], pads = [root.querySelector('[data-p="0"]'), root.querySelector('[data-p="1"]')];
    var roundEl = root.querySelector(".s-round"), countEl = root.querySelector(".s-count"), barEl = root.querySelector(".s-bar i"), queueEl = root.querySelector(".s-queue");
    var A = -1, B = -1, p = 0, fighting = false, humanSides = [], raf = 0, last = 0, cpuAcc = [0, 0], cpuRate = [0, 0], tLeft = 0, over = false;
    function nm(i) { return C.players[i].name; }
    function place() {
      var c0 = 50 + p * 36;
      fl[0].style.left = (c0 - 10 - 11) + "%"; fl[1].style.left = (c0 + 10 - 11) + "%";
      barEl.style.width = (50 + p * 50) + "%";
    }
    function setFighters(a, b) {
      A = a; B = b; p = 0;
      [a, b].forEach(function (id, k) {
        fl[k].className = "s-fighter"; fl[k].style.setProperty("--pc", C.col(id));
        fl[k].innerHTML = '<span class="s-name">' + esc(nm(id)) + '</span><div class="fig' + (k ? " flip" : "") + '">' + sumoSvg(C.players[id].slot, C.col(id)) + "</div>";
      });
      humanSides = [];
      if (!C.players[a].cpu) humanSides.push(0);
      if (!C.players[b].cpu) humanSides.push(1);
      var one = humanSides.length === 1;
      pads[0].style.display = pads[1].style.display = "";
      pads[0].className = "s-pad"; pads[1].className = "s-pad";
      pads[0].style.setProperty("--pc", C.col(a)); pads[1].style.setProperty("--pc", C.col(b));
      pads[0].textContent = humanSides.indexOf(0) >= 0 ? (one ? (touch ? "TAP ANYWHERE" : "CLICK or press any key") : (touch ? "TAP HERE" : "Press A")) : "Computer";
      pads[1].textContent = humanSides.indexOf(1) >= 0 ? (one ? (touch ? "TAP ANYWHERE" : "CLICK or press any key") : (touch ? "TAP HERE" : "Press L")) : "Computer";
      if (one) pads[humanSides[0] ? 0 : 1].style.display = "none";
      barEl.parentNode.style.setProperty("--l", C.col(a)); barEl.parentNode.style.setProperty("--r", C.col(b));
      place();
    }
    function tap(side) {
      if (!fighting) return;
      p += side === 0 ? STEP : -STEP; sfx("tap");
      fl[side].classList.remove("hit"); void fl[side].offsetWidth; fl[side].classList.add("hit");
      var pd = pads[side]; pd.classList.add("on"); setTimeout(function () { pd.classList.remove("on"); }, 60);
      place();
    }
    function startBout(a, b, label, done) {
      setFighters(a, b);
      roundEl.textContent = label;
      C.msg(C.who(a) + " vs " + C.who(b));
      var others = [];
      C.players.forEach(function (q, i) { if (i !== a && i !== b) others.push(nm(i)); });
      queueEl.textContent = others.length ? "Watching: " + others.join(", ") : "";
      var steps = ["Ready…", "3", "2", "1", "TAP!"], k = 0;
      countEl.style.display = "block";
      (function go() {
        countEl.textContent = steps[k]; sfx(k === steps.length - 1 ? "go" : "beep");
        if (k === steps.length - 1) {
          fighting = true; tLeft = 30; cpuRate = [RATE * (0.85 + Math.random() * 0.3), RATE * (0.85 + Math.random() * 0.3)];
          C.later(function () { countEl.style.display = "none"; }, 500);
          sumo.dataset.done = "";
          sumo._done = done;
          return;
        }
        k++; C.later(go, k === 1 ? 900 : 700);
      })();
    }
    function endBout(winSide) {
      fighting = false; sfx("ring");
      var w = winSide === 0 ? A : B, l = winSide === 0 ? B : A;
      fl[winSide ? 0 : 1].classList.add("out", winSide === 0 ? "outr" : "outl");
      fl[winSide].classList.add("win");
      C.add(w, 1);
      countEl.style.display = "block"; countEl.textContent = nm(w) + " wins!";
      C.msg(C.who(w) + " pushed " + C.who(l) + " out of the ring!");
      var d = sumo._done;
      C.later(function () { countEl.style.display = "none"; d(w, l); }, 2000);
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!last) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      if (!fighting) return;
      [0, 1].forEach(function (side) {
        var id = side ? B : A;
        if (!C.players[id].cpu) return;
        if (Math.random() < dt * 1.2) cpuRate[side] = RATE * (0.7 + Math.random() * 0.6);
        cpuAcc[side] += cpuRate[side] * dt;
        while (cpuAcc[side] >= 1) { cpuAcc[side] -= 1; tap(side); }
      });
      tLeft -= dt;
      if (p >= 1) { p = 1; place(); endBout(0); }
      else if (p <= -1) { p = -1; place(); endBout(1); }
      else if (tLeft <= 0) { endBout(p > 0 ? 0 : p < 0 ? 1 : Math.floor(Math.random() * 2)); }
    }
    raf = requestAnimationFrame(loop);
    function onPointer(e) {
      if (!fighting || e.button > 0) return;
      if (humanSides.length === 1) { tap(humanSides[0]); return; }
      if (humanSides.length === 2) { var r = root.getBoundingClientRect(); tap(e.clientX < r.left + r.width / 2 ? 0 : 1); }
    }
    function onKey(e) {
      if (!fighting || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (humanSides.length === 1) { if (e.code !== "Tab") { tap(humanSides[0]); e.preventDefault(); } return; }
      if (humanSides.length === 2) { if (e.code === "KeyA") tap(0); else if (e.code === "KeyL") tap(1); }
    }
    root.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    // bracket
    function champion(w) {
      over = true; C.msg(C.who(w) + " wins the sumo tournament!");
      C.later(function () { C.finish([w], "Won the tournament."); }, 900);
    }
    if (n <= 2) {
      startBout(0, 1, "Sumo showdown", function (w) { champion(w); });
    } else if (n === 3) {
      startBout(0, 1, "Match 1", function (w1, l1) {
        startBout(l1, 2, "Challenger match (winner goes to the final)", function (w2) {
          startBout(w1, w2, "Final", function (w) { champion(w); });
        });
      });
    } else {
      startBout(0, 1, "Semi-final 1", function (w1) {
        startBout(2, 3, "Semi-final 2", function (w2) {
          startBout(w1, w2, "Final", function (w) { champion(w); });
        });
      });
    }
    return { destroy: function () { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); } };
  };

  Hub.register({
    "id": "sumo",
    "name": "Sumo Tap",
    "hue": 20,
    "kind": "All at once",
    "mins": 4,
    "rules": "Tap the screen (or click the mouse) as fast as you can to push your opponent out of the ring. With 4 players there are two semi-finals and a final. With 3 players, the winner of match 1 goes to the final and the loser fights the third player for the other final spot. With two humans on one screen, tap the left side or press A for the left fighter and the right side or press L for the right fighter.",
    "desc": "Tap as fast as you can to shove your rival out of the ring.",
    "icon": "<ellipse class=\"st\" cx=\"40\" cy=\"46\" rx=\"32\" ry=\"16\"/><circle class=\"soft\" cx=\"26\" cy=\"38\" r=\"9\"/><circle class=\"st\" cx=\"26\" cy=\"38\" r=\"9\"/><circle class=\"fl\" cx=\"54\" cy=\"38\" r=\"9\"/><path class=\"st\" d=\"M36 24L44 24M40 20V28\"/>",
    "teams": false,
    "diff": "Sets how fast the computer taps: about 3, 5 or 8 taps a second."
  });
})();
