// ═══ physchar2/tools/ik_limit_audit.mjs — overnight Phase C: do the VALIDATED G2 / G3 behaviours ever ask the production leg IK for a solution outside
// the anatomical hard limits (before any fall)? If never, a bounded (joint-limit-aware) IK would be behaviour-neutral for G2 / G3, and the
// question becomes purely a G4 design choice. Runs every G3 gate trial (T1–T8, U, T9, U per body) and G2 quiet stance + the push grid at each
// body's boundary, wraps legIK, and records per joint axis the maximum excursion of the returned solution beyond the hard limits (pre-fall ticks).
// Per run also: the time of the first beyond-limit solve, the supervisor abort time, and the number of beyond-limit solves BEFORE the abort.
// usage: node tools/ik_limit_audit.mjs [out.json] [--only=<body>|<run>;…]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim, pushScenario } from "../gates/v2_g2.js"; import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), OUT = process.argv[2], D = 180 / Math.PI, AX = ["hip rot", "hip flex", "hip abd", "knee flex", "ankle df", "ankle inv"];
const g2 = JSON.parse(fs.readFileSync(path.join(here, "../../../../review_artifacts/physical_character_v2/g2/json/g2_results.json"))), bnd = {};
for (const j of g2.jobs.filter(j => j.group === "push" && j.res)) { const k = j.human + "|" + j.sc.dir, b = bnd[k] || (bnd[k] = { rec: 0, fail: Infinity }); if (j.res.recovered) b.rec = Math.max(b.rec, j.sc.J); else b.fail = Math.min(b.fail, j.sc.J); }
const runs = []; for (const h of VARIATION_SET) { runs.push({ h: h.id, kind: "G2", base: { title: "quiet", seconds: 10 } }); for (const d of ["F", "B", "R", "L", "FR", "BL"]) { const b = bnd[h.id + "|" + d]; if (b && b.rec) runs.push({ h: h.id, kind: "G2", base: pushScenario(d, b.rec), tag: `push ${d} ${b.rec}` }); }
  for (const k of ["U:R", "U:L", "T9"]) runs.push({ h: h.id, kind: "G3", key: k }); }
for (const k of ["T1", "T2", "T3", "T4", "T5", "T6", ...[4, 2, 1, 0.75, 0.5, 0.25].flatMap(T => [`T7:R:${T}`, `T7:L:${T}`])]) runs.push({ h: "V2-REF", kind: "G3", key: k });
for (const w of ["hold", "ramp"]) for (const d of ["F", "B", "L", "R", "FL", "FR", "BL", "BR"]) for (const m of [5, 10, 15, 20]) runs.push({ h: "V2-REF", kind: "G3", key: `T8:${w}:R:${d}:${m}` }, { h: "V2-REF", kind: "G3", key: `T8:${w}:L:${mirrorDir(d)}:${m}` });
const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7).split(";").filter(Boolean); if (ONLY.length) runs.splice(0, runs.length, ...runs.filter(r => ONLY.includes(`${r.h}|${r.key || r.tag || "quiet"}`)));
const out = [], worst = AX.map(() => ({ v: 0, at: null })); let ticks = 0, viol = 0, violPre = 0;
for (const r of runs) { const spec = generateSpec(VARIATION_SET.find(x => x.id === r.h)), s = r.kind === "G3" ? new G3Sim(J, spec, g3Def(r.key), {}) : new G2Sim(J, spec, r.base, {}), lim = s.ctrl.legK.map(ks => ks.map(k => spec.joints[k].limits.hard));
  const o = s.ctrl.legIK.bind(s.ctrl), w = AX.map(() => 0), abortedAt = () => (s.ctrl.g3 && s.ctrl.g3.aborted != null ? s.ctrl.g3.aborted : null); let n = 0, bad = 0, badPre = 0, firstT = null, fallen = false;
  s.ctrl.legIK = (st, ev, leg, pP, qP, fp) => { const R = o(st, ev, leg, pP, qP, fp); if (!fallen) { const L = lim[leg], lo = [L[0].lo[0], L[0].lo[1], L[0].lo[2], L[1].lo[1], L[2].lo[1], L[2].lo[2]], hi = [L[0].hi[0], L[0].hi[1], L[0].hi[2], L[1].hi[1], L[2].hi[1], L[2].hi[2]];
      let any = false; R.x.forEach((v, i) => { const e = v < lo[i] ? (lo[i] - v) * D : v > hi[i] ? (v - hi[i]) * D : 0; if (e > 0) { any = true; w[i] = Math.max(w[i], e); } }); n++; if (any) { bad++; if (firstT == null) firstT = s.n * s.dt; if (abortedAt() == null) badPre++; } } return R; };
  while (s.tick()) { if (s.g2acc.fallT != null) fallen = true; if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
  const abortT = abortedAt(), fallT = s.g2acc.fallT; s.destroy(); ticks += n; viol += bad; violPre += badPre; w.forEach((v, i) => { if (v > worst[i].v) worst[i] = { v, at: `${r.h} ${r.key || r.tag || "quiet"}` }; });
  out.push({ body: r.h, run: r.key || r.tag || "quiet", solves: n, solvesBeyondLimits: bad, solvesBeyondLimitsBeforeAbort: badPre, firstBeyondT: firstT, abortT, fallT, maxBeyondDeg: w }); }
console.log(`${runs.length} validated runs, ${ticks} pre-fall IK solves; solves with any coordinate beyond the anatomical hard limits: ${viol} (before a supervisor abort: ${violPre})`);
for (const x of out.filter(x => x.solvesBeyondLimits)) console.log(`  ${x.body} ${x.run}: ${x.solvesBeyondLimits} beyond (${x.solvesBeyondLimitsBeforeAbort} before the abort); first ${x.firstBeyondT?.toFixed(4)} s, abort ${x.abortT?.toFixed(4) ?? "—"} s, fall ${x.fallT?.toFixed(4) ?? "—"} s`);
AX.forEach((a, i) => console.log(`  ${a.padEnd(10)} max beyond ${worst[i].v.toFixed(3)}°${worst[i].at ? " (" + worst[i].at + ")" : ""}`));
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/ik_limit_audit.mjs", runs: out, worst }, null, 1));
