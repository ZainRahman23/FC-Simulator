// ═══ physchar2/tools/turn_test.mjs — pre-G4 runway (twist policy falsification): does a twist policy OVER- or UNDER-constrain legitimate
// body turning? (DIAGNOSTIC; controller options via --stand=<json>, never production)
// (1) commanded pelvis turn with both feet planted: the diagnostic yawCmd ramps the pelvis yaw target 0 → θ over 2 s from t = 2 s and holds to
//     t = 10 s (θ = 10 / 20 / 30°). Reported at t = 10 s: achieved pelvis yaw / θ, where the rotation went (hip rotation L / R, knee axial,
//     ankle ab/adduction), foot slip and foot yaw, hip-rotation actuator saturation time, and the oscillation left (pelvis yaw half range 8–10 s).
// (2) static yaw stiffness: constant 2 N·m pelvis yaw torque from 6 s at λ_R 0.5 (G3 "Y:0.5:2" scenario), Δ yaw 6 → 13 s → N·m/°.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/turn_test.mjs [--human=V2-REF] [--stand=<json>] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G2Sim } from "../gates/v2_g2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { ankleNeutralKPerDeg } from "../spec/v2_joints.js"; import { Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), STAND = JSON.parse(arg("stand", "{}")), OUT = arg("out", ""), D = 180 / Math.PI;
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), jx = (n) => spec.joints.findIndex(j => j.name === n), bi = (n) => spec.bodies.findIndex(b => b.name === n), yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; };
const out = { k: ankleNeutralKPerDeg(), human: HUMAN, stand: STAND, turns: [], yawStiffness: null };
for (const th of [10, 20, 30]) { const ramp = (t) => (t < 2 ? 0 : t < 4 ? (t - 2) / 2 : 1) * th / D;
  const s = new G2Sim(J, spec, { title: `turn ${th}`, seconds: 10 }, { stand: { ...STAND, yawCmd: ramp } }), P = s.P, pel = bi("pelvis"), ft = [bi("foot_L"), bi("foot_R")];
  let y0 = null, f0 = null, a0 = null, satT = 0, ywin = [1e9, -1e9]; const A = (n, key) => P.anat(P.jd[jx(n)], s.up.ev.qs[jx(n)], key);
  while (s.tick()) { const t = s.n * s.dt; if (y0 == null && t >= 1.9) { y0 = yawOf(s.st[pel].rot); f0 = ft.map(i => s.st[i].pos.slice()); a0 = { hL: A("hip_L", "rot"), hR: A("hip_R", "rot"), kL: A("knee_L", "rot"), kR: A("knee_R", "rot"), aL: A("ankle_L", "fabd"), aR: A("ankle_R", "fabd") }; }
    if (t >= 8) { const y = yawOf(s.st[pel].rot); ywin = [Math.min(ywin[0], y), Math.max(ywin[1], y)]; }
    if ((s.actRes || []).some(r => r.sat && (r.k === jx("hip_L") || r.k === jx("hip_R")) && r.i === 0)) satT += s.dt; }
  const y1 = yawOf(s.st[pel].rot), r = { thetaDeg: th, achievedDeg: y1 - y0, ratio: (y1 - y0) / th, hipRotDeltaDeg: [A("hip_L", "rot") - a0.hL, A("hip_R", "rot") - a0.hR], kneeAxialDeltaDeg: [A("knee_L", "rot") - a0.kL, A("knee_R", "rot") - a0.kR],
    ankleFabdDeltaDeg: [A("ankle_L", "fabd") - a0.aL, A("ankle_R", "fabd") - a0.aR], footSlipMm: ft.map((i, n) => Math.hypot(s.st[i].pos[0] - f0[n][0], s.st[i].pos[2] - f0[n][2]) * 1000), footYawDeg: ft.map(i => yawOf(s.st[i].rot)),
    hipRotSatS: satT, residualYawOscDeg: (ywin[1] - ywin[0]) / 2, outcome: s.g2summary().outcome };
  s.destroy(); out.turns.push(r);
  console.log(`k ${out.k} ${HUMAN} ${JSON.stringify(STAND)} turn ${th}°: achieved ${r.achievedDeg.toFixed(2)}° (${(100 * r.ratio).toFixed(0)} %); Δhip rot ${r.hipRotDeltaDeg.map(v => v.toFixed(1)).join("/")}°, Δknee axial ${r.kneeAxialDeltaDeg.map(v => v.toFixed(1)).join("/")}°, Δankle fabd ${r.ankleFabdDeltaDeg.map(v => v.toFixed(1)).join("/")}°; slip ${r.footSlipMm.map(v => v.toFixed(1)).join("/")} mm; hip-rot sat ${satT.toFixed(2)} s; residual yaw osc ${r.residualYawOscDeg.toFixed(2)}°; ${r.outcome}`); }
{ const s = new G3Sim(J, spec, g3Def("Y:0.5:2"), Object.keys(STAND).length ? { stand: STAND } : {}); while (s.tick()); const m = s.g3summary().g3.marks; s.destroy(); const dy = m.length === 2 ? m[1].yaw - m[0].yaw : null; out.yawStiffness = dy ? 2 / Math.abs(dy) : null;
  console.log(`k ${out.k} ${HUMAN} ${JSON.stringify(STAND)} static yaw stiffness (2 N·m, λ 0.5): ${out.yawStiffness ? out.yawStiffness.toFixed(2) : "—"} N·m/° (Δyaw ${dy ? dy.toFixed(2) : "—"}°)`); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
