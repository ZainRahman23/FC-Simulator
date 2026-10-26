// occupy3b2/tools/b2_solo.mjs — §9 ONE FOOTBALLER (3B.1's l3_solo.mjs with 3B.2): every curated case of the canonical build (vocab2 v_cases.js: carries,
// turns, cuts, the dribbling vocabulary, BODY FEINT, LA CROQUETA, receives …) in the two-player world with the other player parked 40 m away, STAGE 2 (as
// decided) vs STAGE 3B.2, EVERY TICK: the carrier's root (position, heading), his plan's fingerprint, his ball contacts, the ball, the authority — and
// 3B.2's own record (it must never have placed, guarded or released anything). The approved actions unobstructed are the canonical ones, bit for bit.
import { ENV } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import { CASES } from "../../vocab2/v_cases.js";
let same = 0, diff = 0, opened = 0, ticks = 0, byTech = {}; const bad = [];
for (const c of CASES) { if (!c.runup || !(c.dur || c.c)) continue; const tc = { id: `${c.tech}·${c.variant}`, c, def: { at: [-40, 25], face: 0, stick: [] }, tackle: [] }, S = { S2D: [], S3B2: [] }; let WB = null;
  try { for (const m of ["S2D", "S3B2"]) { const r = runB2(ENV, tc, m, { record: false, onTick: (W) => { const s = W.att.stateAt(W.att.t, W.att.plan), b = W.trueTrack(W.t); S[m].push([s.P[0], s.P[1], s.psi, W.att.hash, W.att.contacts.length, b.p[0], b.p[1], W.auth.state].join("|")); } }); if (m === "S3B2") WB = r.W; } }
  catch (e) { bad.push(`${tc.id}: ${e.message}`); continue; }
  ticks += S.S2D.length; const any = WB.b2.decisions.length || WB.b2.release.length || WB.b2.boot.length || WB.b2.pelvis.length || WB.l3.log.length || WB.imp.episodes.length; if (any) opened++;
  const ok = S.S2D.length === S.S3B2.length && S.S2D.every((x, i) => x === S.S3B2[i]); if (ok) same++; else { diff++; const i = S.S2D.findIndex((x, k) => x !== S.S3B2[k]); bad.push(`${tc.id}: differs at tick ${i}`); }
  const k = c.tech; byTech[k] = byTech[k] || [0, 0]; byTech[k][0]++; if (ok) byTech[k][1]++; process.stderr.write("."); }
console.log(`\nONE FOOTBALLER (the other parked 40 m away) — ${same + diff} curated canonical cases, ${ticks} ticks, STAGE 2 (as decided) vs STAGE 3B.2`);
console.log(`  identical every tick (root, heading, plan fingerprint, contacts, ball, authority): ${same} / ${same + diff}`);
console.log(`  by technique: ${Object.entries(byTech).map(([k, v]) => `${k} ${v[1]}/${v[0]}`).join(" · ")}`);
console.log(`  runs in which 3B.2, 3B.1 or Stage 3 did anything: ${opened}`);
for (const b of bad.slice(0, 10)) console.log("  ✗ " + b);
