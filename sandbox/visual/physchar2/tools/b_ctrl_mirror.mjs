// ═══ physchar2/tools/b_ctrl_mirror.mjs — G3 J2 follow-up: DIRECT controller mirror-equivariance probe (diagnostic; no change) ═════════════════
// The J2 row compares the commanded CoP of two DIFFERENT physical runs, so it mixes any controller asymmetry with the plant's physical mirror floor.
// This probe tests the controller ALONE: at sampled ticks of a real G3 trial A, it takes the exact controller input (body states, joint coordinates
// from the passive layer, sensed foot loads / contacts, the controller + supervisor state before the compute) and feeds its MIRROR IMAGE
// (sagittal-plane reflection x → −x; L ↔ R bodies, feet, holds, sensed loads; λ → 1 − λ) to the mirror trial B's controller instance. A
// mirror-equivariant controller returns the mirror image of A's output: commanded CoP, requested λ, load share, per-foot CoP, foot forces and
// joint torque magnitudes, up to floating-point rounding.
// Mirror maps: position / COM / linear velocity (−x, y, z); orientation quaternion (x, −y, −z, w); angular velocity (x, −y, −z).
// usage: node tools/b_ctrl_mirror.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js";
const J = await loadJolt(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vendor/jolt-physics.wasm-compat.js")), out = [];
const m3 = (p) => [-p[0], p[1], p[2]], m2 = (p) => [-p[0], p[1]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]], swap = (a) => [a[1], a[0]];
const mirrorSt = (st, map) => map.map(i => ({ pos: m3(st[i].pos), rot: mq(st[i].rot), com: m3(st[i].com), v: m3(st[i].v), w: mw(st[i].w) }));
function mirrorInfo(I) { if (!I) return I; const o = { ...I };
  for (const k of ["c", "v", "A"]) if (I[k]) o[k] = m3(I[k]); for (const k of ["xi", "xiRef", "pRaw", "p", "r", "mid", "heading"]) if (I[k]) o[k] = m2(I[k]);
  if (I.lam != null) o.lam = 1 - I.lam; if (I.share) o.share = swap(I.share); if (I.cop) o.cop = swap(I.cop).map(m2); if (I.F) o.F = swap(I.F).map(m3);
  // a reflection reverses a polygon's winding; reverse the point order so the mirrored polygons keep the controller's (hull2) orientation
  if (I.polys) o.polys = swap(I.polys).map(P => P.map(m2).reverse()); if (I.support) o.support = I.support.map(p => (p.length === 3 ? m3(p) : m2(p))).reverse();
  for (const k of ["inSup", "unl", "ikRes"]) if (I[k]) o[k] = swap(I[k]); return o; }
function mirrorState(S) { const o = JSON.parse(JSON.stringify(S)); o.unl = swap(S.unl); o.hold = swap(S.hold).map(h => (h ? { pos: m3(h.pos), rot: mq(h.rot) } : null)); o.sense = { Fz: swap(S.sense.Fz), touch: swap(S.sense.touch) };
  if (S.g3) o.g3 = { ...S.g3, from: S.g3.from != null ? 1 - S.g3.from : S.g3.from }; o.info = mirrorInfo(S.info); return o; }
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const PAIRS = [["T7:R:0.5", "T7:L:0.5"], ["T7:R:0.25", "T7:L:0.25"], ["T1", "T2"], ["U:R", "U:L"], ["T8:hold:R:F:20", `T8:hold:L:${mirrorDir("F")}:20`], ["T8:hold:R:BR:5", `T8:hold:L:${mirrorDir("BR")}:5`]];
for (const [ka, kb] of PAIRS) { const defA = g3Def(ka), defB = g3Def(kb), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF"));
  const map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === (b.name.endsWith("_L") ? b.name.slice(0, -2) + "_R" : b.name.endsWith("_R") ? b.name.slice(0, -2) + "_L" : b.name)));
  const jmap = spec.joints.map(j => spec.joints.findIndex(x => x.name === (j.name.endsWith("_L") ? j.name.slice(0, -2) + "_R" : j.name.endsWith("_R") ? j.name.slice(0, -2) + "_L" : j.name)));
  const A = new G3Sim(J, spec, defA, {}), B = new G3Sim(J, spec, defB, {}); // the controller input is captured AT THE ENTRY of compute: the sim writes the sensed foot loads / contacts during the tick, just before the
  // compute (a snapshot taken after the previous tick would be one tick stale — the first version of this probe did that, recorded)
  let lastCmd = null, pre = null, stIn = null; const origA = A.ctrl.compute.bind(A.ctrl); A.ctrl.compute = (st, ev, dt) => { pre = A.ctrl.getState(); stIn = st; return (lastCmd = origA(st, ev, dt)); };
  // geometry sanity: the posed initial state is mirror-symmetric (the spec is mirror-built), so mirror(st0) ≈ st0
  const st0 = A.st, sym0 = Math.max(...mirrorSt(st0, map).map((s, i) => Math.max(d3(s.pos, st0[i].pos), d3(s.com, st0[i].com))));
  const rows = [];
  while (A.tick()) { const t = A.n * A.dt, i = A.n;
    if (i % 12 === 0 || (t > 0.95 && t < 1.6) || (t > 3.9 && t < 5.2)) { if (i % 3 === 0) {   // dense where the J2 pre-slide maxima occur (fast T7 ramps, T8 pushes)
      const infoA = A.ctrl.info, cmdA = lastCmd, stM = mirrorSt(stIn, map), evM = B.P.compute(stM, B.dt).ev; B.ctrl.setState(mirrorState(pre)); const cmdB = B.ctrl.compute(stM, evM, B.dt), IB = B.ctrl.info;
      // cmd rows follow the passive layer's joint list (P.jd[n].k = spec joint index); compare |τ| per axis of joint k with its mirror partner
      const tq = (c, P) => { const o = {}; c.forEach((row, n) => { o[P.jd[n].k] = row.map(x => (x ? x.tau0 : 0)); }); return o; }, tA = tq(cmdA, A.P), tB = tq(cmdB, B.P); let dTau = 0, tauMax = 0;
      let worst = null; for (const k of Object.keys(tA).map(Number)) { const a = tA[k], b = tB[jmap[k]]; if (!b) continue; for (let ax = 0; ax < 3; ax++) { const d = Math.abs(Math.abs(a[ax]) - Math.abs(b[ax])); if (d > dTau) { dTau = d; worst = `${spec.joints[k].name}[${ax}] ${a[ax].toFixed(3)} vs ${b[ax].toFixed(3)}`; } tauMax = Math.max(tauMax, Math.abs(a[ax])); } }
      rows.push({ t, dCopMm: d2(IB.p, m2(infoA.p)) * 1000, dPRawMm: d2(IB.pRaw, m2(infoA.pRaw)) * 1000, dLam: infoA.lam == null ? 0 : Math.abs(IB.lam - (1 - infoA.lam)), dShare: Math.abs(IB.share[0] - infoA.share[1]),
        dFootCopMm: Math.max(d2(IB.cop[0], m2(infoA.cop[1])), d2(IB.cop[1], m2(infoA.cop[0]))) * 1000, dForceN: Math.max(d3(IB.F[0], m3(infoA.F[1])), d3(IB.F[1], m3(infoA.F[0]))), dTauAbsNm: dTau, tauWorst: worst, unlA: infoA.unl, unlB: IB.unl, ikA: infoA.ikRes, ikB: IB.ikRes, tauMaxNm: tauMax,
        copLatOffMm: (infoA.p[0] - infoA.mid[0]) * 1000 }); } }
    if (A.g2acc.fallT != null && t > A.g2acc.fallT + 0.5) break; }
  A.destroy(); B.destroy();
  const mx = (k) => Math.max(...rows.map(r => r[k])), row = { a: ka, b: kb, samples: rows.length, initialPoseMirrorErrMm: sym0 * 1000, maxDCopMm: mx("dCopMm"), maxDPRawMm: mx("dPRawMm"), maxDLam: mx("dLam"), maxDShare: mx("dShare"), maxDFootCopMm: mx("dFootCopMm"), maxDForceN: mx("dForceN"), maxDTauAbsNm: mx("dTauAbsNm"), tauMaxNm: mx("tauMaxNm") };
  const w = rows.reduce((a, r) => (r.dTauAbsNm > a.dTauAbsNm ? r : a), rows[0]), wc = rows.reduce((a, r) => (r.dCopMm > a.dCopMm ? r : a), rows[0]); row.worstTau = { t: w.t, at: w.tauWorst, unlA: w.unlA, unlB: w.unlB, ikA: w.ikA, ikB: w.ikB }; row.worstCopT = wc.t; row.rows = rows;
  out.push(row); console.log(`   worst |τ| tick t ${w.t.toFixed(4)}: ${w.tauWorst}; unl A ${JSON.stringify(w.unlA)} B ${JSON.stringify(w.unlB)}; ikRes A ${JSON.stringify(w.ikA)} B ${JSON.stringify(w.ikB)}; worst CoP tick t ${wc.t.toFixed(4)}`); console.log(`${ka} ⇄ ${kb}: ${rows.length} ticks; initial-pose mirror error ${row.initialPoseMirrorErrMm.toExponential(2)} mm | controller(mirror(input)) vs mirror(controller(input)): commanded CoP ${row.maxDCopMm.toExponential(2)} mm, raw CoP ${row.maxDPRawMm.toExponential(2)} mm, λ ${row.maxDLam.toExponential(2)}, share ${row.maxDShare.toExponential(2)}, per-foot CoP ${row.maxDFootCopMm.toExponential(2)} mm, foot force ${row.maxDForceN.toExponential(2)} N, |joint torque| ${row.maxDTauAbsNm.toExponential(2)} N·m (max torque ${row.tauMaxNm.toFixed(1)} N·m)`); }
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
