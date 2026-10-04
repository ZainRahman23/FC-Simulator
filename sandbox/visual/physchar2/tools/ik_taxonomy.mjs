// ═══ physchar2/tools/ik_taxonomy.mjs — pre-G4 runway (anatomical reachability): is "not found by the bounded IK" ever "actually feasible"?
// For every target that the production IK reaches geometrically but the opt-in bounded IK does NOT reach inside the anatomical hard limits
// (same states / targets as tools/ik_g4_study.mjs), an aggressive search: the bounded projected LM (production chain, same tolerances) from
// 256 starts — the 64 corners of the joint box shrunk 2 % inward, plus 192 Halton points inside the box — and the warm start. Result per target:
//   FEASIBLE        a start converged to residual ≤ 1e-6 inside the limits (the warm-start solver MISSED it: a solver failure)
//   NOT-FOUND       no start converged; min residual over all starts reported (evidence for, not proof of, infeasibility)
//   PROVEN-GEOM     the hip → ankle-target distance exceeds the leg's maximal reach (a certificate; does not apply here by construction)
// usage: node tools/ik_taxonomy.mjs [--bodies=V2-REF,…] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { IK } from "../ctrl/v2_stand.js"; import { V, Q, dnorm, unitStates, unitEv } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI;
const BODIES = ((process.argv.find(a => a.startsWith("--bodies=")) || "").slice(9) || VARIATION_SET.map(h => h.id).join(",")).split(",");
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
function boundedFrom(C, lo, hi, xs, maxIt = 60) { const clamp = (y) => y.map((v, i) => Math.min(hi[i], Math.max(lo[i], v))); let x = clamp(xs), r = C.fk(x), err = dnorm(...r), mu = IK.mu0;
  for (let it = 0; it < maxIt && err > IK.tol; it++) { const Jm = C.jac(x), g = Jm.map(col => dot(col, r)), free = [0, 1, 2, 3, 4, 5].filter(i => !((x[i] <= lo[i] && g[i] > 0) || (x[i] >= hi[i] && g[i] < 0)));
    if (!free.length || Math.sqrt(free.reduce((s, i) => s + g[i] * g[i], 0)) < IK.gradTol) break; const H = Jm.map(ci => Jm.map(cj => dot(ci, cj))); let ok = false;
    for (let t = 0; t < 8; t++) { const dx = solveN(free.map(i => free.map(c => (i === c ? H[i][c] + mu * (1 + H[i][i]) : H[i][c]))), free.map(i => -g[i])); if (!dx) { mu *= 10; continue; }
      const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), rn = C.fk(xc), en = dnorm(...rn); if (en < err) { x = xc; r = rn; err = en; mu = Math.max(IK.muMin, mu / 10); ok = true; break; } mu *= 10; }
    if (!ok) break; } return { x, err }; }
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }, PR = [2, 3, 5, 7, 11, 13];
function captureState(spec, key, T, n) { const s = new G3Sim(J, spec, g3Def(key), {}); let cap = null; const o = s.ctrl.legIK.bind(s.ctrl), want = { on: false };
  s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want.on && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return o(st, ev, nn, pP, qP, fp); };
  while (s.n * s.dt < T - 1e-9 && s.tick()); want.on = true; s.tick(); s.ctrl.legIK = o; return { s, ctrl: s.ctrl, cap }; }
const TARGETS = []; for (const hgt of [0, 0.05, 0.10]) for (const [fwd, lat, fam] of [[0.15, 0, "short forward"], [0.30, 0, "medium forward"], [0.45, 0, "long forward"], [0.60, 0, "very long forward"], [-0.10, 0, "slight backward"], [0, -0.08, "inward (crossing)"], [0.10, -0.15, "far crossing"], [0, 0.10, "outward"], [0, 0.20, "far outward"], [0.30, 0.10, "diagonal out"], [0.30, -0.06, "diagonal in"], [0.15, 0.05, "wider short step"], [0.15, -0.04, "narrower short step"]])
  for (const yaw of [0, 30, -30, 45, -45]) TARGETS.push({ fwd, lat, hgt, yaw, fam });
const rows = [];
for (const id of BODIES) { const spec = generateSpec(VARIATION_SET.find(h => h.id === id));
  for (const [key, T, n, state] of [["U:R", 8, 0, "swing-ready"], ["U:L", 8, 1, "swing-ready"], ["T5", 6, 0, "near-single-support"], ["T6", 6, 1, "near-single-support"]]) {
    const { s, ctrl, cap } = captureState(spec, key, T, n); if (!cap) { s.destroy(); continue; }
    const st = cap.st, ev = cap.ev, ft0 = cap.foot || st[ctrl.feet[n]], fw = Q.rot(st[ctrl.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), latOut = n === 0 ? V.sc([hd[2], 0, -hd[0]], -1) : [hd[2], 0, -hd[0]], sg = n === 0 ? -1 : 1;
    const L = ctrl.legK[n].map(k => spec.joints[k].limits.hard), lo = [L[0].lo[0], L[0].lo[1], L[0].lo[2], L[1].lo[1], L[2].lo[1], L[2].lo[2]], hi = [L[0].hi[0], L[0].hi[1], L[0].hi[2], L[1].hi[1], L[2].hi[1], L[2].hi[2]];
    const Lmax = V.len(ctrl.anchor[ctrl.legK[n][1]]) + V.len(ctrl.anchor[ctrl.legK[n][2]]);
    for (const drop of [0, 0.05, 0.10]) for (const t of TARGETS) { const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, t.fwd)), V.sc(latOut, t.lat)), [0, t.hgt, 0]), rot: Q.norm(Q.mul(Q.axis([0, 1, 0], sg * t.yaw / D), ft0.rot)) };
      const U = ctrl.legIK(st, ev, n, pP, cap.qP, foot); if (!(U.err <= 1e-6)) continue; const B = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot); if (B.err <= 1e-6) continue;
      const C = ctrl.legChain(st, ev, n, pP, cap.qP, foot), starts = [];
      for (let c = 0; c < 64; c++) starts.push(lo.map((l, i) => { const m = 0.02 * (hi[i] - l); return (c >> i) & 1 ? hi[i] - m : l + m; }));
      for (let h = 1; h <= 192; h++) starts.push(lo.map((l, i) => l + (hi[i] - l) * halton(h, PR[i])));
      let best = Infinity, found = null; for (const xs of starts) { const R = boundedFrom(C, lo, hi, xs); if (R.err < best) best = R.err; if (R.err <= 1e-6) { found = R; break; } }
      const hip = V.add(pP, Q.rot(cap.qP, ctrl.anchor[ctrl.legK[n][0]])), dist = V.len(V.sub(foot.pos, hip));
      rows.push({ body: id, state, leg: n ? "R" : "L", drop, fam: t.fam, yaw: t.yaw, hgt: t.hgt, cls: found ? "FEASIBLE" : dist > Lmax ? "PROVEN-GEOM" : "NOT-FOUND", minResidual: found ? found.err : best, warmResidual: B.err }); }
    s.destroy(); }
  console.error(`${id}: ${rows.length} targets examined`); }
const c = rows.reduce((o, r) => ((o[r.cls] = (o[r.cls] || 0) + 1), o), {}), nf = rows.filter(r => r.cls === "NOT-FOUND").map(r => r.minResidual).sort((a, b) => a - b);
console.log(`${rows.length} geometric-but-not-anatomical targets; aggressive multistart (warm + 64 corners + 192 Halton): ${JSON.stringify(c)}`);
if (nf.length) console.log(`NOT-FOUND min residual over all starts: min ${nf[0].toExponential(2)} m, median ${nf[nf.length >> 1].toExponential(2)}; warm-start residual = multistart best in ${rows.filter(r => r.cls === "NOT-FOUND" && r.minResidual >= r.warmResidual - 1e-9).length} of ${nf.length}`);
for (const r of rows.filter(r => r.cls === "FEASIBLE").slice(0, 10)) console.log(`  FEASIBLE (warm start missed): ${r.body} ${r.state} ${r.leg} ${r.fam} yaw ${r.yaw} h ${r.hgt} drop ${r.drop}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_taxonomy.mjs", rows }));
