/* Rock Paper Scissors - game logic.
   Needs ../_shared/playzone-sdk.js and ../_shared/hub-runtime.js (loaded first by index.html).
   Everything the game shares with the other classic games is imported on the next line. */
(function () {
  var ENGINES = Hub.ENGINES, pickOf = Hub.pickOf, maxIdx = Hub.maxIdx;

  // ---------- Rock Paper Scissors ----------
  ENGINES.rps = function (C) {
    var root = C.root, n = C.n, GOAL = [3, 5, 7][C.lv];
    var EM = { r: "✊", p: "✋", s: "✌️" }, NM = { r: "Rock", p: "Paper", s: "Scissors" }, BEATS = { r: "s", p: "r", s: "p" }, COUNTER = { r: "p", p: "s", s: "r" };
    var picks = [], ph = 0, humans = [], hist = { r: 0, p: 0, s: 0 }, rs = [];
    C.players.forEach(function (p, i) { rs.push(0); if (!p.cpu) humans.push(i); });
    root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="center"></div>';
    var area = root.querySelector(".center");
    function pickScreen() {
      var i = humans[ph]; C.turn(i);
      C.msg(C.who(i) + " — choose in secret");
      area.innerHTML = '<div class="row">' + ["r", "p", "s"].map(function (k) { return '<button type="button" class="rps-btn" data-go="pick" data-v="' + k + '" aria-label="' + NM[k] + '">' + EM[k] + "</button>"; }).join("") + "</div>" +
        '<p class="hintx">' + (humans.length > 1 ? "Everyone else look away. Picks stay hidden until all players have chosen." : "First to " + GOAL + " points wins.") + "</p>";
    }
    function cpuPick() {
      if (Math.random() < [0, 0.3, 0.6][C.lv]) {
        var top = "r";
        ["r", "p", "s"].forEach(function (k) { if (hist[k] > hist[top]) top = k; });
        if (hist[top] > 0) return COUNTER[top];
      }
      return pickOf(["r", "p", "s"]);
    }
    function startRound() { picks = []; ph = 0; pickScreen(); }
    function reveal() {
      C.turn(-1);
      C.players.forEach(function (p, i) { if (p.cpu) picks[i] = cpuPick(); });
      var gain = C.players.map(function () { return 0; });
      C.players.forEach(function (p, i) { C.players.forEach(function (q, j) { if (i !== j && BEATS[picks[i]] === picks[j]) gain[i]++; }); });
      gain.forEach(function (g, i) { if (g) { rs[i] += g; C.add(i, g); } });
      area.innerHTML = '<div class="reveal">' + C.players.map(function (p, i) {
        return '<div class="rcard' + (gain[i] === Math.max.apply(null, gain) && gain[i] > 0 ? " win" : "") + '">' + C.who(i) + '<span class="em">' + EM[picks[i]] + "</span><span>" + NM[picks[i]] + "</span><strong>" + (gain[i] ? "+" + gain[i] : "0") + "</strong></div>";
      }).join("") + "</div>";
      var mx = Math.max.apply(null, rs), leaders = maxIdx(rs);
      if (mx >= GOAL && leaders.length === 1) {
        C.msg("Match over");
        C.later(function () { C.finish(leaders, C.players.map(function (p, q) { return p.name + " " + rs[q]; }).join(" · ")); }, 1800);
        return;
      }
      C.msg(gain.every(function (g) { return g === 0; }) ? "Draw. Nobody scores." : (mx >= GOAL ? "Tie at the top. Play on!" : "Round result"));
      area.insertAdjacentHTML("beforeend", '<div class="dock"><button type="button" class="btn big" data-go="next">Next round</button></div>');
      var nb = area.querySelector('[data-go="next"]'); if (nb) nb.focus();
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest('[data-go="pick"]');
      if (b) {
        var i = humans[ph], v = b.getAttribute("data-v");
        picks[i] = v; hist[v]++; ph++;
        if (ph < humans.length) { C.msg(C.who(i) + " locked in ✓"); area.innerHTML = '<p class="hintx">Locked in. Pass the device to the next player.</p>'; C.later(pickScreen, 700); }
        else reveal();
        return;
      }
      if (e.target.closest('[data-go="next"]')) startRound();
    });
    startRound();
    return {};
  };

  Hub.register({
    "id": "rps",
    "name": "Rock Paper Scissors",
    "hue": 350,
    "kind": "All at once",
    "mins": 3,
    "rules": "Each round everyone secretly picks rock, paper or scissors. Beat another player's pick to score a point. First to 5 points wins.",
    "desc": "Everyone picks in secret. Reveal together and score.",
    "icon": "<circle class=\"st\" cx=\"18\" cy=\"48\" r=\"10\"/><rect class=\"st\" x=\"32\" y=\"36\" width=\"20\" height=\"26\" rx=\"3\"/><path class=\"st\" d=\"M60 36L72 64M72 36L60 64\"/>",
    "teams": false,
    "diff": "First to 3, 5 or 7 points wins."
  });
})();
