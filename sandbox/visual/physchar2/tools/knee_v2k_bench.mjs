// ═══ physchar2/tools/knee_v2k_bench.mjs — corrected knee (v2k) qualification, KINEMATIC part (no stepping): KV1, KV2a, KV3a, KV4a, KV6a, KV7a
// review_artifacts/physical_character_v2/knee_correction/KNEE_CORRECTION_PREREG.md. The passive layer is evaluated at constructed poses (the G1
// coupling-probe method): every torque below is what PassiveLayer.compute would hand to the engine (−∇U, all rows, the knee's dependents).
// usage: node tools/knee_v2k_bench.mjs [--human=V2-REF] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt, V2JoltWorld } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { posedBodies } from "../spec/v2_pose.js"; import { anatToFrameQ, decompose } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
import { PassiveLayer } from "../sim/v2_passive.js"; import { kneeEnvelopeV2K, kneeAxialTorque, kneeTheta0, KNEE_V2K } from "../spec/v2_knee.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), OUT = arg("out", ""), D = 180 / Math.PI, R = Math.PI / 180;
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), w = new V2JoltWorld(J, spec, spec.contact, { gravity: 0 }), P = new PassiveLayer(spec, w, { kneeModel: "v2k" });
if (!P.kneeIsV2K) throw new Error("v2k not active");
const jk = (n) => spec.joints.findIndex(j => j.name === n), KN = { R: jk("knee_R"), L: jk("knee_L") }, res = { human: HUMAN, params: KNEE_V2K, checks: [] };
const chk = (id, name, pass, value, limit) => { res.checks.push({ id, name, pass: !!pass, value, limit }); console.log(`${pass ? "PASS" : "FAIL"} ${id} ${name}: ${value} (limit ${limit})`); };
const base = { hip_L: { abd: 8 }, hip_R: { abd: 8 } };   // limbs clear; every other joint neutral (inside its soft range)
const stateAt = (angles) => posedBodies(spec, { ...base, ...angles }).map(s => ({ ...s, v: [0, 0, 0], w: [0, 0, 0] }));
const evalAt = (side, f, th) => P.compute(stateAt({ ["knee_" + side]: { flex: f, rot: th } }), 1 / 240);
const capOf = (side) => { const d = P.jd[KN[side]], a = d.axes[P.kneeRot[KN[side]]]; return { vsInt: a.s > 0 ? a.v2k.cap[1] : a.v2k.cap[0], vsExt: a.s > 0 ? a.v2k.cap[0] : a.v2k.cap[1], s: a.s, i: P.kneeRot[KN[side]] }; };
const C = { R: capOf("R"), L: capOf("L") };
// anatomical generalised torque of the knee axial row (−∂U/∂θ_anat): the x row is the twist (body-2 x perturbation changes the twist only)
const tauAnat = (up, side) => C[side].s * up.joints[KN[side]].tau[C[side].i];
const termOf = (up, side) => up.ev.per[KN[side]].T[C[side].i];
const anatEnds = (side, lohi) => (C[side].s > 0 ? [lohi[0] * D, lohi[1] * D] : [-lohi[1] * D, -lohi[0] * D]);
const PHI = [-5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 60, 90, 120, 146, 155], DTH = [0, 0.5, 1, 2, 5, 10, 14, 20, 25, 28];

// ── KV1: conventions and mirroring ──
{ let rb = 0, envErr = 0, signBad = 0, mirT = 0, mirU = 0, specErr = 0, specWorst = null, n = 0, rowNoise = 0;
  for (const f of PHI) for (const dth of DTH) for (const sgn of [1, -1]) { const th = kneeTheta0(f) + sgn * dth; const up = { R: evalAt("R", f, th), L: evalAt("L", f, th) };
    for (const side of ["R", "L"]) { const d = P.jd[KN[side]], q = up[side].ev.qs[KN[side]];
      rb = Math.max(rb, Math.abs(P.anat(d, q, "flex") - f), Math.abs(P.anat(d, q, "rot") - th));                                   // (a) readback
      const T = termOf(up[side], side), e = kneeEnvelopeV2K(f), sA = anatEnds(side, T.soft), hA = anatEnds(side, T.hard);        // (b) envelope readback
      envErr = Math.max(envErr, Math.abs(sA[0] - e.soft[0]), Math.abs(sA[1] - e.soft[1]), Math.abs(hA[0] - e.hard[0]), Math.abs(hA[1] - e.hard[1]));
      // (c) restoring sign of the AXIAL LAW TERM (the layer's own term torque, anatomical). The x row's full generalised torque also carries the
      // finite-difference rounding of the joint's other active terms (e.g. the flexion end range at φ = −5° / 155°, ~1e-8 N·m): reported separately.
      const tA = C[side].s * T.tau, tRow = tauAnat(up[side], side); rowNoise = Math.max(rowNoise, Math.abs(tRow - tA));
      if (th > e.soft[1] + 1e-9 ? tA > 0 : th < e.soft[0] - 1e-9 ? tA < 0 : Math.abs(tA) > 1e-9) signBad++;
      const sp = kneeAxialTorque(f, th, C[side].vsInt, C[side].vsExt).tau, er = Math.abs(tRow - sp), lim = 1e-4 + 1e-3 * Math.abs(sp);   // (e) the x row's generalised torque vs the spec law
      if (er - lim > specErr) { specErr = er - lim; specWorst = { side, f, th, layer: tA, spec: sp }; } n++; }
    mirT = Math.max(mirT, Math.abs(tauAnat(up.R, "R") - tauAnat(up.L, "L"))); mirU = Math.max(mirU, Math.abs(termOf(up.R, "R").U - termOf(up.L, "L").U)); }   // (d) mirror
  chk("KV1a", "anatomical (φ, θ) round trip through PassiveLayer.anat, both knees", rb <= 1e-6, `max ${rb.toExponential(2)}°`, "≤ 1e-6°");
  chk("KV1b", "layer knee-axial soft/hard = kneeEnvelopeV2K(φ), both knees", envErr <= 1e-6, `max ${envErr.toExponential(2)}°`, "≤ 1e-6°");
  chk("KV1c", "axial law term: restoring sign outside the zero-torque range, zero inside", signBad === 0, `${signBad} violations / ${n} (report: x-row rounding from the joint's other terms ≤ ${rowNoise.toExponential(1)} N·m)`, "0");
  chk("KV1d", "L/R mirror: anatomical torque and energy", mirT <= 1e-6 && mirU <= 1e-9, `|Δτ| ${mirT.toExponential(2)} N·m, |ΔU| ${mirU.toExponential(2)} J`, "≤ 1e-6 N·m, ≤ 1e-9 J");
  chk("KV1e", "layer axial generalised torque = independent spec law (kneeAxialTorque)", specErr <= 0, specWorst ? `worst excess ${specErr.toExponential(2)} N·m at ${JSON.stringify(specWorst)}` : "all within", "≤ 1e-4 N·m + 0.1 %");
  // (a′) physical meaning of +θ: tibial INTERNAL rotation turns the toes medially (toward the midline) on BOTH legs
  const toeX = (side, th) => { const S = stateAt({ ["knee_" + side]: { flex: 20, rot: th } }), fi = spec.bodies.findIndex(b => b.name === "foot_" + side); return { x: S[fi].pos[0], toe: Q.rot(S[fi].rot, [0, 0, 1])[0] }; };
  const phys = ["R", "L"].map(side => { const a = toeX(side, 0), b = toeX(side, 10); return { side, footX: a.x, dToeX: b.toe - a.toe, medial: Math.sign(b.toe - a.toe) === -Math.sign(a.x) }; });
  chk("KV1a′", "+θ (internal rotation) turns the toes toward the midline on both legs", phys.every(p => p.medial), phys.map(p => `${p.side}: foot x ${p.footX.toFixed(3)} m, Δtoe-x ${p.dToeX.toFixed(4)}`).join("; "), "medial on both"); }

// ── KV2a / KV3a: path integrals of the applied generalised torque vs the potential ──
function pathWork(side, path, naive = false) {   // path: [[f, th], …]; trapezoid of Σ_i τ_i·δ_i (body-2 rotation increments of the knee joint)
  let W = 0, Wabs = 0, up0 = evalAt(side, ...path[0]); const U0 = up0.U; let q0 = up0.ev.qs[KN[side]], t0 = up0.joints[KN[side]].tau;
  for (let n = 1; n < path.length; n++) { const up1 = evalAt(side, ...path[n]), q1 = up1.ev.qs[KN[side]], t1 = up1.joints[KN[side]].tau;
    let dq = Q.mul(Q.conj(q0), q1); if (dq[3] < 0) dq = dq.map(x => -x); const sv = Math.hypot(dq[0], dq[1], dq[2]), ang = 2 * Math.atan2(sv, dq[3]), dl = sv > 0 ? [dq[0] / sv * ang, dq[1] / sv * ang, dq[2] / sv * ang] : [0, 0, 0];
    let dw = 0; for (let i = 0; i < 3; i++) { if (naive && i !== C[side].i) continue; dw += 0.5 * (t0[i] + t1[i]) * dl[i]; } W += dw; Wabs += Math.abs(dw); q0 = q1; t0 = t1; up0 = up1; }
  return { W, Wabs, dU: up0.U - U0 }; }
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
{ const rnd = mulberry(20261004), NP = 20, NS = 2000; let worst = 0, worstRow = null; const rows = [];
  for (const side of ["R", "L"]) for (let p = 0; p < NP; p++) { const fa = -5 + 150 * rnd(), fb = -5 + 150 * rnd(), A = 30 * rnd(), w1 = 1 + 3 * rnd(), w2 = 1 + 3 * rnd(), ph = 6.283 * rnd();
    const path = []; for (let n = 0; n <= NS; n++) { const t = n / NS, f = fa + (fb - fa) * (0.5 - 0.5 * Math.cos(Math.PI * t)) + 4 * Math.sin(6.283 * w1 * t); path.push([f, kneeTheta0(f) + A * Math.sin(6.283 * w2 * t + ph)]); }
    const r = pathWork(side, path), err = Math.abs(r.W + r.dU), lim = 1e-3 + 5e-3 * r.Wabs, x = err / lim; rows.push({ side, p, ...r, err, lim }); if (x > worst) { worst = x; worstRow = { side, p, W: r.W, dU: r.dU, err, lim }; } }
  res.kv2a = rows; chk("KV2a", "generalised power: Σ τ·Δq + ΔU over 40 random flexion–axial paths (incl. end-stop)", worst <= 1, `worst |W + ΔU| / limit = ${worst.toFixed(3)} (${JSON.stringify(worstRow)})`, "≤ 1e-3 J + 0.5 % of Σ|τ·Δq|"); }
{ const loops = []; const ell = (f0, f1, a, N = 1600) => { const out = []; for (let n = 0; n <= N; n++) { const t = 6.283185307179586 * n / N, f = (f0 + f1) / 2 + (f1 - f0) / 2 * Math.cos(t); out.push([f, kneeTheta0(f) + a * Math.sin(t)]); } return out; };
  const rect = (f0, f1, a, N = 400) => { const out = [], seg = (pa, pb) => { for (let n = 0; n < N; n++) { const t = n / N; out.push([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]); } };
    const c = [[f0, kneeTheta0(f0) - a], [f1, kneeTheta0(f1) - a], [f1, kneeTheta0(f1) + a], [f0, kneeTheta0(f0) + a]]; seg(c[0], c[1]); seg(c[1], c[2]); seg(c[2], c[3]); seg(c[3], c[0]); out.push(c[0]); return out; };
  let worst = 0, worstRow = null;
  for (const side of ["R", "L"]) for (const [f0, f1] of [[0, 40], [0, 150]]) for (const a of [5, 15, 28]) for (const [shape, mk] of [["ellipse", ell], ["rectangle", rect]]) {
    const pth = mk(f0, f1, a), r = pathWork(side, pth), nv = pathWork(side, pth, true), err = Math.abs(r.W), lim = 1e-3 + 5e-3 * r.Wabs, x = err / lim;
    loops.push({ side, f0, f1, a, shape, W: r.W, Wabs: r.Wabs, lim, naiveW: nv.W, naiveWabs: nv.Wabs }); if (x > worst) { worst = x; worstRow = { side, f0, f1, a, shape, W: r.W, lim }; } }
  res.kv3a = loops; chk("KV3a", "closed flexion–axial loops: ∮ τ·dq (full gradient incl. flexion reaction)", worst <= 1, `worst |∮| / limit = ${worst.toFixed(3)} (${JSON.stringify(worstRow)})`, "≤ 1e-3 J + 0.5 % of ∮|τ·dq|");
  const nvMax = loops.reduce((m, l) => (Math.abs(l.naiveW) > Math.abs(m.naiveW) ? l : m), loops[0]);
  console.log(`     report: NAIVE variant (axial-row torque only, no flexion reaction): largest |∮| = ${Math.abs(nvMax.naiveW).toFixed(4)} J per loop (${nvMax.side} ${nvMax.shape} φ ${nvMax.f0}–${nvMax.f1}°, ±${nvMax.a}°) vs full gradient ${nvMax.W.toExponential(2)} J`); }

// ── KV4a: torque–rotation from θ0 at defined torques (78 kg capacities: the V2-REF spec capacity is 0.35 N·m/kg × 78 kg) ──
{ const cap = 0.35 * 78, inv = (f, T, side) => { let lo = 0, hi = 60; for (let n = 0; n < 80; n++) { const m = (lo + hi) / 2, th = kneeTheta0(f) + (side === "IR" ? m : -m), t = Math.abs(kneeAxialTorque(f, th, cap, cap).tau); if (t < T) lo = m; else hi = m; } return lo; };
  const TS = [2.5, 5, 6, 10, 15], FL = [0, 5, 10, 15, 20, 25, 30, 35, 40, 60, 90, 120], table = FL.map(f => ({ f, IR: TS.map(T => inv(f, T, "IR")), ER: TS.map(T => inv(f, T, "ER")) })); res.kv4a = { torques: TS, table };
  for (const r of table) console.log(`     φ ${String(r.f).padStart(3)}°: IR ${r.IR.map(x => x.toFixed(1)).join(" / ")}  ER ${r.ER.map(x => x.toFixed(1)).join(" / ")}  (at ${TS.join(" / ")} N·m)`);
  const DATA = [["IR", 0, 5, 9.55, 3.5], ["IR", 20, 5, 10.8, 4.0], ["IR", 30, 5, 8.85, 4.3], ["IR", 30, 2.5, 3.7, 1.4], ["IR", 90, 2.5, 4.0, 2.0], ["IR", 90, 6, 10, 4.0], ["IR", 30, 10, 11, 3.0], ["IR", 30, 15, 12, 3.0],
    ["ER", 0, 5, 6.6, 2.8], ["ER", 20, 5, 7.4, 4.0], ["ER", 30, 5, 14.25, 5.2], ["ER", 30, 2.5, 7.6, 3.5], ["ER", 90, 2.5, 10.0, 3.1], ["ER", 90, 6, 16, 4.0], ["ER", 30, 5, 18, 3.0], ["ER", 30, 10, 22.5, 3.0], ["ER", 30, 15, 24.5, 3.0]];
  const zs = DATA.map(([side, f, T, v, sd]) => ({ side, f, T, data: v, model: inv(f, T, side), z: (inv(f, T, side) - v) / sd })); res.kv4a.data = zs;
  const zmax = Math.max(...zs.map(z => Math.abs(z.z))); chk("KV4a.1", "every in-vivo laxity point reproduced", zmax <= 1.5, `max |z| ${zmax.toFixed(2)} (${zs.map(z => `${z.side}${z.f}@${z.T}:${z.z.toFixed(2)}`).join(" ")})`, "|z| ≤ 1.5");
  const mono = table.every(r => [r.IR, r.ER].every(a => a.every((x, i) => i === 0 || x > a[i - 1]))); chk("KV4a.2", "rotation strictly increasing with torque", mono, mono ? "yes" : "no", "strict");
  let dmax = 0; for (let i = 1; i < 9; i++) for (const s of ["IR", "ER"]) for (let t = 0; t < TS.length; t++) dmax = Math.max(dmax, Math.abs(table[i][s][t] - table[i - 1][s][t]));
  chk("KV4a.3", "continuity across the 0–40° grid (5° steps)", dmax <= 2.5, `max adjacent change ${dmax.toFixed(2)}°`, "≤ 2.5°"); }

// ── KV6a: the zero-torque interval through the E1a envelope = [θ0 − s·f_ER, θ0 + s·f_IR] ──
{ let err = 0, bad = 0; for (let f = -5; f <= 40; f++) for (const side of ["R", "L"]) { const e = kneeEnvelopeV2K(f), lo = e.theta0 - KNEE_V2K.ER.slack * e.fER, hi = e.theta0 + KNEE_V2K.IR.slack * e.fIR, up = evalAt(side, f, e.theta0), sA = anatEnds(side, termOf(up, side).soft);
    err = Math.max(err, Math.abs(sA[0] - lo), Math.abs(sA[1] - hi));
    const tLaw = (th) => C[side].s * termOf(evalAt(side, f, th), side).tau;   // the axial law term (see KV1c)
    const tIn = [lo + 1e-3, e.theta0, hi - 1e-3].map(tLaw), tOut = [tLaw(hi + 0.05), tLaw(lo - 0.05)];
    if (tIn.some(t => Math.abs(t) > 1e-9) || !(tOut[0] < 0 && tOut[1] > 0)) bad++; }
  chk("KV6a", "zero-torque interval = [θ0 − s·f_ER, θ0 + s·f_IR] for φ ∈ [−5, 40]°, both knees", err <= 1e-6 && bad === 0, `max end error ${err.toExponential(2)}°, ${bad} interval violations`, "≤ 1e-6°, 0"); }

// ── KV7a: the Jolt emergency stop encloses (bound + end-stop) by ≥ 10° at every reachable flexion ──
{ let minM = Infinity, at = null; for (const side of ["R", "L"]) { const j = spec.joints[KN[side]], E = j.limits.engine, i = C[side].i, eA = anatEnds(side, [E.lo[i], E.hi[i]]), fl = [j.limits.engine.lo[1], j.limits.engine.hi[1]].map(x => x * D + 70);
    for (let f = Math.ceil(fl[0] * 2) / 2; f <= fl[1]; f += 0.5) { const e = kneeEnvelopeV2K(f), mIR = eA[1] - (e.hard[1] + KNEE_V2K.endStopDeg), mER = (e.hard[0] - KNEE_V2K.endStopDeg) - eA[0];
      if (Math.min(mIR, mER) < minM) { minM = Math.min(mIR, mER); at = { side, f, engineAnat: eA.map(x => +x.toFixed(2)), bound: e.hard.map(x => +x.toFixed(2)) }; } } }
  chk("KV7a", "Jolt stop ≥ 10° beyond the calibrated bound + 3° end-stop over the engine-reachable flexion range, both knees", minM >= 10, `min margin ${minM.toFixed(2)}° at ${JSON.stringify(at)}`, "≥ 10°"); }

const nf = res.checks.filter(c => !c.pass).length; console.log(`\n${res.checks.length - nf} / ${res.checks.length} bench checks pass`); res.allPass = nf === 0;
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); w.destroy();
