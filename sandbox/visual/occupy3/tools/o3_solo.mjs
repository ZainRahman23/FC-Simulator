// occupy3/tools/o3_solo.mjs — §1 / §21 ONE FOOTBALLER: a player running alone must be identical to Stage 2. Every curated case of the canonical
// build (vocab2 v_cases.js: carries, turns, cuts, the dribbling vocabulary, Body Feint, Croqueta, receives …) run in the two-player world with the
// other player parked 40 m away, STAGE 2 (as decided) vs STAGE 3, compared EVERY TICK: the carrier's root (position, heading), his plan's
// fingerprint, his ball contacts, the ball, the possession authority — and Stage 3's own record (it must never have opened an episode).
//   node o3_solo.mjs
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { CASES } from "../../vocab2/v_cases.js";
import { runO3 } from "../o3_run.js";
import "../o3_world.js";
let same = 0, diff = 0, opened = 0, ticks = 0; const bad = [];
for (const c of CASES) { if (!c.runup || !(c.dur || c.c)) continue; const tc = { id: `${c.tech}·${c.variant}`, c, def: { at: [-40, 25], face: 0, stick: [] }, tackle: [] }, S = { S2D: [], S3: [] }; let W3 = null;
  try { for (const m of ["S2D", "S3"]) { const r = runO3(ENV, tc, m, { record: false, onTick: (W) => { const s = W.att.stateAt(W.att.t, W.att.plan), b = W.trueTrack(W.t); S[m].push([s.P[0], s.P[1], s.psi, W.att.hash, W.att.contacts.length, b.p[0], b.p[1], W.auth.state].join("|")); } }); if (m === "S3") W3 = r.W; } }
  catch (e) { bad.push(`${tc.id}: ${e.message}`); continue; }
  ticks += S.S2D.length; if (W3.imp.episodes.length || W3.imp.log.length) opened++; if (S.S2D.length === S.S3.length && S.S2D.every((x, i) => x === S.S3[i])) same++; else { diff++; const i = S.S2D.findIndex((x, k) => x !== S.S3[k]); bad.push(`${tc.id}: differs at tick ${i}`); } process.stderr.write("."); }
console.log(`\nONE FOOTBALLER (the other parked 40 m away) — ${same + diff} curated canonical cases, ${ticks} ticks, STAGE 2 (as decided) vs STAGE 3`);
console.log(`  identical every tick (root, heading, plan fingerprint, contacts, ball, authority): ${same} / ${same + diff}`);
console.log(`  runs in which Stage 3 evaluated anything: ${opened} (the broad phase never admitted the parked player)`);
for (const b of bad.slice(0, 10)) console.log("  ✗ " + b);
