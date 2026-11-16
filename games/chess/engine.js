/* Chess rules + a small alpha-beta engine. Pure functions, no DOM (tested with perft in node).
   Squares are 0..63: index = rank*8 + file, with rank 0 = the 8th rank (top of the board). */
(function (root) {
  var PCS = "PNBRQK";
  function col(p) { return p === "" ? "" : (p === p.toUpperCase() ? "w" : "b"); }
  function startState() { return fromFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"); }
  function fromFEN(f) {
    var p = f.split(" "), b = [], i, c;
    p[0].split("/").forEach(function (row) { for (i = 0; i < row.length; i++) { c = row[i]; if (/\d/.test(c)) for (var k = 0; k < +c; k++) b.push(""); else b.push(c); } });
    var ep = p[3] && p[3] !== "-" ? (8 - +p[3][1]) * 8 + (p[3].charCodeAt(0) - 97) : -1;
    return { b: b, turn: p[1] || "w", cast: p[2] && p[2] !== "-" ? p[2] : "", ep: ep, half: +p[4] || 0, full: +p[5] || 1 };
  }
  var N8 = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], K8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var BD = [[-1, -1], [-1, 1], [1, -1], [1, 1]], RD = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function attacked(b, sq, by) {
    var r = sq >> 3, f = sq & 7, i, d, rr, ff, p;
    var pr = by === "w" ? r + 1 : r - 1, pw = by === "w" ? "P" : "p";
    if (pr >= 0 && pr < 8) { if (f > 0 && b[pr * 8 + f - 1] === pw) return true; if (f < 7 && b[pr * 8 + f + 1] === pw) return true; }
    var kn = by === "w" ? "N" : "n", kg = by === "w" ? "K" : "k";
    for (i = 0; i < 8; i++) { rr = r + N8[i][0]; ff = f + N8[i][1]; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === kn) return true; rr = r + K8[i][0]; ff = f + K8[i][1]; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === kg) return true; }
    var bq = by === "w" ? "BQ" : "bq", rq = by === "w" ? "RQ" : "rq";
    for (i = 0; i < 4; i++) { rr = r + BD[i][0]; ff = f + BD[i][1]; while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { p = b[rr * 8 + ff]; if (p) { if (bq.indexOf(p) >= 0) return true; break; } rr += BD[i][0]; ff += BD[i][1]; }
      rr = r + RD[i][0]; ff = f + RD[i][1]; while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { p = b[rr * 8 + ff]; if (p) { if (rq.indexOf(p) >= 0) return true; break; } rr += RD[i][0]; ff += RD[i][1]; } }
    return false;
  }
  function kingSq(b, c) { var k = c === "w" ? "K" : "k"; for (var i = 0; i < 64; i++) if (b[i] === k) return i; return -1; }
  function inCheck(s, c) { c = c || s.turn; return attacked(s.b, kingSq(s.b, c), c === "w" ? "b" : "w"); }

  function pseudo(s) {
    var b = s.b, t = s.turn, out = [], r, f, sq, p, i, rr, ff, to, q, dir, start, promo, opp = t === "w" ? "b" : "w";
    function add(from, to, extra) { var m = { from: from, to: to }; if (extra) for (var k in extra) m[k] = extra[k]; out.push(m); }
    for (sq = 0; sq < 64; sq++) {
      p = b[sq]; if (!p || col(p) !== t) continue; r = sq >> 3; f = sq & 7; q = p.toUpperCase();
      if (q === "P") {
        dir = t === "w" ? -1 : 1; start = t === "w" ? 6 : 1; promo = t === "w" ? 1 : 6; rr = r + dir;
        if (rr >= 0 && rr < 8 && !b[rr * 8 + f]) {
          if (r === promo) "QRBN".split("").forEach(function (x) { add(sq, rr * 8 + f, { promo: x }); }); else { add(sq, rr * 8 + f); if (r === start && !b[(r + 2 * dir) * 8 + f]) add(sq, (r + 2 * dir) * 8 + f, { dbl: true }); }
        }
        [-1, 1].forEach(function (df) { ff = f + df; if (ff < 0 || ff > 7 || rr < 0 || rr > 7) return; to = rr * 8 + ff;
          if (b[to] && col(b[to]) === opp) { if (r === promo) "QRBN".split("").forEach(function (x) { add(sq, to, { promo: x, cap: true }); }); else add(sq, to, { cap: true }); }
          else if (to === s.ep) add(sq, to, { ep: true, cap: true }); });
      } else if (q === "N" || q === "K") {
        var L = q === "N" ? N8 : K8;
        for (i = 0; i < 8; i++) { rr = r + L[i][0]; ff = f + L[i][1]; if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue; to = rr * 8 + ff; if (!b[to]) add(sq, to); else if (col(b[to]) === opp) add(sq, to, { cap: true }); }
        if (q === "K") {
          var hr = t === "w" ? 7 : 0, ks = t === "w" ? "K" : "k", qs = t === "w" ? "Q" : "q";
          if (sq === hr * 8 + 4 && !attacked(b, sq, opp)) {
            if (s.cast.indexOf(ks) >= 0 && !b[hr * 8 + 5] && !b[hr * 8 + 6] && b[hr * 8 + 7] === (t === "w" ? "R" : "r") && !attacked(b, hr * 8 + 5, opp) && !attacked(b, hr * 8 + 6, opp)) add(sq, hr * 8 + 6, { castle: "K" });
            if (s.cast.indexOf(qs) >= 0 && !b[hr * 8 + 3] && !b[hr * 8 + 2] && !b[hr * 8 + 1] && b[hr * 8] === (t === "w" ? "R" : "r") && !attacked(b, hr * 8 + 3, opp) && !attacked(b, hr * 8 + 2, opp)) add(sq, hr * 8 + 2, { castle: "Q" });
          }
        }
      } else {
        var dirs = q === "B" ? BD : q === "R" ? RD : BD.concat(RD);
        for (i = 0; i < dirs.length; i++) { rr = r + dirs[i][0]; ff = f + dirs[i][1]; while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { to = rr * 8 + ff; if (!b[to]) add(sq, to); else { if (col(b[to]) === opp) add(sq, to, { cap: true }); break; } rr += dirs[i][0]; ff += dirs[i][1]; } }
      }
    }
    return out;
  }
  function make(s, m) {
    var b = s.b.slice(), p = b[m.from], t = s.turn, cast = s.cast, ep = -1;
    b[m.to] = m.promo ? (t === "w" ? m.promo : m.promo.toLowerCase()) : p; b[m.from] = "";
    if (m.ep) b[m.to + (t === "w" ? 8 : -8)] = "";
    if (m.castle) { var hr = t === "w" ? 7 : 0; if (m.castle === "K") { b[hr * 8 + 5] = b[hr * 8 + 7]; b[hr * 8 + 7] = ""; } else { b[hr * 8 + 3] = b[hr * 8]; b[hr * 8] = ""; } }
    if (m.dbl) ep = (m.from + m.to) >> 1;
    function strip(ch) { cast = cast.split(ch).join(""); }
    if (p === "K") { strip("K"); strip("Q"); } if (p === "k") { strip("k"); strip("q"); }
    if (m.from === 63 || m.to === 63) strip("K"); if (m.from === 56 || m.to === 56) strip("Q"); if (m.from === 7 || m.to === 7) strip("k"); if (m.from === 0 || m.to === 0) strip("q");
    return { b: b, turn: t === "w" ? "b" : "w", cast: cast, ep: ep, half: (p.toUpperCase() === "P" || m.cap) ? 0 : s.half + 1, full: s.full + (t === "b" ? 1 : 0) };
  }
  function legal(s) { var t = s.turn; return pseudo(s).filter(function (m) { var n = make(s, m); return !attacked(n.b, kingSq(n.b, t), t === "w" ? "b" : "w"); }); }
  function perft(s, d) { if (d === 0) return 1; var ms = legal(s), n = 0; if (d === 1) return ms.length; for (var i = 0; i < ms.length; i++) n += perft(make(s, ms[i]), d - 1); return n; }
  function key(s) { return s.b.join("") + s.turn + s.cast + (s.ep >= 0 && pseudo(s).some(function (m) { return m.ep; }) ? s.ep : "-"); }
  function insufficient(s) {
    var minors = [], i, p; for (i = 0; i < 64; i++) { p = s.b[i]; if (!p || p === "k" || p === "K") continue; if ("NBnb".indexOf(p) < 0) return false; minors.push(p); }
    if (minors.length <= 1) return true;
    if (minors.every(function (x) { return x.toUpperCase() === "B"; })) { var cs = {}; for (i = 0; i < 64; i++) if ("Bb".indexOf(s.b[i]) >= 0 && s.b[i]) cs[((i >> 3) + (i & 7)) & 1] = 1; return Object.keys(cs).length === 1; }
    return false;
  }
  /* status of the side to move: {over, result: 'mate'|'stalemate'|'draw', why, winner} */
  function status(s, hist) {
    var ms = legal(s);
    if (!ms.length) return inCheck(s) ? { over: true, result: "mate", winner: s.turn === "w" ? "b" : "w", moves: ms } : { over: true, result: "stalemate", why: "stalemate", moves: ms };
    if (insufficient(s)) return { over: true, result: "draw", why: "insufficient material", moves: ms };
    if (s.half >= 100) return { over: true, result: "draw", why: "the 50-move rule", moves: ms };
    if (hist) { var k = key(s), n = 0; hist.forEach(function (h) { if (h === k) n++; }); if (n >= 3) return { over: true, result: "draw", why: "threefold repetition", moves: ms }; }
    return { over: false, moves: ms };
  }

  // ---------- engine ----------
  var VAL = { P: 100, N: 320, B: 335, R: 500, Q: 900, K: 0 };
  var CEN = []; for (var i = 0; i < 64; i++) { var r = i >> 3, f = i & 7; CEN.push(Math.round(14 - (Math.abs(3.5 - r) + Math.abs(3.5 - f)) * 3.5)); }
  function evalS(s) {
    var sc = 0, i, p, q, r, v;
    for (i = 0; i < 64; i++) { p = s.b[i]; if (!p) continue; q = p.toUpperCase(); r = i >> 3; v = VAL[q];
      if (q === "P") v += (col(p) === "w" ? 6 - r : r - 1) * 8 + (CEN[i] > 5 ? 4 : 0); else if (q === "N" || q === "B") v += CEN[i]; else if (q === "Q") v += CEN[i] / 3; else if (q === "K") v -= CEN[i] * 0.5;
      sc += col(p) === "w" ? v : -v; }
    return s.turn === "w" ? sc : -sc;
  }
  function order(s, ms) { return ms.sort(function (a, b) { return sc(b) - sc(a); }); function sc(m) { var v = 0; if (m.cap) v += 10 * (VAL[(s.b[m.to] || "P").toUpperCase()] || 100) - VAL[s.b[m.from].toUpperCase()] / 10; if (m.promo) v += 800; return v; } }
  function search(s, depth, alpha, beta, ctx, q) {
    ctx.nodes++;
    if (ctx.nodes % 512 === 0 && performance_now() > ctx.deadline) ctx.stop = true;
    if (ctx.stop) return 0;
    var ms = legal(s);
    if (!ms.length) return inCheck(s) ? -100000 - depth : 0;
    if (depth <= 0) {
      if (!ctx.quiesce || q >= 4) return evalS(s);
      var stand = evalS(s); if (stand >= beta) return stand; if (stand > alpha) alpha = stand;
      ms = ms.filter(function (m) { return m.cap || m.promo; }); order(s, ms);
      for (var j = 0; j < ms.length; j++) { var v = -search(make(s, ms[j]), 0, -beta, -alpha, ctx, q + 1); if (ctx.stop) return 0; if (v >= beta) return v; if (v > alpha) alpha = v; }
      return alpha;
    }
    order(s, ms); var best = -1e9;
    for (var i = 0; i < ms.length; i++) { var val = -search(make(s, ms[i]), depth - 1, -beta, -alpha, ctx, 0); if (ctx.stop) return 0; if (val > best) best = val; if (val > alpha) alpha = val; if (alpha >= beta) break; }
    return best;
  }
  function performance_now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }
  /* Choose a move. opts: {depth, quiesce, ms (time budget), randomTop} */
  function best(s, opts) {
    var ms = legal(s); if (!ms.length) return null; if (ms.length === 1) return ms[0];
    var ctx = { nodes: 0, stop: false, quiesce: !!opts.quiesce, deadline: performance_now() + (opts.ms || 1200) }, chosen = null, scored = [];
    order(s, ms);
    for (var d = 1; d <= opts.depth; d++) {
      var cur = [], alpha = -1e9;
      for (var i = 0; i < ms.length; i++) { var v = -search(make(s, ms[i]), d - 1, -1e9, -alpha + 1 > 1e9 ? 1e9 : 1e9, ctx, 0); if (ctx.stop) break; cur.push({ m: ms[i], v: v + Math.random() * 3 }); if (v > alpha) alpha = v; }
      if (ctx.stop) break; cur.sort(function (a, b) { return b.v - a.v; }); scored = cur; chosen = cur[0].m; ms = cur.map(function (x) { return x.m; });
    }
    if (opts.randomTop && scored.length > 1) { var k = Math.min(opts.randomTop, scored.length); return scored[Math.floor(Math.random() * k)].m; }
    return chosen || ms[0];
  }
  var API = { startState: startState, fromFEN: fromFEN, legal: legal, make: make, inCheck: inCheck, status: status, key: key, perft: perft, best: best, color: col };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.PZChess = API;
})(typeof window !== "undefined" ? window : this);
