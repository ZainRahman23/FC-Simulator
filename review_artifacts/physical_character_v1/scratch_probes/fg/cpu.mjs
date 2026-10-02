// controlled CPU benchmark: the same 8 s walking run (Controller A, F0 maps, start R@0.6) on each foot, 3 repeats, sequential; ms per simulated second
import { J, body, G2 } from "./lib.mjs";
const res = {}; for (const fm of ["F0", "F1", "F2", "F2h", "F0", "F1", "F2", "F2h", "F0", "F1", "F2", "F2h"]) { const { spec, poses } = body(fm); const t0 = process.hrtime.bigint();
  const r = G2.runG2a(J, spec, "G2W_A8_best", { poses, seconds: 8 }); const ms = Number(process.hrtime.bigint() - t0) / 1e6; (res[fm] = res[fm] || []).push({ ms, hash: r.hash, n: spec.bodies.length, nc: (spec.joints.length + (spec.passiveJoints || []).length) }); }
for (const [k, v] of Object.entries(res)) console.log(k, "bodies", v[0].n, "constraints", v[0].nc, "ms per sim-s", v.map(x => (x.ms / 8).toFixed(0)).join(" / "), "median", [...v].sort((a, b) => a.ms - b.ms)[1].ms / 8 | 0, "hashes", [...new Set(v.map(x => x.hash))].join(","));
