/* Chess - two players on one device, or you against the Computer. */
(function () {
  var ENGINES = Hub.ENGINES, sfx = Hub.sfx, esc = Hub.esc, E = window.PZChess;
  var BASE = '<rect x="11" y="32.5" width="23" height="4" rx="1.8"/><rect x="9" y="36" width="27" height="3.6" rx="1.8"/>';
  var SHAPES = {
    P: '<circle cx="22.5" cy="12.5" r="5.6"/><path d="M17.2 19.5Q22.5 16.8 27.8 19.5Q26.8 26 29.5 32.5H15.5Q18.2 26 17.2 19.5Z"/>' + BASE,
    R: '<path d="M12 10h4v3.4h3.6V10h5.8v3.4H29V10h4v9.4H12z"/><path d="M14.5 19.4h16l1.6 13.1H12.9z"/>' + BASE,
    B: '<circle cx="22.5" cy="5.8" r="2.1"/><path d="M22.5 8.2C29 13 30 19 26.4 23.2H18.6C15 19 16 13 22.5 8.2Z"/><path d="M21 13.5l3.6 4.6" class="cut"/><rect x="16.6" y="23" width="11.8" height="3.2" rx="1.6"/><path d="M19 26.2h7.4l2.6 6.3H16.4z"/>' + BASE,
    N: '<path d="M13.5 32.5C13.5 25 16.5 21 20.5 18.5L15.2 17.6C13.6 15.6 14.4 13.4 16.4 11.6L21.2 7.4 23 4.4 25.2 8C32 10.6 33.6 22 32.2 32.5Z"/><circle cx="21.6" cy="11.8" r="1.3" class="eye"/><path d="M26 12.5C28.5 15 29.5 20 28.6 26" class="cut"/>' + BASE,
    Q: '<circle cx="9.8" cy="12.6" r="2.3"/><circle cx="16.6" cy="9.4" r="2.3"/><circle cx="22.5" cy="8.4" r="2.5"/><circle cx="28.4" cy="9.4" r="2.3"/><circle cx="35.2" cy="12.6" r="2.3"/><path d="M10.6 14.6L14.4 29l2.6-14 5.5 14 5.5-14 2.6 14 3.8-14.4-1.4 18H12z"/>' + BASE,
    K: '<path d="M21 3.2h3v3.6h3.6v3H24v3.6h-3V9.8h-3.6v-3H21z"/><path d="M12.6 32.5C12.6 22.4 16.6 17 22.5 14.6 28.4 17 32.4 22.4 32.4 32.5Z"/><path d="M16.8 24h11.4" class="cut"/>' + BASE
  };
  function pc(q, side, cls) { return '<svg class="ch-p ' + side + (cls ? " " + cls : "") + '" viewBox="0 0 45 45" aria-hidden="true">' + SHAPES[q] + "</svg>"; }
  var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="chw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef7"/><stop offset="0.55" stop-color="#eadfbe"/><stop offset="1" stop-color="#bba878"/></linearGradient><linearGradient id="chb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a6560"/><stop offset="0.5" stop-color="#2a2725"/><stop offset="1" stop-color="#0b0a0a"/></linearGradient></defs></svg>';
  var NAME = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };
  function sqName(s) { return "abcdefgh"[s & 7] + (8 - (s >> 3)); }

  ENGINES.chess = function (C) {
    var lv = C.lv, cpuSide = C.players[1] && C.players[1].cpu ? "b" : null, st = E.startState(), hist = [E.key(st)], undo = [], sel = -1, targets = [], last = null, over = false, flip = false, thinking = false, pend = null, caps = { w: [], b: [] }, tm = 0;
    var DEPTH = [1, 2, 3][lv], OPTS = { depth: DEPTH, quiesce: lv === 2, ms: lv === 2 ? 1300 : 900, randomTop: lv === 0 ? 4 : 0 };
    C.root.innerHTML = '<div class="msg" aria-live="polite"></div><div class="ch-wrap">'+DEFS+'<div class="ch-cap ch-cap-t"></div><div class="ch-frame"><div class="ch-board" role="grid" aria-label="Chess board"></div></div><div class="ch-cap ch-cap-b"></div><div class="ch-bar"><button type="button" class="btn alt ch-undo">Undo</button><button type="button" class="btn alt ch-flip">Flip board</button><button type="button" class="btn alt ch-res">Resign</button></div><div class="ch-promo" hidden></div></div>';
    var boardEl = C.root.querySelector(".ch-board"), capT = C.root.querySelector(".ch-cap-t"), capB = C.root.querySelector(".ch-cap-b"), promo = C.root.querySelector(".ch-promo"), undoB = C.root.querySelector(".ch-undo"), flipB = C.root.querySelector(".ch-flip"), resB = C.root.querySelector(".ch-res");
    undoB.hidden = !!cpuSide; C.set(0, 0); C.set(1, 0);
    function pIdx(side) { return side === "w" ? 0 : 1; }
    function render() {
      var html = "", legal = E.legal(st), kSq = E.inCheck(st) ? st.b.indexOf(st.turn === "w" ? "K" : "k") : -1;
      for (var vr = 0; vr < 8; vr++) for (var vf = 0; vf < 8; vf++) {
        var r = flip ? 7 - vr : vr, f = flip ? 7 - vf : vf, sq = r * 8 + f, p = st.b[sq], dark = (r + f) % 2;
        var cls = "ch-sq " + (dark ? "d" : "l") + (sq === sel ? " sel" : "") + (last && (sq === last.from || sq === last.to) ? " lm" : "") + (sq === kSq ? " chk" : "") + (targets.indexOf(sq) >= 0 ? (p || (sel >= 0 && st.b[sel].toUpperCase() === "P" && (sq & 7) !== (sel & 7)) ? " cap" : " tgt") : "");
        html += '<button type="button" class="' + cls + '" data-s="' + sq + '" aria-label="' + sqName(sq) + (p ? " " + (E.color(p) === "w" ? "white " : "black ") + NAME[p.toUpperCase()] : "") + '">' + (p ? pc(p.toUpperCase(), E.color(p) === "w" ? "w" : "b") : "") + ((sq & 7) === (flip ? 7 : 0) ? '<i class="rk">' + (8 - r) + "</i>" : "") + (r === (flip ? 0 : 7) ? '<i class="fl">' + "abcdefgh"[f] + "</i>" : "") + "</button>";
      }
      boardEl.innerHTML = html;
      function strip(side) { return caps[side].map(function (p) { return pc(p, side === "w" ? "b" : "w", "sm"); }).join(""); }
      capT.innerHTML = flip ? strip("b") : strip("w"); capB.innerHTML = flip ? strip("w") : strip("b");
    }
    function turnMsg() {
      var who = C.who(pIdx(st.turn)), side = st.turn === "w" ? "White" : "Black";
      C.msg(who + " (" + side + ") to move" + (E.inCheck(st) ? " — <b>check!</b>" : "") + (thinking ? "…" : ""));
      C.turn(pIdx(st.turn));
    }
    function endGame(s) {
      over = true; render();
      if (s.result === "mate") { var w = pIdx(s.winner); C.set(w, 1); C.msg("Checkmate! " + C.who(w) + " wins."); C.later(function () { C.finish([w], "Checkmate."); }, 1500); }
      else { C.set(0, 0.5); C.set(1, 0.5); C.msg("Draw by " + esc(s.why) + "."); C.later(function () { C.finish([], "Draw by " + s.why + ".", "Draw"); }, 1500); }
    }
    function apply(m) {
      var mover = st.turn, capt = st.b[m.to] || (m.ep ? (mover === "w" ? "p" : "P") : "");
      undo.push({ st: st, last: last, caps: { w: caps.w.slice(), b: caps.b.slice() }, hist: hist.slice() });
      if (capt) caps[mover].push(capt.toUpperCase());
      st = E.make(st, m); last = m; hist.push(E.key(st)); sel = -1; targets = [];
      sfx(capt ? "capture" : "tap");
      var s = E.status(st, hist); render();
      if (s.over) return endGame(s);
      turnMsg(); maybeCpu();
    }
    function maybeCpu() {
      if (!cpuSide || st.turn !== cpuSide || over) return;
      thinking = true; turnMsg();
      C.later(function () {
        var m = E.best(st, OPTS); thinking = false;
        if (!over && m) apply(m);
      }, 350);
    }
    function onSq(sq) {
      if (over || thinking || (cpuSide && st.turn === cpuSide)) return;
      var p = st.b[sq], legal = E.legal(st);
      if (sel >= 0 && targets.indexOf(sq) >= 0) {
        var ms = legal.filter(function (m) { return m.from === sel && m.to === sq; });
        if (ms[0].promo) { pend = ms; promo.hidden = false; promo.innerHTML = '<div class="ch-pbox"><p>Promote to:</p>' + ["Q", "R", "B", "N"].map(function (x) { return '<button type="button" data-p="' + x + '">'+ pc(x, st.turn === "w" ? "w" : "b") + "</button>"; }).join("") + "</div>"; return; }
        return apply(ms[0]);
      }
      if (p && E.color(p) === st.turn) { sel = sq; targets = legal.filter(function (m) { return m.from === sq; }).map(function (m) { return m.to; }); sfx("tick"); } else { sel = -1; targets = []; }
      render();
    }
    boardEl.addEventListener("click", function (e) { var b = e.target.closest(".ch-sq"); if (b) onSq(+b.getAttribute("data-s")); });
    promo.addEventListener("click", function (e) { var b = e.target.closest("button[data-p]"); if (!b || !pend) return; var m = pend.filter(function (x) { return x.promo === b.getAttribute("data-p"); })[0]; pend = null; promo.hidden = true; apply(m); });
    undoB.addEventListener("click", function () { if (over || thinking || !undo.length) return; var u = undo.pop(); st = u.st; last = u.last; caps = u.caps; hist = u.hist; sel = -1; targets = []; render(); turnMsg(); });
    flipB.addEventListener("click", function () { flip = !flip; render(); });
    resB.addEventListener("click", function () {
      if (over) return; var loser = cpuSide ? 0 : pIdx(st.turn); if (!window.confirm || true) { over = true; var w = 1 - loser; C.set(w, 1); C.msg(C.who(loser) + " resigns. " + C.who(w) + " wins."); render(); C.later(function () { C.finish([w], "Resignation."); }, 1200); }
    });
    window.__PZ_TEST = { state: function () { return st; }, move: function (a, b, pr) { var m = E.legal(st).filter(function (x) { return x.from === a && x.to === b && (!pr || x.promo === pr); })[0]; if (m) apply(m); return !!m; }, over: function () { return over; } };
    render(); turnMsg(); maybeCpu();
    return { destroy: function () { over = true; } };
  };

  Hub.register({
    "id": "chess", "name": "Chess", "hue": 45, "kind": "Turns", "mins": 10,
    "rules": "Full chess rules: castling, en passant, promotion, check, checkmate, stalemate and draws (insufficient material, 50 moves, threefold repetition). Tap a piece, then a highlighted square. White moves first; with one player you are White against the Computer. In a two-player game the Undo button takes back a move.",
    "desc": "Classic chess for two, or against the Computer.",
    "icon": "<path class=\"st\" d=\"M30 66h20M32 66c0-14 4-20 8-26-6-4-8-10-4-16 4-4 10-4 14 0 4 6 2 12-4 16 4 6 8 12 8 26\"/>",
    "teams": false,
    "diff": "Easy: the Computer thinks 1 move ahead and sometimes blunders. Medium: 2 moves ahead. Hard: 3 moves ahead with capture search."
  });
})();
