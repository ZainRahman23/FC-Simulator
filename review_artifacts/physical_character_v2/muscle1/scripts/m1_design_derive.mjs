// MUSCLE-1 design derivation [E]: the contraction lags τc,rise / τc,fall that make the discrete (240 Hz, exact-exponential) cascade activation (15 / 50 ms) → developed
// force reproduce the literature step-rise / relaxation targets (FORCE_PRODUCTION_LITERATURE §12.2; agrees with its Appendix A.4 within 0.5 ms). usage: node m1_design_derive.mjs
// discrete (240 Hz, exact-exponential) two-lag cascade: a (15 / 50 ms) → f (τc,rise / τc,fall); invert τc for a 10–90 % step rise / 90–10 % fall
const dt = 1 / 240, lag = (y, x, tu, td) => x + (y - x) * Math.exp(-dt / (x > y ? tu : td));
function resp(tcU, tcD, up) { let a = up ? 0 : 1, f = a; const u = up ? 1 : 0, y = [f]; for (let n = 0; n < 2400; n++) { a = lag(a, u, 0.015, 0.050); f = lag(f, a, tcU, tcD); y.push(f); }
  const lo = up ? 0.1 : 0.9, hi = up ? 0.9 : 0.1, cross = (v) => { for (let i = 1; i < y.length; i++) if (up ? y[i] >= v : y[i] <= v) { const t0 = (i - 1) * dt, fr = (v - y[i - 1]) / (y[i] - y[i - 1]); return t0 + fr * dt; } return NaN; };
  return { t: (cross(hi) - cross(lo)) * 1000, onset2: cross(up ? 0.02 : 0.98) * 1000, firstTick: Math.abs(y[1] - y[0]) }; }
const inv = (target, up) => { let lo = 1e-4, hi = 1.0; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, t = up ? resp(m, 0.05, true).t : resp(0.1, m, false).t; if (t < target) lo = m; else hi = m; } return (lo + hi) / 2 * 1000; };
for (const t of [150, 200, 250, 300, 325, 350, 450]) console.log("rise", t, "→ τc,rise", inv(t, true).toFixed(1), "ms");
for (const t of [120, 160, 175, 200, 250, 300]) console.log("fall", t, "→ τc,fall", inv(t, false).toFixed(1), "ms");
for (const [lab, u, d] of [["PF", 0.1465, 0.054], ["DF/KE", 0.089, 0.095]]) { const r = resp(u, d, true), f = resp(u, d, false); console.log(lab, "check rise", r.t.toFixed(1), "onset2%", r.onset2.toFixed(1), "first tick", r.firstTick.toExponential(2), "| fall", f.t.toFixed(1)); }
