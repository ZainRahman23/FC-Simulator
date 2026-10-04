// ═══ physchar2/tools/ik_pelvis_yaw.mjs — user decision 2026-10-04 (Decision 2), plausibility of the invalid footholds (DIAGNOSTIC)
// tools/ik_g4_study.mjs / ik_anat_study.mjs hold the pelvis ORIENTATION at the controller's posture target. In human turning steps the pelvis yaws
// toward the new direction, so the hip rotation a foothold demands is roughly (foot yaw − pelvis yaw). For every target that is geometrically but
// not anatomically reachable (bounded IK) at pelvis yaw 0, this re-solves it with the pelvis rotated about the vertical by ψ = 5, 10, … 45° TOWARD
// the foot's yaw (both signs for foot yaw 0) — pelvis position, limits, body and solver unchanged — and records the smallest ψ that makes it
// anatomically reachable, plus the result at ψ = foot yaw / 2. Same start states and targets as ik_g4_study.mjs.
// usage: node tools/ik_pelvis_yaw.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q, unitStates, unitEv } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI;
function captureState(spec, key, T, n) { const s = new G3Sim(J, spec, g3Def(key), {}); let cap = null; const o = s.ctrl.legIK.bind(s.ctrl), want = { on: false };
  s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want.on && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return o(st, ev, nn, pP, qP, fp); };
  while (s.n * s.dt < T - 1e-9 && s.tick()); want.on = true; s.tick(); s.ctrl.legIK = o; return { s, ctrl: s.ctrl, cap }; }
const TARGETS = []; for (const hgt of [0, 0.05, 0.10]) for (const [fwd, lat, fam] of [[0.15, 0, "short forward"], [0.30, 0, "medium forward"], [0.45, 0, "long forward"], [0.60, 0, "very long forward"], [-0.10, 0, "slight backward"], [0, -0.08, "inward (crossing)"], [0.10, -0.15, "far crossing"], [0, 0.10, "outward"], [0, 0.20, "far outward"], [0.30, 0.10, "diagonal out"], [0.30, -0.06, "diagonal in"], [0.15, 0.05, "wider short step"], [0.15, -0.04, "narrower short step"]])
  for (const yaw of [0, 30, -30, 45, -45]) TARGETS.push({ fwd, lat, hgt, yaw, fam });
const rows = [];
for (const h of VARIATION_SET) { const spec = generateSpec(h);
  for (const [key, T, n, state] of [["U:R", 8, 0, "swing-ready"], ["U:L", 8, 1, "swing-ready"], ["T5", 6, 0, "near-single-support"], ["T6", 6, 1, "near-single-support"]]) {
    const { s, ctrl, cap } = captureState(spec, key, T, n); if (!cap) { s.destroy(); continue; }
    const st = cap.st, ev = cap.ev, ft0 = cap.foot || st[ctrl.feet[n]], fw = Q.rot(st[ctrl.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), latOut = n === 0 ? V.sc([hd[2], 0, -hd[0]], -1) : [hd[2], 0, -hd[0]], sgnLeg = n === 0 ? -1 : 1;
    for (const drop of [0, 0.05, 0.10]) for (const t of TARGETS) { const pP = [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot = { pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, t.fwd)), V.sc(latOut, t.lat)), [0, t.hgt, 0]), rot: Q.norm(Q.mul(Q.axis([0, 1, 0], sgnLeg * t.yaw / D), ft0.rot)) };
      const U = ctrl.legIK(st, ev, n, pP, cap.qP, foot), B = ctrl.legIKBounded(st, ev, n, pP, cap.qP, foot); if (!(U.err <= 1e-6 && B.err > 1e-6)) continue;
      const solveAt = (psiDeg) => { const qP = Q.norm(Q.mul(Q.axis([0, 1, 0], psiDeg / D), cap.qP)); return ctrl.legIKBounded(st, ev, n, pP, qP, foot).err <= 1e-6; };
      const dirs = t.yaw === 0 ? [1, -1] : [Math.sign(sgnLeg * t.yaw)]; let minPsi = null, minSign = null;
      for (let p = 5; p <= 45 && minPsi == null; p += 5) for (const d of dirs) if (solveAt(d * p)) { minPsi = p; minSign = d; break; }
      const half = t.yaw ? solveAt(sgnLeg * t.yaw / 2) : null;
      rows.push({ body: h.id, state, leg: n ? "R" : "L", drop, fam: t.fam, yaw: t.yaw, hgt: t.hgt, minPelvisYawDeg: minPsi, towardFoot: minSign, halfYawReaches: half }); }
    s.destroy(); }
  console.error(`${h.id}: ${rows.length} invalid targets so far`); }
const by = (f) => { const o = {}; for (const r of rows) { const k = f(r); o[k] = o[k] || {}; const m = r.minPelvisYawDeg == null ? ">45" : r.minPelvisYawDeg; o[k][m] = (o[k][m] || 0) + 1; } return o; };
console.log(`${rows.length} geometric-but-not-anatomical targets`); console.log("smallest pelvis yaw toward the foot that makes the target anatomical, by foot yaw:", JSON.stringify(by(r => r.yaw)));
console.log("… by family:", JSON.stringify(by(r => r.fam))); console.log(`pelvis yaw = foot yaw / 2 reaches ${rows.filter(r => r.halfYawReaches).length} of ${rows.filter(r => r.yaw).length} yawed invalid targets`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_pelvis_yaw.mjs", date: new Date().toISOString().slice(0, 10), rows }));
