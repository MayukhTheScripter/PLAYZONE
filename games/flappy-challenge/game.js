/* Flappy Challenge - tap to flap, fly through the pipes. Everybody takes a run. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, Kit = Hub.Kit;
  var LW = 360, LH = 560, GY = 500, PW = 62, BX = 100, BR = 12;

  function mkView(box, W0, H0) {
    var arena = document.createElement("div"); arena.className = "arena fc-arena";
    var cv = document.createElement("canvas"); arena.appendChild(cv); box.appendChild(arena);
    var g = cv.getContext("2d"), v = { s: 1, ox: 0, oy: 0, W: 0, H: 0, dpr: 1, g: g, cv: cv };
    v.resize = function () {
      var W = arena.clientWidth, H = arena.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (W < 10 || H < 10 || (W === v.W && H === v.H && dpr === v.dpr)) return;
      v.W = W; v.H = H; v.dpr = dpr; cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      v.s = Math.min(W / W0, H / H0); v.ox = (W - W0 * v.s) / 2; v.oy = (H - H0 * v.s) / 2;
    };
    v.begin = function () {
      g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); g.fillStyle = "#0b1220"; g.fillRect(0, 0, v.W, v.H);
      g.setTransform(v.s * v.dpr, 0, 0, v.s * v.dpr, v.ox * v.dpr, v.oy * v.dpr);
      g.save(); g.beginPath(); g.rect(0, 0, W0, H0); g.clip();
    };
    v.end = function () { g.restore(); };
    v.toLogical = function (cx, cy) { var r = cv.getBoundingClientRect(); return { x: (cx - r.left - v.ox) / v.s, y: (cy - r.top - v.oy) / v.s }; };
    v.resize();
    return v;
  }

  ENGINES.flappy = function (C) {
    var lv = C.lv, SPEED = [150, 178, 208][lv], GAP = [178, 158, 140][lv], SPACE = [218, 206, 198][lv], MAXD = [105, 125, 145][lv];
    return Kit.runTurns(C, {
      intro: "Tap, click or press Space to flap. Fly through the gaps between the pipes without touching anything. Each pipe is one point.",
      cpuScore: function (l) { return Math.max(0, Math.round([4, 9, 15][l] + Kit.rnd(-3, 4))); },
      sub: "Most pipes passed",
      play: function (idx, box, done) {
        var view = mkView(box, LW, LH), g = view.g, stop = 0, over = false;
        var state = "ready", t = 0, bird = { y: 250, vy: 0, wing: 9 }, pipes = [], score = 0, parts = [], shake = 0, scroll = 0, flash = 0, popT = 0, deadT = 0;
        var clouds = [], i;
        for (i = 0; i < 6; i++) clouds.push({ x: Kit.rnd(0, LW), y: Kit.rnd(30, 260), s: Kit.rnd(0.6, 1.4) });
        var hills = Kit.rnd(0, 1000);

        function lastCy() { return pipes.length ? pipes[pipes.length - 1].cy : 250; }
        function spawn(x) {
          var lo = GAP / 2 + 55, hi = GY - GAP / 2 - 55;
          pipes.push({ x: x, cy: Kit.clamp(lastCy() + Kit.rnd(-MAXD, MAXD), lo, hi), passed: false });
        }
        function puff(x, y, n, col, sp) {
          for (var k = 0; k < n; k++) { var a = Kit.rnd(0, 6.283), s = Kit.rnd(0.3, 1) * sp; parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: Kit.rnd(0.35, 0.8), age: 0, col: col, r: Kit.rnd(2, 4.5) }); }
        }
        function flap() {
          if (over) return;
          if (state === "dead") return;
          if (state === "ready") { state = "play"; spawn(LW + 90); }
          bird.vy = -440; bird.wing = 0; sfx("tap");
          puff(BX - 10, bird.y + 6, 3, "rgba(255,255,255,0.8)", 60);
        }
        function die() {
          if (state === "dead") return;
          state = "dead"; shake = 0.35; flash = 0.25; sfx("crash"); bird.vy = Math.min(bird.vy, 0) - 120; deadT = 0;
          puff(BX, bird.y, 16, "#ffd93b", 220); puff(BX, bird.y, 8, "#fff", 160);
          over = true; done(score, score === 1 ? "1 pipe passed." : score + " pipes passed.");
        }

        var keys = Kit.keys(function (code) { if (code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "Enter") flap(); });
        function pd(e) { e.preventDefault(); flap(); }
        view.cv.addEventListener("pointerdown", pd);

        function update(dt) {
          t += dt; bird.wing += dt; popT = Math.max(0, popT - dt); shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
          for (var k = parts.length - 1; k >= 0; k--) { var p = parts[k]; p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; if (p.age > p.life) parts.splice(k, 1); }
          for (k = 0; k < clouds.length; k++) { var c = clouds[k]; c.x -= (state === "dead" ? 0 : 22 * c.s) * dt; if (c.x < -80) { c.x = LW + 60; c.y = Kit.rnd(30, 260); } }
          if (state === "ready") { bird.y = 250 + Math.sin(t * 4) * 8; scroll += 60 * dt; if (bird.wing > 0.28) bird.wing = 0; return; }
          if (state === "dead") {
            deadT += dt; bird.vy = Math.min(800, bird.vy + 1700 * dt); bird.y += bird.vy * dt;
            if (bird.y > GY - BR) { bird.y = GY - BR; bird.vy = 0; }
            return;
          }
          scroll += SPEED * dt;
          bird.vy = Math.min(720, bird.vy + 1500 * dt); bird.y += bird.vy * dt;
          if (bird.y < BR) { bird.y = BR; if (bird.vy < 0) bird.vy = 0; }
          for (k = 0; k < pipes.length; k++) pipes[k].x -= SPEED * dt;
          if (pipes.length && pipes[0].x < -PW - 10) pipes.shift();
          if (!pipes.length || pipes[pipes.length - 1].x < LW + 20 - SPACE + 0) { if (!pipes.length || pipes[pipes.length - 1].x <= LW - SPACE + 40) spawn((pipes.length ? pipes[pipes.length - 1].x : LW) + SPACE); }
          for (k = 0; k < pipes.length; k++) {
            var q = pipes[k];
            if (!q.passed && q.x + PW < BX - BR) { q.passed = true; score++; popT = 0.25; sfx("score"); C.set(idx, score); }
            if (BX + BR - 2 > q.x && BX - BR + 2 < q.x + PW) { if (bird.y - BR + 3 < q.cy - GAP / 2 || bird.y + BR - 3 > q.cy + GAP / 2) { die(); return; } }
          }
          if (bird.y + BR >= GY) { bird.y = GY - BR; die(); }
        }

        function cloud(x, y, s) {
          g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath();
          g.arc(x, y, 16 * s, 0, 6.283); g.arc(x + 18 * s, y - 8 * s, 20 * s, 0, 6.283); g.arc(x + 40 * s, y, 15 * s, 0, 6.283); g.arc(x + 20 * s, y + 6 * s, 16 * s, 0, 6.283); g.fill();
        }
        function layer(off, base, amp, freq, col) {
          g.fillStyle = col; g.beginPath(); g.moveTo(0, GY);
          for (var x = 0; x <= LW; x += 10) g.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin((x + off) * freq) * Math.cos((x + off) * freq * 0.37 + 1)));
          g.lineTo(LW, GY); g.closePath(); g.fill();
        }
        function pipe(x, y0, y1, capTop) {
          var gr = g.createLinearGradient(x, 0, x + PW, 0); gr.addColorStop(0, "#3d9a1f"); gr.addColorStop(0.35, "#86e04a"); gr.addColorStop(1, "#2f7d18");
          g.fillStyle = gr; g.strokeStyle = "#1d4a0e"; g.lineWidth = 2;
          g.fillRect(x + 4, y0, PW - 8, y1 - y0); g.strokeRect(x + 4, y0, PW - 8, y1 - y0);
          var cy = capTop ? y0 : y1 - 24; g.fillRect(x, cy, PW, 24); g.strokeRect(x, cy, PW, 24);
          g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 8, cy + 3, 6, 18);
        }
        function drawBird() {
          g.save(); g.translate(BX, bird.y); g.rotate(state === "ready" ? 0 : Kit.clamp(bird.vy / 620, -0.5, 1.2));
          g.fillStyle = "rgba(0,0,0,0.15)"; 
          var gr = g.createRadialGradient(-4, -6, 2, 0, 0, 20); gr.addColorStop(0, "#fff3a0"); gr.addColorStop(1, "#ffc928");
          g.fillStyle = gr; g.strokeStyle = "#a86a00"; g.lineWidth = 2;
          g.beginPath(); g.ellipse(0, 0, 17, 14, 0, 0, 6.283); g.fill(); g.stroke();
          g.fillStyle = "#fff6cf"; g.beginPath(); g.ellipse(2, 6, 10, 6, 0, 0, 6.283); g.fill();
          var wa = bird.wing < 0.3 ? -0.9 * Math.cos(bird.wing / 0.3 * 6.283 * 1.0) : 0.15 + Math.sin(t * 3) * 0.05;
          g.save(); g.translate(-5, 2); g.rotate(wa); g.fillStyle = "#ffb100"; g.strokeStyle = "#a86a00"; g.lineWidth = 1.5;
          g.beginPath(); g.ellipse(-3, 0, 11, 6, 0, 0, 6.283); g.fill(); g.stroke(); g.restore();
          g.fillStyle = "#fff"; g.beginPath(); g.arc(8, -5, 5.5, 0, 6.283); g.fill(); g.stroke();
          g.fillStyle = "#222"; g.beginPath(); g.arc(state === "dead" ? 8 : 9.5, -5, state === "dead" ? 1.5 : 2.6, 0, 6.283); g.fill();
          g.fillStyle = "#ff7a1a"; g.strokeStyle = "#a84500"; g.beginPath(); g.moveTo(13, 0); g.quadraticCurveTo(25, -1, 24, 4); g.quadraticCurveTo(20, 8, 12, 6); g.closePath(); g.fill(); g.stroke();
          g.restore();
        }
        function text(s, x, y, size, col) {
          g.font = "800 " + size + "px Orbitron, 'Exo 2', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
          g.lineWidth = Math.max(3, size / 6); g.strokeStyle = "rgba(0,0,0,0.55)"; g.lineJoin = "round"; g.strokeText(s, x, y); g.fillStyle = col || "#fff"; g.fillText(s, x, y);
        }
        function draw() {
          view.resize(); view.begin();
          var sk = g.createLinearGradient(0, 0, 0, GY); sk.addColorStop(0, "#3aa6ff"); sk.addColorStop(1, "#c9f0ff"); g.fillStyle = sk; g.fillRect(0, 0, LW, LH);
          g.fillStyle = "rgba(255,240,170,0.9)"; g.beginPath(); g.arc(290, 90, 28, 0, 6.283); g.fill();
          for (var k = 0; k < clouds.length; k++) cloud(clouds[k].x, clouds[k].y, clouds[k].s);
          layer(hills + scroll * 0.12, GY - 70, 90, 0.012, "#9fd6e8"); layer(hills + 400 + scroll * 0.3, GY - 20, 70, 0.02, "#6cc08a");
          if (shake > 0) g.translate(Math.sin(t * 90) * 4 * shake / 0.35, Math.cos(t * 70) * 3 * shake / 0.35);
          for (k = 0; k < pipes.length; k++) { var q = pipes[k]; pipe(q.x, -10, q.cy - GAP / 2, false); pipe(q.x, q.cy + GAP / 2, GY, true); }
          // ground
          g.fillStyle = "#d9c27a"; g.fillRect(0, GY, LW, LH - GY); g.fillStyle = "#6fcf3a"; g.fillRect(0, GY, LW, 14);
          g.fillStyle = "#4fae25"; var off = -(scroll % 28);
          for (var x = off; x < LW; x += 28) { g.beginPath(); g.moveTo(x, GY); g.lineTo(x + 14, GY); g.lineTo(x + 6, GY + 14); g.lineTo(x - 8, GY + 14); g.closePath(); g.fill(); }
          g.fillStyle = "#b99a4d"; g.fillRect(0, GY + 14, LW, 4);
          g.fillStyle = "rgba(0,0,0,0.08)"; for (x = -(scroll * 0.9 % 40); x < LW; x += 40) g.fillRect(x, GY + 34, 18, 6);
          drawBird();
          for (k = 0; k < parts.length; k++) { var p = parts[k]; g.globalAlpha = 1 - p.age / p.life; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); }
          g.globalAlpha = 1;
          text(String(score), LW / 2, 62, 46 + popT * 40, "#fff");
          if (state === "ready") {
            text("GET READY", LW / 2, 150, 28, "#ffe36b");
            if (Math.floor(t * 2) % 2 === 0) text("TAP TO START", LW / 2, 360, 20, "#fff");
            g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(LW / 2, 410, 16, 0, 6.283); g.fill(); g.fillStyle = "#3aa6ff"; g.font = "18px sans-serif"; g.fillText("👆", LW / 2, 411);
          }
          if (state === "dead") { text("GAME OVER", LW / 2, 200, 32, "#ff6b6b"); text(score + (score === 1 ? " pipe" : " pipes"), LW / 2, 245, 22, "#fff"); }
          if (flash > 0) { g.fillStyle = "rgba(255,255,255," + (flash / 0.25 * 0.7) + ")"; g.fillRect(0, 0, LW, LH); }
          view.end();
        }
        stop = Kit.loop(function (dt) { update(dt); draw(); });
        window.__PZ_TEST = window.__PZ_TEST || {};
        window.__PZ_TEST.flappy = { get: function () { return { state: state, y: bird.y, vy: bird.vy, score: score, gap: GAP, pipes: pipes.map(function (p) { return { x: p.x, cy: p.cy }; }) }; }, flap: flap };
        return function () { over = true; stop(); keys.destroy(); view.cv.removeEventListener("pointerdown", pd); };
      }
    });
  };

  Hub.register({
    "id": "flappy",
    "name": "Flappy Challenge",
    "hue": 52,
    "kind": "Turns",
    "mins": 4,
    "rules": "Each player gets one flight. Tap, click or press Space to flap your wings and fly through the gaps between the pipes. Every pipe passed is one point. Touch a pipe or the ground and the flight is over. The player who passes the most pipes wins. On harder levels the gaps are smaller and the pipes come faster.",
    "desc": "Flap through the pipes. How far can you go?",
    "icon": "<ellipse class=\"fl\" cx=\"38\" cy=\"42\" rx=\"18\" ry=\"15\"/><circle class=\"st\" cx=\"46\" cy=\"36\" r=\"5\"/><path class=\"soft\" d=\"M54 42l14 4-14 4z\"/><path class=\"st\" d=\"M26 44c6-8 14-6 14 2\"/><path class=\"st\" d=\"M10 14v16M10 58v10M70 8v18M70 54v18\"/>",
    "teams": false,
    "diff": "Easy: wide gaps, slow pipes. Medium: tighter gaps. Hard: narrow gaps, fast pipes, and the Computer flies better."
  });
})();
