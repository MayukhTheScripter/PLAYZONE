/* Brick Breaker - smash the bricks, three lives. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var LW = 360, LH = 560, COLS = 8, BW = 40, BH = 18, GAP = 4, X0 = (LW - COLS * (BW + GAP) + GAP) / 2, Y0 = 70, PY = 520, COLORS = ["#ff5d73", "#ff9f43", "#ffd93d", "#4cd97b", "#4aa3ff", "#b07cff"];

  ENGINES.brick = function (C) {
    var lv = C.lv, SP0 = [300, 340, 385][lv];
    return Kit.runTurns(C, {
      intro: "Drag (or use the arrow keys) to move the paddle. Tap or press Space to launch the ball. Break all the bricks. Catch power-ups for help. Three lives.",
      cpuScore: function (l) { return Math.round([260, 480, 760][l] + Kit.rnd(-70, 90)); },
      sub: "Highest score",
      play: function (idx, box, done) {
        var view = Kit.tall(box, LW, LH), g = view.g, over = false, stopLoop, level = 1, score = 0, lives = 3, pad = { x: LW / 2, w: 72 }, ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7, on: true }, bricks = [], drops = [], slow = 0, wide = 0, target = LW / 2, parts = [];
        function layout() {
          bricks = []; var rows = Math.min(6, 4 + Math.floor(level / 2));
          for (var r = 0; r < rows; r++) for (var c = 0; c < COLS; c++) { if (level % 2 === 0 && (r + c) % 5 === 4) continue; bricks.push({ x: X0 + c * (BW + GAP), y: Y0 + r * (BH + GAP), hp: (lv >= 1 && r < 1 + lv) || level > 3 && r === 0 ? 2 : 1, col: COLORS[r % 6] }); }
        }
        layout();
        function speed() { return SP0 + (level - 1) * 28; }
        function stick() { ball.on = true; ball.x = pad.x; ball.y = PY - 10; ball.vx = ball.vy = 0; }
        stick();
        function launch() { if (!ball.on) return; ball.on = false; var a = -Math.PI / 2 + Kit.rnd(-0.35, 0.35); ball.vx = Math.cos(a) * speed(); ball.vy = Math.sin(a) * speed(); sfx("whoosh"); }
        var keys = Kit.keys(function (c) { if (c === "Space" || c === "ArrowUp") launch(); });
        view.cv.style.touchAction = "none";
        view.cv.addEventListener("pointermove", function (e) { target = view.toLogical(e.clientX, e.clientY).x; });
        view.cv.addEventListener("pointerdown", function (e) { target = view.toLogical(e.clientX, e.clientY).x; launch(); });
        function lose() {
          lives--; sfx("bad"); wide = slow = 0; pad.w = 72; if (lives <= 0) { over = true; stopLoop && stopLoop(); draw(); done(score, "Out of lives."); return; } stick();
        }
        function spark(x, y, c) { for (var i = 0; i < 6; i++) parts.push({ x: x, y: y, vx: Kit.rnd(-90, 90), vy: Kit.rnd(-90, 90), t: 0.4, c: c }); }
        function update(dt) {
          var ax = (keys.down.ArrowLeft || keys.down.KeyA ? -1 : 0) + (keys.down.ArrowRight || keys.down.KeyD ? 1 : 0);
          if (ax) target = pad.x + ax * 400 * dt * 3; pad.x += (Kit.clamp(target, pad.w / 2, LW - pad.w / 2) - pad.x) * Math.min(1, dt * 18);
          pad.x = Kit.clamp(pad.x, pad.w / 2, LW - pad.w / 2);
          if (wide > 0) { wide -= dt; if (wide <= 0) pad.w = 72; } if (slow > 0) slow -= dt;
          if (ball.on) { ball.x = pad.x; ball.y = PY - 10; } else {
            var k = slow > 0 ? 0.62 : 1, steps = 3;
            for (var s = 0; s < steps; s++) {
              ball.x += ball.vx * k * dt / steps; ball.y += ball.vy * k * dt / steps;
              if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); sfx("tick"); } if (ball.x > LW - ball.r) { ball.x = LW - ball.r; ball.vx = -Math.abs(ball.vx); sfx("tick"); } if (ball.y < ball.r + 36) { ball.y = ball.r + 36; ball.vy = Math.abs(ball.vy); sfx("tick"); }
              if (ball.vy > 0 && ball.y + ball.r >= PY && ball.y - ball.r <= PY + 12 && ball.x > pad.x - pad.w / 2 - 4 && ball.x < pad.x + pad.w / 2 + 4) {
                var rel = Kit.clamp((ball.x - pad.x) / (pad.w / 2), -1, 1), a = -Math.PI / 2 + rel * 1.05, sp = speed(); ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.y = PY - ball.r; sfx("bounce");
              }
              for (var i = 0; i < bricks.length; i++) {
                var b = bricks[i];
                if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + BW && ball.y + ball.r > b.y && ball.y - ball.r < b.y + BH) {
                  var ox = Math.min(ball.x + ball.r - b.x, b.x + BW - (ball.x - ball.r)), oy = Math.min(ball.y + ball.r - b.y, b.y + BH - (ball.y - ball.r));
                  if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
                  b.hp--; spark(ball.x, ball.y, b.col);
                  if (b.hp <= 0) { bricks.splice(i, 1); score += 10 * level; sfx("hit"); if (Math.random() < 0.13) drops.push({ x: b.x + BW / 2, y: b.y, k: Kit.pick(["w", "s", "l"]) }); } else sfx("tick");
                  break;
                }
              }
              var sp2 = Math.hypot(ball.vx, ball.vy), want = speed() ; if (Math.abs(ball.vy) < want * 0.3) { ball.vy = (ball.vy < 0 ? -1 : 1) * want * 0.3; }
              sp2 = Math.hypot(ball.vx, ball.vy); ball.vx *= want / sp2; ball.vy *= want / sp2;
              if (ball.y > LH + 20) { lose(); return; }
            }
          }
          drops.forEach(function (d) { d.y += 120 * dt; if (d.y > PY - 4 && d.y < PY + 16 && Math.abs(d.x - pad.x) < pad.w / 2 + 8) { d.dead = true; sfx("good"); if (d.k === "w") { pad.w = 110; wide = 12; } else if (d.k === "s") slow = 8; else lives = Math.min(5, lives + 1); } if (d.y > LH) d.dead = true; });
          drops = drops.filter(function (d) { return !d.dead; });
          parts.forEach(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; }); parts = parts.filter(function (q) { return q.t > 0; });
          if (!bricks.length) { level++; score += 100; sfx("win"); layout(); stick(); }
        }
        function draw() {
          view.begin("#0c1226");
          g.fillStyle = "#e8f1ff"; g.font = "700 17px sans-serif"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText("Score " + score, 10, 18); g.textAlign = "center"; g.fillText("Level " + level, LW / 2, 18); g.textAlign = "right"; g.fillText("❤️".repeat(lives), LW - 10, 18);
          bricks.forEach(function (b) { g.fillStyle = b.col; g.fillRect(b.x, b.y, BW, BH); if (b.hp > 1) { g.fillStyle = "#ffffff55"; g.fillRect(b.x, b.y, BW, 4); g.strokeStyle = "#fff"; g.lineWidth = 2; g.strokeRect(b.x + 1, b.y + 1, BW - 2, BH - 2); } });
          drops.forEach(function (d) { g.font = "20px serif"; g.textAlign = "center"; g.fillText(d.k === "w" ? "↔️" : d.k === "s" ? "🐌" : "❤️", d.x, d.y); });
          g.fillStyle = "#6fd0ff"; g.beginPath(); g.roundRect ? g.roundRect(pad.x - pad.w / 2, PY, pad.w, 12, 6) : g.rect(pad.x - pad.w / 2, PY, pad.w, 12); g.fill();
          g.fillStyle = "#fff"; g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, 7); g.fill();
          parts.forEach(function (q) { g.fillStyle = q.c; g.globalAlpha = Math.max(0, q.t * 2); g.fillRect(q.x, q.y, 3, 3); }); g.globalAlpha = 1;
          if (ball.on) { g.fillStyle = "#ffffffcc"; g.font = "700 16px sans-serif"; g.textAlign = "center"; g.fillText("Tap to launch", LW / 2, 360); }
          view.end();
        }
        stopLoop = Kit.loop(function (dt) { if (over) return; update(dt); draw(); });
        return function () { over = true; stopLoop && stopLoop(); keys.destroy(); view.destroy(); };
      }
    });
  };
  Hub.register({
    "id": "brick", "name": "Brick Breaker", "hue": 190, "kind": "Turns", "mins": 5,
    "rules": "Each player plays one game with three lives. Move the paddle (drag or arrow keys), tap or press Space to launch the ball and break every brick. Silver-edged bricks take two hits. Power-ups: ↔️ wide paddle, 🐌 slow ball, ❤️ extra life. Clear the board to go to the next, faster level. Highest score wins.",
    "desc": "Break every brick without losing the ball.",
    "icon": "<rect class=\"st\" x=\"12\" y=\"16\" width=\"22\" height=\"10\"/><rect class=\"st\" x=\"38\" y=\"16\" width=\"22\" height=\"10\"/><rect class=\"st\" x=\"25\" y=\"30\" width=\"22\" height=\"10\"/><circle class=\"fl\" cx=\"40\" cy=\"54\" r=\"4\"/><path class=\"st\" d=\"M26 68h28\"/>",
    "teams": false,
    "diff": "Easy: slow ball, mostly single-hit bricks. Medium: faster, some two-hit bricks. Hard: fast ball, more two-hit bricks."
  });
})();
