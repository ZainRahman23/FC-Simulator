// ═══ physchar2/tools/contact_gap_check.mjs — final pre-E1a stage §7: is a 5 mm lift above the turf-contact noise? (static state reads only;
// no lift is commanded or applied). For every body, the accepted G3 controller: T0 at 5 s (both feet loaded) and U:R at 7.9 s (left foot
// unloaded, held, touching): per boot piece the turf-manifold penetration depth, the touching flag (separation ≤ 0.5 mm, the probe's definition),
// speculative-only pieces; the sensed vertical load of the touching-unloaded foot (residual-wrench noise); the foot's tilt (sole normal vs
// vertical); the boot's half length (lever of a foot tilt on the sole clearance). Engine settings in force: speculative distance, penetration slop.
// usage: node tools/contact_gap_check.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { CONTACT } from "../spec/v2_colliders.js"; import { Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI, rows = [];
for (const h of VARIATION_SET) for (const [key, T] of [["T0", 5.0], ["U:R", 7.9]]) { const spec = generateSpec(h), s = new G3Sim(J, spec, g3Def(key), {}), N = Math.round(T / s.dt); const fz = [[], []], dep = [[], []];
  while (s.n < N && s.tick()) { if (s.n * s.dt >= T - 0.5) s.probeRows.forEach((r, n) => { fz[n].push(r.JyN); dep[n].push(Math.max(0, ...r.pieces.map(p => (p.depthMm != null ? p.depthMm : -99)))); }); }
  const pr = s.probeRows, feet = [0, 1].map(n => { const r = pr[n], f = s.st[s.ctrl.feet[n]], u = Q.rot(f.rot, [0, 1, 0]), P = s.probes[n];
    return { touch: r.pieces.filter(p => p.touch).length, specOnly: r.pieces.filter(p => p.spec && !p.touch).length, maxDepthMm: Math.max(...r.pieces.map(p => p.depthMm ?? -99)), depthsMm: r.pieces.map(p => p.depthMm),
      maxDepthMm_last05s: Math.max(...dep[n]), FzN: r.JyN, FzN_last05s: [Math.min(...fz[n]), Math.max(...fz[n])], tiltDeg: Math.acos(Math.min(1, u[1])) * D, bootHalfLenMm: P.len * 500 }; });
  rows.push({ body: h.id, key, t: T, feet }); s.destroy();
  console.log(`${h.id.padEnd(14)} ${key.padEnd(4)}: ` + feet.map((f, n) => `${n ? "R" : "L"} touch ${f.touch} spec ${f.specOnly} depth max ${f.maxDepthMm.toFixed(2)} mm (0.5 s max ${f.maxDepthMm_last05s.toFixed(2)}), Fz ${f.FzN.toFixed(1)} N [${f.FzN_last05s.map(x => x.toFixed(1)).join("…")}], tilt ${f.tiltDeg.toFixed(2)}°, half-boot ${f.bootHalfLenMm.toFixed(0)} mm`).join(" | ")); }
console.log(`engine: speculative ${CONTACT.speculative * 1000} mm, penetration slop ${CONTACT.slop * 1000} mm, probe touch threshold 0.5 mm`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/contact_gap_check.mjs", contact: CONTACT, rows }));
