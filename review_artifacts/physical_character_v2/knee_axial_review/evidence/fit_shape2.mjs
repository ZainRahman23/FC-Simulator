// Refit of the V2 law structure to the in-vivo bone-level anchors as finally synthesised in KNEE_AXIAL_MODEL_REVIEW.md §3–4
// (per side, degrees from the neutral θ0, relaxed, unloaded, adult male). Anchors = band centres; bands in the review.
// Plateau (30–120°): IR 2.5→4 (Moewis), 5→9 (Hemmerich 8.9, Nordt 10.8@20°, Almquist 10@6 N·m), 10→11.5, 15→13 (Neumann CT 9–15), 30→15.5 (extrapolated)
//                    ER 2.5→8.5 (Moewis 7.6–10), 5→14.5 (Hemmerich 14.6, Almquist 16, Shultz 12.4), 10→20, 15→23 (Neumann 24–25), 30→25.5 (extrapolated)
// Full extension (0°): IR ≈ plateau (Hemmerich 9.5@5 N·m); ER ≈ 0.45 × plateau (Hemmerich 6.2–7.0@5 N·m) — in-vivo central values.
const P_IR = [[2.5, 4.0], [5, 9.0], [10, 11.5], [15, 13.0], [30, 15.5]], P_ER = [[2.5, 8.5], [5, 14.5], [10, 20.0], [15, 23.0], [30, 25.5]];
const d2r = Math.PI / 180;
function lawT(x, s, h, B, tauH, Tcap, dS) { if (x <= s) return 0; const A = tauH / (Math.exp(B * (h - s) * d2r) - 1); let T = A * (Math.exp(B * (x - s) * d2r) - 1);
  if (x > h) { const kS = Math.max(0, (Tcap - A * (Math.exp(B * (h - s + dS) * d2r) - 1)) / dS); T += kS * (x - h); } return T; }
function invT(T, p) { let lo = 0, hi = 80; for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (lawT(m, ...p) < T) lo = m; else hi = m; } return lo; }
function fit(anch, B, tauH, Tcap, dS) { let best = null;
  for (let s = 0; s <= 12; s += 0.25) for (let h = s + 1; h <= 40; h += 0.25) { const p = [s, h, B, tauH, Tcap, dS]; let e = 0; for (const [T, x] of anch) e += (invT(T, p) - x) ** 2;
    if (!best || e < best.e) best = { e, s, h, pred: anch.map(([T]) => invT(T, p).toFixed(1)) }; } return best; }
const cases = [["V2 generic: B 6/rad, τ_hard 6.8 N·m (25 % of capacity), end-stop 27.3 N·m at +3°", 6, 6.8, 27.3, 3],
  ["B 6/rad, τ_hard 15 N·m, end-stop 30 N·m at +3°", 6, 15, 30, 3], ["B 8.6/rad (0.15/°), τ_hard 15, end-stop 30 at +3°", 8.6, 15, 30, 3],
  ["B 11.5/rad (0.20/°), τ_hard 15, end-stop 30 at +3°", 11.5, 15, 30, 3], ["B 6/rad, τ_hard 10 N·m, end-stop 30 at +4°", 6, 10, 30, 4]];
console.log("plateau anchors IR (N·m→°): " + P_IR.map(a => a.join("→")).join(", ") + " | ER: " + P_ER.map(a => a.join("→")).join(", "));
for (const [name, B, tauH, Tcap, dS] of cases) { const fi = fit(P_IR, B, tauH, Tcap, dS), fe = fit(P_ER, B, tauH, Tcap, dS);
  console.log(`${name}\n   IR: soft ${fi.s}, hard ${fi.h}, pred ${fi.pred.join("/")}, rms ${Math.sqrt(fi.e / 5).toFixed(2)}°   ER: soft ${fe.s}, hard ${fe.h}, pred ${fe.pred.join("/")}, rms ${Math.sqrt(fe.e / 5).toFixed(2)}°`); }
