/* Pacman - eat every dot, outwit the ghosts. Everybody takes a run (3 lives). */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var MAZE = [
    "###################", "#........#........#", "#o##.###.#.###.##o#", "#.................#", "#.##.#.#####.#.##.#", "#....#...#...#....#", "####.### # ###.####",
    "   #.#       #.#   ", "####.# ##-## #.####", "    .  #   #  .    ", "####.# ##### #.####", "   #.#       #.#   ", "####.# ##### #.####", "#........#........#",
    "#.##.###.#.###.##.#", "#o.#.....P.....#.o#", "##.#.#.#####.#.#.##", "#....#...#...#....#", "#.######.#.######.#", "#.................#", "###################"
  ];
  var W = 19, H = 21, T = 18, TOP = 30, LW = W * T, LH = TOP + H * T;
  var DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  var GCOL = ["#ff4d4d", "#ffa6d8", "#4de3ff", "#ffb347"];

  ENGINES.pacman = function (C) {
    var lv = C.lv, NG = lv === 2 ? 4 : 3, FRIGHT = [7, 5.5, 4][lv], GSP = [3.9, 4.5, 5.2][lv];
    return Kit.runTurns(C, {
      intro: "Swipe, use the arrow keys / WASD or the on-screen pad to guide Chomper. Eat every dot. Power pellets let you eat the ghosts. You have 3 lives.",
      cpuScore: function (l) { return Math.round(([700, 1500, 2600][l] + Kit.rnd(-250, 350)) / 10) * 10; },
      sub: "Highest score",
      play: function (idx, box, done) {
        var view = Kit.tall(box, LW, LH), g = view.g, over = false, stopLoop, level = 1, score = 0, lives = 3, grid, dotsLeft, eatenDots, combo, freeze = 0, t = 0, fruit = null, fruitAt = 0, msgT = 0, speedMul = 1;
        var pac, ghosts, qdir = { x: 0, y: 0 };
        function pass(x, y, gm) { x = (x + W) % W; if (y < 0 || y >= H) return false; var c = grid[y][x]; if (c === "#") return false; if (c === "-") return gm; return true; }
        function reset(all) {
          if (all) { grid = MAZE.map(function (r) { return r.split(""); }); dotsLeft = 0; eatenDots = 0; grid.forEach(function (r) { r.forEach(function (c) { if (c === "." || c === "o") dotsLeft++; }); }); fruit = null; fruitAt = 0; }
          pac = { tx: 9, ty: 15, dx: 0, dy: 0, p: 0, mouth: 0 }; qdir = { x: 0, y: 0 };
          ghosts = [];
          for (var i = 0; i < NG; i++) ghosts.push({ i: i, tx: i === 0 ? 9 : 8 + (i % 3), ty: i === 0 ? 7 : 9, dx: i === 0 ? -1 : 0, dy: 0, p: 0, st: i === 0 ? "chase" : "house", timer: i === 0 ? 0 : 2.2 * i * (1 - lv * 0.15), fr: 0 });
          freeze = 1.2; combo = 0;
        }
        reset(true);
        function sp(e) { return pacSp(); }
        function pacSp() { return (5.2 + lv * 0.35) * speedMul; }
        function setDirKey(x, y) { qdir = { x: x, y: y }; }
        var keys = Kit.keys(function (c) { if (c === "ArrowUp" || c === "KeyW") setDirKey(0, -1); else if (c === "ArrowDown" || c === "KeyS") setDirKey(0, 1); else if (c === "ArrowLeft" || c === "KeyA") setDirKey(-1, 0); else if (c === "ArrowRight" || c === "KeyD") setDirKey(1, 0); });
        var sx = 0, sy = 0, sw = false;
        view.cv.style.touchAction = "none";
        view.cv.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; sw = true; });
        view.cv.addEventListener("pointermove", function (e) { if (!sw) return; var dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 18 || Math.abs(dy) > 18) { if (Math.abs(dx) > Math.abs(dy)) setDirKey(dx > 0 ? 1 : -1, 0); else setDirKey(0, dy > 0 ? 1 : -1); sx = e.clientX; sy = e.clientY; } });
        function pu() { sw = false; } window.addEventListener("pointerup", pu);
        var pad = document.createElement("div"); pad.className = "pm-pad";
        pad.innerHTML = '<button type="button" data-d="0,-1" aria-label="Up">▲</button><button type="button" data-d="-1,0" aria-label="Left">◀</button><button type="button" data-d="1,0" aria-label="Right">▶</button><button type="button" data-d="0,1" aria-label="Down">▼</button>';
        pad.addEventListener("pointerdown", function (e) { var b = e.target.closest("button"); if (!b) return; e.preventDefault(); var d = b.getAttribute("data-d").split(","); setDirKey(+d[0], +d[1]); });
        box.appendChild(pad);

        function advance(e, dist, chooser) {
          e.p += dist;
          var guard = 0;
          while (e.p >= 1 && guard++ < 3) {
            e.tx = (e.tx + e.dx + W) % W; e.ty += e.dy; e.p -= 1; chooser(e);
            if (e.dx === 0 && e.dy === 0) { e.p = 0; break; }
          }
        }
        function pacChoose(e) {
          var c = grid[e.ty][e.tx];
          if (c === ".") { grid[e.ty][e.tx] = " "; score += 10; dotsLeft--; eatenDots++; sfx("tick"); } else if (c === "o") { grid[e.ty][e.tx] = " "; score += 50; dotsLeft--; eatenDots++; sfx("good"); combo = 0; ghosts.forEach(function (gh) { if (gh.st === "chase" || gh.st === "fright") { gh.st = "fright"; gh.fr = FRIGHT; gh.dx *= -1; gh.dy *= -1; } }); }
          if ((eatenDots === 60 || eatenDots === 120) && !fruit) { fruit = { t: 9 }; }
          if (fruit && e.tx === 9 && e.ty === 11) { score += 100 * level; fruit = null; sfx("score"); }
          if ((qdir.x || qdir.y) && pass(e.tx + qdir.x, e.ty + qdir.y, false)) { e.dx = qdir.x; e.dy = qdir.y; }
          else if (!pass(e.tx + e.dx, e.ty + e.dy, false)) { e.dx = 0; e.dy = 0; }
        }
        function ghostTarget(gh) {
          if (gh.st === "exit") return { x: 9, y: 7 };
          if (gh.st === "eaten") return { x: 9, y: 9 };
          if (gh.i === 0) return { x: pac.tx, y: pac.ty };
          if (gh.i === 1) return { x: pac.tx + pac.dx * 4, y: pac.ty + pac.dy * 4 };
          if (gh.i === 2) return Math.hypot(gh.tx - pac.tx, gh.ty - pac.ty) > 7 ? { x: pac.tx, y: pac.ty } : { x: 1, y: 19 };
          return { x: Kit.ri(0, W - 1), y: Kit.ri(0, H - 1) };
        }
        function ghostChoose(gh) {
          if (gh.st === "exit" && gh.tx === 9 && gh.ty === 7) gh.st = "chase";
          if (gh.st === "eaten" && gh.tx === 9 && gh.ty === 9) { gh.st = "house"; gh.timer = 1; gh.dx = gh.dy = 0; return; }
          var gm = gh.st === "exit" || gh.st === "eaten", opts = [];
          DIRS.forEach(function (d) { if (!(d.x === -gh.dx && d.y === -gh.dy && (gh.dx || gh.dy)) && pass(gh.tx + d.x, gh.ty + d.y, gm)) opts.push(d); });
          if (!opts.length) opts = DIRS.filter(function (d) { return pass(gh.tx + d.x, gh.ty + d.y, gm); });
          var pick;
          if (gh.st === "fright" || (gh.st === "chase" && lv === 0 && Math.random() < 0.3)) pick = Kit.pick(opts);
          else { var tg = ghostTarget(gh), best = 1e9; opts.forEach(function (d) { var dd = Math.pow(gh.tx + d.x - tg.x, 2) + Math.pow(gh.ty + d.y - tg.y, 2); if (dd < best) { best = dd; pick = d; } }); }
          gh.dx = pick.x; gh.dy = pick.y;
        }
        function loseLife() { lives--; sfx("lose"); if (lives <= 0) { over = true; stopLoop && stopLoop(); draw(); done(score, "Caught by the ghosts."); return; } reset(false); }
        function update(dt) {
          t += dt; if (msgT > 0) msgT -= dt;
          if (freeze > 0) { freeze -= dt; return; }
          // pacman
          if ((qdir.x || qdir.y) && !pac.dx && !pac.dy && pass(pac.tx + qdir.x, pac.ty + qdir.y, false)) { pac.dx = qdir.x; pac.dy = qdir.y; }
          if ((pac.dx || pac.dy) && qdir.x === -pac.dx && qdir.y === -pac.dy && (qdir.x || qdir.y)) { pac.tx = (pac.tx + pac.dx + W) % W; pac.ty += pac.dy; pac.dx = qdir.x; pac.dy = qdir.y; pac.p = 1 - pac.p; if (pac.p >= 1) pac.p = 0.999; }
          if (pac.dx || pac.dy) { advance(pac, pacSp() * dt, pacChoose); pac.mouth += dt * 12; }
          // ghosts
          ghosts.forEach(function (gh) {
            if (gh.st === "house") { gh.timer -= dt; if (gh.timer <= 0) { gh.st = "exit"; gh.dx = gh.dy = 0; ghostChoose(gh); } return; }
            if (gh.st === "fright") { gh.fr -= dt; if (gh.fr <= 0) gh.st = "chase"; }
            var spd = GSP * speedMul * (gh.st === "fright" ? 0.55 : gh.st === "eaten" ? 2.4 : 1);
            if (!gh.dx && !gh.dy) ghostChoose(gh);
            if (gh.dx || gh.dy) advance(gh, spd * dt, ghostChoose);
          });
          if (fruit) { fruit.t -= dt; if (fruit.t <= 0) fruit = null; }
          // collisions
          var px = pac.tx + pac.dx * pac.p, py = pac.ty + pac.dy * pac.p;
          for (var i = 0; i < ghosts.length; i++) {
            var gh = ghosts[i]; if (gh.st === "house" || gh.st === "eaten") continue;
            var gx = gh.tx + gh.dx * gh.p, gy = gh.ty + gh.dy * gh.p, dx = Math.abs(gx - px); if (dx > W / 2) dx = W - dx;
            if (Math.hypot(dx, gy - py) < 0.6) {
              if (gh.st === "fright") { gh.st = "eaten"; combo++; score += 100 * Math.pow(2, combo); sfx("capture"); }
              else { loseLife(); return; }
            }
          }
          if (dotsLeft <= 0) { level++; speedMul = Math.min(1.5, speedMul * 1.07); score += 200; sfx("win"); reset(true); msgT = 1.5; }
        }
        function draw() {
          view.begin("#050816");
          g.fillStyle = "#e8f1ff"; g.font = "700 16px sans-serif"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText("Score " + score, 8, 15); g.textAlign = "center"; g.fillText("Level " + level, LW / 2, 15); g.textAlign = "right"; g.fillText("🟡".repeat(Math.max(0, lives)), LW - 8, 15);
          g.save(); g.translate(0, TOP);
          for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
            var c = grid[y][x];
            if (c === "#") { g.fillStyle = "#1731c8"; g.beginPath(); g.roundRect ? g.roundRect(x * T + 2, y * T + 2, T - 4, T - 4, 5) : g.rect(x * T + 2, y * T + 2, T - 4, T - 4); g.fill(); g.fillStyle = "#050816"; g.fillRect(x * T + 5, y * T + 5, T - 10, T - 10); }
            else if (c === "-") { g.fillStyle = "#ffb3e6"; g.fillRect(x * T, y * T + T / 2 - 2, T, 4); }
            else if (c === ".") { g.fillStyle = "#ffe9b0"; g.fillRect(x * T + T / 2 - 1.5, y * T + T / 2 - 1.5, 3, 3); }
            else if (c === "o") { g.fillStyle = "#ffe9b0"; g.beginPath(); g.arc(x * T + T / 2, y * T + T / 2, 5 + Math.sin(t * 8) * 1, 0, 7); g.fill(); }
          }
          if (fruit) { g.font = "16px serif"; g.textAlign = "center"; g.fillText("🍒", 9 * T + T / 2, 11 * T + T / 2); }
          var px = (pac.tx + pac.dx * pac.p) * T + T / 2, py = (pac.ty + pac.dy * pac.p) * T + T / 2, ang = Math.atan2(pac.dy || 0, pac.dx || 1) * (pac.dx || pac.dy ? 1 : 0), m = (Math.sin(pac.mouth) * 0.5 + 0.5) * 0.7 + 0.05;
          g.fillStyle = "#ffd400"; g.beginPath(); g.moveTo(px, py); g.arc(px, py, T / 2 - 1, ang + m, ang + Math.PI * 2 - m); g.closePath(); g.fill();
          ghosts.forEach(function (gh) {
            var x = (gh.tx + gh.dx * gh.p) * T + T / 2, y = (gh.ty + gh.dy * gh.p) * T + T / 2 + (gh.st === "house" ? Math.sin(t * 6 + gh.i) * 2 : 0), r = T / 2 - 1;
            if (gh.st !== "eaten") {
              g.fillStyle = gh.st === "fright" ? (gh.fr < 1.8 && Math.floor(t * 8) % 2 ? "#fff" : "#2a3cff") : GCOL[gh.i];
              g.beginPath(); g.arc(x, y - 1, r, Math.PI, 0); g.lineTo(x + r, y + r); for (var k = 0; k < 3; k++) g.lineTo(x + r - (k + 0.5) * (2 * r / 3), y + r - 3 + (k % 2 ? 0 : 3)); g.lineTo(x - r, y + r); g.closePath(); g.fill();
            }
            g.fillStyle = "#fff"; g.fillRect(x - 5, y - 4, 4, 5); g.fillRect(x + 1, y - 4, 4, 5);
            g.fillStyle = gh.st === "fright" ? "#fff" : "#1020a0"; g.fillRect(x - 4 + (gh.dx > 0 ? 1 : 0), y - 2, 2, 3); g.fillRect(x + 2 + (gh.dx > 0 ? 1 : 0), y - 2, 2, 3);
          });
          g.restore();
          if (freeze > 0 || msgT > 0) { g.fillStyle = "#ffd400"; g.font = "800 22px sans-serif"; g.textAlign = "center"; g.fillText(msgT > 0 ? "LEVEL " + level + "!" : "READY!", LW / 2, TOP + 11 * T + 9); }
          view.end();
        }
        stopLoop = Kit.loop(function (dt) { if (over) return; update(dt); if (!over) draw(); });
        return function () { over = true; stopLoop && stopLoop(); keys.destroy(); view.destroy(); window.removeEventListener("pointerup", pu); };
      }
    });
  };
  Hub.register({
    "id": "pacman", "name": "Pacman", "hue": 55, "kind": "Turns", "mins": 6,
    "rules": "Each player plays one game with three lives. Guide Chomper through the maze (swipe, arrow keys / WASD, or the on-screen pad) and eat every dot. Eat a power pellet to turn the ghosts blue, then eat them for 200, 400, 800 points. Touch a normal ghost and you lose a life. Fruit appears for bonus points. Clear the maze for a faster level. Highest score wins.",
    "desc": "Eat every dot and outwit the ghosts.",
    "icon": "<path class=\"fl\" d=\"M40 40L62 28A26 26 0 1 0 62 52Z\"/><circle class=\"st\" cx=\"66\" cy=\"40\" r=\"2\"/>",
    "teams": false,
    "diff": "Easy: 3 slow ghosts that wander a bit and a long power-up. Medium: faster ghosts. Hard: 4 fast ghosts and a short power-up."
  });
})();
