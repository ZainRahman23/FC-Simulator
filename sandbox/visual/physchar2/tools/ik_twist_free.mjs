// ═══ physchar2/tools/ik_twist_free.mjs — pre-G4 runway (reachability taxonomy): is PROVEN-INFEASIBLE a property of the leg, or of the IK
// problem definition? The production / bounded leg IK solves 6 coordinates (hip 3, knee flexion, ankle DF + inversion) and HOLDS the two
// redundant twist DOFs at their current values: knee axial rotation (actuated) and ankle ab/adduction (passive only). For every target that
// is geometric-but-not-anatomical in the 6-D problem (same states / targets as tools/ik_taxonomy.mjs and tools/ik_certificate.mjs), this
// re-solves with those DOFs FREE inside their own approved hard limits:
//   V7k  knee axial rotation free in its hard limits (7-D)      V7a  ankle ab/adduction free in its hard limits (7-D)      V8  both (8-D)
//   V7ks / V7as / V8s: the same DOFs restricted to their PASSIVELY UNLOADED ranges — knee axial inside its soft range scaled by the approved
//   screw-home coupling (spec COUPLINGS: soft axial range × clamp(kneeFlex/60°, 0.1, 1); parameterised as tw = u·f(flex), u in the uncoupled
//   soft range, so the feasible set is a box in (u, flex)); ankle ab/adduction inside its soft range (±10°).
//   R6 / R7ks (--ref): the twist DOFs held at the posture REFERENCE values (ikRefTwist semantics) instead of the instantaneous ones; R7ks frees
//   the knee axial inside the screw-home-coupled soft range with the ankle ab/adduction at its reference value.
//   --refall: classify EVERY geometric target (not only the 6-D-invalid ones) with the twist DOFs held at the instantaneous values (= the
//   bounded IK) and at the reference values (R6), to count invalid targets under both definitions (rows carry valid6 / R6 only).
// Solver: bounded projected LM (same tolerances as legIKBounded) from the warm start (current twist values) + 64 Halton starts in the box;
// FEASIBLE = constructive (residual ≤ 1e-6 re-checked by forward kinematics, every coordinate inside its hard limit). Not-found targets can be
// certified with --cert (branch-and-bound as tools/ik_certificate.mjs, extended Lipschitz levers: knee axial — shank length; ankle — 0).
// The chain is an independent re-implementation of StandController.legChain's forward kinematics; it is checked bit-identical against
// legChain.fk with the twist DOFs at their held values on every target (reported as chainCheckMaxDiff; must be 0).
// No controller change; research only — no adoption of any reachability definition.
// --sens: classification sensitivity to the HELD twist values (they are the instantaneous joint values, so they move with the twist motion):
// the smallest offset |δ| ∈ {0.25, 0.5, 1, 2, 3, 5, 7.5, 10}° of the held knee axial (ankle held), or of the held ankle ab/adduction (knee held),
// inside the hard limits, that makes the otherwise unchanged 6-D anatomical problem FEASIBLE (warm + 16 Halton starts; constructive).
// usage: node tools/ik_twist_free.mjs [--bodies=V2-REF,…] [--states=U:R,…] [--cert] [--tight] [--only-v8nf] [--cap=50000000] [--sens] [out.json]
//   --tight: certificates with the opt-in twist levers (tools/ik_cert_core.mjs); --only-v8nf: keep only rows whose V8 search found nothing (for certificate runs)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { IK } from "../ctrl/v2_stand.js"; import { decompose } from "../spec/v2_joints.js"; import { V, Q, dnorm, unitStates, unitEv } from "../core/v2_math.js"; import { certLevers, branchAndBound, chain8 } from "./ik_cert_core.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI, TOL = 1e-6, TIGHT = process.argv.includes("--tight"), ONLYV8NF = process.argv.includes("--only-v8nf"), CERT = process.argv.includes("--cert"), SENS = process.argv.includes("--sens"), REF = process.argv.includes("--ref") || process.argv.includes("--refall"), REFALL = process.argv.includes("--refall"), CAP = +arg("cap", 50000000);
const BODIES = (arg("bodies", "") || VARIATION_SET.map(h => h.id).join(",")).split(","), STATES = (arg("states", "") || "U:R,U:L,T5,T6").split(",");
function solveN(M, y) { const n = y.length, a = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return null; [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; } } return a.map((r, i) => r[n] / r[i]); }
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const jacOf = (fk, x) => x.map((_, c) => { const xp = x.slice(), xm = x.slice(); xp[c] += IK.h; xm[c] -= IK.h; const rp = fk(xp), rm = fk(xm); return rp.map((v, i) => (v - rm[i]) / (2 * IK.h)); });
function bounded(fk, lo, hi, xs, maxIt = 60) { const N = xs.length, clamp = (y) => y.map((v, i) => Math.min(hi[i], Math.max(lo[i], v))); let x = clamp(xs), r = fk(x), err = dnorm(...r), mu = IK.mu0;
  for (let it = 0; it < maxIt && err > IK.tol; it++) { const Jm = jacOf(fk, x), g = Jm.map(col => dot(col, r)), free = [...Array(N).keys()].filter(i => !((x[i] <= lo[i] && g[i] > 0) || (x[i] >= hi[i] && g[i] < 0)));
    if (!free.length || Math.sqrt(free.reduce((s, i) => s + g[i] * g[i], 0)) < IK.gradTol) break; const H = Jm.map(ci => Jm.map(cj => dot(ci, cj))); let ok = false;
    for (let t = 0; t < 8; t++) { const dx = solveN(free.map(i => free.map(c => (i === c ? H[i][c] + mu * (1 + H[i][i]) : H[i][c]))), free.map(i => -g[i])); if (!dx) { mu *= 10; continue; }
      const xn = x.slice(); free.forEach((i, k) => { xn[i] += dx[k]; }); const xc = clamp(xn), rn = fk(xc), en = dnorm(...rn); if (en < err) { x = xc; r = rn; err = en; mu = Math.max(IK.muMin, mu / 10); ok = true; break; } mu *= 10; }
    if (!ok) break; } return { x, err }; }
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }, PR = [2, 3, 5, 7, 11, 13, 17, 19];
// 8-D chain (tools/ik_cert_core.mjs): x = [hip tw, hip sy, hip sz, knee tw (axial), knee sy (flexion), ankle tw (ab/adduction), ankle sy (DF), ankle sz (inversion)].
function captureState(spec, key, T, n) { const s = new G3Sim(J, spec, g3Def(key), {}); let cap = null; const o = s.ctrl.legIK.bind(s.ctrl), want = { on: false };
  s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want.on && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return o(st, ev, nn, pP, qP, fp); };
  while (s.n * s.dt < T - 1e-9 && s.tick()); want.on = true; s.tick(); s.ctrl.legIK = o; return { s, ctrl: s.ctrl, cap }; }
const TARGETS = []; for (const hgt of [0, 0.05, 0.10]) for (const [fwd, lat, fam] of [[0.15, 0, "short forward"], [0.30, 0, "medium forward"], [0.45, 0, "long forward"], [0.60, 0, "very long forward"], [-0.10, 0, "slight backward"], [0, -0.08, "inward (crossing)"], [0.10, -0.15, "far crossing"], [0, 0.10, "outward"], [0, 0.20, "far outward"], [0.30, 0.10, "diagonal out"], [0.30, -0.06, "diagonal in"], [0.15, 0.05, "wider short step"], [0.15, -0.04, "narrower short step"]])
  for (const yaw of [0, 30, -30, 45, -45]) TARGETS.push({ fwd, lat, hgt, yaw, fam });
const rows = []; let chainCheckMaxDiff = 0; const t00 = Date.now();
for (const id of BODIES) { const spec = generateSpec(VARIATION_SET.find(h => h.id === id));
  for (const key of STATES) { const [T, n] = { "U:R": [8, 0], "U:L": [8, 1], T5: [6, 0], T6: [6, 1] }[key]; const { s, ctrl, cap } = captureState(spec, key, T, n); if (!cap) { s.destroy(); continue; }
    const st = cap.st, ev = cap.ev, ft0 = cap.foot || st[ctrl.feet[n]], fw = Q.rot(st[ctrl.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), latOut = n === 0 ? V.sc([hd[2], 0, -hd[0]], -1) : [hd[2], 0, -hd[0]], sg = n === 0 ? -1 : 1;
    const Lh = ctrl.legK[n].map(k => spec.joints[k].limits.hard), lo8 = [Lh[0].lo[0], Lh[0].lo[1], Lh[0].lo[2], Lh[1].lo[0], Lh[1].lo[1], Lh[2].lo[0], Lh[2].lo[1], Lh[2].lo[2]], hi8 = [Lh[0].hi[0], Lh[0].hi[1], Lh[0].hi[2], Lh[1].hi[0], Lh[1].hi[1], Lh[2].hi[0], Lh[2].hi[1], Lh[2].hi[2]];
    const Ls = ctrl.legK[n].map(k => spec.joints[k].limits.soft), kSgn = spec.joints[ctrl.legK[n][1]].def.axes.x.s, leg = spec.joints[ctrl.legK[n][1]].name.slice(-1);
    const LIP8 = certLevers(ctrl, n, 8, TIGHT).LIP;
    for (const drop of [0, 0.05, 0.10]) for (const t of TARGETS) { const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, t.fwd)), V.sc(latOut, t.lat)), [0, t.hgt, 0]), rot: Q.norm(Q.mul(Q.axis([0, 1, 0], sg * t.yaw / D), ft0.rot)) };
      const U = ctrl.legIK(st, ev, n, pP, cap.qP, foot); if (!(U.err <= 1e-6)) continue; const B = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot); if (B.err <= 1e-6 && !REFALL) continue;
      const C6 = ctrl.legChain(st, ev, n, pP, cap.qP, foot), { fk, cur, embed: emb } = chain8(ctrl, st, ev, n, pP, cap.qP, foot);
      for (const x6 of [C6.x0, B.x]) { const r6 = C6.fk(x6), r8 = fk(emb(x6)); chainCheckMaxDiff = Math.max(chainCheckMaxDiff, ...r6.map((v, i) => Math.abs(v - r8[i]))); }
      const x8w = emb(B.x), row = { body: id, state: key, leg, fam: t.fam, yaw: t.yaw, hgt: t.hgt, drop, err6: B.err, heldKneeAxialDeg: cur[1][0] * D, heldAnkleAbAddDeg: cur[2][0] * D };
      const flexOf = (x) => x[4] * D + 70, fc = (x) => Math.min(1, Math.max(0.1, flexOf(x) / 60)), sk = kSgn;   // knee anatomical flexion (centre 70°); screw-home factor
      const xref = x8w.slice(); xref[3] = decompose(ctrl.qref[ctrl.legK[n][1]]).tw; xref[5] = decompose(ctrl.qref[ctrl.legK[n][2]]).tw; row.refKneeAxialDeg = xref[3] * D; row.refAnkleAbAddDeg = xref[5] * D;
      row.valid6 = B.err <= TOL;
      for (const [vn, kb, ab] of REFALL ? [["R6", "ref", "ref"]] : [["V7k", "hard", "held"], ["V7ks", "soft", "held"], ["V7a", "held", "hard"], ["V7as", "held", "soft"], ["V8", "hard", "hard"], ["V8s", "soft", "soft"], ...(REF ? [["R6", "ref", "ref"], ["R7ks", "soft", "ref"]] : [])]) {
        const lo = lo8.slice(), hi = hi8.slice(); if (kb === "held") lo[3] = hi[3] = x8w[3]; if (kb === "ref") lo[3] = hi[3] = xref[3]; if (ab === "ref") lo[5] = hi[5] = xref[5]; if (kb === "soft") { lo[3] = Ls[1].lo[0]; hi[3] = Ls[1].hi[0]; } if (ab === "held") lo[5] = hi[5] = x8w[5]; if (ab === "soft") { lo[5] = Ls[2].lo[0]; hi[5] = Ls[2].hi[0]; }
        const map = kb === "soft" ? (x) => { const y = x.slice(); y[3] = x[3] * fc(x); return y; } : (x) => x, fkV = (x) => fk(map(x));
        const w0 = x8w.slice(); if (kb === "ref") w0[3] = xref[3]; if (ab === "ref") w0[5] = xref[5]; if (kb === "soft") w0[3] = Math.min(hi[3], Math.max(lo[3], x8w[3] / fc(x8w)));
        const starts = [w0]; for (let h = 1; h <= 64; h++) starts.push(lo.map((l, i) => l + (hi[i] - l) * halton(h, PR[i]))); let best = { err: Infinity };
        for (const x0 of starts) { const R = bounded(fkV, lo, hi, x0); if (R.err < best.err) best = R; if (best.err <= TOL) break; }
        const y = map(best.x), inside = y.every((v, i) => v >= lo8[i] - 1e-15 && v <= hi8[i] + 1e-15), recheck = dnorm(...fk(y)), feas = recheck <= TOL && inside;
        const res = { verdict: feas ? "FEASIBLE" : "NOT-FOUND", bestResidual: recheck, kneeAxialDeg: y[3] * D, kneeAxialAnatDeg: sk * y[3] * D, kneeFlexAnatDeg: flexOf(y), ankleAbAddDeg: y[5] * D,
          kneeAxialCoupledSoftDeg: [Ls[1].lo[0] * fc(y) * D, Ls[1].hi[0] * fc(y) * D], kneeAxialInCoupledSoft: y[3] >= Ls[1].lo[0] * fc(y) - 1e-12 && y[3] <= Ls[1].hi[0] * fc(y) + 1e-12,
          ankleAbAddInSoft: y[5] >= Ls[2].lo[0] - 1e-12 && y[5] <= Ls[2].hi[0] + 1e-12, kneeAxialMarginDeg: Math.min(y[3] - lo8[3], hi8[3] - y[3]) * D, ankleAbAddMarginDeg: Math.min(y[5] - lo8[5], hi8[5] - y[5]) * D };
        if (!feas && CERT && vn === "V8") { const tc = Date.now(), R = branchAndBound(fk, lo, hi, LIP8, CAP, TOL); res.certificate = { verdict: R.verdict, cells: R.evals, ms: Date.now() - tc }; }
        row[vn] = res; }
      if (SENS && !REFALL) { row.sens = {}; for (const [nm, i] of [["kneeAxialMinDeltaDeg", 3], ["ankleAbAddMinDeltaDeg", 5]]) { row.sens[nm] = null;
          outer: for (const dd of [0.25, 0.5, 1, 2, 3, 5, 7.5, 10]) for (const sgn of [-1, 1]) { const v = x8w[i] + sgn * dd / D; if (v < lo8[i] || v > hi8[i]) continue; const lo = lo8.slice(), hi = hi8.slice();
            for (const j of [3, 5]) { lo[j] = hi[j] = j === i ? v : x8w[j]; } const starts = [x8w.map((u, j) => (j === i ? v : u))]; for (let h = 1; h <= 16; h++) starts.push(lo.map((l, j) => l + (hi[j] - l) * halton(h, PR[j])));
            for (const x0 of starts) { const R = bounded(fk, lo, hi, x0); if (dnorm(...fk(R.x)) <= TOL) { row.sens[nm] = sgn * dd; break outer; } } } } }
      if (REFALL) { rows.push(row); continue; }
      if (ONLYV8NF && row.V8.verdict === "FEASIBLE") continue;
      rows.push(row); const f = (r) => r.verdict === "FEASIBLE" ? `F(kax ${r.kneeAxialAnatDeg.toFixed(1)}° @flex ${r.kneeFlexAnatDeg.toFixed(0)}°${r.kneeAxialInCoupledSoft ? "" : "*"}, ab ${r.ankleAbAddDeg.toFixed(1)}°${r.ankleAbAddInSoft ? "" : "*"})` : `NF ${r.bestResidual.toExponential(1)}${r.certificate ? " " + r.certificate.verdict : ""}`;
      console.log(`${id} ${key} ${t.fam.padEnd(20)} yaw ${String(t.yaw).padStart(3)} h ${t.hgt} d ${drop} e6 ${B.err.toExponential(1)}: ` + ["V7k", "V7ks", "V7a", "V7as", "V8", "V8s", ...(REF ? ["R6", "R7ks"] : [])].map(v => `${v} ${f(row[v])}`).join(" | ") + (row.sens ? ` | sens knee ${row.sens.kneeAxialMinDeltaDeg} ank ${row.sens.ankleAbAddMinDeltaDeg}` : "")); }
    s.destroy(); } }
if (REFALL) { const sm = {}; for (const r of rows) { const k = `${r.body} ${r.state}`; const o = (sm[k] ||= { geometric: 0, invalidHeldInstantaneous: 0, invalidHeldReference: 0, both: 0 }); o.geometric++; if (!r.valid6) o.invalidHeldInstantaneous++; if (r.R6.verdict !== "FEASIBLE") o.invalidHeldReference++; if (!r.valid6 && r.R6.verdict !== "FEASIBLE") o.both++; }
  console.log(JSON.stringify(sm, null, 1)); if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_twist_free.mjs --refall", summary: sm, rows: rows.map(r => ({ body: r.body, state: r.state, fam: r.fam, yaw: r.yaw, hgt: r.hgt, drop: r.drop, valid6: r.valid6, refKneeAxialDeg: r.refKneeAxialDeg, refAnkleAbAddDeg: r.refAnkleAbAddDeg, heldKneeAxialDeg: r.heldKneeAxialDeg, heldAnkleAbAddDeg: r.heldAnkleAbAddDeg, R6: r.R6.verdict, R6res: r.R6.bestResidual })) }));
  process.exit(0); }
const summ = {}; for (const vn of ["V7k", "V7ks", "V7a", "V7as", "V8", "V8s", ...(REF ? ["R6", "R7ks"] : [])]) summ[vn] = rows.reduce((o, r) => ((o[r[vn].verdict] = (o[r[vn].verdict] || 0) + 1), o), {});
console.log(`invalid (6-D) targets: ${rows.length}; chain check max |Δr| = ${chainCheckMaxDiff}; ${JSON.stringify(summ)}; ${((Date.now() - t00) / 1000).toFixed(0)} s`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_twist_free.mjs", chainCheckMaxDiff, summary: summ, rows }));
