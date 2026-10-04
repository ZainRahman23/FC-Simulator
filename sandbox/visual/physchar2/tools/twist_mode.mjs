// ═══ physchar2/tools/twist_mode.mjs — ankle reinvestigation, held-out attack (DIAGNOSTIC): STABILITY of the leg-twist mode (the antisymmetric
// ankle ab/adduction ↔ hip rotation ↔ pelvis yaw mode, G3-A7 / G3-F1) after a disturbance, under the validated G2 controller, at the env k.
// For each disturbance the run lasts 20 s; per 1 s window: the half peak-to-peak of the left ankle's ab/adduction and of the pelvis yaw (deg).
// Classification from the window amplitudes A(t): growth = mean A over 15–20 s / mean A over 2–7 s: DECAYING (< 0.5), SUSTAINED (0.5 … 1.5),
// GROWING (> 1.5) — QUIET when the twist never exceeds 1° (amplitude ratios of sub-degree noise are meaningless); plus the final amplitude.
// --stand=<json> passes DIAGNOSTIC controller options (e.g. {"ikRefTwist":true}); never a production configuration. Disturbances: thorax angular impulses roll / yaw / pitch 4 and 8 N·m·s, thorax pushes R 15 / F 15
// N·s (G2 scenarios with a 20 s horizon); bodies V2-REF, V2-165-62, V2-198-92.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/twist_mode.mjs [--bodies=V2-REF,…] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G2Sim, torqueScenario, pushScenario } from "../gates/v2_g2.js";
import { ankleNeutralKPerDeg } from "../spec/v2_joints.js"; import { Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const BODIES = arg("bodies", "V2-REF,V2-165-62,V2-198-92").split(","), OUT = arg("out", ""), T = 20, STAND = JSON.parse(arg("stand", "{}"));
const DIST = [["roll", 4], ["roll", 8], ["yaw", 4], ["yaw", 8], ["pitch", 8], ["push R", 15], ["push F", 15]];
const out = { generated: "tools/twist_mode.mjs", k: ankleNeutralKPerDeg(), stand: STAND, seconds: T, runs: [] };
for (const id of BODIES) { const spec = generateSpec(VARIATION_SET.find(h => h.id === id)), jx = (n) => spec.joints.findIndex(j => j.name === n), pel = spec.bodies.findIndex(b => b.name === "pelvis"), aL = jx("ankle_L");
  for (const [d, H] of DIST) { const sc = d.startsWith("push") ? { ...pushScenario(d.split(" ")[1], H), seconds: T } : { ...torqueScenario(d, H), seconds: T }, s = new G2Sim(J, spec, sc, Object.keys(STAND).length ? { stand: STAND } : {}), W = [];
    while (s.tick()) { const t = s.n * s.dt, w = Math.floor(t), f = s.P.anat(s.P.jd[aL], s.up.ev.qs[aL], "fabd"), fq = Q.rot(s.st[pel].rot, [0, 0, 1]), y = Math.atan2(fq[0], fq[2]) * 180 / Math.PI;
      const o = W[w] || (W[w] = { f0: f, f1: f, y0: y, y1: y }); o.f0 = Math.min(o.f0, f); o.f1 = Math.max(o.f1, f); o.y0 = Math.min(o.y0, y); o.y1 = Math.max(o.y1, y); }
    const r = s.g2summary(); s.destroy(); const A = W.map(o => (o.f1 - o.f0) / 2), Y = W.map(o => (o.y1 - o.y0) / 2), mean = (a, i, j) => a.slice(i, j).reduce((p, q) => p + q, 0) / (j - i);
    const growth = mean(A, 15, 20) / Math.max(1e-9, mean(A, 2, 7)), cls = Math.max(...A) < 1 ? "QUIET" : growth < 0.5 ? "DECAYING" : growth > 1.5 ? "GROWING" : "SUSTAINED";
    const row = { body: id, disturbance: `${d} ${H}`, outcome: r.outcome, cls, growth: +growth.toFixed(3), ampFabdDeg: A.map(v => +v.toFixed(2)), ampPelvisYawDeg: Y.map(v => +v.toFixed(2)), finalFabdAmp: +A[T - 1].toFixed(2), finalYawAmp: +Y[T - 1].toFixed(2) };
    out.runs.push(row); console.log(`k ${out.k}${Object.keys(STAND).length ? " " + JSON.stringify(STAND) : ""} ${id.padEnd(10)} ${row.disturbance.padEnd(9)} ${cls.padEnd(9)} growth ${row.growth.toFixed(2)}  fabd amp 2–7 s ${mean(A, 2, 7).toFixed(1)}° → 15–20 s ${mean(A, 15, 20).toFixed(1)}° (final ${row.finalFabdAmp}°), pelvis yaw final ${row.finalYawAmp}°; ${r.outcome}`); } }
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out));
