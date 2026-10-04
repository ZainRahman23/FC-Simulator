// ═══ physchar2/tools/ik_anat_study.mjs — user decision 2026-10-04 (Decision 2): anatomical reachability research (DIAGNOSTIC; nothing adopted)
// Same start states and G4-style targets as tools/ik_g4_study.mjs (8 bodies × U:R / U:L swing-ready / T5 / T6 near-single-support; 13 target
// families × foot yaw 0 / ±30 / ±45 × height 0 / 5 / 10 cm; reach sweeps; pelvis drop 0 / 5 / 10 cm).
// PART 1 — characterisation of every target: direction (heading frame), distance (step length, s = hip→target / L_max), foot yaw, height,
//   pelvis drop, morphology, state; the production IK's (U) solution in ANATOMICAL angles (hip rotation / flexion / abduction, knee flexion, ankle
//   DF / inversion; passive-layer anat()), per-axis excursion beyond the hard limits, and the opt-in bounded IK's (B) classification.
// PART 2 — candidate constrained-IK approaches, compared on every target and its mirror image (other leg):
//   M0  production legIKBounded (active-set projected LM, ≤ 30 iterations)                         — the current opt-in candidate
//   M1  the same with ≤ 400 iterations                                                              — REFERENCE for the box-constrained optimum
//   M2e two-stage: M0, then (only if unreached) the box-constrained minimiser of ½‖r‖² + ½ε‖x − a‖², a = the clamped warm start (current
//       pose), ε = 1e-4 / 1e-6 — a well-determined "closest-to-current near-optimal" fallback; reached targets are untouched by construction
//   M3  log-barrier LM (interior method): ½‖r‖² − μ Σ log(slack), μ 1e-4 → 1e-12; reached iff ‖r‖ ≤ 1e-6
//   M4  unconstrained production legIK + post-check against the limits (option O1)
// Metrics: anatomical classification vs M1; reached solutions vs M0 (≤ 1e-9 rad); unreached: residual gap and coordinate distance to M1, KKT
// residual of the method's own problem, iterations, µs; mirror Δ (σ correspondence); determinism (re-solve identical).
// usage: node tools/ik_anat_study.mjs [--quick] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { IK } from "../ctrl/v2_stand.js"; import { pyr } from "../spec/v2_joints.js"; import { V, Q, dnorm, unitStates, unitEv } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), QUICK = process.argv.includes("--quick"), OUT = process.argv.slice(2).find(a => a.endsWith(".json"));
const D = 180 / Math.PI, m3 = (p) => [-p[0], p[1], p[2]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]], SIG = [-1, 1, -1, 1, 1, -1];
const lr = (n) => (n.endsWith("_L") ? n.slice(0, -2) + "_R" : n.endsWith("_R") ? n.slice(0, -2) + "_L" : n), now = () => process.hrtime.bigint(), us = (t0) => Number(process.hrtime.bigint() - t0) / 1e3;
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
function boxOf(ctrl, n) { const L = ctrl.legK[n].map(k => ctrl.spec.joints[k].limits.hard); return { lo: [L[0].lo[0], L[0].lo[1], L[0].lo[2], L[1].lo[1], L[2].lo[1], L[2].lo[2]], hi: [L[0].hi[0], L[0].hi[1], L[0].hi[2], L[1].hi[1], L[2].hi[1], L[2].hi[2]] }; }
// KKT residual of min f on the box, gradient g
const kktOf = (x, g, B) => Math.max(...g.map((gi, i) => (x[i] <= B.lo[i] ? Math.max(0, -gi) : x[i] >= B.hi[i] ? Math.max(0, gi) : Math.abs(gi))));
// M2: box-constrained minimiser of ½‖r‖² + ½ε‖x − a‖² by active-set projected LM on the augmented residual, from x1
function regularised(C, B, x1, a, eps, maxIt = 60) { const clamp = (y) => y.map((v, i) => Math.min(B.hi[i], Math.max(B.lo[i], v))), se = Math.sqrt(eps);
  const phi = (x, r) => 0.5 * dot(r, r) + 0.5 * eps * x.reduce((s, v, i) => s + (v - a[i]) ** 2, 0);
  let x = clamp(x1), r = C.fk(x), f = phi(x, r), mu = IK.mu0, it = 0, g = null;
  for (; it < maxIt; it++) { const Jm = C.jac(x); g = Jm.map((col, c) => dot(col, r) + eps * (x[c] - a[c]));
    const free = [0, 1, 2, 3, 4, 5].filter(i => !((x[i] <= B.lo[i] && g[i] > 0) || (x[i] >= B.hi[i] && g[i] < 0))); if (!free.length || Math.sqrt(free.reduce((s, i) => s + g[i] * g[i], 0)) < 1e-15) break;
    const H = Jm.map((ci, i) => Jm.map((cj, j) => dot(ci, cj) + (i === j ? eps : 0))); let ok = false;
    for (let t = 0; t < 8; t++) { const dx = solveN(free.map(i => free.map(c => (i === c ? H[i][c] + mu * (1 + H[i][i]) : H[i][c]))), free.map(i => -g[i])); if (!dx) { mu *= 10; continue; }
      const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), rn = C.fk(xc), fn = phi(xc, rn); if (fn < f) { x = xc; r = rn; f = fn; mu = Math.max(IK.muMin, mu / 10); ok = true; break; } mu *= 10; }
    if (!ok) break; }
  const Jm = C.jac(x), gg = Jm.map((col, c) => dot(col, r) + eps * (x[c] - a[c])); return { x, err: dnorm(...r), it, kkt: kktOf(x, gg, B) }; }
// M5: box-constrained minimiser of Φ = ½‖r‖² + ½ε‖x − a‖² by a PROJECTED DAMPED NEWTON method with the FULL Hessian (JᵀJ + Σ rᵢ∇²rᵢ + εI,
// central differences of the gradient), from x1. Gauss–Newton (M0 / M2) drops Σ rᵢ∇²rᵢ, which dominates at a large-residual (unreachable) optimum.
function newtonReg(C, B, x1, a, eps, maxIt = 25) { const clamp = (y) => y.map((v, i) => Math.min(B.hi[i], Math.max(B.lo[i], v))), hN = 1e-5;
  const grad = (x) => { const Jm = C.jac(x), r = C.fk(x); return { g: Jm.map((col, c) => dot(col, r) + eps * (x[c] - a[c])), r }; };
  const phi = (x, r) => 0.5 * dot(r, r) + 0.5 * eps * x.reduce((s2, v, i) => s2 + (v - a[i]) ** 2, 0);
  let x = clamp(x1), G0 = grad(x), f = phi(x, G0.r), it = 0;
  for (; it < maxIt; it++) { const g = G0.g, free = [0, 1, 2, 3, 4, 5].filter(i => !((x[i] <= B.lo[i] && g[i] > 0) || (x[i] >= B.hi[i] && g[i] < 0)));
    if (!free.length || Math.sqrt(free.reduce((s2, i) => s2 + g[i] * g[i], 0)) < 1e-14) break;
    const H = [0, 1, 2, 3, 4, 5].map(() => new Array(6).fill(0)); for (let c = 0; c < 6; c++) { const xp = x.slice(), xm = x.slice(); xp[c] += hN; xm[c] -= hN; const gp = grad(xp).g, gm = grad(xm).g; for (let i = 0; i < 6; i++) H[i][c] = (gp[i] - gm[i]) / (2 * hN); }
    for (let i = 0; i < 6; i++) for (let c = i + 1; c < 6; c++) { const m = 0.5 * (H[i][c] + H[c][i]); H[i][c] = m; H[c][i] = m; }
    let ok = false; for (let lam = 0, t = 0; t < 12; t++, lam = lam ? lam * 10 : 1e-10) { const dx = solveN(free.map(i => free.map(c => (i === c ? H[i][c] + lam : H[i][c]))), free.map(i => -g[i])); if (!dx || free.reduce((s2, i, k) => s2 + g[i] * dx[k], 0) >= 0) continue;
      const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), Gn = grad(xc), fn = phi(xc, Gn.r); if (fn < f || (fn === f && xc.some((v, i) => v !== x[i]))) { const same = xc.every((v, i) => v === x[i]); x = xc; G0 = Gn; f = fn; ok = !same; break; } }
    if (!ok) break; }
  return { x, err: dnorm(...G0.r), it, kkt: kktOf(x, G0.g, B) }; }
// M3: log-barrier LM, μ 1e-4 → 1e-12 (×0.01), from the warm start pulled 1e-9 inside the box
function barrier(C, B, x0) { const pad = (lo, hi) => Math.min(1e-6, (hi - lo) * 1e-3); let x = x0.map((v, i) => Math.min(B.hi[i] - pad(B.lo[i], B.hi[i]), Math.max(B.lo[i] + pad(B.lo[i], B.hi[i]), v))), it = 0;
  const psi = (x, r, mu) => { let b = 0; for (let i = 0; i < 6; i++) { const s1 = x[i] - B.lo[i], s2 = B.hi[i] - x[i]; if (!(s1 > 0 && s2 > 0)) return Infinity; b -= Math.log(s1) + Math.log(s2); } return 0.5 * dot(r, r) + mu * b; };
  for (let mu = 1e-4; mu >= 1e-12; mu *= 0.01) { let r = C.fk(x), f = psi(x, r, mu), lm = IK.mu0;
    for (let k = 0; k < 25; k++, it++) { const Jm = C.jac(x), g = Jm.map((col, c) => dot(col, r) - mu / (x[c] - B.lo[c]) + mu / (B.hi[c] - x[c])); if (Math.sqrt(dot(g, g)) < 1e-15) break;
      const H = Jm.map((ci, i) => Jm.map((cj, j) => dot(ci, cj) + (i === j ? mu / (x[i] - B.lo[i]) ** 2 + mu / (B.hi[i] - x[i]) ** 2 : 0))); let ok = false;
      for (let t = 0; t < 10; t++) { const dx = solveN(H.map((row, i) => row.map((v, c) => (i === c ? v + lm * (1 + v) : v))), g.map(v => -v)); if (!dx) { lm *= 10; continue; }
        const xn = x.map((v, i) => v + dx[i]), rn = C.fk(xn), fn = psi(xn, rn, mu); if (fn < f) { x = xn; r = rn; f = fn; lm = Math.max(IK.muMin, lm / 10); ok = true; break; } lm *= 10; }
      if (!ok) break; } }
  return { x, err: dnorm(...C.fk(x)), it }; }
function captureState(spec, key, T, n) { const s = new G3Sim(J, spec, g3Def(key), {}); let cap = null; const o = s.ctrl.legIK.bind(s.ctrl), want = { on: false };
  s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want.on && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return o(st, ev, nn, pP, qP, fp); };
  while (s.n * s.dt < T - 1e-9 && s.tick()); want.on = true; s.tick(); s.ctrl.legIK = o; return { s, ctrl: s.ctrl, cap }; }
const TARGETS = []; for (const hgt of [0, 0.05, 0.10]) for (const [fwd, lat, fam] of [[0.15, 0, "short forward"], [0.30, 0, "medium forward"], [0.45, 0, "long forward"], [0.60, 0, "very long forward"], [-0.10, 0, "slight backward"], [0, -0.08, "inward (crossing)"], [0.10, -0.15, "far crossing"], [0, 0.10, "outward"], [0, 0.20, "far outward"], [0.30, 0.10, "diagonal out"], [0.30, -0.06, "diagonal in"], [0.15, 0.05, "wider short step"], [0.15, -0.04, "narrower short step"]])
  for (const yaw of [0, 30, -30, 45, -45]) TARGETS.push({ fwd, lat, hgt, yaw, fam });
const bodies = QUICK ? VARIATION_SET.filter(h => ["V2-REF", "V2-short-legs"].includes(h.id)) : VARIATION_SET, rows = [];
for (const h of bodies) { const spec = generateSpec(h), map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name)));
  for (const [key, T, n, state] of [["U:R", 8, 0, "swing-ready"], ["U:L", 8, 1, "swing-ready"], ["T5", 6, 0, "near-single-support"], ["T6", 6, 1, "near-single-support"]]) {
    const { s, ctrl, cap } = captureState(spec, key, T, n); if (!cap) { s.destroy(); continue; }
    const st = cap.st, ev = cap.ev, P = s.P, ks = ctrl.legK[n], ksM = ctrl.legK[1 - n], B = boxOf(ctrl, n), BM = boxOf(ctrl, 1 - n), ft0 = cap.foot || st[ctrl.feet[n]];
    const fwd = Q.rot(st[ctrl.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fwd[0], 0, fwd[2]]), latOut = n === 0 ? V.sc([hd[2], 0, -hd[0]], -1) : [hd[2], 0, -hd[0]];
    const hip = V.add(cap.pP, Q.rot(cap.qP, ctrl.anchor[ks[0]])), Lmax = V.len(ctrl.anchor[ks[1]]) + V.len(ctrl.anchor[ks[2]]);
    const stM = map.map(i => st[i]).map(b => ({ pos: m3(b.pos), rot: mq(b.rot), com: m3(b.com), v: m3(b.v), w: mw(b.w) })), evM = unitEv(s.P.compute(stM, s.dt).ev);
    const anat = (x, cur) => { const qh = pyr(x[0], x[1], x[2]), qk = pyr(cur[1][0], x[3], cur[1][2]), qa = pyr(cur[2][0], x[4], x[5]);
      return [P.anat(P.jd[ks[0]], qh, "rot"), P.anat(P.jd[ks[0]], qh, "flex"), P.anat(P.jd[ks[0]], qh, "abd"), P.anat(P.jd[ks[1]], qk, "flex"), P.anat(P.jd[ks[2]], qa, "df"), P.anat(P.jd[ks[2]], qa, "inv")].map(v => +v.toFixed(3)); };   // anat() returns degrees
    const all = TARGETS.map(t => ({ ...t, pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, t.fwd)), V.sc(latOut, t.lat)), [0, t.hgt, 0]), rot: Q.mul(Q.axis([0, 1, 0], (n === 0 ? -1 : 1) * t.yaw / D), ft0.rot) }));
    for (const sv of [0.95, 0.98, 0.99, 0.995, 1.0, 1.005, 1.02]) for (const dirFam of ["forward", "outward", "down-forward"]) { const dir = dirFam === "forward" ? V.norm(V.add(V.sc(hd, 0.6), [0, -0.8, 0])) : dirFam === "outward" ? V.norm(V.add(V.sc(latOut, 0.45), [0, -0.9, 0])) : V.norm(V.add(V.sc(hd, 0.3), [0, -0.95, 0]));
      all.push({ fam: `reach sweep ${dirFam}`, sv, yaw: 0, pos: V.add(hip, V.sc(dir, sv * Lmax)), rot: ft0.rot.slice() }); }
    for (const drop of [0, 0.05, 0.10]) for (const t of all) { const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: t.pos, rot: Q.norm(t.rot) }, footM = { pos: m3(t.pos), rot: mq(foot.rot) };
      const C = ctrl.legChain(st, ev, n, pP, cap.qP, foot), CM = ctrl.legChain(stM, evM, 1 - n, m3(pP), mq(cap.qP), footM), a = C.x0.map((v, i) => Math.min(B.hi[i], Math.max(B.lo[i], v))), aM = CM.x0.map((v, i) => Math.min(BM.hi[i], Math.max(BM.lo[i], v)));
      let t0 = now(); const U = ctrl.legIK(st, ev, n, pP, cap.qP, foot), usU = us(t0);
      t0 = now(); const M0 = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot), us0 = us(t0), M0m = ctrl.legIKBounded(stM, evM, 1 - n, m3(pP), mq(cap.qP), footM), M0r = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot);
      const reached0 = M0.err <= 1e-6, rec = { body: h.id, state, leg: n ? "R" : "L", drop, fam: t.fam, yaw: t.yaw, fwd: t.fwd ?? null, lat: t.lat ?? null, hgt: t.hgt ?? null,
        s: +(V.len(V.sub(foot.pos, V.add(pP, Q.rot(cap.qP, ctrl.anchor[ks[0]])))) / Lmax).toFixed(4), geom: U.err <= 1e-6, anat: reached0, errU: U.err, errB: M0.err,
        angU: anat(U.x, C.cur), viol: U.x.map((v, i) => +((v < B.lo[i] ? (B.lo[i] - v) : v > B.hi[i] ? (v - B.hi[i]) : 0) * D).toFixed(3)), angB: anat(M0.x, C.cur), atBoundB: M0.atBound.map(Number).join(""),
        m0: { it: M0.it, us: +us0.toFixed(1), mir: Math.max(...M0.x.map((v, i) => Math.abs(v - SIG[i] * M0m.x[i]))), cls: (M0m.err <= 1e-6) === reached0, det: M0r.x.every((v, i) => v === M0.x[i]) }, usU: +usU.toFixed(1),
        m4: { cls: (U.err <= 1e-6 && U.x.every((v, i) => v >= B.lo[i] && v <= B.hi[i])) === reached0 } };
      // M3 barrier on every target (classification + reached-solution agreement)
      t0 = now(); const M3 = barrier(C, B, C.x0), us3 = us(t0), M3m = barrier(CM, BM, CM.x0); rec.m3 = { reached: M3.err <= 1e-6, it: M3.it, us: +us3.toFixed(1), dReached: reached0 && M3.err <= 1e-6 ? Math.max(...M3.x.map((v, i) => Math.abs(v - M0.x[i]))) : null, mir: Math.max(...M3.x.map((v, i) => Math.abs(v - SIG[i] * M3m.x[i]))), errGap: M3.err - M0.err };
      if (!reached0) { const sv = IK.maxItBounded; IK.maxItBounded = 400; t0 = now(); const M1 = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot), us1 = us(t0); IK.maxItBounded = sv;
        const g1 = C.jac(M1.x).map(col => dot(col, C.fk(M1.x))); rec.m1 = { it: M1.it, us: +us1.toFixed(1), err: M1.err, kkt: kktOf(M1.x, g1, B) };
        const g0 = C.jac(M0.x).map(col => dot(col, C.fk(M0.x))); rec.m0.kkt = kktOf(M0.x, g0, B); rec.m0.errGap = M0.err - M1.err; rec.m0.dRef = Math.max(...M0.x.map((v, i) => Math.abs(v - M1.x[i]))) * D;
        for (const eps of [0, 1e-6]) { t0 = now(); const N5 = newtonReg(C, B, M0.x, a, eps), us5 = us(t0), N5m = newtonReg(CM, BM, M0m.x, aM, eps), N5r = newtonReg(C, B, M0.x, a, eps);
          rec["m5_" + eps] = { it: N5.it, us: +(us0 + us5).toFixed(1), kkt: N5.kkt, errGap: N5.err - M1.err, dRef: Math.max(...N5.x.map((v, i) => Math.abs(v - M1.x[i]))) * D, dAnchor: Math.sqrt(N5.x.reduce((s2, v, i) => s2 + (v - a[i]) ** 2, 0)) * D,
            mir: Math.max(...N5.x.map((v, i) => Math.abs(v - SIG[i] * N5m.x[i]))) * D, det: N5r.x.every((v, i) => v === N5.x[i]) }; }
        for (const eps of [1e-4, 1e-6]) { t0 = now(); const R2 = regularised(C, B, M0.x, a, eps), us2 = us(t0), R2m = regularised(CM, BM, M0m.x, aM, eps), R2r = regularised(C, B, M0.x, a, eps);
          rec["m2_" + eps] = { it: R2.it, us: +(us0 + us2).toFixed(1), kkt: R2.kkt, errGap: R2.err - M1.err, dRef: Math.max(...R2.x.map((v, i) => Math.abs(v - M1.x[i]))) * D, dAnchor: Math.sqrt(R2.x.reduce((s2, v, i) => s2 + (v - a[i]) ** 2, 0)) * D, dAnchorRef: Math.sqrt(M1.x.reduce((s2, v, i) => s2 + (v - a[i]) ** 2, 0)) * D,
            mir: Math.max(...R2.x.map((v, i) => Math.abs(v - SIG[i] * R2m.x[i]))) * D, det: R2r.x.every((v, i) => v === R2.x[i]) }; } }
      rows.push(rec); }
    s.destroy(); }
  console.error(`${h.id}: ${rows.length} rows`); }
// ── summary ──
const q = (a, p) => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; }, mx = (a) => { const v = a.filter(x => x != null && isFinite(x)); return v.length ? Math.max(...v) : NaN; }, e = (x) => (isFinite(x) ? (+x).toExponential(2) : "—"), f1 = (x) => (isFinite(x) ? (+x).toFixed(1) : "—");
const inval = rows.filter(r => r.geom && !r.anat), AX = ["hip rot", "hip flex", "hip abd", "knee flex", "ankle DF", "ankle inv"];
console.log(`PART 1 — ${rows.length} targets; geometric ${rows.filter(r => r.geom).length}; anatomical ${rows.filter(r => r.anat).length}; geometric-but-not-anatomical ${inval.length}`);
const grp = (keyf, R = inval, base = rows.filter(r => r.geom)) => { const o = {}; for (const r of base) { const k = keyf(r); (o[k] = o[k] || { geom: 0, inval: 0 }).geom++; } for (const r of R) o[keyf(r)].inval++; return o; };
console.log("by foot yaw:", JSON.stringify(grp(r => r.yaw))); console.log("by family:", JSON.stringify(grp(r => r.fam))); console.log("by body:", JSON.stringify(grp(r => r.body))); console.log("by state:", JSON.stringify(grp(r => r.state))); console.log("by pelvis drop:", JSON.stringify(grp(r => r.drop))); console.log("by height:", JSON.stringify(grp(r => r.hgt)));
for (const [i, a] of AX.entries()) { const v = inval.filter(r => r.viol[i] > 0); console.log(`${a}: ${v.length} invalid targets bind it; excess median ${f1(q(v.map(r => r.viol[i]), 0.5))}° p90 ${f1(q(v.map(r => r.viol[i]), 0.9))}° max ${f1(mx(v.map(r => r.viol[i])))}°; U solution anatomical angle range ${f1(Math.min(...v.map(r => r.angU[i])))} … ${f1(mx(v.map(r => r.angU[i])))}°`); }
console.log(`knee flexion (anatomical) in invalid U solutions: median ${f1(q(inval.map(r => r.angU[3]), 0.5))}°, range ${f1(Math.min(...inval.map(r => r.angU[3])))} … ${f1(mx(inval.map(r => r.angU[3])))}°; ankle DF ${f1(Math.min(...inval.map(r => r.angU[4])))} … ${f1(mx(inval.map(r => r.angU[4])))}°; inversion ${f1(Math.min(...inval.map(r => r.angU[5])))} … ${f1(mx(inval.map(r => r.angU[5])))}°`);
const y0 = inval.filter(r => r.yaw === 0); console.log(`invalid at foot yaw 0 (plausible in normal gait): ${y0.length}`); for (const r of y0.slice(0, 40)) console.log(`  ${r.body} ${r.state} ${r.leg} drop ${r.drop} ${r.fam} h ${r.hgt} s ${r.s}: viol ${r.viol.join(",")} | U angles ${r.angU.join(",")}`);
console.log("\nPART 2 — methods (unreached = M0 not reached; reference M1 = 400 iterations)");
const un = rows.filter(r => !r.anat), re = rows.filter(r => r.anat);
console.log(`M0 production bounded: classification L/R mismatches ${rows.filter(r => !r.m0.cls).length}; determinism ${rows.filter(r => r.m0.det).length}/${rows.length}; µs p50 ${f1(q(rows.map(r => r.m0.us), 0.5))} p99 ${f1(q(rows.map(r => r.m0.us), 0.99))}; unreached ${un.length}: KKT p50 ${e(q(un.map(r => r.m0.kkt), 0.5))} max ${e(mx(un.map(r => r.m0.kkt)))}; residual gap to M1 max ${e(mx(un.map(r => r.m0.errGap)))} m; Δx to M1 p50 ${f1(q(un.map(r => r.m0.dRef), 0.5))}° p99 ${f1(q(un.map(r => r.m0.dRef), 0.99))}° max ${f1(mx(un.map(r => r.m0.dRef)))}°; mirror Δ unreached max ${e(mx(un.map(r => r.m0.mir)))} rad`);
console.log(`M1 reference (400 it): iterations p50 ${q(un.map(r => r.m1.it), 0.5)} max ${mx(un.map(r => r.m1.it))}; KKT max ${e(mx(un.map(r => r.m1.kkt)))}; at the cap: ${un.filter(r => r.m1.it >= 400).length}; µs p50 ${f1(q(un.map(r => r.m1.us), 0.5))} max ${f1(mx(un.map(r => r.m1.us)))}`);
for (const eps of [1e-4, 1e-6]) { const k = "m2_" + eps; console.log(`M2 ε=${eps}: unreached ${un.length}: iterations p50 ${q(un.map(r => r[k].it), 0.5)} max ${mx(un.map(r => r[k].it))}; KKT (own problem) max ${e(mx(un.map(r => r[k].kkt)))}; residual cost vs M1 max ${e(mx(un.map(r => r[k].errGap)))} m (p50 ${e(q(un.map(r => r[k].errGap), 0.5))}); Δx to M1 max ${f1(mx(un.map(r => r[k].dRef)))}°; distance to current pose: M2 p50 ${f1(q(un.map(r => r[k].dAnchor), 0.5))}° vs M1 ${f1(q(un.map(r => r[k].dAnchorRef), 0.5))}°; mirror Δ max ${e(mx(un.map(r => r[k].mir)))}°; determinism ${un.filter(r => r[k].det).length}/${un.length}; µs total p50 ${f1(q(un.map(r => r[k].us), 0.5))} p99 ${f1(q(un.map(r => r[k].us), 0.99))}`); }
for (const eps of [0, 1e-6]) { const k = "m5_" + eps; console.log(`M5 Newton ε=${eps}: unreached ${un.length}: iterations p50 ${q(un.map(r => r[k].it), 0.5)} max ${mx(un.map(r => r[k].it))}; KKT (own problem) p50 ${e(q(un.map(r => r[k].kkt), 0.5))} p99 ${e(q(un.map(r => r[k].kkt), 0.99))} max ${e(mx(un.map(r => r[k].kkt)))}; residual vs M1 (− = better) max ${e(mx(un.map(r => r[k].errGap)))} m, min ${e(Math.min(...un.map(r => r[k].errGap)))}; Δx to M1 max ${f1(mx(un.map(r => r[k].dRef)))}°; mirror Δ max ${e(mx(un.map(r => r[k].mir)))}°; determinism ${un.filter(r => r[k].det).length}/${un.length}; µs total p50 ${f1(q(un.map(r => r[k].us), 0.5))} p99 ${f1(q(un.map(r => r[k].us), 0.99))}`); }
console.log(`M3 log-barrier: classification vs M0 mismatches ${rows.filter(r => r.m3.reached !== r.anat).length} (reached by M3 not M0 ${rows.filter(r => r.m3.reached && !r.anat).length}, by M0 not M3 ${rows.filter(r => !r.m3.reached && r.anat).length}); reached-solution Δ vs M0 max ${e(mx(re.map(r => r.m3.dReached)))} rad; mirror Δ max ${e(mx(rows.map(r => r.m3.mir)))} rad; iterations p50 ${q(rows.map(r => r.m3.it), 0.5)}; µs p50 ${f1(q(rows.map(r => r.m3.us), 0.5))} p99 ${f1(q(rows.map(r => r.m3.us), 0.99))}; unreached residual vs M0 (− = better) p50 ${e(q(un.map(r => r.m3.errGap), 0.5))}`);
console.log(`M4 unconstrained + post-check: classification vs M0 mismatches ${rows.filter(r => !r.m4.cls).length}; µs p50 ${f1(q(rows.map(r => r.usU), 0.5))}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_anat_study.mjs", date: new Date().toISOString().slice(0, 10), rows }));
