/* Color Match - tap the colour of each falling blob before it lands. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var LW = 360, LH = 380, LINE = 340, SECS = 40;
  var COLS = [["#ff4d6d", "Red"], ["#3b9bff", "Blue"], ["#38d96f", "Green"], ["#ffd23f", "Yellow"]];

  ENGINES.cmatch = function (C) {
    var lv = C.lv, K = lv === 0 ? 3 : 4, SP0 = [95, 120, 150][lv], GAPT = [1.15, 0.95, 0.8][lv];
    return Kit.runTurns(C, {
      intro: "Colour blobs fall. Tap the button with the same colour (or press 1-" + K + ") before a blob reaches the bottom. A wrong tap or a miss costs a life. " + SECS + " seconds, 3 lives.",
      cpuScore: function (l) { return Math.round([14, 24, 36][l] + Kit.rnd(-4, 5)); },
      sub: "Most blobs matched",
      play: function (idx, box, done) {
        var view = Kit.tall(box, LW, LH), g = view.g, blobs = [], score = 0, combo = 0, lives = 3, left = SECS, spawn = 0.4, over = false, stopLoop, elapsed = 0, fx = [], bar = document.createElement("div");
        bar.className = "cm-bar";
        for (var i = 0; i < K; i++) { var b = document.createElement("button"); b.type = "button"; b.className = "cm-btn"; b.style.background = COLS[i][0]; b.setAttribute("data-c", i); b.innerHTML = "<span>" + (i + 1) + "</span>"; bar.appendChild(b); }
        box.appendChild(bar);
        function press(c) {
          if (over) return; var t = null; blobs.forEach(function (b) { if (!t || b.y > t.y) t = b; });
          if (!t) return;
          if (t.c === c) { blobs.splice(blobs.indexOf(t), 1); combo++; score += combo >= 10 ? 3 : combo >= 5 ? 2 : 1; sfx("score"); fx.push({ x: t.x, y: t.y, c: COLS[c][0], t: 0.4, ok: true }); }
          else { miss(t, true); }
        }
        function miss(t, wrong) {
          if (t) blobs.splice(blobs.indexOf(t), 1); combo = 0; lives--; sfx("bad"); fx.push({ x: t ? t.x : LW / 2, y: t ? t.y : LINE, c: "#fff", t: 0.4, ok: false });
          if (lives <= 0) finish("Out of lives.");
        }
        bar.addEventListener("pointerdown", function (e) { var b = e.target.closest(".cm-btn"); if (b) { e.preventDefault(); press(+b.getAttribute("data-c")); } });
        var keys = Kit.keys(function (c) { var m = /^(Digit|Numpad)([1-4])$/.exec(c); if (m && +m[2] <= K) press(+m[2] - 1); else { var k = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3 }[c]; if (k != null && k < K) press(k); } });
        function finish(t) { if (over) return; over = true; stopLoop && stopLoop(); draw(); done(score, t); }
        function draw() {
          view.begin("#0d1424");
          g.fillStyle = "#e8f1ff"; g.font = "700 17px sans-serif"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText("Score " + score, 10, 18); g.textAlign = "center"; g.fillText(Math.ceil(left) + " s" + (combo >= 3 ? "  ·  🔥 x" + combo : ""), LW / 2, 18); g.textAlign = "right"; g.fillText("❤️".repeat(Math.max(0, lives)), LW - 10, 18);
          g.strokeStyle = "#ffffff44"; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(0, LINE); g.lineTo(LW, LINE); g.stroke(); g.setLineDash([]);
          var low = null; blobs.forEach(function (b) { if (!low || b.y > low.y) low = b; });
          blobs.forEach(function (b) { g.fillStyle = COLS[b.c][0]; g.beginPath(); g.arc(b.x, b.y, 24, 0, 7); g.fill(); g.fillStyle = "#ffffff55"; g.beginPath(); g.arc(b.x - 7, b.y - 8, 7, 0, 7); g.fill(); if (b === low) { g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, 28, 0, 7); g.stroke(); } });
          fx.forEach(function (f) { g.globalAlpha = f.t * 2.2; g.strokeStyle = f.ok ? f.c : "#ff3b3b"; g.lineWidth = 4; g.beginPath(); g.arc(f.x, f.y, 24 + (0.4 - f.t) * 90, 0, 7); g.stroke(); }); g.globalAlpha = 1;
          view.end();
        }
        stopLoop = Kit.loop(function (dt) {
          if (over) return; left -= dt; elapsed += dt; spawn -= dt;
          if (left <= 0) { left = 0; return finish("Time up!"); }
          var sp = SP0 + elapsed * 2.4;
          if (spawn <= 0) { blobs.push({ x: Kit.rnd(40, LW - 40), y: -24, c: Kit.ri(0, K - 1) }); spawn = Math.max(0.42, GAPT - elapsed * 0.012) * Kit.rnd(0.85, 1.2); }
          for (var i = blobs.length - 1; i >= 0; i--) { blobs[i].y += sp * dt; if (blobs[i].y > LINE) { miss(blobs[i], false); if (over) return; } }
          fx.forEach(function (f) { f.t -= dt; }); fx = fx.filter(function (f) { return f.t > 0; });
          draw();
        });
        return function () { over = true; stopLoop && stopLoop(); keys.destroy(); view.destroy(); };
      }
    });
  };
  Hub.register({
    "id": "cmatch", "name": "Color Match", "hue": 330, "kind": "Turns", "mins": 4,
    "rules": "Coloured blobs fall from the top. Tap the button with the same colour as the lowest blob (or press 1-4). A wrong tap or a blob reaching the line costs a life. Keep a streak for bonus points. You have 40 seconds and three lives. The most points wins.",
    "desc": "Match the falling colours fast.",
    "icon": "<circle class=\"fl\" cx=\"26\" cy=\"28\" r=\"11\"/><circle class=\"st\" cx=\"52\" cy=\"28\" r=\"11\"/><circle class=\"st\" cx=\"26\" cy=\"56\" r=\"11\"/><circle class=\"fl\" cx=\"52\" cy=\"56\" r=\"11\"/>",
    "teams": false,
    "diff": "Easy: 3 colours, slow. Medium: 4 colours. Hard: 4 colours, fast and frequent."
  });
})();
