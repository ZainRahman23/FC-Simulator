// ═══ physchar2/tools/twist_toeout.mjs — pre-G4 runway (twist-policy falsification): does a REFERENCE twist target over-constrain a stance whose
// feet are legitimately toed out near the hip-rotation limit? (DIAGNOSTIC; controller options via --stand=<json>)
// Quiet stance 8 s starting from toe-out θ per foot (initStance.toeOutDeg; the controller's reference stance stays nominal, 7°), θ = 7 / 30 /
// 40 / 45°. Reported: outcome; final hip rotation (anat), ankle ab/adduction, knee axial; hip-rotation actuator saturation time and peak
// fraction of capacity; hip-rotation passive torque (end range); pelvis-yaw half range 6–8 s.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/twist_toeout.mjs [--stand=<json>] [--human=V2-REF]
import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G2Sim } from "../gates/v2_g2.js";
import { ankleNeutralKPerDeg } from "../spec/v2_joints.js"; import { Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const STAND = JSON.parse(arg("stand", "{}")), HUMAN = arg("human", "V2-REF"), spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), jx = (n) => spec.joints.findIndex(j => j.name === n), D = 180 / Math.PI;
for (const th of [7, 30, 40, 45]) { const s = new G2Sim(J, spec, { title: `toe-out ${th}`, seconds: 8, initStance: { toeOutDeg: th } }, Object.keys(STAND).length ? { stand: STAND } : {}), pel = spec.bodies.findIndex(b => b.name === "pelvis");
  let sat = 0, peak = 0, pasHip = 0, yw = [1e9, -1e9]; const hk = [jx("hip_L"), jx("hip_R")];
  while (s.tick()) { const t = s.n * s.dt; for (const r of s.actRes || []) if (hk.includes(r.k) && r.i === 0) { if (r.sat) sat += s.dt / 2; peak = Math.max(peak, r.frac); }
    for (const pj of s.up.joints || []) if (hk.includes(pj.k)) pasHip = Math.max(pasHip, Math.abs(pj.tau[0]));
    if (t >= 6) { const f = Q.rot(s.st[pel].rot, [0, 0, 1]), y = Math.atan2(f[0], f[2]) * D; yw = [Math.min(yw[0], y), Math.max(yw[1], y)]; } }
  const A = (n, k) => s.P.anat(s.P.jd[jx(n)], s.up.ev.qs[jx(n)], k).toFixed(1), out = s.g2summary().outcome;
  console.log(`k ${ankleNeutralKPerDeg()} ${HUMAN} ${JSON.stringify(STAND)} toe-out ${th}°: ${out}; hip rot ${A("hip_L", "rot")}/${A("hip_R", "rot")}°, ankle fabd ${A("ankle_L", "fabd")}/${A("ankle_R", "fabd")}°, knee axial ${A("knee_L", "rot")}/${A("knee_R", "rot")}°; hip-rot actuator sat ${sat.toFixed(2)} s, peak ${(100 * peak).toFixed(0)} % cap; hip-rot passive |τ| max ${pasHip.toFixed(1)} N·m; pelvis yaw half-range 6–8 s ${((yw[1] - yw[0]) / 2).toFixed(2)}°`);
  s.destroy(); }
