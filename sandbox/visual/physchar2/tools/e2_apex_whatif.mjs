// ═══ physchar2/tools/e2_apex_whatif.mjs — PLANNING-ONLY what-if (e2/E2_OVERNIGHT_REPORT.md §12; no simulation, changes nothing): the frozen E2 post-liftoff swing's vertical
// reference (A1 / B1: from the lift reference at the planning liftoff delay, apex knot at T/2 by BLF's solve, T = 0.6 s, end at the anchor) — the reference foot-origin height
// above the anchor at the clearance-window ends and the descent speed near the turf, for alternative apex heights and liftoff delays. usage: node tools/e2_apex_whatif.mjs
import { stepSegment, stepAt } from "../ctrl/v2_swing.js"; import { FS, liftRef } from "../ctrl/v2_footstep.js";
const A = { pos: [0, 0, 0], rot: [0, 0, 0, 1] }, T = 0.6;
const run = (Tlo, apex) => { const L = liftRef(A, Tlo), sg = stepSegment({ p: L.p, v: L.v, a: L.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, { pos: [0, 0, 0.10], rot: A.rot }, T, { z: apex, tk: 0.5 * T });
  const z = (phi) => stepAt(sg, phi * T), cross = (h) => { for (let phi = 0.5; phi <= 1; phi += 0.0005) { const e = z(phi); if (e.pos[1] * 1000 <= h) return [phi, -e.vel[1]]; } return [1, 0]; };
  let mn = 1e9, at = null; for (let phi = 0.2; phi <= 0.8 + 1e-9; phi += 0.001) { const h = z(phi).pos[1] * 1000; if (h < mn) { mn = h; at = phi; } }
  return { L, z02: z(0.2).pos[1] * 1000, z075: z(0.75).pos[1] * 1000, z08: z(0.8).pos[1] * 1000, mn, at, c15: cross(1.5) }; };
console.log(`frozen: liftoff delay ${FS.liftDelayPlan} s, apex 25 mm, T ${T} s. Reference foot-origin height above the anchor (mm); the lowest boot point is ≈ 0.08 mm above it (PG records: 5.40 at φ 0.80)`);
for (const Tlo of [FS.liftDelayPlan, 0.133]) for (const apex of [0.025, 0.0265, 0.0275, 0.030, 0.0325, 0.035, 0.0375, 0.040]) { const r = run(Tlo, apex);
  console.log(`delay ${Tlo.toFixed(3)} s, apex ${(apex * 1000).toFixed(1)} mm: φ0.2 ${r.z02.toFixed(2)} | φ0.75 ${r.z075.toFixed(2)} | φ0.8 ${r.z08.toFixed(2)} | min over [0.2, 0.8] ${r.mn.toFixed(2)} at φ ${r.at.toFixed(3)} | reaches 1.5 mm at φ ${r.c15[0].toFixed(3)} descending ${r.c15[1].toFixed(3)} m/s`); }
