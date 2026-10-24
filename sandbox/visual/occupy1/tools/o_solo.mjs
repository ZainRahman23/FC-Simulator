// occupy1/tools/o_solo.mjs — §29 ONE FOOTBALLER: Player Occupancy V1 must do nothing. Every curated case of the canonical build (vocab2
// v_cases.js: carries, turns, cuts, the dribbling vocabulary, Body Feint, Croqueta, receives …) run in the occupancy world with the other player
// parked 40 m away, occupancy ON vs OFF, compared EVERY TICK: the carrier's root (position, heading), his plan's fingerprint, his ball contacts,
// the ball, the possession authority — and the occupancy's own log (it must never have evaluated a pair). (The single-player tools themselves
// never build a two-player world: they are covered by the milestone regression, run through possess1's solo hook.)   node o_solo.mjs
import { ENV } from "./o_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { runO } from "../o_run.js";
let same = 0, diff = 0, evaluated = 0, ticks = 0; const bad = [];
for (const c of CASES) { if (!c.runup || !(c.dur || c.c)) continue; const tc = { id: `${c.tech}·${c.variant}`, c, def: { at: [-40, 25], face: 0, stick: [] }, tackle: [] }, S = { OLD: [], OCC: [] }; let W1 = null;
  try { for (const m of ["OLD", "OCC"]) { const r = runO(ENV, tc, m, { record: false, onTick: (W) => { const s = W.att.stateAt(W.att.t, W.att.plan), b = W.trueTrack(W.t); S[m].push([s.P[0], s.P[1], s.psi, W.att.hash, W.att.contacts.length, b.p[0], b.p[1], W.auth.state].join("|")); } }); if (m === "OCC") W1 = r.W; } }
  catch (e) { bad.push(`${tc.id}: ${e.message}`); continue; }
  ticks += S.OLD.length; if (W1.occ.log.length) evaluated++; if (S.OLD.length === S.OCC.length && S.OLD.every((x, i) => x === S.OCC[i])) same++; else { diff++; const i = S.OLD.findIndex((x, k) => x !== S.OCC[k]); bad.push(`${tc.id}: differs at tick ${i}`); } process.stderr.write("."); }
console.log(`\nONE FOOTBALLER (the other parked 40 m away) — ${same + diff} curated canonical cases, ${ticks} ticks, occupancy ON vs OFF`);
console.log(`  identical every tick (root, heading, plan fingerprint, contacts, ball, authority): ${same} / ${same + diff}`);
console.log(`  runs in which the occupancy evaluated a pair at all: ${evaluated} (the broad phase never admitted the parked player)`);
for (const b of bad.slice(0, 10)) console.log("  ✗ " + b);
