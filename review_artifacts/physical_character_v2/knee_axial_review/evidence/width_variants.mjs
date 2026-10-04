const d2r = Math.PI / 180, cap = 27.3, Tcap = cap, dS = 3, B = 6;
function side(sw, hw, tauH) { const A = tauH / (Math.exp(B * (hw - sw) * d2r) - 1), kS = Math.max(0, (Tcap - A * (Math.exp(B * (hw - sw + dS) * d2r) - 1)) / dS);
  const T = (x) => x <= sw ? 0 : A * (Math.exp(B * (x - sw) * d2r) - 1) + (x > hw ? kS * (x - hw) : 0);
  return (Tq) => { let lo = 0, hi = 90; for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (T(m) < Tq) lo = m; else hi = m; } return lo; }; }
for (const [si, hi, se, he, ext, tauH] of [[2, 13, 1, 23, 0.45, 15], [3, 14, 1.5, 24, 0.5, 15], [3, 14.5, 1.5, 24.5, 0.5, 15], [3.5, 14.5, 2, 24.5, 0.5, 15], [3, 13.5, 1.5, 23.5, 0.5, 13], [3, 14, 2, 24, 0.5, 15]]) {
  const I = side(si, hi, tauH), E = side(se, he, tauH), I0 = side(si, hi, tauH), E0 = side(se * ext, he * ext, tauH);
  const r = (f, t) => f(t).toFixed(1);
  console.log(`IR s${si} h${hi} ER s${se} h${he} ext${ext} τh${tauH}: plateau IR ${[2.5, 5, 10, 15, 27].map(t => r(I, t)).join("/")} ER ${[2.5, 5, 10, 15, 27].map(t => r(E, t)).join("/")} | tot5 plateau ${(I(5) + E(5)).toFixed(1)}, tot6 ${(I(6) + E(6)).toFixed(1)} | 0°: IR5 ${r(I0, 5)} ER5 ${r(E0, 5)} tot5 ${(I0(5) + E0(5)).toFixed(1)}`); }
