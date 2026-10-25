// occupy3b/tools/l3_nearmiss.mjs — §10 / §18 NO-CONTACT NEAR MISSES: two players passing without a genuine contact must be STAGE 2 (Stage 3B and
// Stage 3 acting on nothing). Stage 3's own tool, run STAGE 2 (as decided) vs STAGE 3B (its header:)
// Stage 2's near-miss sweep
// (occupy2/tools/s2/o2s_nearmiss.mjs: a carrier walking / jogging PAST a standing player, two players passing HEAD-ON, the defender CROSSING behind
// the carrier, across lateral offsets) run STAGE 2 (as decided) vs STAGE 3. For each pass: Stage 2's closest approach of the resolved volumes, whether
// Stage 3 opened an impact at all (and why), and the largest difference between the two runs (both roots, every tick) — none where nothing was
// meaningful. Also the touching passes Stage 3 left alone (contact, but slower than its thresholds: Stage 2's occupancy alone).
//   [IMP='{…RES3 overrides}'] node o3_nearmiss.mjs [--json f]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { D } from "../../tackle1/t_cases.js";
import { runO3 } from "../../occupy3/o3_run.js";
import "../../occupy3/o3_world.js";
import "../l3_world.js";
import { volumesOf, detect, OCC } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DT = 1 / 240, hyp = Math.hypot;
const carry = (mode, o = {}) => Object.assign({ tech: "CARRY", variant: mode, mode, ang: 0, runup: 2.4, dur: 3.0, pre: 1.0, intents: [] }, o);
// (the passes exactly as o2s_nearmiss.mjs makes them)
const L = [];
for (const lat of [0.40, 0.45, 0.50, 0.55, 0.60, 0.70, 0.80]) for (const s of [1, -1]) {
  L.push({ id: `past-walk ${s * lat}`, kind: "PAST A STANDING PLAYER · walk", c: carry("WALK", { runup: 2.2, dur: 3.5 }), def: D(2.4, s * lat, 180), tackle: [] });
  L.push({ id: `past-jog ${s * lat}`, kind: "PAST A STANDING PLAYER · jog", c: carry("JOG", { dur: 3.0 }), def: D(3.2, s * lat, 180), tackle: [] });
  L.push({ id: `headon-walk ${s * lat}`, kind: "HEAD-ON PASS · walk", c: carry("WALK", { runup: 2.2, dur: 3.5 }), def: D(4.4, s * lat, 180, { stick: [[-0.2, 0, "WALK"]] }), tackle: [] });
  L.push({ id: `headon-jog ${s * lat}`, kind: "HEAD-ON PASS · jog", c: carry("JOG", { dur: 3.0 }), def: D(7.2, s * lat, 180, { stick: [[-0.3, 0, "JOG"]] }), tackle: [] }); }
for (const ahead of [5.3, 5.8, 6.3, 6.8]) for (const s of [1, -1]) L.push({ id: `cross-behind ${ahead}/${s}`, kind: "CROSSING BEHIND THE CARRIER · jog", c: carry("JOG", { dur: 3.5 }), def: D(ahead, s * 2.6, s * -90, { stick: [[0.4, 0, "JOG"]] }), tackle: [] });
const rows = [], IMP = process.env.IMP ? JSON.parse(process.env.IMP) : undefined;   // (IMP: RES3 overrides — a variant)
for (const tc of L) { const R2 = runO3(ENV, tc, "S2D"), R3 = runO3(ENV, tc, "S3B", { imp: IMP }), W2 = R2.W, W3 = R3.W; let gap = Infinity, touching = 0, dev = 0, firstDev = null;
  for (const fr of W2.frames.values()) { if (hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) > OCC.broad + 0.3) continue; let g = Infinity; for (const x of detect(volumesOf(fr.a.J), volumesOf(fr.d.J), { within: 0.5 })) if (x.both) g = Math.min(g, x.gap); gap = Math.min(gap, g); if (g < 0) touching++; }
  for (let k = 0; k <= Math.min(W2.k, W3.k); k++) for (const p of ["att", "def"]) { const a = W2[p].stateAt(k * DT).P, b = W3[p].stateAt(k * DT).P, d = hyp(a[0] - b[0], a[1] - b[1]); if (d > dev) dev = d; if (d > 1e-9 && firstDev == null) firstDev = k; }
  const eps = W3.imp.episodes, first = eps[0], lc = W3.l3.apps.length, lcAt = lc ? +(W3.l3.apps[0].k * DT - R3.t0).toFixed(3) : null;
  rows.push({ id: tc.id, kind: tc.kind, gap, touching, limb: lc, limbAt: lcAt, impacts: eps.length + lc, why: first ? first.why : null, impactAt: first ? +(first.t0 - R3.t0).toFixed(3) : null, dev, firstDev: firstDev != null ? +(firstDev * DT - R3.t0).toFixed(3) : null }); process.stderr.write("."); }
const cm = (v) => (v === Infinity ? "  —  " : (v * 100).toFixed(1).padStart(5)), cls = (g) => (g === Infinity || g > 0.3 ? "apart (> 30 cm)" : g > 0.05 ? "NEAR MISS 5 – 30 cm" : g > 0 ? "NEAR MISS 0 – 5 cm" : g >= -OCC.tol ? "TOUCHING (within the 2 cm tolerance)" : "OVERLAP (Stage 2 resolving)");
console.log(`\nTWO PLAYERS PASSING — ${rows.length} passes (Stage 2's near-miss sweep), STAGE 2 (as decided) vs STAGE 3B${IMP ? " " + JSON.stringify(IMP) : ""}; Stage 2's closest approach of the resolved volumes`);
console.log(`  ${"case".padEnd(26)} ${"S2 gap".padStart(8)}  ${"touch".padStart(5)}  ${"impacts".padStart(7)}  ${"3B vs S2 root".padStart(13)}  class · why Stage 3B / 3 acted`);
for (const r of rows) console.log(`  ${r.id.padEnd(26)} ${cm(r.gap)} cm  ${String(r.touching).padStart(5)}  ${String(r.impacts).padStart(7)}  ${(r.dev * 100).toFixed(2).padStart(10)} cm  ${cls(r.gap)}${r.limb ? ` · ${r.limb} limb contact applications from ${r.limbAt} s` : ""}${r.why ? ` · ${r.why} at ${r.impactAt} s` : ""}`);
const by = {}; for (const r of rows) { const c = cls(r.gap); (by[c] = by[c] || []).push(r); }
console.log(`\n  BY STAGE 2's CLOSEST APPROACH:`); for (const [c, R] of Object.entries(by)) console.log(`  ${c.padEnd(38)} ${String(R.length).padStart(3)} passes · Stage 3B / 3 acted in ${R.filter((r) => r.impacts).length} · identical to Stage 2 every tick in ${R.filter((r) => r.dev < 1e-9).length} · the largest root difference ${(Math.max(0, ...R.map((r) => r.dev)) * 100).toFixed(2)} cm`);
const none = rows.filter((r) => !r.impacts); console.log(`\n  NOTHING OPENED (no limb contact, no impact): ${none.length} / ${rows.length} passes — identical to Stage 2 every tick in ${none.filter((r) => r.dev < 1e-9).length}${none.some((r) => r.dev >= 1e-9) ? "  ✗ " + none.filter((r) => r.dev >= 1e-9).map((r) => r.id).join(", ") : ""}`);
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(rows, null, 1));
