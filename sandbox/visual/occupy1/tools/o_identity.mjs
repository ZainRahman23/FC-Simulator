// occupy1/tools/o_identity.mjs — WHAT OCCUPANCY V1 MUST NOT CHANGE:
//   1. OLD as the review runs it (the world with occupancy OFF, the bodies recorded) ≡ Shared Possession + Reaction V1 (possess1, MEDIUM),
//      every tick, the whole run — recording the live poses changes nothing
//   2. OCCUPANCY V1 ≡ OLD, every tick, until its first action (a root correction, the soft wall, a foothold moved, a ball access
//      blocked); the whole run when the bodies never come close enough to act
//   node o_identity.mjs [--search 20]     (the review cases + the first N tackle set-ups × 15 request times)
import { ENV } from "./o_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { OCASES } from "../o_cases.js";
import { trialCase } from "../../tackle1/tools/t_matrix.mjs";
import { runO } from "../o_run.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, NS = +arg("search", 0);
const sig = (W) => { const a = W.att.stateAt(W.att.t, W.att.plan), d = W.def.stateAt(W.def.t, W.def.plan), b = W.trueTrack(W.t); return [a.P[0], a.P[1], a.psi, d.P[0], d.P[1], d.psi, b.p[0], b.p[1], b.v[0], b.v[1], W.att.hash, W.def.hash]; };
const cases = OCASES.slice(); for (let i = 0; i < NS; i++) { const t0 = trialCase(i, 7); for (let q = 0; q <= 14; q++) cases.push(Object.assign({}, t0, { id: `${t0.id}@${(q * 0.1).toFixed(1)}`, tackle: [+(q * 0.1).toFixed(2)] })); }
let rec = 0, recBad = 0, pre = 0, preBad = 0, full = 0, fullBad = 0; const bad = [];
for (const tc of cases) { const S = { plain: [], old: [], occ: [] };
  runO(ENV, tc, "OLD", { plain: true, onTick: (W) => S.plain.push(sig(W)) }); runO(ENV, tc, "OLD", { onTick: (W) => S.old.push(sig(W)) });
  const r = runO(ENV, tc, "OCC", { onTick: (W) => S.occ.push(sig(W)) }), O = r.W.occ, acts = [...O.log.filter((x) => x.acted).map((x) => x.k), ...O.events.filter((e) => /BLOCKED/.test(e.kind)).map((e) => e.k)], k1 = acts.length ? Math.min(...acts) : Infinity;
  rec++; if (JSON.stringify(S.plain) !== JSON.stringify(S.old)) { recBad++; bad.push(`${tc.id}: OLD with recording ≠ Shared V1`); }
  let first = null; for (let i = 0; i < Math.min(S.old.length, S.occ.length); i++) { if (S.old[i].some((x, j) => x !== S.occ[i][j])) { first = i + 1; break; } }
  if (k1 === Infinity) { full++; if (first != null || S.old.length !== S.occ.length) { fullBad++; bad.push(`${tc.id}: no occupancy action, yet differs at tick ${first}`); } }
  else { pre++; if (first != null && first < k1) { preBad++; bad.push(`${tc.id}: differs at tick ${first} before the first occupancy action (tick ${k1})`); } }
  process.stderr.write("."); }
console.log(`\nIDENTITY — ${cases.length} encounters`);
console.log(`  OLD with the bodies recorded ≡ Shared Possession + Reaction V1 (MEDIUM), the whole run: ${rec - recBad} / ${rec}`);
console.log(`  OCCUPANCY V1 ≡ OLD until its first action (a root correction, the soft wall, a foothold moved, an access blocked): ${pre - preBad} / ${pre}`);
console.log(`  runs where occupancy never acts (the bodies never close enough): identical for the whole run ${full - fullBad} / ${full}`);
for (const b of bad.slice(0, 20)) console.log("  ✗ " + b);
