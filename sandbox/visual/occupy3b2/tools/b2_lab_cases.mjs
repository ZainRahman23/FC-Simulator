// occupy3b2/tools/b2_lab_cases.mjs — the 3B.2 Lab's numbers computed in node, for the browser check (page ≡ node): every case the Lab lists
// (occupy3b2/b2_cases.js), STAGE 3B.1 (the calibrated F+M default) and STAGE 3B.2 (its default) — the 3B.1 Lab's measures (occupy3b/tools/
// l3_lab_cases.mjs labRun's: deepest, torso, legs, ticks > 5 cm, the outcome, the impacts, each player's severity / balance / action / steps) + the
// limb layer's strikes and Σ impulse + 3B.2's decisions and NO_FEASIBLE results.   node b2_lab_cases.mjs --out f
import { ENV, arg, DT, hyp } from "../../occupy3b/tools/l3_common.mjs";
import { runB2 } from "../b2_run.js";
import { B2ROWS } from "../b2_cases.js";
import { outcomeO3 } from "../../occupy3/o3_run.js";
import { volumesOf, detect, OCC, GROUP } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
export function labRun(tc, m) { const r = runB2(ENV, tc, m, { record: true, rot: tc.rot }), W = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT); let best = -1, trunk = -1, legs = -1, over5 = 0;
  for (let k = k0; k <= k1; k++) { const fr = W.frames.get(k); if (!fr) continue; const near = hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) < OCC.broad + 0.6, P = near ? detect(volumesOf(fr.a.J), volumesOf(fr.d.J), { within: 0.03 }) : [];
    let mres = -1; for (const p of P) { if (!p.both) continue; if (p.pen > mres) mres = p.pen; if (GROUP[p.A] === "TRUNK" && GROUP[p.B] === "TRUNK") trunk = Math.max(trunk, p.pen); else legs = Math.max(legs, p.pen); } if (mres > OCC.hard) over5++; if (mres > best) best = mres; }
  const o = outcomeO3(W), eps = W.imp ? W.imp.episodes : [];
  return { W, row: { best, trunk, legs, over5, out: o ? o.kind : null, impacts: eps.length, eps: eps.map((e) => ({ t0: e.t0 - r.t0, why: e.why, players: Object.fromEntries(["ATT", "DEF"].filter((k) => e.players[k]).map((k) => [k, { sev: e.players[k].sev, sigma: e.players[k].sigma, cls: e.players[k].cls, outcome: e.players[k].outcome, steps: e.players[k].steps.length }])) })),
    strikes: W.l3 ? W.l3.contacts : null, lamSum: W.l3 ? +W.l3.apps.reduce((a, x) => a + x.lam, 0).toFixed(6) : null, decisions: W.b2 ? W.b2.decisions.length : null, results: W.b2 ? W.b2.results.map((n) => n.consequence) : null } }; }
if (process.argv[1] && process.argv[1].endsWith("b2_lab_cases.mjs")) { const rows = [], only = arg("ids") ? arg("ids").split(",") : null;
  for (const tc of B2ROWS) { if (only && !only.includes(tc.id)) continue; const runs = {}; for (const m of ["S3B", "S3B2"]) runs[m] = labRun(tc, m).row; rows.push({ id: tc.id, runs }); process.stderr.write("."); }
  fs.writeFileSync(arg("out", "lab_cases.json"), JSON.stringify(rows, null, 0)); console.log(`\n${rows.length} cases written`); }
