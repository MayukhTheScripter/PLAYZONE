/* Jump Higher - bounce up as far as you can. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var LW = 360, LH = 560, PWd = 66;

  ENGINES.jump = function (C) {
    var lv = C.lv;
    return Kit.runTurns(C, {
      intro: "Steer left and right (drag, or arrow keys / A D). You bounce on every platform. Springs launch you high. Do not fall off the bottom!",
      cpuScore: function (l) { return Math.max(20, Math.round([55, 110, 190][l] + Kit.rnd(-20, 30))); },
      fmt: function (s) { return s + " m" }, sub: "Highest climb",
      play: function (idx, box, done) {
        var view = Kit.tall(box, LW, LH), g = view.g, p = { x: LW / 2, y: 470, vx: 0, vy: -700 }, cam = 0, best = 0, plats = [], over = false, target = LW / 2, usingPtr = false, stopLoop, t = 0, parts = [];
        function addPlat(y) {
          var r = Math.random(), type = "n";
          if (lv >= 1 && r < 0.18) type = "m"; if (r > 0.88 - lv * 0.06) type = "c";
          var pl = { x: Kit.rnd(0, LW - PWd), y: y, type: type, dx: Kit.rnd(40, 80) * (Math.random() < 0.5 ? -1 : 1), gone: false, spring: type === "n" && Math.random() < 0.08 };
          plats.push(pl);
        }
        plats.push({ x: LW / 2 - 50, y: 520, type: "n", dx: 0, gone: false, w: 100 });
        for (var y = 440; y > -200; y -= 62 + lv * 8) addPlat(y);
        var topY = y;
        var keys = Kit.keys();
        function pm(e) { var l = view.toLogical(e.clientX, e.clientY); target = l.x; usingPtr = true; }
        view.cv.style.touchAction = "none"; view.cv.addEventListener("pointermove", pm); view.cv.addEventListener("pointerdown", pm);
        function end() { over = true; sfx("lose"); stopLoop && stopLoop(); done(best, "You climbed " + best + " m."); }
        function draw() {
          view.begin("#10203a");
          var gr = g.createLinearGradient(0, 0, 0, LH); gr.addColorStop(0, "#1b2f5e"); gr.addColorStop(1, "#7a5aa8"); g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
          g.fillStyle = "#ffffff55"; for (var i = 0; i < 24; i++) g.fillRect((i * 97) % LW, ((i * 53 + cam * 0.2) % LH + LH) % LH, 2, 2);
          plats.forEach(function (pl) {
            if (pl.gone) return; var sy = pl.y - cam, w = pl.w || PWd; if (sy < -20 || sy > LH + 20) return;
            g.fillStyle = pl.type === "c" ? "#b9854e" : pl.type === "m" ? "#58a6ff" : "#5fd38a"; g.beginPath(); g.roundRect ? g.roundRect(pl.x, sy, w, 12, 6) : g.rect(pl.x, sy, w, 12); g.fill();
            if (pl.spring) { g.fillStyle = "#ffd33d"; g.fillRect(pl.x + w / 2 - 7, sy - 8, 14, 8); }
          });
          g.font = "34px serif"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillText("🦘", p.x, p.y - cam + 2);
          g.fillStyle = "#fff"; g.font = "700 20px sans-serif"; g.textAlign = "left"; g.fillText(best + " m", 12, 28);
          view.end();
        }
        stopLoop = Kit.loop(function (dt) {
          if (over) return; t += dt;
          var ax = 0; if (keys.down.ArrowLeft || keys.down.KeyA) { ax = -1; usingPtr = false; } if (keys.down.ArrowRight || keys.down.KeyD) { ax = 1; usingPtr = false; }
          if (usingPtr) p.vx = Kit.clamp((target - p.x) * 9, -430, 430); else p.vx = ax * 330;
          p.x += p.vx * dt; if (p.x < -10) p.x = LW + 10; if (p.x > LW + 10) p.x = -10;
          var oy = p.y; p.vy += 1500 * dt; p.y += p.vy * dt;
          plats.forEach(function (pl) {
            if (pl.gone) return; if (pl.type === "m") { pl.x += pl.dx * dt; if (pl.x < 0 || pl.x > LW - PWd) pl.dx *= -1; }
            var w = pl.w || PWd;
            if (p.vy > 0 && oy <= pl.y + 2 && p.y >= pl.y && p.x > pl.x - 8 && p.x < pl.x + w + 8) {
              if (pl.type === "c") { pl.gone = true; sfx("tick"); return; }
              p.vy = pl.spring ? -1120 : -720; sfx(pl.spring ? "whoosh" : "bounce");
            }
          });
          if (p.y - cam < 240) cam = p.y - 240;
          best = Math.max(best, Math.round((470 - p.y) / 10));
          while (topY > cam - 60) { topY -= 62 + lv * 8 + Math.random() * 14 + Math.min(20, best / 25); addPlat(topY); }
          plats = plats.filter(function (pl) { return pl.y - cam < LH + 60; });
          if (p.y - cam > LH + 30) return end();
          draw();
        });
        return function () { over = true; stopLoop && stopLoop(); keys.destroy(); view.destroy(); };
      }
    });
  };
  Hub.register({
    "id": "jump", "name": "Jump Higher", "hue": 270, "kind": "Turns", "mins": 3,
    "rules": "Each player takes a climb. You bounce automatically: steer left and right (drag on the screen or use the arrow keys / A D) to land on platforms. Blue platforms move, brown ones crumble, yellow springs launch you. Fall off the bottom and your run is over. The highest climb wins.",
    "desc": "Bounce up through the sky.",
    "icon": "<path class=\"st\" d=\"M14 66h22M44 48h22M22 30h22\"/><path class=\"soft\" d=\"M40 64V36\"/><circle class=\"fl\" cx=\"34\" cy=\"20\" r=\"4\"/>",
    "teams": false,
    "diff": "Easy: wide gaps are close together. Medium: moving platforms. Hard: more crumbling platforms and tougher gaps."
  });
})();
