/* Number Sequence - what comes next? */
(function () {
  var ENGINES = Hub.ENGINES, Kit = Hub.Kit, ri = Kit.ri;
  var PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];

  function seq(lv) {
    var kinds = ["add", "mul", "sq", "fib", "alt", "grow"];
    if (lv >= 1) kinds.push("sub");
    if (lv >= 2) kinds.push("cube", "prime", "mul");
    var k = Kit.pick(kinds), a, d, d2, s = [], i, hint;
    if (k === "add") { a = ri(1, 20); d = ri(2, lv ? 11 : 7); for (i = 0; i < 6; i++) s.push(a + d * i); hint = "Add " + d + " each time."; }
    else if (k === "sub") { d = ri(2, 9); a = ri(50, 90); for (i = 0; i < 6; i++) s.push(a - d * i); hint = "Subtract " + d + " each time."; }
    else if (k === "mul") { a = ri(1, 4); d = ri(2, 3); for (i = 0; i < 6; i++) s.push(a * Math.pow(d, i)); hint = "Multiply by " + d + " each time."; }
    else if (k === "sq") { a = ri(1, 6); for (i = 0; i < 6; i++) s.push((a + i) * (a + i)); hint = "Square numbers: " + a + "², " + (a + 1) + "², …"; }
    else if (k === "cube") { a = ri(1, 4); for (i = 0; i < 6; i++) s.push(Math.pow(a + i, 3)); hint = "Cube numbers: " + a + "³, " + (a + 1) + "³, …"; }
    else if (k === "fib") { s = [ri(1, 4), ri(1, 5)]; for (i = 2; i < 6; i++) s.push(s[i - 1] + s[i - 2]); hint = "Each number is the sum of the two before it."; }
    else if (k === "alt") { a = ri(1, 15); d = ri(2, 6); d2 = ri(7, 12); s = [a]; for (i = 1; i < 6; i++) s.push(s[i - 1] + (i % 2 ? d : d2)); hint = "Add " + d + ", then " + d2 + ", and repeat."; }
    else if (k === "grow") { a = ri(1, 12); s = [a]; for (i = 1; i < 6; i++) s.push(s[i - 1] + i); hint = "Add 1, then 2, then 3, then 4…"; }
    else { var st = ri(0, PRIMES.length - 7); s = PRIMES.slice(st, st + 6); hint = "These are prime numbers."; }
    return { s: s, hint: hint };
  }
  function make(lv) {
    var r = seq(lv), ans = r.s[5], opts = [ans], guard = 0;
    while (opts.length < 4 && guard++ < 80) {
      var spread = Math.max(2, Math.round(ans * 0.12)), v = ans + ri(1, spread) * (Math.random() < 0.5 ? -1 : 1);
      if (v > 0 && opts.indexOf(v) < 0) opts.push(v);
    }
    while (opts.length < 4) opts.push(ans + opts.length * 3);
    opts = Hub.shuffle(opts);
    return { q: r.s.slice(0, 5).join(" , ") + " , ?", opts: opts.map(String), ans: opts.indexOf(ans), hint: r.hint };
  }
  ENGINES.numseq = function (C) {
    return Kit.quiz(C, { rounds: 5, time: [16, 13, 10], cpuAcc: [0.55, 0.75, 0.9], make: make });
  };
  Hub.register({
    "id": "numseq", "name": "Number Sequence", "hue": 255, "kind": "Turns", "mins": 5,
    "rules": "Each player answers 5 puzzles in turn. Five numbers follow a hidden rule: choose the number that comes next. Quick answers earn bonus points. After each answer the rule is shown.",
    "desc": "Work out what comes next.",
    "icon": "<path class=\"st\" d=\"M12 62l16-14 14 8 16-22 14 6\"/><circle class=\"fl\" cx=\"28\" cy=\"48\" r=\"3\"/><circle class=\"fl\" cx=\"42\" cy=\"56\" r=\"3\"/><circle class=\"fl\" cx=\"58\" cy=\"34\" r=\"3\"/>",
    "teams": false,
    "diff": "Easy: adding, multiplying, squares. Medium: adds subtracting. Hard: cubes and primes, less time, sharper Computer."
  });
})();
