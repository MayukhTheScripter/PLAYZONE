/* Color Rush - a Stroop test: tap the colour the WORD names, ignore the ink. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var COLORS = [
    { n: "RED", c: "#ef3b3b" }, { n: "BLUE", c: "#3b82f6" }, { n: "GREEN", c: "#22c55e" },
    { n: "YELLOW", c: "#facc15" }, { n: "ORANGE", c: "#fb923c" }, { n: "PURPLE", c: "#a855f7" }
  ];

  ENGINES.colorrush = function (C) {
    var SECS = 20, NC = [4, 5, 6][C.lv], FLIP = [3.2, 2.3, 1.6][C.lv] * 1000;
    return Kit.runTurns(C, {
      intro: "A colour word appears in a different ink. Tap the button of the colour the WORD NAMES, not the ink. Right +1, wrong -1. " + SECS + " seconds.",
      cpuScore: function (lv) { return Math.round([11, 16, 21][lv] + Kit.rnd(-2, 2)); },
      play: function (idx, box, done) {
        var cols = COLORS.slice(0, NC), kd = null;
        box.innerHTML = '<div class="cr-top"><span class="cr-t">' + SECS + '</span><span class="cr-c"></span><span class="cr-s">0</span></div>' +
          '<div class="cr-word"><b></b><i></i></div><div class="cr-btns cr-n' + NC + '"></div>';
        var tEl = box.querySelector(".cr-t"), cEl = box.querySelector(".cr-c"), sEl = box.querySelector(".cr-s"), wEl = box.querySelector(".cr-word"), wb = wEl.querySelector("b"), wi = wEl.querySelector("i"), bt = box.querySelector(".cr-btns");
        var score = 0, combo = 0, left = SECS, over = false, cur = null, flipT = 0, timers = [];
        cols.forEach(function (c, i) {
          var b = document.createElement("button"); b.type = "button"; b.className = "cr-btn"; b.style.background = c.c; b.setAttribute("data-i", i);
          b.setAttribute("aria-label", c.n.toLowerCase()); b.innerHTML = '<span class="cr-k">' + (i + 1) + '</span>';
          bt.appendChild(b);
        });
        function next() {
          clearTimeout(flipT);
          var w = Kit.pick(cols), ink;
          do { ink = Kit.pick(cols); } while (ink === w);
          if (Math.random() < 0.1) ink = w;
          cur = { word: w, ink: ink };
          wb.textContent = w.n; wb.style.color = ink.c;
          wEl.classList.remove("pop"); void wEl.offsetWidth; wEl.classList.add("pop");
          flipT = setTimeout(function () { if (over) return; combo = 0; showC(); sfx("bad"); flash("bad"); next(); }, FLIP);
        }
        function showC() { cEl.textContent = combo >= 2 ? "Combo x" + combo : ""; }
        function flash(k) { wi.className = k; wi.textContent = k === "ok" ? "✔" : "✘"; clearTimeout(kd); kd = setTimeout(function () { wi.textContent = ""; }, 350); }
        function answer(i) {
          if (over || !cur) return;
          if (cols[i] === cur.word) { combo++; score += 1; sfx(combo >= 5 ? "score" : "good"); flash("ok"); }
          else { combo = 0; score = Math.max(0, score - 1); sfx("bad"); flash("bad"); }
          sEl.textContent = score; showC(); next();
        }
        function pd(e) { var b = e.target.closest(".cr-btn"); if (!b) return; e.preventDefault(); answer(+b.getAttribute("data-i")); }
        bt.addEventListener("pointerdown", pd);
        var map = { KeyR: "RED", KeyB: "BLUE", KeyG: "GREEN", KeyY: "YELLOW", KeyO: "ORANGE", KeyP: "PURPLE" };
        var keys = Kit.keys(function (code) {
          var m = /^(Digit|Numpad)([1-6])$/.exec(code);
          if (m && +m[2] <= NC) return answer(+m[2] - 1);
          if (map[code]) for (var i = 0; i < cols.length; i++) if (cols[i].n === map[code]) answer(i);
        });
        var iv = setInterval(function () {
          left--; tEl.textContent = left;
          if (left <= 0) { over = true; clearInterval(iv); clearTimeout(flipT); sfx("go"); done(score, "Colours matched."); }
        }, 1000);
        next();
        return function () { over = true; clearInterval(iv); clearTimeout(flipT); clearTimeout(kd); keys.destroy(); bt.removeEventListener("pointerdown", pd); };
      }
    });
  };

  Hub.register({
    "id": "colorrush",
    "name": "Color Rush",
    "hue": 300,
    "kind": "Turns",
    "mins": 3,
    "rules": "Each player takes a 20-second turn. A colour word is shown in a different ink colour. Tap the button of the colour the word NAMES, not the colour it is printed in. Right answers score 1 point, wrong ones lose 1 (never below 0). A word you leave too long changes by itself and breaks your combo. Most points wins.",
    "desc": "Read the word, ignore the ink.",
    "icon": "<circle class=\"st\" cx=\"28\" cy=\"34\" r=\"14\"/><circle class=\"fl\" cx=\"52\" cy=\"34\" r=\"14\"/><circle class=\"soft\" cx=\"40\" cy=\"54\" r=\"14\"/>",
    "teams": false,
    "diff": "Easy: 4 colours, slow words. Medium: 5 colours, faster. Hard: 6 colours and words change quickly."
  });
})();
