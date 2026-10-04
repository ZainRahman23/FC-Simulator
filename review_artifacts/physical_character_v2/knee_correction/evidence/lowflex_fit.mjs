// Low-flexion parameter derivation for the corrected knee axial law (knee_correction/KNEE_PARAMETERIZATION.md §3). Weighted least squares of the
// V2 law shape (zero torque inside the slack s; A(e^{B(x−s)}−1) from s to a15 reaching τcal = 15 N·m; linear end-stop to the capacity 27.3 N·m
// at a15 + 3°; B = 6/rad) against the IN-VIVO BONE-LEVEL torque-defined laxity points, per side from the neutral, z-scored by each point's SD.
// Flexion factor (multiplies s and a15 on that side): f(φ) = f0 + (1 − f0)·S(φ/35), S = smoothstep. Grid search; prints the best fit, the
// predictions vs every data point (z), and the 1-unit-z-sum profile (parameter ranges compatible with the data: Δ(Σz²) ≤ 1 · n_par).
const d2r = Math.PI / 180, B = 6, TCAL = 15, CAP = 27.3, DS = 3, S = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
function lawInv(T, s, a) { const A = TCAL / (Math.exp(B * (a - s) * d2r) - 1), kS = Math.max(0, (CAP - A * (Math.exp(B * (a - s + DS) * d2r) - 1)) / DS);
  const Tq = (x) => x <= s ? 0 : A * (Math.exp(B * (x - s) * d2r) - 1) + (x > a ? kS * (x - a) : 0); let lo = 0, hi = 90; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Tq(m) < T) lo = m; else hi = m; } return lo; }
// data: [flexion°, torque N·m, value°, SD°, source] — SDs as reported; 'assumed' where the source gives none (marked)
const IR = [[0, 5, 9.55, 3.5, "Hemmerich 2011 0° (M 9.6±4.3, F 9.5±2.7) [SEC Zee 2020]"], [20, 5, 10.8, 4.0, "Nordt 1999 20° CT n=21 (SD not reported: 4 assumed) [SEC]"],
  [30, 5, 8.85, 4.3, "Hemmerich 2011 30° (M 8.9±4.8, F 8.8±3.7)"], [30, 2.5, 3.7, 1.4, "Moewis 2016 30° [FT]"], [90, 2.5, 4.0, 2.0, "Moewis 2016 90° [FT]"],
  [90, 6, 10, 4.0, "Almquist 2002 90° RSA n=5 (SD not reported: 4 assumed) [SEC]"], [30, 10, 11, 3.0, "Neumann 2015a 30° CT 7–15 (n=6; centre, SD 3 assumed) [FT]"], [30, 15, 12, 3.0, "Neumann 2015a 30° CT 9–15 (centre, SD 3 assumed)"]];
const ER = [[0, 5, 6.6, 2.8, "Hemmerich 2011 0° (M 6.2±3.0, F 7.0±2.6)"], [20, 5, 7.4, 4.0, "Nordt 1999 20° (SD 4 assumed)"], [30, 5, 14.25, 5.2, "Hemmerich 2011 30° (M 14.6±5.6, F 13.9±4.7)"],
  [30, 2.5, 7.6, 3.5, "Moewis 2016 30°"], [90, 2.5, 10.0, 3.1, "Moewis 2016 90°"], [90, 6, 16, 4.0, "Almquist 2002 90° (SD 4 assumed)"],
  [30, 5, 18, 3.0, "Neumann 2015a 30° CT 16–20 (centre, SD 3 assumed)"], [30, 10, 22.5, 3.0, "Neumann 2015a 22–23"], [30, 15, 24.5, 3.0, "Neumann 2015a 24–25"]];
function fitSide(data, name, grid) { const res = [];
  for (const s of grid.s) for (const a of grid.a) { if (a <= s + 1) continue; for (const f0 of grid.f0) {
    let z2 = 0; const pred = data.map(([fl, T, v, sd]) => { const f = f0 + (1 - f0) * S(fl / 35), p = lawInv(T, s * f, a * f); z2 += ((p - v) / sd) ** 2; return p; }); res.push({ s, a, f0, z2, pred }); } }
  res.sort((x, y) => x.z2 - y.z2); const b = res[0], ok = res.filter(r => r.z2 <= b.z2 + 3);   // Δχ² ≤ 3 (3 parameters, ~1σ joint region)
  const rng = (k) => [Math.min(...ok.map(r => r[k])), Math.max(...ok.map(r => r[k]))];
  console.log(`\n${name}: best slack s = ${b.s}°, 15 N·m point a15 = ${b.a}°, extension factor f0 = ${b.f0}; Σz² = ${b.z2.toFixed(2)} over ${data.length} points`);
  console.log(`   compatible (Δχ² ≤ 3): s ${rng("s").join("–")}°, a15 ${rng("a").join("–")}°, f0 ${rng("f0").join("–")}`);
  data.forEach(([fl, T, v, sd, src], i) => console.log(`   φ ${String(fl).padStart(2)}° ${String(T).padStart(4)} N·m: data ${v.toFixed(1)} ± ${sd} → model ${b.pred[i].toFixed(1)} (z ${((b.pred[i] - v) / sd).toFixed(2)})  ${src}`));
  return { best: b, range: { s: rng("s"), a15: rng("a"), f0: rng("f0") } }; }
const r = (a, b, st) => { const o = []; for (let x = a; x <= b + 1e-9; x += st) o.push(+x.toFixed(3)); return o; };
const fi = fitSide(IR, "INTERNAL", { s: r(0, 5, 0.5), a: r(9, 18, 0.5), f0: r(0.4, 1.2, 0.05) }), fe = fitSide(ER, "EXTERNAL", { s: r(0, 5, 0.5), a: r(16, 30, 0.5), f0: r(0.3, 1.0, 0.05) });
console.log("\nJSON " + JSON.stringify({ IR: { s: fi.best.s, a15: fi.best.a, f0: fi.best.f0, range: fi.range }, ER: { s: fe.best.s, a15: fe.best.a, f0: fe.best.f0, range: fe.range } }));
// the CHOSEN parameter set (KNEE_PARAMETERIZATION.md §3): IR f0 capped at 1.0 (cadaver data contradict a wider envelope at extension), a minimal
// 1° slack on both sides (inside the compatible 0–4/0–5°; a numerical dead zone, not an anatomical claim)
const chosen = { IR: { s: 1, a: 14, f0: 1.0 }, ER: { s: 1, a: 25, f0: 0.5 } };
for (const [name, data, p] of [["INTERNAL", IR, chosen.IR], ["EXTERNAL", ER, chosen.ER]]) { let z2 = 0;
  const rows = data.map(([fl, T, v, sd, src]) => { const f = p.f0 + (1 - p.f0) * S(fl / 35), m = lawInv(T, p.s * f, p.a * f); z2 += ((m - v) / sd) ** 2; return `   φ ${String(fl).padStart(2)}° ${String(T).padStart(4)} N·m: data ${v.toFixed(1)} ± ${sd} → chosen ${m.toFixed(1)} (z ${((m - v) / sd).toFixed(2)})`; });
  console.log(`\nCHOSEN ${name} (s ${p.s}°, a15 ${p.a}°, f0 ${p.f0}): Σz² = ${z2.toFixed(2)} over ${data.length} points\n` + rows.join("\n")); }
