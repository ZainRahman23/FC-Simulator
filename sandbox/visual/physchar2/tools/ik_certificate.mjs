// ═══ physchar2/tools/ik_certificate.mjs — pre-G4 runway (reachability taxonomy): can a PROVEN-INFEASIBLE certificate be produced in practice?
// Branch-and-bound over the 6-D anatomical joint box of the leg IK problem (the same chain / residual as legIK; knee axial and ankle
// ab/adduction at their current values, as in the IK problem definition). Rigorous cell lower bound from Lipschitz constants:
//   orientation residual: ≤ 1 rad per rad of any coordinate (each coordinate rotates the foot by at most its own change; pyramid swing as a
//   rotation vector, twist about a unit axis; the residual 2·vec(q_err) is 1-Lipschitz in the rotation angle);
//   ankle position: ≤ lever per rad — hip coordinates: thigh + shank length; knee flexion: shank length; ankle coordinates: 0 (they do not move
//   the ankle centre). Cell bound: ‖r(c)‖ − Σ_i (Lp_i + 1)·h_i  (h = half-width). A cell is pruned when its bound exceeds the 1e-6 tolerance.
// RIGOUR: pyr(tw, sy, sz) builds the swing as q ∝ (0, tan(sy/2), tan(sz/2), 1); its angular speed per unit coordinate is
// (1 + a)·√(1 + b) / (1 + a + b) (a = tan²(sy/2), b = tan²(sz/2) or vice versa) — ≤ 1 whenever |sy|, |sz| < 90°, true for every leg-joint box
// (largest: hip flexion 87.3°, knee 85°); twist and the constant frame rotations are 1-Lipschitz; 2·vec(q_err) is 1-Lipschitz in the rotation
// angle and the residual NORM is continuous across the sign normalisation. So the bound is valid (up to floating-point rounding).
// PROVEN-INFEASIBLE = every cell pruned within the evaluation cap; FEASIBLE = a centre with ‖r‖ ≤ 1e-6 found; otherwise UNDECIDED (cap hit).
// usage: node tools/ik_certificate.mjs [--cap=2000000] [--body=V2-REF] [--state=U:R] [--soundness=N] [--tight] [out.json]   (--tight: the opt-in twist levers of ik_cert_core)
// --soundness=N: instead of certificates, an empirical falsification test of the bound (seeded, deterministic): (1) N random box points × 6
// coordinates, central-difference rates ‖∂r_pos/∂x_i‖ / lever_i (claim ≤ 1; ankle coordinates: claim exactly 0) and ‖∂r_ori/∂x_i‖ (claim ≤ 1);
// (2) N random (cell, point) pairs per target over every target: the exact inequality used, ‖r(x)‖ ≥ ‖r(c)‖ − Σ LIP_i·|x_i − c_i|;
// (3) known-solution path: for every anatomically VALID target (bounded solution x*, residual ≤ 1e-6) the chain of cells containing x* is
// followed down the same bisection rule to Σ LIP·h < 1e-9 — a pruned cell that contains x* would falsify the certificate (claim: 0).
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q, dnorm, unitStates, unitEv } from "../core/v2_math.js"; import { certLevers, branchAndBound, knownSolutionPath, chain8 } from "./ik_cert_core.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const TIGHT = process.argv.includes("--tight"), CAP = +arg("cap", 2000000), ONLY = +arg("only", 0), BODY = arg("body", "V2-REF"), STATE = arg("state", "U:R"), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI, TOL = 1e-6;
const spec = generateSpec(VARIATION_SET.find(h => h.id === BODY)), [T, n] = { "U:R": [8, 0], "U:L": [8, 1], T5: [6, 0], T6: [6, 1] }[STATE];
const s = new G3Sim(J, spec, g3Def(STATE), {}); let cap = null; { const o = s.ctrl.legIK.bind(s.ctrl); let want = false; s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return o(st, ev, nn, pP, qP, fp); };
  while (s.n * s.dt < T - 1e-9 && s.tick()); want = true; s.tick(); s.ctrl.legIK = o; }
const ctrl = s.ctrl, st = cap.st, ev = cap.ev, ft0 = cap.foot || st[ctrl.feet[n]], fw = Q.rot(st[ctrl.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), latOut = n === 0 ? V.sc([hd[2], 0, -hd[0]], -1) : [hd[2], 0, -hd[0]], sg = n === 0 ? -1 : 1;
const Lh = ctrl.legK[n].map(k => spec.joints[k].limits.hard), lo = [Lh[0].lo[0], Lh[0].lo[1], Lh[0].lo[2], Lh[1].lo[1], Lh[2].lo[1], Lh[2].lo[2]], hi = [Lh[0].hi[0], Lh[0].hi[1], Lh[0].hi[2], Lh[1].hi[1], Lh[2].hi[1], Lh[2].hi[2]];
const { L1, L2, LIP, lever: LEV } = certLevers(ctrl, n, 6, TIGHT);   // bound and rigour argument: tools/ik_cert_core.mjs
const TARGETS = []; for (const hgt of [0, 0.05, 0.10]) for (const [fwd, lat, fam] of [[0.15, 0, "short forward"], [0.30, 0, "medium forward"], [0.45, 0, "long forward"], [0.60, 0, "very long forward"], [-0.10, 0, "slight backward"], [0, -0.08, "inward (crossing)"], [0.10, -0.15, "far crossing"], [0, 0.10, "outward"], [0, 0.20, "far outward"], [0.30, 0.10, "diagonal out"], [0.30, -0.06, "diagonal in"], [0.15, 0.05, "wider short step"], [0.15, -0.04, "narrower short step"]])
  for (const yaw of [0, 30, -30, 45, -45]) TARGETS.push({ fwd, lat, hgt, yaw, fam });
const rows = [];
const SOUND = +arg("soundness", 0);
if (SOUND) { let seed = 0x9e3779b9; const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const LP = LEV, C0 = ctrl.legChain(st, ev, n, cap.pP, cap.qP, ft0), hD = 1e-6, posR = [0, 0, 0, 0, 0, 0], oriR = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < SOUND; k++) { const x = lo.map((l, i) => l + (hi[i] - l) * rnd());
    for (let i = 0; i < 6; i++) { const xp = x.slice(), xm = x.slice(); xp[i] += hD; xm[i] -= hD; const rp = C0.fk(xp), rm = C0.fk(xm), d = rp.map((v, j) => (v - rm[j]) / (2 * hD));
      const dp = Math.hypot(d[0], d[1], d[2]), dq = Math.hypot(d[3], d[4], d[5]); posR[i] = Math.max(posR[i], LP[i] > 0 ? dp / LP[i] : dp); oriR[i] = Math.max(oriR[i], dq); } }
  // 8-D rate claims (the twist-free chain, levers per certLevers(…, 8, TIGHT)): hip / knee position rate ≤ lever (0-lever coordinates: absolute
  // rate reported, claim ≈ 0 to rounding), orientation rate ≤ 1; the 8-D box includes knee axial and ankle ab/adduction hard limits
  const L8 = certLevers(ctrl, n, 8, TIGHT).lever, C8 = chain8(ctrl, st, ev, n, cap.pP, cap.qP, ft0), Lh8 = ctrl.legK[n].map(k => spec.joints[k].limits.hard);
  const lo8 = [Lh8[0].lo[0], Lh8[0].lo[1], Lh8[0].lo[2], Lh8[1].lo[0], Lh8[1].lo[1], Lh8[2].lo[0], Lh8[2].lo[1], Lh8[2].lo[2]], hi8 = [Lh8[0].hi[0], Lh8[0].hi[1], Lh8[0].hi[2], Lh8[1].hi[0], Lh8[1].hi[1], Lh8[2].hi[0], Lh8[2].hi[1], Lh8[2].hi[2]];
  const posR8 = Array(8).fill(0), oriR8 = Array(8).fill(0);
  for (let k = 0; k < SOUND; k++) { const x = lo8.map((l, i) => l + (hi8[i] - l) * rnd());
    for (let i = 0; i < 8; i++) { const xp = x.slice(), xm = x.slice(); xp[i] += hD; xm[i] -= hD; const rp = C8.fk(xp), rm = C8.fk(xm), d = rp.map((v, j) => (v - rm[j]) / (2 * hD));
      const dp = Math.hypot(d[0], d[1], d[2]); posR8[i] = Math.max(posR8[i], L8[i] > 0 ? dp / L8[i] : dp); oriR8[i] = Math.max(oriR8[i], Math.hypot(d[3], d[4], d[5])); } }
  let pairs = 0, viol = 0, minSlack = Infinity, pathTargets = 0, pathCells = 0, pathViol = 0, maxDepth = 0;
  for (const drop of [0, 0.05, 0.10]) for (const t of TARGETS) { const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, t.fwd)), V.sc(latOut, t.lat)), [0, t.hgt, 0]), rot: Q.norm(Q.mul(Q.axis([0, 1, 0], sg * t.yaw / D), ft0.rot)) };
    const C = ctrl.legChain(st, ev, n, pP, cap.qP, foot);
    for (let k = 0; k < SOUND; k++) { const sc = Math.pow(rnd(), 3), c = lo.map((l, i) => l + (hi[i] - l) * rnd()), x = c.map((v, i) => Math.min(hi[i], Math.max(lo[i], v + (2 * rnd() - 1) * sc * (hi[i] - lo[i]) / 2)));
      const rc = dnorm(...C.fk(c)), rx = dnorm(...C.fk(x)), bound = c.reduce((a, v, i) => a + LIP[i] * Math.abs(x[i] - v), 0), slack = rx - (rc - bound); pairs++;
      if (slack < -1e-12) viol++; if (bound > 1e-9) minSlack = Math.min(minSlack, slack / bound); }
    const B = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot); if (!(B.err <= TOL)) continue; pathTargets++; const P = knownSolutionPath(C.fk, lo, hi, LIP, B.x, TOL);
    pathCells += P.depth; if (P.pruned) pathViol++; maxDepth = Math.max(maxDepth, P.depth); }
  const out = { generated: "tools/ik_certificate.mjs --soundness", body: BODY, state: STATE, N: SOUND, tight: TIGHT, lever: LEV, rateMax: { posOverLever: posR, ori: oriR, note: "claims: posOverLever ≤ 1 for hip/knee, = 0 for ankle (absolute m/rad); ori ≤ 1" },
    rateMax8: { lever: L8, posOverLever: posR8, ori: oriR8, note: "8-D chain; 0-lever coordinates report the absolute position rate (claim ≈ 0)" },
    cellInequality: { pairs, violations: viol, minSlackOverBound: minSlack }, knownSolutionPath: { validTargets: pathTargets, cellsChecked: pathCells, prunedCellsContainingSolution: pathViol, maxDepth } };
  console.log(JSON.stringify(out, null, 1)); if (OUT) fs.writeFileSync(OUT, JSON.stringify(out)); s.destroy(); process.exit(0); }
for (const drop of [0, 0.05, 0.10]) for (const t of TARGETS) { const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, t.fwd)), V.sc(latOut, t.lat)), [0, t.hgt, 0]), rot: Q.norm(Q.mul(Q.axis([0, 1, 0], sg * t.yaw / D), ft0.rot)) };
  const U = ctrl.legIK(st, ev, n, pP, cap.qP, foot); if (!(U.err <= 1e-6)) continue; const B = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot); if (B.err <= 1e-6) continue;
  if (ONLY && rows.length >= ONLY) break;   // --only=N: the first N invalid targets
  const C = ctrl.legChain(st, ev, n, pP, cap.qP, foot), t0 = Date.now(), R = branchAndBound(C.fk, lo, hi, LIP, CAP, TOL), { verdict, evals, openCells, minLowerBound } = R;
  rows.push({ fam: t.fam, yaw: t.yaw, hgt: t.hgt, drop, warmResidual: B.err, verdict, evals, ms: Date.now() - t0, openCells, minLowerBound });
  console.log(`${t.fam.padEnd(20)} yaw ${String(t.yaw).padStart(3)} h ${t.hgt} drop ${drop}: warm residual ${B.err.toExponential(2)} → ${verdict} (${evals} cells, ${Date.now() - t0} ms, ${openCells} cells still open)`); }
s.destroy(); const c = rows.reduce((o, r) => ((o[r.verdict] = (o[r.verdict] || 0) + 1), o), {}); console.log(`${BODY} ${STATE}: ${rows.length} invalid targets → ${JSON.stringify(c)} (cap ${CAP} cells)`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_certificate.mjs", body: BODY, state: STATE, cap: CAP, tight: TIGHT, rows }));
