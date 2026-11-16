/* Lantern Quest - all drawing code (hero, monsters, bosses, NPCs, wildlife, scenery). Origin = feet, facing +x, up = -y. */
(function () {
  var LQ = window.LQ, A = LQ.art = {}, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;

  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  A.rng = rng;
  function shade(hex, f) { var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255; function m(v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); } return "rgb(" + m(r) + "," + m(gg) + "," + m(b) + ")"; }
  A.shade = shade;
  function ell(g, x, y, rx, ry, f, rot) { g.fillStyle = f; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); g.fill(); }
  function poly(g, pts, f, st) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (st) { g.strokeStyle = st; g.lineWidth = 1.2; g.stroke(); } }
  function limb(g, x0, y0, x1, y1, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  function eye(g, x, y, r, col) { ell(g, x, y, r * 1.9, r * 1.9, "rgba(255,60,40,0.25)"); ell(g, x, y, r, r * 0.8, col); ell(g, x + r * 0.2, y, r * 0.35, r * 0.6, "#000"); }
  function lg(g, x0, y0, x1, y1, a, b) { var q = g.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; }
  function rg(g, x, y, r0, r1, a, b) { var q = g.createRadialGradient(x, y, r0, x, y, r1); q.addColorStop(0, a); q.addColorStop(1, b); return q; }
  A.eye = eye;

  /* ------------------------------------------------------------------ HERO (human) */
  A.hero = function (g, o) {
    var t = o.t, run = o.run ? sin(t * 13) : 0, air = !o.ground, hc = o.col || "#e5484d", sw = o.sw | 0, bw = o.bw | 0;
    g.save();
    if (o.down) { g.translate(0, -7); g.rotate(-1.45); g.translate(14, 0); }
    // cape
    var cw = air ? 10 : (o.run ? 6 + run * 2 : 3);
    poly(g, [-3, -34, -9 - cw, -22, -12 - cw, -6, -4, -14], shade(hc, -0.15), "rgba(0,0,0,0.35)");
    // legs
    var l1 = air ? -5 : run * 7, l2 = air ? 6 : -run * 7;
    limb(g, -2, -17, -2 + l1, -4 - (air ? 3 : 0), 6, "#40434f"); limb(g, 2, -17, 2 + l2, -4, 6, "#4d5160");
    ell(g, -2 + l1 + 2, -2, 5, 3, "#2c2018"); ell(g, 2 + l2 + 2, -2, 5, 3, "#3a2a1e");
    // back arm
    limb(g, -2, -31, -6 + run * -3, -21, 4.5, "#d9a07a");
    // torso
    g.fillStyle = lg(g, -7, -35, 7, -16, shade(hc, 0.15), shade(hc, -0.2)); g.beginPath(); g.moveTo(-7, -34); g.quadraticCurveTo(0, -37, 7, -34); g.lineTo(6, -17); g.lineTo(-6, -17); g.closePath(); g.fill();
    g.fillStyle = "#6b4a2a"; g.fillRect(-7, -22, 14, 3); g.fillStyle = "#ffd34a"; g.fillRect(-1.5, -22, 3, 3);
    if (sw >= 2) { ell(g, 1, -34, 6, 3.5, "#b8bcc8"); ell(g, 1, -34.5, 4, 2, "#e8ecf4"); }
    // head
    ell(g, 2, -41, 7, 7.5, "#e8b48c"); ell(g, 1, -44, 7.5, 5.5, "#4a2c18"); poly(g, [-5, -42, -9, -34, -4, -37], "#4a2c18");
    if (sw >= 3) { poly(g, [-4, -47, 2, -53, 8, -47], "#ffd34a"); }
    ell(g, 5.5, -41, 1.5, 1.7, "#222"); g.fillStyle = hc; g.fillRect(-4, -36, 12, 3);
    // front arm + weapon
    var sx = 3, sy = -31, ang;
    if (o.atk > 0 && o.atk < 1) ang = -1.9 + o.atk * 3.4; else if (o.shoot > 0) ang = -0.05; else ang = 0.9 + (o.run ? run * 0.25 : 0);
    var ex = sx + cos(ang) * 9, ey = sy + sin(ang) * 9;
    limb(g, sx, sy, ex, ey, 4.5, "#e8b48c");
    if (o.shoot > 0 && bw) { // bow
      g.strokeStyle = bw >= 3 ? "#9a6bff" : bw >= 2 ? "#e8d27a" : "#8a5a2e"; g.lineWidth = 3; g.beginPath(); g.arc(ex + 4, ey, 17, -1.15, 1.15); g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1; g.beginPath(); g.moveTo(ex + 4 + cos(-1.15) * 17, ey + sin(-1.15) * 17); g.lineTo(ex - 6, ey); g.lineTo(ex + 4 + cos(1.15) * 17, ey + sin(1.15) * 17); g.stroke();
    } else if (sw > 0) {
      var bl = 17 + sw * 6, bc = sw >= 3 ? ["#fff2b0", "#ffd34a"] : sw === 2 ? ["#f4f8ff", "#9aa8c8"] : ["#e0e4ee", "#8a93a8"];
      g.save(); g.translate(ex, ey); g.rotate(ang - 0.2);
      g.fillStyle = "#ffd34a"; g.fillRect(-1, -3, 3, 6); g.fillRect(2, -1.5, 3, 3);
      g.fillStyle = lg(g, 5, -2.5, 5, 2.5, bc[0], bc[1]); g.beginPath(); g.moveTo(5, -2.5); g.lineTo(5 + bl, -1); g.lineTo(7 + bl, 0); g.lineTo(5 + bl, 1); g.lineTo(5, 2.5); g.closePath(); g.fill();
      if (sw >= 3) { g.globalAlpha = 0.35; ell(g, 5 + bl / 2, 0, bl / 2, 5, "#ffe58a"); g.globalAlpha = 1; }
      g.restore();
      if (o.atk > 0.15 && o.atk < 0.85) { g.strokeStyle = "rgba(255,255,255," + (0.55 * (1 - Math.abs(o.atk - 0.5) * 2)) + ")"; g.lineWidth = 5; g.beginPath(); g.arc(sx, sy + 4, bl + 4, -1.8 + o.atk * 2.2, -1.0 + o.atk * 2.8); g.stroke(); }
    }
    if (o.beam > 0) { ell(g, ex + 6, ey, 7 + o.beam * 6, 7 + o.beam * 6, rg(g, ex + 6, ey, 0, 14, "rgba(255,255,255,0.95)", "rgba(80,200,255,0)")); }
    g.restore();
  };

  /* ------------------------------------------------------------------ MONSTERS (30 types, 10 body plans) */
  function legsQuad(g, w, h, sp, c, t, n) { for (var i = 0; i < 4; i++) { var fx = (i < 2 ? -1 : 1) * w * 0.26 + (i % 2) * 5 - 2, sw = sin(t * sp + i * 1.7) * 6; limb(g, fx, -h * 0.4, fx + sw, -1 - (sw > 3 ? 3 : 0), 5, i % 2 ? shade(c, -0.3) : c); } }
  var BODY = {
    quad: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], f = d.ft.join(" "), sp = d.bh === "charge" || d.bh === "walk" ? 11 : 7;
      legsQuad(g, w, h, sp, c, t);
      if (/frost/.test(f)) for (var i = 0; i < 5; i++) poly(g, [-w * 0.3 + i * 8, -h * 0.75, -w * 0.3 + i * 8 + 3, -h * 1.1, -w * 0.3 + i * 8 + 7, -h * 0.75], a);
      if (/crystal/.test(f)) for (i = 0; i < 4; i++) poly(g, [-w * 0.3 + i * 9, -h * 0.7, -w * 0.3 + i * 9 + 4, -h * 1.25 - (i % 2) * 5, -w * 0.3 + i * 9 + 8, -h * 0.7], a, "rgba(255,255,255,0.6)");
      g.fillStyle = rg(g, 0, -h * 0.7, 2, w * 0.5, shade(c, 0.25), shade(c, -0.35)); g.beginPath(); g.ellipse(0, -h * 0.55, w * 0.4, h * 0.3, 0, 0, TAU); g.fill();
      if (/ribs/.test(f)) { g.strokeStyle = shade(a, 0.3); g.lineWidth = 1.5; for (i = 0; i < 4; i++) { g.beginPath(); g.arc(-w * 0.2 + i * 7, -h * 0.55, 6, 0.2, 2.9); g.stroke(); } }
      if (/rock/.test(f)) for (i = 0; i < 4; i++) ell(g, -w * 0.22 + i * 11, -h * 0.82, 7, 5, shade(a, -0.1 - (i % 2) * 0.1));
      limb(g, -w * 0.38, -h * 0.6, -w * 0.52, -h * 0.5 + sin(t * 6) * 3, 4, c);
      ell(g, w * 0.4, -h * 0.66, w * 0.2, h * 0.2, shade(c, 0.1)); poly(g, [w * 0.3, -h * 0.85, w * 0.35, -h * 1.05, w * 0.42, -h * 0.85], shade(c, -0.2));
      if (/tusk/.test(f)) { g.strokeStyle = a; g.lineWidth = 3; g.beginPath(); g.arc(w * 0.52, -h * 0.52, 6, 3.4, 5.6); g.stroke(); }
      if (/fang/.test(f)) { poly(g, [w * 0.5, -h * 0.56, w * 0.53, -h * 0.4, w * 0.56, -h * 0.57], "#fff"); }
      eye(g, w * 0.46, -h * 0.72, 2.2, d.c[2]);
    },
    biped: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], f = d.ft.join(" "), sw = sin(t * 9) * 5, y = -h * 0.42;
      if (/tail/.test(f)) { g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(-3, y); g.quadraticCurveTo(-w * 0.8, y + 6, -w * 0.7, y - 8 + sin(t * 5) * 3); g.stroke(); }
      limb(g, -3, y, -3 + sw, -2, 6, shade(c, -0.3)); limb(g, 3, y, 3 - sw, -2, 6, c);
      if (/hood/.test(f)) poly(g, [-w * 0.5, 0, 0, -h * 0.98, w * 0.5, 0, 0, -4], shade(c, -0.1), "rgba(0,0,0,0.4)");
      else { g.fillStyle = lg(g, -w * 0.4, -h * 0.8, w * 0.4, y, shade(c, 0.2), shade(c, -0.3)); g.beginPath(); g.moveTo(-w * 0.38, -h * 0.78); g.quadraticCurveTo(0, -h * 0.9, w * 0.38, -h * 0.78); g.lineTo(w * 0.28, y + 3); g.lineTo(-w * 0.28, y + 3); g.closePath(); g.fill(); }
      if (/fur/.test(f)) for (var i = 0; i < 7; i++) poly(g, [-w * 0.45 + i * 6, -h * 0.5, -w * 0.45 + i * 6 + 3, -h * 0.5 + 8, -w * 0.45 + i * 6 + 6, -h * 0.5], a);
      if (/wrap/.test(f)) { g.strokeStyle = a; g.lineWidth = 2; for (i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-w * 0.3, -h * 0.75 + i * 5); g.lineTo(w * 0.3, -h * 0.65 + i * 5); g.stroke(); } }
      limb(g, w * 0.3, -h * 0.75, w * 0.62, -h * 0.55 + sin(t * 7) * 4, 5, shade(c, 0.1));
      limb(g, -w * 0.3, -h * 0.75, -w * 0.5, -h * 0.5, 5, shade(c, -0.2));
      if (/pick/.test(f)) { limb(g, w * 0.62, -h * 0.55, w * 0.85, -h * 0.95, 2.5, "#7a5a30"); poly(g, [w * 0.7, -h * 1.0, w * 1.1, -h * 0.95, w * 0.8, -h * 0.85], "#b8bcc8"); }
      if (e.st === 1) ell(g, w * 0.7, -h * 0.55, 6, 6, "rgba(255,140,40,0.7)");
      ell(g, 2, -h * 0.9, w * 0.3, w * 0.3, shade(c, 0.12));
      if (/horn/.test(f)) { poly(g, [-w * 0.16, -h * 1.0, -w * 0.28, -h * 1.22, -w * 0.02, -h * 1.02], a); poly(g, [w * 0.2, -h * 1.0, w * 0.34, -h * 1.22, w * 0.05, -h * 1.02], a); }
      if (/ear/.test(f)) { poly(g, [-w * 0.28, -h * 0.9, -w * 0.55, -h * 0.95, -w * 0.28, -h * 0.8], c); }
      if (/helm/.test(f)) { g.fillStyle = a; g.beginPath(); g.arc(2, -h * 0.92, w * 0.32, Math.PI, TAU); g.fill(); g.fillRect(2 - w * 0.32, -h * 0.92, w * 0.64, 3); }
      if (/fin/.test(f)) poly(g, [-2, -h * 1.0, 3, -h * 1.22, 8, -h * 1.0], a);
      eye(g, w * 0.2, -h * 0.92, 2.2, d.c[2]);
      if (/fang/.test(f)) { poly(g, [w * 0.2, -h * 0.82, w * 0.24, -h * 0.72, w * 0.28, -h * 0.82], "#fff"); }
      if (/shield/.test(f)) { ell(g, w * 0.5, -h * 0.5, 7, 10, "#7a5a30"); ell(g, w * 0.5, -h * 0.5, 4, 7, "#a8855a"); }
    },
    skel: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], sw = sin(t * 8) * 5;
      limb(g, -3, -h * 0.4, -3 + sw, -2, 3.5, a); limb(g, 3, -h * 0.4, 3 - sw, -2, 3.5, c);
      g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -h * 0.4); g.lineTo(0, -h * 0.75); g.stroke();
      for (var i = 0; i < 4; i++) { g.strokeStyle = i % 2 ? a : c; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-6, -h * 0.72 + i * 4); g.quadraticCurveTo(0, -h * 0.66 + i * 4, 6, -h * 0.72 + i * 4); g.stroke(); }
      ell(g, 0, -h * 0.4, 6, 3, a);
      limb(g, 4, -h * 0.72, w * 0.55, -h * 0.55 + sin(t * 6) * 3, 3, c); limb(g, -4, -h * 0.72, -w * 0.4, -h * 0.5, 3, a);
      ell(g, 2, -h * 0.88, 7, 7.5, c); ell(g, 3, -h * 0.82, 4, 2.5, shade(c, -0.1));
      eye(g, 5, -h * 0.9, 1.9, d.c[2]); eye(g, -1, -h * 0.9, 1.9, d.c[2]);
      if (/bow/.test(d.ft.join(" "))) { g.strokeStyle = "#8a5a2e"; g.lineWidth = 2.5; g.beginPath(); g.arc(w * 0.55, -h * 0.55, 13, -1.2, 1.2); g.stroke(); }
      if (/shield/.test(d.ft.join(" "))) { ell(g, w * 0.55, -h * 0.5, 7, 11, "#59595e"); ell(g, w * 0.55, -h * 0.5, 3, 7, "#8a8a92"); }
      else { limb(g, w * 0.55, -h * 0.55, w * 0.9, -h * 0.9, 2, "#b0b4c0"); }
    },
    blob: function (g, d, e, t) {
      var w = d.w, h = d.h, sq = 1 + sin(t * 5) * 0.08, c = d.c[0];
      g.fillStyle = rg(g, -4, -h * 0.7, 2, w * 0.7, shade(c, 0.45), shade(c, -0.25)); g.beginPath(); g.ellipse(0, -h * 0.45 * sq, w * 0.5 / sq, h * 0.5 * sq, 0, 0, TAU); g.fill();
      ell(g, -6, -h * 0.8, 5, 3, "rgba(255,255,255,0.45)"); eye(g, 6, -h * 0.55, 3, d.c[2]); eye(g, -4, -h * 0.55, 2.6, d.c[2]);
      g.fillStyle = "rgba(0,0,0,0.5)"; g.beginPath(); g.arc(1, -h * 0.35, 5, 0.1, Math.PI - 0.1); g.fill();
      for (var i = 0; i < 3; i++) ell(g, -w * 0.2 + i * 10, -h * 0.2, 2, 2, "rgba(255,255,255,0.35)");
    },
    flyer: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], f = d.ft.join(" "), fl = sin(t * 18), wy = -h * 0.55;
      var wc = /bat/.test(f) ? shade(c, -0.1) : /wing/.test(f) ? shade(c, 0.1) : "rgba(220,240,255,0.55)";
      function wing(s) { poly(g, [0, wy, s * w * 0.3, wy - h * 0.9 * fl, s * w * 0.75, wy - h * 0.4 * fl + 2, s * w * 0.55, wy + h * 0.2, s * w * 0.3, wy + 2], wc, "rgba(0,0,0,0.4)"); }
      wing(-1); g.fillStyle = rg(g, 0, wy, 1, w * 0.4, shade(c, 0.3), shade(c, -0.3)); g.beginPath(); g.ellipse(0, wy, w * 0.26, h * 0.34, 0, 0, TAU); g.fill();
      if (/stinger/.test(f)) { g.fillStyle = a; for (var i = 0; i < 3; i++) g.fillRect(-w * 0.2 + i * 6, wy - 3, 3, 6); poly(g, [-w * 0.24, wy, -w * 0.5, wy + 4, -w * 0.24, wy + 4], "#111"); }
      if (/bomb/.test(f)) ell(g, 0, wy + h * 0.42, 6, 6, "#222");
      ell(g, w * 0.22, wy - 2, w * 0.17, w * 0.15, shade(c, 0.1)); wing(1);
      if (/horn/.test(f)) { poly(g, [w * 0.18, wy - 6, w * 0.15, wy - 14, w * 0.27, wy - 6], a); }
      if (/beak/.test(f)) poly(g, [w * 0.35, wy - 3, w * 0.55, wy, w * 0.35, wy + 3], "#e8c060");
      if (/bat/.test(f)) { poly(g, [w * 0.14, wy - 5, w * 0.12, wy - 12, w * 0.22, wy - 5], c); poly(g, [w * 0.26, wy - 5, w * 0.3, wy - 12, w * 0.32, wy - 4], c); }
      eye(g, w * 0.3, wy - 3, 1.9, d.c[2]);
    },
    snake: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], n = 9;
      for (var i = n; i >= 0; i--) { var u = i / n, x = -w * 0.5 + u * w, y = -h * 0.5 + sin(t * 8 - u * 6) * 3 - (u > 0.8 ? (u - 0.8) * h * 2 : 0), r = h * (0.28 + 0.3 * u * (1 - u) + (i === n ? 0.15 : 0)); ell(g, x, y, r * 1.15, r, i % 2 ? shade(c, -0.15) : c); if (i % 2) ell(g, x, y + r * 0.35, r * 0.7, r * 0.3, a); }
      var hx = w * 0.5, hy = -h * 0.5 - h * 0.3; eye(g, hx + 3, hy - 1, 2, d.c[2]);
      if (/fang/.test(d.ft.join(" "))) { poly(g, [hx + 5, hy + 3, hx + 6, hy + 8, hx + 8, hy + 3], "#fff"); }
      g.strokeStyle = "#e0405a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx + 7, hy + 2); g.lineTo(hx + 12, hy + 2 + sin(t * 20) * 2); g.stroke();
    },
    spider: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], sc = /tail/.test(d.ft.join(" "));
      for (var i = 0; i < 4; i++) for (var s = -1; s <= 1; s += 2) { var bx = (i - 1.5) * w * 0.14, sw = sin(t * 12 + i * 1.3 + (s > 0 ? 1.5 : 0)) * 4; g.strokeStyle = shade(c, -0.1 - (s > 0 ? 0.2 : 0)); g.lineWidth = 2.6; g.beginPath(); g.moveTo(bx, -h * 0.6); g.lineTo(bx + s * w * 0.3 + sw, -h * 0.95); g.lineTo(bx + s * w * 0.4 + sw, -1); g.stroke(); }
      if (sc) { g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.moveTo(-w * 0.25, -h * 0.6); g.quadraticCurveTo(-w * 0.7, -h * 0.9, -w * 0.4, -h * 1.35 + sin(t * 4) * 3); g.stroke(); poly(g, [-w * 0.42, -h * 1.3, -w * 0.3, -h * 1.15, -w * 0.5, -h * 1.1], "#222"); }
      ell(g, -w * 0.12, -h * 0.62, w * 0.28, h * 0.32, rg(g, -w * 0.12, -h * 0.7, 1, w * 0.3, shade(c, 0.25), shade(c, -0.3)));
      ell(g, w * 0.2, -h * 0.58, w * 0.18, h * 0.22, shade(c, 0.05));
      if (sc) { ell(g, w * 0.34, -h * 0.6, 7, 4, a); ell(g, w * 0.34, -h * 0.4, 7, 4, a); } else { ell(g, -w * 0.12, -h * 0.7, 5, 3, a); }
      eye(g, w * 0.3, -h * 0.64, 1.9, d.c[2]); eye(g, w * 0.24, -h * 0.72, 1.6, d.c[2]);
    },
    wisp: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], bob = sin(t * 3) * 3;
      g.globalAlpha = 0.85; g.fillStyle = lg(g, 0, -h, 0, 0, a, c); g.beginPath(); g.moveTo(-w * 0.5, -h * 0.1 + bob);
      for (var i = 0; i <= 6; i++) g.lineTo(-w * 0.5 + i * w / 6, -h * 0.1 + bob + (i % 2 ? 8 : 0) + sin(t * 5 + i) * 2);
      g.lineTo(w * 0.4, -h * 0.7 + bob); g.quadraticCurveTo(0, -h * 1.1 + bob, -w * 0.4, -h * 0.7 + bob); g.closePath(); g.fill();
      limb(g, w * 0.3, -h * 0.55 + bob, w * 0.65, -h * 0.5 + bob + sin(t * 4) * 5, 4, a); g.globalAlpha = 1;
      ell(g, w * 0.08, -h * 0.72 + bob, 4, 5, "#10131f"); ell(g, -w * 0.18, -h * 0.72 + bob, 4, 5, "#10131f"); ell(g, w * 0.08, -h * 0.72 + bob, 1.6, 2, d.c[2]); ell(g, -w * 0.18, -h * 0.72 + bob, 1.6, 2, d.c[2]);
      ell(g, 0, -h * 0.55 + bob, 3.5, 5, "#10131f");
      if (/frost/.test(d.ft.join(" "))) for (i = 0; i < 4; i++) poly(g, [-w * 0.3 + i * 8, -h * 0.95 + bob, -w * 0.3 + i * 8 + 3, -h * 1.2 + bob, -w * 0.3 + i * 8 + 6, -h * 0.95 + bob], "#e8fbff");
    },
    plant: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], cap = /cap/.test(d.ft.join(" ")), sw = sin(t * 3) * 3;
      g.strokeStyle = shade(c, -0.25); g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sw, -h * 0.45, sw * 1.5, -h * 0.6); g.stroke();
      if (cap) { g.fillStyle = rg(g, sw, -h * 0.8, 2, w * 0.6, a, c); g.beginPath(); g.ellipse(sw * 1.5, -h * 0.72, w * 0.5, h * 0.3, 0, Math.PI, TAU); g.fill(); for (var i = 0; i < 4; i++) ell(g, sw * 1.5 - 8 + i * 6, -h * 0.82, 2, 2, "#fff"); eye(g, sw * 1.5 + 4, -h * 0.62, 2, d.c[2]); }
      else { for (i = 0; i < 6; i++) { var an = i / 6 * TAU + t; poly(g, [sw * 1.5 + cos(an) * 8, -h * 0.75 + sin(an) * 8, sw * 1.5 + cos(an) * 16, -h * 0.75 + sin(an) * 16, sw * 1.5 + cos(an + 0.4) * 8, -h * 0.75 + sin(an + 0.4) * 8], "#d8f080"); } ell(g, sw * 1.5, -h * 0.75, 11, 11, rg(g, sw * 1.5, -h * 0.75, 1, 12, shade(c, 0.3), shade(c, -0.3))); eye(g, sw * 1.5 + 3, -h * 0.78, 2.3, d.c[2]); g.fillStyle = "#fff"; poly(g, [sw * 1.5 + 2, -h * 0.66, sw * 1.5 + 4, -h * 0.58, sw * 1.5 + 6, -h * 0.66], "#fff"); }
      limb(g, 0, -4, -w * 0.4, -h * 0.35 + sw, 4, shade(c, -0.1)); limb(g, 0, -4, w * 0.4, -h * 0.3 - sw, 4, shade(c, -0.1));
    },
    golem: function (g, d, e, t) {
      var w = d.w, h = d.h, c = d.c[0], a = d.c[1], sw = sin(t * 5) * 3;
      g.fillStyle = shade(c, -0.25); g.fillRect(-w * 0.32 + sw, -h * 0.35, w * 0.22, h * 0.35); g.fillRect(w * 0.1 - sw, -h * 0.35, w * 0.22, h * 0.35);
      g.fillStyle = lg(g, -w * 0.4, -h * 0.9, w * 0.4, -h * 0.3, shade(c, 0.25), shade(c, -0.3)); g.beginPath(); g.moveTo(-w * 0.42, -h * 0.85); g.lineTo(w * 0.42, -h * 0.85); g.lineTo(w * 0.32, -h * 0.32); g.lineTo(-w * 0.32, -h * 0.32); g.closePath(); g.fill();
      g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-w * 0.1, -h * 0.85); g.lineTo(-w * 0.05, -h * 0.5); g.lineTo(w * 0.1, -h * 0.35); g.moveTo(w * 0.2, -h * 0.8); g.lineTo(w * 0.12, -h * 0.55); g.stroke();
      ell(g, 0, -h * 0.6, 5, 6, d.c[2]); g.fillStyle = shade(c, 0.1); g.fillRect(-w * 0.62, -h * 0.82, w * 0.2, h * 0.38 + sw); g.fillRect(w * 0.42, -h * 0.82, w * 0.2, h * 0.38 - sw);
      g.fillStyle = shade(c, 0.05); g.fillRect(-w * 0.2, -h * 1.0, w * 0.4, h * 0.2); eye(g, w * 0.08, -h * 0.9, 2.4, d.c[2]); eye(g, -w * 0.1, -h * 0.9, 2.4, d.c[2]);
    }
  };
  A.mon = function (g, d, e, t) {
    g.save(); if (e.fl > 0) g.globalAlpha = 0.65; if (e.st === 1) { var j = sin(t * 60) * 1.5; g.translate(j, 0); }
    (BODY[d.body] || BODY.biped)(g, d, e, t); g.restore();
    if (e.fl > 0) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.35; (BODY[d.body] || BODY.biped)(g, d, e, t); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; }
  };

  /* ------------------------------------------------------------------ BOSSES (10) */
  var BB = {
    treant: function (g, b, t, W, H) {
      var c = b.c[0], l = b.c[1];
      for (var i = -2; i <= 2; i++) { g.strokeStyle = shade(c, -0.2); g.lineWidth = 14; g.beginPath(); g.moveTo(i * 16, -H * 0.3); g.quadraticCurveTo(i * 26, -H * 0.1, i * 34 + sin(t * 2 + i) * 3, 0); g.stroke(); }
      g.fillStyle = lg(g, -W * 0.3, 0, W * 0.3, 0, shade(c, 0.1), shade(c, -0.4)); g.beginPath(); g.moveTo(-W * 0.32, -H * 0.2); g.quadraticCurveTo(-W * 0.38, -H * 0.7, -W * 0.2, -H * 0.88); g.lineTo(W * 0.2, -H * 0.88); g.quadraticCurveTo(W * 0.38, -H * 0.7, W * 0.32, -H * 0.2); g.closePath(); g.fill();
      g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2; for (i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-W * 0.25 + i * 14, -H * 0.8); g.quadraticCurveTo(-W * 0.2 + i * 14, -H * 0.5, -W * 0.25 + i * 14 + 4, -H * 0.25); g.stroke(); }
      var sw = b.st === 1 ? -0.9 : b.st === 2 ? 0.7 : sin(t * 1.5) * 0.15;
      for (var s = -1; s <= 1; s += 2) { g.save(); g.translate(s * W * 0.3, -H * 0.72); g.rotate(s * (0.9 + sw)); g.fillStyle = shade(c, -0.1); g.fillRect(-7, 0, 14, H * 0.5); for (var k = 0; k < 3; k++) poly(g, [-7, H * 0.5 + 0, 0, H * 0.5 + 18, 7, H * 0.5], shade(c, 0.1)); g.restore(); }
      for (i = 0; i < 9; i++) ell(g, -W * 0.45 + i * W * 0.11, -H * 0.9 + sin(i * 2) * 10, 22, 16, shade(l, (i % 3) * -0.12));
      ell(g, 0, -H * 0.62, 22, 24, shade(c, -0.45)); eye(g, -9, -H * 0.66, 4, b.c[2]); eye(g, 9, -H * 0.66, 4, b.c[2]);
      g.fillStyle = "#150a04"; g.beginPath(); g.moveTo(-12, -H * 0.5); g.lineTo(12, -H * 0.5); g.lineTo(8, -H * 0.4); g.lineTo(0, -H * 0.46); g.lineTo(-8, -H * 0.4); g.closePath(); g.fill();
    },
    toad: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1], br = sin(t * 3) * 3;
      g.fillStyle = rg(g, 0, -H * 0.7, 4, W * 0.6, shade(c, 0.3), shade(c, -0.35)); g.beginPath(); g.ellipse(0, -H * 0.42 - br, W * 0.48, H * 0.4 + br, 0, 0, TAU); g.fill();
      ell(g, 0, -H * 0.25, W * 0.34, H * 0.18, a);
      for (var i = 0; i < 8; i++) ell(g, -W * 0.35 + i * 10, -H * 0.62 + sin(i * 3) * 10, 4 + i % 3, 3, shade(c, -0.25));
      g.fillStyle = shade(c, -0.15); g.beginPath(); g.ellipse(-W * 0.36, -8, 22, 10, 0, 0, TAU); g.ellipse(W * 0.3, -8, 24, 10, 0, 0, TAU); g.fill();
      g.fillStyle = "#210e0e"; g.beginPath(); g.moveTo(W * 0.1, -H * 0.38); g.quadraticCurveTo(W * 0.42, -H * 0.3 + (b.st === 1 ? -12 : 4), W * 0.5, -H * 0.4); g.lineTo(W * 0.48, -H * 0.5); g.quadraticCurveTo(W * 0.3, -H * 0.55, W * 0.1, -H * 0.48); g.closePath(); g.fill();
      ell(g, W * 0.34, -H * 0.42, 5, 3, "#e0405a");
      for (var s = 0; s < 2; s++) { var ex = s ? W * 0.28 : W * 0.06; ell(g, ex, -H * 0.82, 14, 13, c); eye(g, ex + 2, -H * 0.83, 6, b.c[2]); }
    },
    spider: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1];
      for (var i = 0; i < 4; i++) for (var s = -1; s <= 1; s += 2) { var bx = (i - 1.5) * W * 0.12, sw = sin(t * 5 + i * 1.3 + (s > 0 ? 1.5 : 0)) * 5; g.strokeStyle = shade(c, s > 0 ? -0.1 : 0.1); g.lineWidth = 7; g.lineJoin = "round"; g.beginPath(); g.moveTo(bx, -H * 0.55); g.lineTo(bx + s * W * 0.32 + sw, -H * 1.0); g.lineTo(bx + s * W * 0.5 + sw, -2); g.stroke(); }
      ell(g, -W * 0.18, -H * 0.62, W * 0.3, H * 0.4, rg(g, -W * 0.18, -H * 0.8, 2, W * 0.3, shade(c, 0.35), shade(c, -0.4)));
      for (i = 0; i < 4; i++) poly(g, [-W * 0.3 + i * 12, -H * 0.85, -W * 0.25 + i * 12, -H * 0.6, -W * 0.2 + i * 12, -H * 0.85], a);
      ell(g, -W * 0.18, -H * 0.5, 9, 6, "#d83a58");
      ell(g, W * 0.2, -H * 0.58, W * 0.2, H * 0.28, shade(c, 0.1));
      [[0.28, 0.7], [0.2, 0.78], [0.34, 0.6], [0.26, 0.64]].forEach(function (p, k) { eye(g, W * p[0], -H * p[1], 3 - k * 0.3, b.c[2]); });
      poly(g, [W * 0.3, -H * 0.4, W * 0.34, -H * 0.25, W * 0.26, -H * 0.38], "#fff"); poly(g, [W * 0.2, -H * 0.4, W * 0.18, -H * 0.25, W * 0.14, -H * 0.4], "#fff");
    },
    golem: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1], sw = sin(t * 2) * 3, ex = b.st === 3;
      g.fillStyle = shade(c, -0.3); g.fillRect(-W * 0.34, -H * 0.38, W * 0.26, H * 0.38); g.fillRect(W * 0.08, -H * 0.38, W * 0.26, H * 0.38);
      g.fillStyle = lg(g, -W * 0.4, -H * 0.9, W * 0.4, -H * 0.3, shade(c, 0.28), shade(c, -0.35)); g.beginPath(); g.moveTo(-W * 0.45, -H * 0.82); g.lineTo(W * 0.45, -H * 0.82); g.lineTo(W * 0.34, -H * 0.3); g.lineTo(-W * 0.34, -H * 0.3); g.closePath(); g.fill();
      g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-W * 0.1, -H * 0.82); g.lineTo(0, -H * 0.55); g.lineTo(-W * 0.12, -H * 0.3); g.moveTo(W * 0.2, -H * 0.78); g.lineTo(W * 0.1, -H * 0.5); g.stroke();
      ell(g, 0, -H * 0.56, ex ? 14 : 9, ex ? 14 : 9, ex ? "#bffff0" : b.c[2]);
      g.fillStyle = shade(c, 0.05); g.fillRect(-W * 0.68, -H * 0.86 + sw, W * 0.24, H * 0.5); g.fillRect(W * 0.44, -H * 0.86 - sw, W * 0.24, H * 0.5);
      g.fillStyle = shade(c, 0.15); g.fillRect(-W * 0.72, -H * 0.38 + sw, W * 0.3, H * 0.14); g.fillRect(W * 0.42, -H * 0.38 - sw, W * 0.3, H * 0.14);
      g.fillStyle = shade(c, 0.08); g.fillRect(-W * 0.22, -H * 1.0, W * 0.44, H * 0.22); for (var i = 0; i < 5; i++) poly(g, [-W * 0.2 + i * 8, -H, -W * 0.17 + i * 8, -H * 1.06, -W * 0.14 + i * 8, -H], shade(c, 0.2));
      eye(g, W * 0.08, -H * 0.92, 4, b.c[2]); eye(g, -W * 0.08, -H * 0.92, 4, b.c[2]); for (i = 0; i < 6; i++) ell(g, -W * 0.4 + i * W * 0.16, -H * 0.32, 7, 4, "#5a5d68");
    },
    minotaur: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1], run = b.st === 2 ? sin(t * 20) * 8 : sin(t * 3) * 2;
      limb(g, -W * 0.15, -H * 0.4, -W * 0.15 + run, -3, 20, shade(c, -0.3)); limb(g, W * 0.15, -H * 0.4, W * 0.15 - run, -3, 20, c);
      ell(g, -W * 0.15 + run, -3, 15, 6, "#222"); ell(g, W * 0.15 - run, -3, 15, 6, "#222");
      g.fillStyle = lg(g, -W * 0.4, -H * 0.9, W * 0.3, -H * 0.4, shade(c, 0.25), shade(c, -0.45)); g.beginPath(); g.moveTo(-W * 0.45, -H * 0.8); g.quadraticCurveTo(0, -H * 0.98, W * 0.4, -H * 0.78); g.lineTo(W * 0.25, -H * 0.38); g.lineTo(-W * 0.25, -H * 0.38); g.closePath(); g.fill();
      for (var i = 0; i < 12; i++) poly(g, [-W * 0.4 + i * 7, -H * 0.8 + (i % 2) * 6, -W * 0.38 + i * 7, -H * 0.62, -W * 0.34 + i * 7, -H * 0.8 + (i % 2) * 6], shade(c, -0.5));
      g.fillStyle = "#a07a3a"; g.fillRect(-W * 0.2, -H * 0.46, W * 0.4, 8);
      limb(g, W * 0.35, -H * 0.72, W * 0.62, -H * 0.5 + (b.st === 1 ? -26 : 0), 17, shade(c, 0.1)); limb(g, -W * 0.35, -H * 0.72, -W * 0.55, -H * 0.45, 17, shade(c, -0.2));
      ell(g, W * 0.15, -H * 0.9, W * 0.22, H * 0.15, shade(c, 0.12)); ell(g, W * 0.34, -H * 0.82, 15, 11, shade(c, 0.28)); ell(g, W * 0.4, -H * 0.82, 3, 2, "#000"); ell(g, W * 0.3, -H * 0.78, 3, 2, "#000");
      g.strokeStyle = a; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(W * 0.08, -H * 0.98); g.quadraticCurveTo(-W * 0.12, -H * 1.1, -W * 0.06, -H * 1.28); g.stroke(); g.beginPath(); g.moveTo(W * 0.22, -H * 0.98); g.quadraticCurveTo(W * 0.4, -H * 1.1, W * 0.34, -H * 1.28); g.stroke();
      eye(g, W * 0.24, -H * 0.93, 3.6, b.c[2]);
      ell(g, W * 0.46, -H * 0.8 + 6 * sin(t * 8), 4, 2, "rgba(255,255,255,0.5)");
    },
    worm: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1], n = 9;
      for (var i = n; i >= 0; i--) { var u = i / n, y = -H * u * 0.95 + sin(t * 2 + u * 5) * 3, x = sin(t * 1.5 + u * 4) * 10, r = (W * 0.38) * (1 - u * 0.3); ell(g, x, y - r * 0.4, r, r * 0.6, i % 2 ? shade(c, -0.15) : shade(c, 0.05)); g.strokeStyle = shade(c, -0.4); g.lineWidth = 3; g.beginPath(); g.moveTo(x - r, y - r * 0.4); g.quadraticCurveTo(x, y - r * 0.9, x + r, y - r * 0.4); g.stroke(); }
      var hy = -H * 0.95, o = b.st === 2 ? 14 : 5;
      g.fillStyle = shade(c, 0.08); g.beginPath(); g.ellipse(0, hy - 18, W * 0.34, 24, 0, 0, TAU); g.fill();
      g.fillStyle = "#2a0d0d"; g.beginPath(); g.ellipse(0, hy - 12, W * 0.24, 14 + o, 0, 0, TAU); g.fill();
      for (i = 0; i < 12; i++) { var an = i / 12 * TAU; poly(g, [cos(an) * 24, hy - 12 + sin(an) * (12 + o), cos(an) * 14, hy - 12 + sin(an) * (6 + o * 0.5), cos(an + 0.2) * 24, hy - 12 + sin(an + 0.2) * (12 + o)], "#f2e8cc"); }
      eye(g, -22, hy - 36, 4, b.c[2]); eye(g, 22, hy - 36, 4, b.c[2]);
    },
    scorpion: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1];
      for (var i = 0; i < 4; i++) for (var s = -1; s <= 1; s += 2) { var bx = (i - 1.5) * W * 0.12, sw = sin(t * 8 + i * 1.4 + (s > 0 ? 1.4 : 0)) * 5; g.strokeStyle = shade(c, s > 0 ? -0.2 : 0); g.lineWidth = 7; g.lineJoin = "round"; g.beginPath(); g.moveTo(bx, -H * 0.45); g.lineTo(bx + s * W * 0.26 + sw, -H * 0.85); g.lineTo(bx + s * W * 0.36 + sw, -2); g.stroke(); }
      g.strokeStyle = shade(c, -0.1); g.lineWidth = 18; g.lineCap = "round"; g.beginPath(); g.moveTo(-W * 0.22, -H * 0.5); g.quadraticCurveTo(-W * 0.62, -H * 0.8, -W * 0.4, -H * 1.2 + (b.st === 1 ? -14 : sin(t * 3) * 4)); g.quadraticCurveTo(-W * 0.2, -H * 1.5, W * 0.0, -H * 1.3); g.stroke();
      poly(g, [W * 0.0, -H * 1.36, W * 0.16, -H * 1.28, -W * 0.02, -H * 1.14], "#222");
      ell(g, -W * 0.05, -H * 0.5, W * 0.34, H * 0.28, rg(g, 0, -H * 0.6, 2, W * 0.34, shade(c, 0.3), shade(c, -0.35)));
      for (i = 0; i < 5; i++) ell(g, -W * 0.25 + i * 12, -H * 0.62, 7, 4, shade(a, -0.2));
      for (var s2 = -1; s2 <= 1; s2 += 2) { limb(g, W * 0.24, -H * 0.5, W * 0.5, -H * 0.4 + s2 * 12, 12, shade(c, 0.1)); ell(g, W * 0.56, -H * 0.4 + s2 * 12, 14, 9, shade(c, 0.2)); poly(g, [W * 0.6, -H * 0.4 + s2 * 12 - 6, W * 0.76, -H * 0.4 + s2 * 12, W * 0.6, -H * 0.4 + s2 * 12 + 6], shade(c, -0.2)); }
      eye(g, W * 0.24, -H * 0.62, 3.4, b.c[2]); eye(g, W * 0.16, -H * 0.7, 3, b.c[2]);
    },
    pharaoh: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1], hv = sin(t * 2) * 4;
      g.fillStyle = lg(g, 0, -H * 0.9, 0, 0, shade(c, 0.2), shade(c, -0.5)); g.beginPath(); g.moveTo(-W * 0.4, 0 + hv); for (var i = 0; i <= 6; i++) g.lineTo(-W * 0.4 + i * W * 0.8 / 6, hv + (i % 2 ? 10 : 0)); g.lineTo(W * 0.3, -H * 0.75); g.lineTo(-W * 0.3, -H * 0.75); g.closePath(); g.fill();
      g.strokeStyle = "rgba(60,40,10,0.45)"; g.lineWidth = 2; for (i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-W * 0.3, -H * 0.7 + i * 12); g.lineTo(W * 0.3, -H * 0.62 + i * 12); g.stroke(); }
      g.fillStyle = "#d8a63a"; g.fillRect(-W * 0.3, -H * 0.78, W * 0.6, 9); for (i = 0; i < 5; i++) ell(g, -W * 0.22 + i * W * 0.11, -H * 0.745, 3, 3, i % 2 ? "#3ac8ff" : "#e03a5a");
      limb(g, W * 0.3, -H * 0.7, W * 0.6, -H * 0.5 + (b.st === 1 ? -30 : sin(t * 3) * 3), 12, c); limb(g, -W * 0.3, -H * 0.7, -W * 0.55, -H * 0.5, 12, shade(c, -0.2));
      ell(g, W * 0.62, -H * 0.52, 11, 11, rg(g, W * 0.62, -H * 0.52, 1, 14, "rgba(255,255,255,0.95)", "rgba(64,255,208,0)"));
      limb(g, -W * 0.55, -H * 0.5, -W * 0.7, -H * 1.05, 4, "#d8a63a"); ell(g, -W * 0.7, -H * 1.08, 7, 7, "#d8a63a");
      ell(g, 0, -H * 0.92, W * 0.2, H * 0.14, shade(c, -0.1));
      poly(g, [-W * 0.3, -H * 1.0, -W * 0.34, -H * 0.72, -W * 0.18, -H * 0.8, W * 0.18, -H * 0.8, W * 0.34, -H * 0.72, W * 0.3, -H * 1.0, 0, -H * 1.16], a, "#101820");
      for (i = 0; i < 4; i++) g.fillStyle = i % 2 ? "#e8c860" : "#1d6fa0", g.fillRect(-W * 0.28 + i * W * 0.14, -H * 1.0, W * 0.1, 6);
      eye(g, W * 0.07, -H * 0.9, 3.2, b.c[2]); eye(g, -W * 0.07, -H * 0.9, 3.2, b.c[2]);
    },
    dragon: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1], fl = sin(t * 4);
      g.strokeStyle = shade(c, -0.15); g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(-W * 0.3, -H * 0.35); g.quadraticCurveTo(-W * 0.7, -H * 0.2 + sin(t * 3) * 8, -W * 0.65, -H * 0.55); g.stroke();
      [[-0.05, -1], [0.05, 1]].forEach(function (w) { poly(g, [w[0] * W, -H * 0.7, -W * 0.1 - w[1] * 8, -H * 1.4 - fl * 12, W * 0.18, -H * 1.1 - fl * 8, W * 0.3, -H * 0.7], w[1] < 0 ? shade(c, -0.25) : shade(c, 0.1), "rgba(0,0,0,0.4)"); });
      limb(g, -W * 0.14, -H * 0.38, -W * 0.14 + sin(t * 5) * 6, -3, 16, shade(c, -0.25)); limb(g, W * 0.1, -H * 0.38, W * 0.1 - sin(t * 5) * 6, -3, 16, c);
      g.fillStyle = lg(g, 0, -H * 0.8, 0, -H * 0.2, shade(c, 0.25), shade(c, -0.4)); g.beginPath(); g.ellipse(0, -H * 0.5, W * 0.38, H * 0.26, 0, 0, TAU); g.fill();
      ell(g, W * 0.04, -H * 0.4, W * 0.26, H * 0.13, a);
      for (var i = 0; i < 7; i++) poly(g, [-W * 0.3 + i * 12, -H * 0.72, -W * 0.28 + i * 12, -H * 0.88, -W * 0.22 + i * 12, -H * 0.72], a);
      g.strokeStyle = shade(c, 0.05); g.lineWidth = 16; g.beginPath(); g.moveTo(W * 0.26, -H * 0.6); g.quadraticCurveTo(W * 0.42, -H * 0.85, W * 0.38, -H * 0.9); g.stroke();
      ell(g, W * 0.44, -H * 0.92, W * 0.14, H * 0.1, shade(c, 0.1), -0.1); poly(g, [W * 0.4, -H * 1.0, W * 0.34, -H * 1.18, W * 0.48, -H * 1.02], a); poly(g, [W * 0.32, -H * 0.97, W * 0.22, -H * 1.1, W * 0.36, -H * 1.0], a);
      eye(g, W * 0.46, -H * 0.96, 3.4, b.c[2]); if (b.st === 1) { ell(g, W * 0.58, -H * 0.88, 12, 8, "rgba(120,230,255,0.8)"); }
      for (i = 0; i < 6; i++) poly(g, [W * 0.52 + i * 3, -H * 0.84, W * 0.53 + i * 3, -H * 0.78, W * 0.55 + i * 3, -H * 0.84], "#fff");
    },
    king: function (g, b, t, W, H) {
      var c = b.c[0], a = b.c[1], hv = sin(t * 2) * 4;
      g.save(); g.translate(0, hv * -1);
      for (var s = -1; s <= 1; s += 2) { poly(g, [s * W * 0.2, -H * 0.8, s * W * 0.9, -H * 1.1 - sin(t * 3) * 10, s * W * 0.8, -H * 0.5, s * W * 0.2, -H * 0.4], "rgba(70,30,110,0.85)", "rgba(0,0,0,0.5)"); }
      g.fillStyle = lg(g, 0, -H * 0.9, 0, 0, shade(c, 0.25), "#0a0412"); g.beginPath(); g.moveTo(-W * 0.4, 0); for (var i = 0; i <= 6; i++) g.lineTo(-W * 0.4 + i * W * 0.8 / 6, (i % 2) * 10); g.lineTo(W * 0.35, -H * 0.8); g.lineTo(-W * 0.35, -H * 0.8); g.closePath(); g.fill();
      g.strokeStyle = a; g.lineWidth = 3; g.beginPath(); g.moveTo(-W * 0.1, -H * 0.8); g.lineTo(-W * 0.05, -H * 0.1); g.moveTo(W * 0.1, -H * 0.8); g.lineTo(W * 0.05, -H * 0.1); g.stroke();
      ell(g, 0, -H * 0.5, 9, 9, rg(g, 0, -H * 0.5, 1, 14, "#fff", "rgba(138,74,216,0)"));
      limb(g, W * 0.3, -H * 0.72, W * 0.62, -H * 0.55 + (b.st === 1 ? -35 : sin(t * 3) * 4), 12, shade(c, 0.1));
      g.save(); g.translate(W * 0.62, -H * 0.55); g.rotate(-0.4); g.fillStyle = "#3a2a4a"; g.fillRect(-3, -62, 6, 70); poly(g, [-9, -70, 0, -96, 9, -70], a); g.restore();
      limb(g, -W * 0.3, -H * 0.72, -W * 0.55, -H * 0.5, 12, shade(c, -0.2));
      ell(g, 0, -H * 0.88, W * 0.2, H * 0.13, "#1c1230"); ell(g, 4, -H * 0.86, W * 0.14, H * 0.09, "#0a0610");
      for (i = -2; i <= 2; i++) poly(g, [i * 12 - 5, -H * 0.99, i * 12, -H * (1.12 + (i === 0 ? 0.08 : (i % 2 ? 0 : 0.03))), i * 12 + 5, -H * 0.99], "#d8a63a");
      g.fillStyle = "#d8a63a"; g.fillRect(-W * 0.2, -H * 1.0, W * 0.4, 6);
      eye(g, 8, -H * 0.88, 3.6, b.c[2]); eye(g, -8, -H * 0.88, 3.6, b.c[2]);
      g.restore();
    }
  };
  A.boss = function (g, b, t) {
    var d = LQ.BOSS[b.k]; var o = { c: d.c, st: b.st, k: b.k };
    g.save();
    if (b.fl > 0) g.globalAlpha = 0.75;
    if (b.st === 1) g.translate(sin(t * 55) * 1.8, 0);
    if (b.dead) { g.globalAlpha = Math.max(0, 1 - (b.dt || 0) / 2.2); g.translate(sin(t * 40) * 3, 0); }
    BB[d.body](g, o, t, d.w, d.h);
    if (b.st === 3) { g.globalAlpha = 0.5 + 0.3 * sin(t * 14); for (var i = 0; i < 3; i++) { var an = t * 3 + i * 2.1; ell(g, cos(an) * d.w * 0.3, -d.h * 1.0 + sin(an) * 8, 4, 4, "#ffe36a"); } }
    g.restore();
    if (b.fl > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.3; BB[d.body](g, o, t, d.w, d.h); g.restore(); }
  };

  /* ------------------------------------------------------------------ WILDLIFE (harmless; they only run away) */
  A.wild = function (g, k, t, run) {
    var s = run ? sin(t * 14) * 5 : 0;
    if (k === "deer") {
      limb(g, -10, -14, -10 + s, -1, 3, "#8a5a32"); limb(g, 10, -14, 10 - s, -1, 3, "#8a5a32"); limb(g, -6, -14, -6 - s, -1, 3, "#6f4524"); limb(g, 6, -14, 6 + s, -1, 3, "#6f4524");
      ell(g, 0, -20, 16, 8, "#b27a46"); ell(g, -6, -18, 6, 3, "#e8d4a8"); limb(g, 12, -22, 17, -33, 4.5, "#b27a46"); ell(g, 19, -34, 6, 4, "#c28a54", -0.3);
      g.strokeStyle = "#e8d8b0"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(18, -37); g.lineTo(15, -48); g.moveTo(16, -43); g.lineTo(11, -45); g.moveTo(18, -37); g.lineTo(23, -47); g.moveTo(21, -43); g.lineTo(26, -44); g.stroke(); ell(g, 21, -35, 1, 1, "#222"); poly(g, [-15, -22, -20, -26, -15, -18], "#e8d4a8");
    } else if (k === "rabbit") { ell(g, 0, -7, 8, 6, "#d8d2c8"); ell(g, 7, -10, 4.5, 4, "#e6e0d8"); ell(g, 6, -17, 1.8, 5, "#e6e0d8", 0.2); ell(g, 9, -16, 1.8, 5, "#d8d2c8", 0.3); ell(g, -8, -7, 3, 3, "#fff"); ell(g, 8.5, -11, 1, 1, "#222"); }
    else if (k === "fox") { limb(g, -8, -9, -8 + s, -1, 2.6, "#7a3a14"); limb(g, 8, -9, 8 - s, -1, 2.6, "#7a3a14"); ell(g, 0, -13, 14, 6, "#d8742a"); g.fillStyle = "#e8742a"; g.beginPath(); g.moveTo(-12, -14); g.quadraticCurveTo(-26, -20 - s, -24, -8); g.quadraticCurveTo(-18, -10, -12, -11); g.fill(); ell(g, -23, -10, 3, 3, "#fff"); ell(g, 14, -17, 6, 5, "#e07a30"); poly(g, [12, -21, 13, -28, 17, -21], "#d8742a"); poly(g, [18, -17, 25, -15, 18, -14], "#e8742a"); ell(g, 14, -17, 1, 1, "#222"); }
    else if (k === "bird") { var f = sin(t * 14); poly(g, [-4, -4, -12, -4 - f * 8, -2, -2], "#4a6a9a"); ell(g, 0, -4, 6, 3.5, "#6a8ac0"); ell(g, 5, -6, 3, 3, "#6a8ac0"); poly(g, [8, -6, 12, -5, 8, -4], "#f0b040"); poly(g, [-4, -4, 4, -12 + f * 8, 2, -3], "#3a5a8a"); }
    else if (k === "fish") { var j = sin(t * 5); ell(g, 0, -6, 8, 4, "#5ab0e8", j * 0.5); poly(g, [-7, -6, -13, -10, -13, -2], "#4aa0d8"); ell(g, 5, -7, 1, 1, "#000"); }
    else if (k === "bat") { var fb = sin(t * 18); poly(g, [0, -6, -10, -12 * fb - 6, -14, -4, -6, -2], "#2c2a3a"); poly(g, [0, -6, 10, -12 * fb - 6, 14, -4, 6, -2], "#2c2a3a"); ell(g, 0, -5, 4, 5, "#3a3650"); ell(g, 1, -6, 0.9, 0.9, "#ff8"); }
    else if (k === "lizard") { g.strokeStyle = "#7a9a3a"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(-14, -3); g.quadraticCurveTo(-4, -8 + s * 0.4, 6, -5); g.stroke(); ell(g, 9, -5, 4, 3, "#8aaa4a"); limb(g, -2, -4, -4 + s, 0, 2, "#6a8a30"); limb(g, 4, -4, 6 - s, 0, 2, "#6a8a30"); ell(g, 10, -6, 0.8, 0.8, "#000"); }
    else if (k === "camel") { limb(g, -10, -16, -10 + s, -1, 3.4, "#a8803c"); limb(g, 10, -16, 10 - s, -1, 3.4, "#a8803c"); ell(g, 0, -24, 16, 8, "#c89a52"); ell(g, -5, -33, 5, 6, "#c89a52"); ell(g, 5, -32, 5, 5, "#c89a52"); limb(g, 13, -26, 20, -40, 4.5, "#c89a52"); ell(g, 22, -41, 6, 4, "#d8aa62"); ell(g, 23, -42, 1, 1, "#222"); }
    else if (k === "goat") { limb(g, -8, -11, -8 + s, -1, 2.6, "#d8d4cc"); limb(g, 8, -11, 8 - s, -1, 2.6, "#d8d4cc"); ell(g, 0, -15, 12, 6, "#f0eee8"); ell(g, 12, -20, 5, 4.5, "#f0eee8"); g.strokeStyle = "#b8a888"; g.lineWidth = 2; g.beginPath(); g.arc(9, -24, 5, 3.5, 5.6); g.stroke(); poly(g, [14, -17, 15, -12, 17, -17], "#f6f4f0"); ell(g, 14, -21, 1, 1, "#222"); }
  };

  /* ------------------------------------------------------------------ NPCs, villagers in cages, campfire, gate */
  A.npc = function (g, gift, t, given) {
    var cols = ["#6a4a2a", "#3a7a4a", "#6a5aa0", "#8a6a3a", "#2a8a6a", "#a05a2a", "#5a6a8a", "#8a3a7a", "#4a8ab0", "#e0c050"];
    var c = cols[gift % cols.length], b = sin(t * 2) * 1.2;
    limb(g, -3, -16, -3, -1, 6, "#3a3a44"); limb(g, 3, -16, 3, -1, 6, "#3a3a44");
    poly(g, [-9, -36 + b, 9, -36 + b, 11, -14, -11, -14], c, "rgba(0,0,0,0.35)"); g.fillStyle = "#e8d0a0"; g.fillRect(-9, -22, 18, 3);
    ell(g, 0, -42 + b, 7, 7.5, "#e8b48c"); ell(g, 0, -47 + b, 8, 4.5, gift === 0 || gift === 5 || gift === 9 ? "#d8d8d8" : "#5a3a1e");
    if (gift === 2 || gift === 5 || gift === 8) poly(g, [-9, -43 + b, 0, -58 + b, 9, -43 + b], c);
    if (gift === 9) { ell(g, 0, -34, 26, 26, rg(g, 0, -34, 4, 26, "rgba(255,240,170,0.5)", "rgba(255,240,170,0)")); }
    limb(g, 8, -32 + b, 14, -22 + b + sin(t * 3) * 3, 4, "#e8b48c");
    if (!given) { var by = -64 + sin(t * 3) * 3; ell(g, 0, by, 9, 9, "#ffd34a"); g.fillStyle = "#4a3000"; g.font = "bold 13px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 0, by + 1); g.textBaseline = "alphabetic"; }
  };
  A.cage = function (g, t, open) {
    g.save();
    if (!open) { ell(g, 0, -14, 6, 7, "#e8b48c"); poly(g, [-8, -20, 8, -20, 10, -4, -10, -4], "#c8a050"); ell(g, 0, -20, 8, 4, "#5a3a1e"); }
    g.strokeStyle = "#5a3a1e"; g.lineWidth = 3; g.fillStyle = "rgba(90,58,30,0.2)";
    if (!open) { g.fillRect(-16, -32, 32, 32); for (var i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 7, -32); g.lineTo(i * 7, 0); g.stroke(); } g.beginPath(); g.moveTo(-16, -32); g.lineTo(16, -32); g.moveTo(-16, -1); g.lineTo(16, -1); g.stroke(); }
    else { g.beginPath(); g.moveTo(-16, 0); g.lineTo(-24, -6); g.moveTo(16, 0); g.lineTo(24, -4); g.stroke(); }
    g.restore();
  };
  A.camp = function (g, t, lit) {
    g.fillStyle = "#5a3a1e"; g.save(); g.rotate(0.3); g.fillRect(-12, -6, 24, 5); g.restore(); g.save(); g.rotate(-0.3); g.fillRect(-12, -6, 24, 5); g.restore();
    ell(g, 0, -3, 12, 4, "#6a6a72");
    if (lit) { for (var i = 0; i < 3; i++) { var h = 18 + i * 3 + sin(t * 9 + i * 2) * 4; ell(g, (i - 1) * 5, -4 - h * 0.45, 5 - i, h * 0.5, i === 0 ? "#ff7a1a" : i === 1 ? "#ffa82a" : "#ffe27a"); } ell(g, 0, -20, 40, 40, rg(g, 0, -20, 2, 40, "rgba(255,170,60,0.28)", "rgba(255,170,60,0)")); }
    else ell(g, 0, -7, 3, 3, "#444");
  };
  A.gate = function (g, t, open, bio) {
    g.fillStyle = "#3a3a48"; g.fillRect(-34, -118, 14, 118); g.fillRect(20, -118, 14, 118);
    g.fillStyle = "#53536a"; g.fillRect(-38, -126, 76, 14); g.fillStyle = "#6a6a84"; g.fillRect(-38, -126, 76, 4);
    if (open) {
      g.fillStyle = rg(g, 0, -60, 4, 56, "rgba(255,255,255,0.95)", "rgba(110,200,255,0.55)"); g.fillRect(-20, -112, 40, 112);
      for (var i = 0; i < 6; i++) { var y = -((t * 60 + i * 24) % 112); ell(g, sin(t * 3 + i) * 12, y, 4, 4, "rgba(255,255,255,0.8)"); }
      ell(g, 0, -60, 60, 80, rg(g, 0, -60, 10, 70, "rgba(130,210,255,0.35)", "rgba(130,210,255,0)"));
    } else { g.fillStyle = "#1c1c26"; g.fillRect(-20, -112, 40, 112); g.strokeStyle = "#666"; g.lineWidth = 3; for (i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 12, -112); g.lineTo(i * 12, 0); g.stroke(); } }
  };

  /* ------------------------------------------------------------------ scenery decoration (drawn at feet) */
  A.decor = function (g, k, t, s, bio) {
    if (k === "tree") { g.fillStyle = "#5a3a1e"; g.fillRect(-5 * s, -60 * s, 10 * s, 60 * s); var cs = bio.mid; for (var i = 0; i < 3; i++) ell(g, (i - 1) * 16 * s, -(70 + (i === 1 ? 14 : 0)) * s, 24 * s, 22 * s, shade(cs, -0.1 + i * 0.08)); ell(g, -4 * s, -86 * s, 10 * s, 6 * s, "rgba(255,255,255,0.12)"); }
    else if (k === "pine") { g.fillStyle = "#4a2e18"; g.fillRect(-3 * s, -14 * s, 6 * s, 14 * s); for (i = 0; i < 4; i++) poly(g, [-(24 - i * 4) * s, -(10 + i * 22) * s, 0, -(46 + i * 22) * s, (24 - i * 4) * s, -(10 + i * 22) * s], shade(bio.mid, -0.15 + i * 0.07)); if (bio.fx === "snow") for (i = 0; i < 4; i++) poly(g, [-(14 - i * 3) * s, -(26 + i * 22) * s, 0, -(46 + i * 22) * s, (14 - i * 3) * s, -(26 + i * 22) * s], "#f4fbff"); }
    else if (k === "bush") { ell(g, -8 * s, -8 * s, 14 * s, 9 * s, shade(bio.mid, -0.05)); ell(g, 8 * s, -7 * s, 12 * s, 8 * s, shade(bio.mid, 0.1)); }
    else if (k === "flower") { limb(g, 0, 0, 0, -9, 1.5, "#3a8a3a"); ell(g, 0, -10, 3.5, 3.5, s > 1 ? "#ff8ac0" : "#ffe45a"); }
    else if (k === "reed") { for (i = -1; i <= 1; i++) { limb(g, i * 3, 0, i * 4 + sin(t * 2 + i) * 2, -26 + i * 3, 2, "#6a9a4a"); ell(g, i * 4 + sin(t * 2 + i) * 2, -28 + i * 3, 2, 5, "#7a4a2a"); } }
    else if (k === "rock") { poly(g, [-14 * s, 0, -9 * s, -14 * s, 4 * s, -18 * s, 14 * s, -6 * s, 16 * s, 0], shade(bio.far, -0.25), "rgba(0,0,0,0.3)"); poly(g, [-9 * s, -14 * s, 4 * s, -18 * s, 0, -8 * s], "rgba(255,255,255,0.15)"); }
    else if (k === "stalag") { poly(g, [-9 * s, 0, 0, -44 * s, 9 * s, 0], shade(bio.far, 0.1)); poly(g, [-3 * s, -10 * s, 0, -44 * s, 3 * s, -10 * s], "rgba(255,255,255,0.2)"); }
    else if (k === "crystal") { var gl = 0.7 + 0.3 * sin(t * 2 + s); poly(g, [-6, 0, -2, -26 * s, 4, 0], "rgba(120,230,255," + gl + ")", "rgba(255,255,255,0.6)"); poly(g, [2, 0, 8, -18 * s, 12, 0], "rgba(190,140,255," + gl + ")", "rgba(255,255,255,0.6)"); ell(g, 0, -10, 24, 24, rg(g, 0, -10, 2, 24, "rgba(130,220,255,0.22)", "rgba(130,220,255,0)")); }
    else if (k === "mush") { limb(g, 0, 0, 0, -10, 4, "#e8e0d0"); g.fillStyle = "#e05a8a"; g.beginPath(); g.ellipse(0, -10, 10 * s, 7 * s, 0, Math.PI, TAU); g.fill(); ell(g, -3, -14, 1.6, 1.6, "#fff"); ell(g, 4, -13, 1.4, 1.4, "#fff"); ell(g, 0, -3, 18, 14, rg(g, 0, -3, 1, 18, "rgba(240,120,200,0.25)", "rgba(240,120,200,0)")); }
    else if (k === "pillar") { var h = 70 * s; g.fillStyle = lg(g, -9, 0, 9, 0, shade(bio.mid, 0.25), shade(bio.mid, -0.3)); g.fillRect(-9, -h, 18, h); g.fillRect(-12, -h, 24, 6); g.fillRect(-12, -6, 24, 6); g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1; for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-4 + i * 4, -h); g.lineTo(-4 + i * 4, 0); g.stroke(); } if (s < 1) poly(g, [-12, -h, 12, -h, 6, -h - 8, -2, -h - 4], bio.mid); }
    else if (k === "arch") { g.fillStyle = shade(bio.mid, 0); g.fillRect(-34, -80, 12, 80); g.fillRect(22, -80, 12, 80); g.beginPath(); g.arc(0, -80, 34, Math.PI, TAU); g.lineTo(22, -80); g.arc(0, -80, 22, 0, Math.PI, true); g.fill(); for (i = 0; i < 4; i++) ell(g, -30 + i * 20, -40 + (i % 2) * 20, 5, 7, "rgba(70,140,70,0.8)"); }
    else if (k === "statue") { g.fillStyle = shade(bio.mid, 0.1); g.fillRect(-12, -14, 24, 14); poly(g, [-9, -14, 9, -14, 7, -52, 11, -62, -11, -62, -7, -52], shade(bio.mid, 0.2)); ell(g, 0, -68, 8, 8, shade(bio.mid, 0.25)); eye(g, 3, -68, 1.6, "#40ffd0"); poly(g, [-9, -60, -22, -42, -9, -46], shade(bio.mid, 0.05)); }
    else if (k === "brazier") { g.fillStyle = "#4a4a54"; g.fillRect(-2, -30, 4, 30); poly(g, [-10, -34, 10, -34, 6, -26, -6, -26], "#5a5a66"); for (i = 0; i < 3; i++) ell(g, (i - 1) * 4, -42 - sin(t * 9 + i) * 3, 4 - i * 0.5, 9, i ? "#ffa82a" : "#ff6a1a"); ell(g, 0, -40, 40, 40, rg(g, 0, -40, 2, 40, "rgba(255,170,60,0.3)", "rgba(255,170,60,0)")); }
    else if (k === "support") { g.fillStyle = "#6a4a2a"; g.fillRect(-26, -90, 8, 90); g.fillRect(18, -90, 8, 90); g.fillRect(-30, -96, 60, 9); g.save(); g.translate(0, -88); g.rotate(0.6); g.fillRect(-26, -4, 44, 5); g.restore(); }
    else if (k === "lantern") { limb(g, 0, 0, 0, -26, 2, "#4a3a2a"); g.fillStyle = "#3a2a1a"; g.fillRect(-5, -36, 10, 12); ell(g, 0, -30, 5, 5, "#ffd45a"); ell(g, 0, -30, 36, 36, rg(g, 0, -30, 2, 36, "rgba(255,200,90,0.35)", "rgba(255,200,90,0)")); }
    else if (k === "cart") { g.fillStyle = "#6a4a2a"; poly(g, [-18, -22, 18, -22, 14, -6, -14, -6], "#7a5a38", "rgba(0,0,0,0.4)"); ell(g, -10, -4, 5, 5, "#222"); ell(g, 10, -4, 5, 5, "#222"); ell(g, -4, -24, 6, 4, "#8a8a92"); ell(g, 6, -25, 5, 4, "#ffd34a"); }
    else if (k === "cactus") { limb(g, 0, 0, 0, -48 * s, 11, "#4a9a4a"); limb(g, 0, -22 * s, -16, -22 * s, 7, "#4a9a4a"); limb(g, -16, -22 * s, -16, -38 * s, 7, "#4a9a4a"); limb(g, 0, -30 * s, 15, -30 * s, 7, "#4a9a4a"); limb(g, 15, -30 * s, 15, -42 * s, 7, "#4a9a4a"); g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 1; for (i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-3, -8 * (i + 1) * s); g.lineTo(-6, -8 * (i + 1) * s); g.stroke(); } }
    else if (k === "bones") { g.strokeStyle = "#e8e0c8"; g.lineWidth = 3; g.beginPath(); g.arc(0, -8, 14, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(-10, 0); g.lineTo(10, -3); g.stroke(); ell(g, 14, -5, 6, 5, "#e8e0c8"); }
    else if (k === "obelisk") { poly(g, [-10, 0, -7, -88 * s, 0, -100 * s, 7, -88 * s, 10, 0], shade(bio.mid, 0.2), "rgba(0,0,0,0.3)"); g.fillStyle = "rgba(0,0,0,0.3)"; for (i = 0; i < 6; i++) g.fillRect(-3, -14 - i * 12, 6, 3); }
    else if (k === "icespike") { poly(g, [-10 * s, 0, -2 * s, -50 * s, 10 * s, 0], "rgba(200,240,255,0.9)", "rgba(255,255,255,0.8)"); poly(g, [8 * s, 0, 14 * s, -30 * s, 20 * s, 0], "rgba(170,220,250,0.9)"); }
    else if (k === "spire") { poly(g, [-14, 0, -10, -120 * s, 0, -150 * s, 10, -120 * s, 14, 0], shade(bio.mid, 0.15), "rgba(0,0,0,0.4)"); ell(g, 0, -90, 3, 4, "#c88aff"); ell(g, 0, -60, 3, 4, "#c88aff"); }
    else if (k === "chain") { for (i = 0; i < 6; i++) ell(g, 0, i * 9, 3, 5, "#5a5a68"); }
    else if (k === "sign") { g.fillStyle = "#6a4a2a"; g.fillRect(-2, -30, 4, 30); g.fillStyle = "#b98348"; g.fillRect(-14, -40, 28, 14); g.fillStyle = "#4a2e18"; g.fillRect(-9, -36, 18, 2); g.fillRect(-9, -31, 12, 2); }
  };

  /* ------------------------------------------------------------------ parallax layers (pre-rendered) */
  A.layers = function (bioKey, lvIdx) {
    var B = LQ.BIOMES[bioKey], r = rng(500 + lvIdx * 77), W = 1024, H = 360, out = {};
    function mk() { var c = document.createElement("canvas"); c.width = W; c.height = H; return c; }
    var far = mk(), fg = far.getContext("2d"), mid = mk(), mg = mid.getContext("2d");
    var i, x;
    // far silhouettes: mountains / dunes / hills / crags
    fg.fillStyle = shade(B.far, 0.1);
    fg.beginPath(); fg.moveTo(0, H);
    for (x = 0; x <= W; x += 32) {
      var ph = x / W * TAU, hh;
      if (bioKey === "desert") hh = 170 + sin(ph * 2) * 24 + sin(ph * 5) * 8;
      else if (bioKey === "ice") hh = 150 + Math.abs(sin(ph * 3)) * 80 + sin(ph * 7) * 10;
      else if (bioKey === "caves" || bioKey === "mines") hh = 90 + Math.abs(sin(ph * 4)) * 40 + sin(ph * 9) * 8;
      else if (bioKey === "citadel") hh = 160 + Math.abs(sin(ph * 5)) * 70;
      else hh = 160 + sin(ph * 3) * 30 + sin(ph * 7) * 12;
      fg.lineTo(x, H - hh);
    }
    fg.lineTo(W, H); fg.closePath(); fg.fill();
    fg.fillStyle = shade(B.far, -0.12); fg.beginPath(); fg.moveTo(0, H);
    for (x = 0; x <= W; x += 24) { var h2 = 110 + sin(x / W * TAU * 4 + 1) * 24 + sin(x / W * TAU * 9) * 8; fg.lineTo(x, H - h2); }
    fg.lineTo(W, H); fg.closePath(); fg.fill();
    if (bioKey === "ice") { fg.fillStyle = "rgba(255,255,255,0.8)"; for (i = 0; i < 5; i++) { var px = 100 + i * 200; poly(fg, [px - 26, H - 170, px, H - 240, px + 26, H - 170], "rgba(255,255,255,0.85)"); } }
    if (bioKey === "citadel" || bioKey === "ruins" || bioKey === "temple") { fg.fillStyle = shade(B.far, -0.25); for (i = 0; i < 6; i++) { var bx = 40 + i * 170 + r() * 30, bh = 100 + r() * 90; fg.fillRect(bx, H - 120 - bh * 0.5, 34, bh); if (bioKey === "citadel") poly(fg, [bx - 4, H - 120 - bh * 0.5, bx + 17, H - 160 - bh * 0.5 - 30, bx + 38, H - 120 - bh * 0.5], shade(B.far, -0.25)); } }
    // mid layer: tree line / rocky layer / dunes / pillars
    for (i = 0; i < 14; i++) {
      x = i * 76 + r() * 30; var sc = 0.8 + r() * 0.7;
      mg.save(); mg.translate(x, H - 40); mg.globalAlpha = 0.95;
      if (bioKey === "forest" || bioKey === "river") { if (r() < 0.55) A.decor(mg, "tree", 0, sc * 1.3, { mid: shade(B.mid, -0.15), far: B.far, fx: "" }); else A.decor(mg, "pine", 0, sc * 1.2, { mid: shade(B.mid, -0.2), far: B.far, fx: "" }); }
      else if (bioKey === "ice") A.decor(mg, "pine", 0, sc * 1.2, { mid: "#5a86a8", far: B.far, fx: "snow" });
      else if (bioKey === "desert") { if (r() < 0.5) A.decor(mg, "cactus", 0, sc, B); else A.decor(mg, "rock", 0, sc * 1.4, B); }
      else if (bioKey === "caves") { A.decor(mg, "stalag", 0, sc * 1.4, B); }
      else if (bioKey === "mines") { A.decor(mg, "support", 0, 1, B); }
      else if (bioKey === "citadel") { A.decor(mg, "spire", 0, sc, B); }
      else { A.decor(mg, "pillar", 0, sc * (r() < 0.4 ? 0.6 : 1.1), B); }
      mg.restore();
    }
    // river band for river level
    if (B.river) { var q = mg.createLinearGradient(0, H - 70, 0, H - 30); q.addColorStop(0, "rgba(120,200,240,0.9)"); q.addColorStop(1, "rgba(60,140,200,0.9)"); mg.fillStyle = q; mg.fillRect(0, H - 56, W, 30); mg.fillStyle = "rgba(255,255,255,0.4)"; for (i = 0; i < 20; i++) mg.fillRect(r() * W, H - 54 + r() * 24, 24 + r() * 20, 2); }
    // dark biome vignette in caves/mines/citadel
    out.far = far; out.mid = mid; return out;
  };
})();
