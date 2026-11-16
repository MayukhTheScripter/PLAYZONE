/* Catch the Star - slide a basket under falling stars; rocks cost lives. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;

  ENGINES.catchstar = function (C) {
    var SECS = 30, LW = 400, LH = 600, BW = 84, BY = 540;
    var SPEED = [150, 200, 260][C.lv], ROCK = [0.18, 0.26, 0.34][C.lv], GAP = [0.62, 0.5, 0.4][C.lv];
    return Kit.runTurns(C, {
      intro: "Slide the basket (drag, or arrow keys / A and D). Catch stars, gold stars count 3. Rocks cost a life: you have 3. " + SECS + " seconds.",
      cpuScore: function (lv) { return Math.round([18, 28, 40][lv] + Kit.rnd(-4, 4)); },
      play: function (idx, box, done) {
        box.innerHTML = '<div class="cs-top"><span class="cs-t">' + SECS + '</span><span class="cs-l">❤️❤️❤️</span><span class="cs-s">0</span></div><div class="cs-host"></div>';
        var host = box.querySelector(".cs-host"), tEl = box.querySelector(".cs-t"), lEl = box.querySelector(".cs-l"), sEl = box.querySelector(".cs-s");
        var cv = Kit.canvas(host, LW, LH), g = cv.g, view = cv.view;
        var bx = LW / 2, tx = bx, items = [], fx = [], score = 0, lives = 3, left = SECS, over = false, spawn = 0.6, elapsed = 0, shake = 0, dragging = false;
        var stars = [];
        for (var i = 0; i < 30; i++) stars.push({ x: Math.random() * LW, y: Math.random() * LH, r: Math.random() * 1.4 + 0.3 });
        var keys = Kit.keys();
        function setL() { lEl.textContent = lives > 0 ? new Array(lives + 1).join("❤️") : "💔"; }
        function pointer(e) { var p = view.toLogical(e.clientX, e.clientY); tx = Kit.clamp(p.x, BW / 2, LW - BW / 2); }
        function pd(e) { dragging = true; pointer(e); try { cv.cv.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); }
        function pm(e) { if (dragging || e.pointerType === "mouse") pointer(e); }
        function pu() { dragging = false; }
        cv.cv.addEventListener("pointerdown", pd); cv.cv.addEventListener("pointermove", pm); cv.cv.addEventListener("pointerup", pu); cv.cv.addEventListener("pointercancel", pu);
        function end() {
          if (over) return; over = true; sfx(lives > 0 ? "go" : "lose");
          done(score, lives > 0 ? "Stars collected." : "Out of lives!");
        }
        function pop(x, y, c, txt) { fx.push({ x: x, y: y, c: c, t: 0, txt: txt }); }
        var lastSec = performance.now(), stop = Kit.loop(function (dt) {
          if (over) { draw(); return; }
          elapsed += dt;
          var now = performance.now();
          if (now - lastSec >= 1000) { lastSec += 1000; left--; tEl.textContent = Math.max(0, left); if (left <= 0) { end(); } }
          var k = keys.down, dir = 0;
          if (k.ArrowLeft || k.KeyA) dir -= 1; if (k.ArrowRight || k.KeyD) dir += 1;
          if (dir) { tx = Kit.clamp(tx + dir * 520 * dt, BW / 2, LW - BW / 2); bx = tx; }
          else bx += (tx - bx) * Math.min(1, dt * 22);
          spawn -= dt;
          var ramp = 1 + Math.min(0.5, elapsed / SECS * 0.5);
          if (spawn <= 0) {
            spawn = GAP * Kit.rnd(0.6, 1.2) / ramp;
            var r = Math.random(), type = r < ROCK ? "rock" : (r < ROCK + 0.12 ? "gold" : "star");
            items.push({ x: Kit.rnd(24, LW - 24), y: -24, v: SPEED * ramp * Kit.rnd(0.85, 1.2), type: type, rot: Math.random() * 6 });
          }
          for (var i = items.length - 1; i >= 0; i--) {
            var it = items[i]; it.y += it.v * dt; it.rot += dt * 3;
            if (it.y > BY - 14 && it.y < BY + 26 && Math.abs(it.x - bx) < BW / 2 + 8) {
              items.splice(i, 1);
              if (it.type === "rock") { lives--; setL(); sfx("crash"); shake = 0.3; pop(it.x, BY, "#ff6b6b", "-1 ❤"); if (lives <= 0) end(); }
              else { var p = it.type === "gold" ? 3 : 1; score += p; sEl.textContent = score; sfx(p > 1 ? "score" : "tap"); pop(it.x, BY, it.type === "gold" ? "#ffd84a" : "#fff", "+" + p); }
            } else if (it.y > LH + 30) items.splice(i, 1);
          }
          for (var j = fx.length - 1; j >= 0; j--) { fx[j].t += dt; if (fx[j].t > 0.6) fx.splice(j, 1); }
          shake = Math.max(0, shake - dt);
          draw();
        });
        function star(x, y, r, rot) {
          g.beginPath();
          for (var i = 0; i < 10; i++) { var a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          g.closePath();
        }
        function draw() {
          view.screen(); g.fillStyle = "#0a0f24"; g.fillRect(0, 0, view.W, view.H);
          view.begin();
          var gr = g.createLinearGradient(0, 0, 0, LH); gr.addColorStop(0, "#101a45"); gr.addColorStop(1, "#2a1850");
          g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
          g.fillStyle = "rgba(255,255,255,0.5)";
          stars.forEach(function (s) { g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill(); });
          if (shake > 0) g.translate(Math.sin(shake * 90) * 5, 0);
          items.forEach(function (it) {
            if (it.type === "rock") {
              g.save(); g.translate(it.x, it.y); g.rotate(it.rot); g.fillStyle = "#7b7f8a"; g.strokeStyle = "#3a3d46"; g.lineWidth = 3;
              g.beginPath(); g.moveTo(-18, -4); g.lineTo(-8, -18); g.lineTo(10, -16); g.lineTo(19, -2); g.lineTo(12, 15); g.lineTo(-10, 16); g.closePath(); g.fill(); g.stroke();
              g.fillStyle = "#555966"; g.beginPath(); g.arc(-3, 0, 5, 0, 7); g.fill(); g.restore();
            } else {
              var gold = it.type === "gold";
              g.shadowColor = gold ? "#ffb300" : "#fff7a8"; g.shadowBlur = gold ? 18 : 10;
              g.fillStyle = gold ? "#ffc400" : "#fff27a"; g.strokeStyle = gold ? "#fff" : "#e0b800"; g.lineWidth = gold ? 3 : 2;
              star(it.x, it.y, gold ? 24 : 19, it.rot * 0.4); g.fill(); g.stroke(); g.shadowBlur = 0;
            }
          });
          // basket
          g.fillStyle = "#c98b4a"; g.strokeStyle = "#7a4b1e"; g.lineWidth = 3;
          g.beginPath(); g.moveTo(bx - BW / 2, BY - 10); g.lineTo(bx + BW / 2, BY - 10); g.lineTo(bx + BW / 2 - 12, BY + 28); g.lineTo(bx - BW / 2 + 12, BY + 28); g.closePath(); g.fill(); g.stroke();
          g.strokeStyle = "#7a4b1e"; g.lineWidth = 2; g.beginPath();
          for (var q = -2; q <= 2; q++) { g.moveTo(bx + q * 14, BY - 8); g.lineTo(bx + q * 11, BY + 27); }
          g.moveTo(bx - BW / 2 + 4, BY + 8); g.lineTo(bx + BW / 2 - 4, BY + 8); g.stroke();
          fx.forEach(function (f) {
            g.globalAlpha = 1 - f.t / 0.6; g.fillStyle = f.c; g.font = "800 22px Orbitron, Arial, sans-serif"; g.textAlign = "center";
            g.fillText(f.txt, f.x, f.y - 20 - f.t * 70); g.globalAlpha = 1;
          });
          view.screen();
        }
        return function () { over = true; stop(); keys.destroy(); cv.destroy(); cv.cv.removeEventListener("pointerdown", pd); cv.cv.removeEventListener("pointermove", pm); cv.cv.removeEventListener("pointerup", pu); cv.cv.removeEventListener("pointercancel", pu); };
      }
    });
  };

  Hub.register({
    "id": "catchstar",
    "name": "Catch the Star",
    "hue": 48,
    "kind": "Turns",
    "mins": 3,
    "rules": "Each player takes a 30-second turn. Slide the basket left and right (drag a finger, or use the arrow keys or A and D) to catch falling stars. Gold stars are worth 3 points. Catching a rock costs a life, and you only have 3. The player with the most points wins.",
    "desc": "Catch falling stars, dodge the rocks.",
    "icon": "<path class=\"st\" d=\"M40 12l8 17 18 2-13 12 4 18-17-9-17 9 4-18-13-12 18-2z\"/><path class=\"soft\" d=\"M16 66h48l-6 10H22z\"/>",
    "teams": false,
    "diff": "Easy: slow stars, few rocks. Medium: faster with more rocks. Hard: fast, many rocks, and a sharper Computer."
  });
})();
