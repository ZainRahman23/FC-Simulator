// CF-6 preregistration (read-only analysis): the V2 walking envelope per body — leg length, hip height above the ankle in the validated stance, straight-leg horizontal reach, foot region, ω, leg capacities. No stepping; one settled stance (3.4 s) per body.
// usage (from the worktree root): V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node review_artifacts/physical_character_v2/diagnostics/loco_cf6_2026-10-08/scripts/envelope.mjs
// read-only: V2 walking envelope from the spec and one settled standing state (no stepping)
import path from "path"; import { loadJolt } from "../../../../../sandbox/visual/physchar2/core/v2_jolt.js";
import { e2Spec, CFG } from "../../../../../sandbox/visual/physchar2/gates/v2_e2.js"; import { G3Sim, g3Def } from "../../../../../sandbox/visual/physchar2/gates/v2_g3.js";
import { V } from "../../../../../sandbox/visual/physchar2/core/v2_math.js";
const J = await loadJolt(new URL("../../../../../sandbox/visual/physchar2/vendor/jolt-physics.wasm-compat.js", import.meta.url).pathname), D = 180 / Math.PI;
const cap = (j, ax, dir) => { const a = (j.actuator || j.act || j.capacity) && (j.actuator || j.act || j.capacity)[ax]; return a && a[dir] ? a[dir].Nm : null; };
for (const h of ["V2-REF", "V2-165-62", "V2-198-92", "V2-long-legs"]) { const spec = e2Spec(h), def = { ...g3Def("U:R"), lam: () => 0.5, holds: [], seconds: 3.5, push: null, torque: null };
  const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: { t0: 1, dur: 2, dz: 0.025 }, ...CFG.PSTAR5CHABV }, passiveOpts: { kneeModel: "v2k" } });
  while (s.tick() && s.n * s.dt < 3.4) {} const C = s.ctrl, st = s.st, I = C.info;
  const hipL = C.jointAt(st, C.legK[0][0]), ankL = C.jointAt(st, C.legK[0][2]), L = C.legLen[0], dv = hipL[1] - ankL[1], reach = Math.sqrt(Math.max(0, L * L - dv * dv));
  const hip = spec.joints.find(j => j.name === "hip_L"), knee = spec.joints.find(j => j.name === "knee_L"), ank = spec.joints.find(j => j.name === "ankle_L");
  const legM = ["thigh_L", "shank_L", "foot_L"].map(n => spec.bodies.find(b => b.name === n).mass).reduce((a, b) => a + b, 0), M = spec.bodies.reduce((a, b) => a + b.mass, 0);
  const poly = C.footPoly(st, 0), xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  console.log(JSON.stringify({ body: h, massKg: +M.toFixed(1), legLenM: +L.toFixed(4), hipHeightM: +hipL[1].toFixed(4), hipAboveAnkleM: +dv.toFixed(4), maxHorizontalReachStraightLegM: +reach.toFixed(4), comHeightM: +I.c[1].toFixed(4), omega: +I.w0.toFixed(3),
    footRegionLenM: +(Math.max(...zs) - Math.min(...zs)).toFixed(4), footRegionWidthM: +(Math.max(...xs) - Math.min(...xs)).toFixed(4), legMassKg: +legM.toFixed(2),
    capNm: { hipFlex: cap(hip, "y", "plus") ?? cap(hip, "y", "minus"), hipAxes: Object.fromEntries(Object.entries(hip.actuator || hip.act || hip.capacity || {}).map(([k, v]) => [k, v ? { plus: v.plus && [v.plus.dir, v.plus.Nm], minus: v.minus && [v.minus.dir, v.minus.Nm] } : null])),
      kneeAxes: Object.fromEntries(Object.entries(knee.actuator || knee.act || knee.capacity || {}).map(([k, v]) => [k, v ? { plus: v.plus && [v.plus.dir, +v.plus.Nm.toFixed(1)], minus: v.minus && [v.minus.dir, +v.minus.Nm.toFixed(1)] } : null])),
      ankleAxes: Object.fromEntries(Object.entries(ank.actuator || ank.act || ank.capacity || {}).map(([k, v]) => [k, v ? { plus: v.plus && [v.plus.dir, +v.plus.Nm.toFixed(1)], minus: v.minus && [v.minus.dir, +v.minus.Nm.toFixed(1)] } : null])) } }));
  s.destroy(); }
