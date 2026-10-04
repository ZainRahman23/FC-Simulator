// Can the V2 law structure (zero inside soft; A(e^{B(x−s)}−1) from soft to hard reaching tauH at hard; linear end-stop to Tcap at hard+δ)
// reproduce the literature per-side curve (bone-level, in vivo, relaxed, unloaded, mid-flexion)? Anchors = centre of the literature bands.
const IR = [[2.5, 4.0], [5, 7.0], [10, 10.0], [15, 12.0], [30, 14.5]], ER = [[2.5, 8.5], [5, 13.0], [10, 18.5], [15, 21.0], [30, 23.5]];
const d2r = Math.PI / 180;
function lawT(x, s, h, B, tauH, Tcap, dS) { if (x <= s) return 0; const A = tauH / (Math.exp(B * (h - s) * d2r) - 1); let T = A * (Math.exp(B * (x - s) * d2r) - 1);
  if (x > h) { const kS = Math.max(0, (Tcap - A * (Math.exp(B * (h - s + dS) * d2r) - 1)) / dS); T += kS * (x - h); } return T; }
function invT(T, p) { let lo = 0, hi = 60; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lawT(m, ...p) < T) lo = m; else hi = m; } return lo; }
function fit(anch, B, tauH, Tcap, dS) { let best = null;
  for (let s = 0; s <= 20; s += 0.25) for (let h = s + 1; h <= 40; h += 0.25) { const p = [s, h, B, tauH, Tcap, dS]; let e = 0; for (const [T, x] of anch) e += (invT(T, p) - x) ** 2;
    if (!best || e < best.e) best = { e, s, h, pred: anch.map(([T]) => invT(T, p).toFixed(1)) }; } return best; }
const cases = [["V2 generic: B 6/rad, tauH 6.8 (25 % cap), end-stop 27.3 @ +3°", 6, 6.8, 27.3, 3], ["B 11.5/rad (lit 0.2/°), tauH 6.8, end-stop 27.3 @ +3°", 11.5, 6.8, 27.3, 3],
  ["B 6/rad, tauH 15, end-stop 30 @ +3°", 6, 15, 30, 3], ["B 11.5/rad, tauH 15 (hard = clinical end-feel), end-stop 30 @ +3°", 11.5, 15, 30, 3], ["B 8.6/rad (0.15/°), tauH 15, end-stop 30 @ +3°", 8.6, 15, 30, 3]];
console.log("anchors IR (T N·m → °): " + IR.map(a => a.join("→")).join(", ") + " | ER: " + ER.map(a => a.join("→")).join(", "));
for (const [name, B, tauH, Tcap, dS] of cases) { const fi = fit(IR, B, tauH, Tcap, dS), fe = fit(ER, B, tauH, Tcap, dS);
  console.log(`${name}\n   IR: soft ${fi.s}, hard ${fi.h}, pred ${fi.pred.join("/")}, rms ${Math.sqrt(fi.e / IR.length).toFixed(2)}°   ER: soft ${fe.s}, hard ${fe.h}, pred ${fe.pred.join("/")}, rms ${Math.sqrt(fe.e / ER.length).toFixed(2)}°`); }
