// ═══ physchar2/tools/b1_bench.mjs — V1 bench of the unload fix B1 (unload_fix/UNLOAD_FIX_PREREG.md §2). Kinematic, no stepping.
// For the knees and elbows (one locked swing axis z, actuated twist x and swing y), over twist t ∈ {−10 … +10}° × free swing ∈ {0, 5 … 60}° (elbow
// {0, 10 … 120}°) with the locked swing 0, and 40 seeded statics torques per pose (|T| ≤ 100 N·m, frontal component always present):
//   reference  Q_c = T·j_c, with j_c computed NUMERICALLY (central difference h = 1e-5 rad of the child's world rotation R_p·F1·pyr(·)·F2⁻¹ in each free coordinate)
//   V1.1  the controller's exported lockedAxisFF rows (τ_x = T·x̂, τ_y = lockedAxisFF) reproduce Q_tw and Q_sy:  ≤ 1e-9·max(1, |T|)
//   V1.2  the naive projection τ_y = T·ŷ misses Q_sy by exactly sin t·(T·ẑ) (identity within the same tolerance; nonzero for t ≠ 0)
//   V1.3  mirror: the reflected pose and torque on the opposite side give the mirrored rows (≤ 1e-12 relative)
// usage: node tools/b1_bench.mjs [out.json]
import fs from "fs";
import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { pyr, decompose } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
import { lockedAxisFF } from "../ctrl/v2_stand.js";
const OUT = process.argv[2], spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), R = Math.PI / 180, E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], H = 1e-5;
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
const unitQ = (q) => { const l = Math.hypot(...q); return q.map(x => x / l); }, randQ = () => unitQ([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5, rnd() - 0.5 + 1.5]);
const mq = (q) => [q[0], -q[1], -q[2], q[3]], mv = (v) => [-v[0], v[1], v[2]], pseudo = (v) => [v[0], -v[1], -v[2]];   // reflection x → −x: rotation, vector, pseudovector (torque)
const child = (Rp, j, x) => Q.norm(Q.mul(Q.mul(Q.mul(Rp, j.F1), pyr(x[0], x[1], x[2])), Q.conj(j.F2)));
const rotvec = (q) => { let w = q[3], v = [q[0], q[1], q[2]]; if (w < 0) { w = -w; v = v.map(x => -x); } const s = Math.hypot(...v); return s < 1e-300 ? [0, 0, 0] : V.sc(v, 2 * Math.atan2(s, w) / s); };
const jc = (Rp, j, x, c) => { const xp = x.slice(), xm = x.slice(); xp[c] += H; xm[c] -= H; return V.sc(rotvec(Q.mul(child(Rp, j, xp), Q.conj(child(Rp, j, xm)))), 1 / (2 * H)); };
const res = { generated: "tools/b1_bench.mjs", tol: "1e-9·max(1,|T|)", joints: {} }; let all = true;
for (const name of ["knee_L", "knee_R", "elbow_L", "elbow_R"]) { const j = spec.joints.find(x => x.name === name), mirrorName = name.endsWith("_L") ? name.replace("_L", "_R") : name.replace("_R", "_L"), jm = spec.joints.find(x => x.name === mirrorName);
  if (!(j.locked.length === 1 && j.locked[0] === "z")) throw new Error(name + " is not a locked-z joint");
  const flexes = name.startsWith("elbow") ? Array.from({ length: 13 }, (_, i) => i * 10) : Array.from({ length: 13 }, (_, i) => i * 5);
  const r = { poses: 0, samples: 0, v11max: 0, v12max: 0, v12minMiss: Infinity, v13max: 0, roundTripMax: 0 };
  for (let tw = -10; tw <= 10; tw++) for (const fl of flexes) { const Rp = randQ(), x = [tw * R, fl * R, 0], Rc = child(Rp, j, x);
    const qcs = Q.norm(Q.mul(Q.mul(Q.conj(j.F1), Q.mul(Q.conj(Rp), Rc)), j.F2)), dc = decompose(qcs); r.roundTripMax = Math.max(r.roundTripMax, Math.abs(dc.tw - x[0]), Math.abs(dc.sy - x[1]), Math.abs(dc.sz));
    const R2F2 = Q.mul(Rc, j.F2), axW = E.map(e => Q.rot(R2F2, e)), J0 = jc(Rp, j, x, 0), J1 = jc(Rp, j, x, 1); r.poses++;
    // mirrored state on the opposite joint
    const Rpm = mq(Rp), Rcm = mq(Rc), qcsm = Q.norm(Q.mul(Q.mul(Q.conj(jm.F1), Q.mul(Q.conj(Rpm), Rcm)), jm.F2)), twm = decompose(qcsm).tw, axWm = E.map(e => Q.rot(Q.mul(Rcm, jm.F2), e)), sgn = axWm.map((a, i) => V.dot(a, mv(axW[i])));
    for (let k = 0; k < 40; k++) { const T = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5].map(v => v * 2 * 57.7), Tz = V.dot(T, axW[2]); if (Math.abs(Tz) < 1) T[0] += 5 * axW[2][0], T[1] += 5 * axW[2][1], T[2] += 5 * axW[2][2];
      const tol = 1e-9 * Math.max(1, V.len(T)), tx = V.dot(T, axW[0]), ty = lockedAxisFF(T, axW, dc.tw, 2), tau = V.add(V.sc(axW[0], tx), V.sc(axW[1], ty));
      const e11 = Math.max(Math.abs(V.dot(tau, J0) - V.dot(T, J0)), Math.abs(V.dot(tau, J1) - V.dot(T, J1))); r.v11max = Math.max(r.v11max, e11 / Math.max(1, V.len(T)));
      const tyN = V.dot(T, axW[1]), tauN = V.add(V.sc(axW[0], tx), V.sc(axW[1], tyN)), miss = V.dot(tauN, J1) - V.dot(T, J1), pred = Math.sin(dc.tw) * V.dot(T, axW[2]);
      r.v12max = Math.max(r.v12max, Math.abs(miss - pred) / Math.max(1, V.len(T))); if (tw !== 0) r.v12minMiss = Math.min(r.v12minMiss, Math.abs(miss));
      // mirror: T' = pseudo(T); expected rows τ'_i = s_i · (pseudo(T)·axW'_i) relation → τ'_y(B1) must equal sgn_y·(−… ) consistently: compare to the mirrored generalized force
      const Tm = pseudo(T), tym = lockedAxisFF(Tm, axWm, twm, 2), txm = V.dot(Tm, axWm[0]), expY = -sgn[1] * ty, expX = -sgn[0] * tx;
      r.v13max = Math.max(r.v13max, Math.abs(tym - expY) / Math.max(1e-9, Math.abs(ty) + 1), Math.abs(txm - expX) / Math.max(1e-9, Math.abs(tx) + 1)); r.samples++; } }
  r.pass = r.v11max <= 1e-9 && r.v12max <= 1e-9 && r.v12minMiss > 0 && r.v13max <= 1e-12 && r.roundTripMax <= 1e-12; all = all && r.pass; res.joints[name] = r;
  console.log(`${name}: ${r.poses} poses × 40 torques = ${r.samples}; V1.1 max |ΔQ|/max(1,|T|) ${r.v11max.toExponential(2)} (≤ 1e-9); V1.2 naive-miss identity ${r.v12max.toExponential(2)} (min nonzero miss ${r.v12minMiss.toExponential(2)} N·m); V1.3 mirror ${r.v13max.toExponential(2)} (≤ 1e-12); pose round trip ${r.roundTripMax.toExponential(1)} rad → ${r.pass ? "PASS" : "FAIL"}`); }
res.pass = all; console.log(`B1 bench: ${all ? "PASS" : "FAIL"}`); if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
