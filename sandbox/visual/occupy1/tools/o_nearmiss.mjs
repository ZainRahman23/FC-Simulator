// occupy1/tools/o_nearmiss.mjs — §10 NO INVISIBLE FORCE FIELD: footballers pass very close; occupancy must not keep them apart when their
// bodies would not have overlapped. Near misses swept across lateral offsets: a carrier walking / jogging PAST a standing player, two players
// passing HEAD-ON (walk, jog), the defender CROSSING behind the carrier. For each: OLD's closest approach of the resolved volumes (the bodies
// as drawn), and under occupancy the ticks it acted, the largest root deviation from OLD and the largest separation it added.
//   node o_nearmiss.mjs [--json f]
import { ENV } from "./o_env.mjs";
import { D } from "../../tackle1/t_cases.js";
import { runO } from "../o_run.js";
import { RES } from "../o_world.js";
if (process.env.RESJ) Object.assign(RES, JSON.parse(process.env.RESJ));
import { volumesOf, detect, OCC } from "../o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DT = 1 / 240, hyp = Math.hypot;
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
const L = [];
for (const lat of [0.40, 0.45, 0.50, 0.55, 0.60, 0.70, 0.80]) for (const s of [1, -1]) {
  L.push({ id: `past-walk ${s * lat}`, kind: "PAST A STANDING PLAYER · walk", c: carry("WALK", { runup: 2.2, dur: 3.5 }), def: D(2.4, s * lat, 180), tackle: [] });
  L.push({ id: `past-jog ${s * lat}`, kind: "PAST A STANDING PLAYER · jog", c: carry("JOG", { dur: 3.0 }), def: D(3.2, s * lat, 180), tackle: [] });
  L.push({ id: `headon-walk ${s * lat}`, kind: "HEAD-ON PASS · walk", c: carry("WALK", { runup: 2.2, dur: 3.5 }), def: D(4.4, s * lat, 180, { stick: [[-0.2, 0, "WALK"]] }), tackle: [] });
  L.push({ id: `headon-jog ${s * lat}`, kind: "HEAD-ON PASS · jog", c: carry("JOG", { dur: 3.0 }), def: D(7.2, s * lat, 180, { stick: [[-0.3, 0, "JOG"]] }), tackle: [] }); }
for (const ahead of [5.3, 5.8, 6.3, 6.8]) for (const s of [1, -1]) L.push({ id: `cross-behind ${ahead}/${s}`, kind: "CROSSING BEHIND THE CARRIER · jog", c: carry("JOG", { dur: 3.5 }), def: D(ahead, s * 2.6, s * -90, { stick: [[0.4, 0, "JOG"]] }), tackle: [] });
const rows = [];
for (const tc of L) { const RO = runO(ENV, tc, "OLD"), RC = runO(ENV, tc, "OCC"), WO = RO.W, WC = RC.W; let gapO = Infinity, gapC = Infinity, dev = 0, firstDev = null;
  for (const [W, set] of [[WO, (g) => (gapO = Math.min(gapO, g))], [WC, (g) => (gapC = Math.min(gapC, g))]]) for (const fr of W.frames.values()) { if (hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) > OCC.broad + 0.3) continue; for (const x of detect(volumesOf(fr.a.J), volumesOf(fr.d.J), { within: 0.5 })) if (x.both) set(x.gap); }
  for (let k = 0; k <= Math.min(WO.k, WC.k); k++) { for (const p of ["att", "def"]) { const a = WO[p].stateAt(k * DT).P, b = WC[p].stateAt(k * DT).P, d = hyp(a[0] - b[0], a[1] - b[1]); if (d > dev) dev = d; if (d > 1e-9 && firstDev == null) firstDev = k; } }
  const acts = WC.occ.log.filter((x) => x.acted), why = { position: acts.filter((x) => hyp(...x.dA) + hyp(...x.dD) > 0).length, wall: acts.filter((x) => (x.wA || 0) + (x.wD || 0) > 0).length, feet: acts.filter((x) => (x.foot || []).length).length };
  rows.push({ id: tc.id, kind: tc.kind, gapOLD: gapO, gapOCC: gapC, acted: acts.length, why, dev, firstDev: firstDev != null ? +(firstDev * DT - RO.t0).toFixed(3) : null }); process.stderr.write("."); }
const cm = (v) => (v === Infinity ? "  —  " : (v * 100).toFixed(1).padStart(5)), cls = (g) => (g === Infinity || g > 0.3 ? "apart (> 30 cm)" : g > 0.05 ? "NEAR MISS 5 – 30 cm" : g > 0 ? "NEAR MISS 0 – 5 cm" : g >= -OCC.tol ? "TOUCHING (within the 2 cm tolerance)" : "OVERLAP in OLD");
console.log(`\nNO FORCE FIELD — ${rows.length} passes swept across lateral offsets; OLD's closest approach of the resolved volumes, and what occupancy did`);
console.log(`  ${"case".padEnd(26)} ${"OLD gap".padStart(8)} ${"OCC gap".padStart(8)}  ${"acted".padStart(5)} (pos / wall / feet)  ${"root dev".padStart(8)}  class`);
for (const r of rows) console.log(`  ${r.id.padEnd(26)} ${cm(r.gapOLD)} cm ${cm(r.gapOCC)} cm  ${String(r.acted).padStart(5)} (${r.why.position} / ${r.why.wall} / ${r.why.feet})  ${(r.dev * 100).toFixed(2).padStart(6)} cm  ${cls(r.gapOLD)}`);
const by = {}; for (const r of rows) { const c = cls(r.gapOLD); (by[c] = by[c] || []).push(r); }
console.log(`\n  BY OLD's CLOSEST APPROACH:`); for (const [c, R] of Object.entries(by)) console.log(`  ${c.padEnd(38)} ${String(R.length).padStart(3)} passes · occupancy acted in ${R.filter((r) => r.acted).length} · identical to OLD every tick in ${R.filter((r) => r.dev < 1e-9).length} · the largest root deviation ${(Math.max(0, ...R.map((r) => r.dev)) * 100).toFixed(2)} cm`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows, null, 1));
