// ═══ physchar2/tools/b_g3_mirror_falls.mjs — G3 J2 follow-up: mirrored FALLING pairs (excess T8 pushes) — how far do the mirrored trials diverge
// before the supervisor abort and before the fall, versus after (chaotic falling)? Same per-tick mirrored-frame foot-displacement difference as
// tools/g3_mirror_pairs.mjs. DIAGNOSTIC, no change.   usage: node tools/b_g3_mirror_falls.mjs [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js";
const J = await loadJolt(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../vendor/jolt-physics.wasm-compat.js")), out = [];
const mp = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../review_artifacts/physical_character_v2/g3/json/g3_mirror_pairs.json"))).pairs.filter(p => p.sliding && /fell/.test(p.clsA));
function trace(key, mirror) { const def = g3Def(key), spec = generateSpec(VARIATION_SET.find(h => h.id === (def.human || "V2-REF"))), s = new G3Sim(J, spec, def, {}), rows = [], ft = s.ctrl.feet; let foot0 = null;
  while (s.tick()) { const fp = ft.map(f => [s.st[f].pos[0], s.st[f].pos[2]]); if (!foot0) foot0 = fp.map(p => p.slice()); const disp = fp.map((p, n) => [(p[0] - foot0[n][0]) * (mirror ? -1 : 1), p[1] - foot0[n][1]]);
    rows.push({ t: s.n * s.dt, disp: mirror ? [disp[1], disp[0]] : disp }); if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
  const r = { rows, abortT: s.ctrl.g3 ? s.ctrl.g3.aborted : null, fallT: s.g2acc.fallT }; s.destroy(); return r; }
for (const p of mp) { const A = trace(p.a, false), B = trace(p.b, true), n = Math.min(A.rows.length, B.rows.length), upTo = (T) => { let m = 0; for (let i = 0; i < n && A.rows[i].t <= T; i++) m = Math.max(m, ...[0, 1].map(k => Math.hypot(A.rows[i].disp[k][0] - B.rows[i].disp[k][0], A.rows[i].disp[k][1] - B.rows[i].disp[k][1]))); return m * 1000; };
  const row = { a: p.a, b: p.b, abortA: A.abortT, abortB: B.abortT, fallA: A.fallT, fallB: B.fallT, dposToAbortMm: upTo(A.abortT ?? 1e9), dposToFallMm: upTo(Math.min(A.fallT ?? 1e9, B.fallT ?? 1e9)), dposAllMm: upTo(1e9) };
  out.push(row); console.log(`${p.a}: abort ${row.abortA?.toFixed(3)} / ${row.abortB?.toFixed(3)} s, fall ${row.fallA?.toFixed(3)} / ${row.fallB?.toFixed(3)} s | mirrored Δpos up to abort ${row.dposToAbortMm.toFixed(3)} mm, up to the first fall ${row.dposToFallMm.toFixed(2)} mm, whole run ${row.dposAllMm.toFixed(1)} mm`); }
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
