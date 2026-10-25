// occupy3b/tools/l3_lab_cases.mjs — the Limb Contact Lab's numbers computed in node, for the browser check (page ≡ node): every case the Lab lists
// (occupy3b/l3_forms.js labRows: the flagship, the calibration spectrum with its mirrors and the world turned 37°, the rest of the §10 matrix),
// OLD STAGE 3 and the CALIBRATED STAGE 3B (the default RES3B) — Stage 3's Lab numbers (o3_lab_cases.mjs labRun's measures: deepest, torso, legs,
// ticks > 5 cm, the outcome, the impacts, each player's severity / balance / action / steps) + Stage 3B's strikes and Σ impulse.
//   node l3_lab_cases.mjs --out f
import { ENV, runO3, arg, DT, hyp } from "./l3_common.mjs";
import { runRotated } from "../l3_rot.js";
import { labRows } from "../l3_forms.js";
import { outcomeO3 } from "../../occupy3/o3_run.js";
import { volumesOf, detect, OCC, GROUP } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
export const LAB_ROWS = labRows();
// (Stage 3's labRun, verbatim in its measures, with the rotated encounter for the rows that turn the world)
export function labRun(tc, m) { const r = tc.rot ? runRotated(ENV, tc, m, tc.rot, { record: true }) : runO3(ENV, tc, m, { record: true }), W = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT); let best = -1, trunk = -1, legs = -1, over5 = 0;
  for (let k = k0; k <= k1; k++) { const fr = W.frames.get(k); if (!fr) continue; const near = hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) < OCC.broad + 0.6, P = near ? detect(volumesOf(fr.a.J), volumesOf(fr.d.J), { within: 0.03 }) : [];
    let mres = -1; for (const p of P) { if (!p.both) continue; if (p.pen > mres) mres = p.pen; if (GROUP[p.A] === "TRUNK" && GROUP[p.B] === "TRUNK") trunk = Math.max(trunk, p.pen); else legs = Math.max(legs, p.pen); } if (mres > OCC.hard) over5++; if (mres > best) best = mres; }
  const o = outcomeO3(W), eps = W.imp ? W.imp.episodes : [];
  return { W, row: { best, trunk, legs, over5, out: o ? o.kind : null, impacts: eps.length, eps: eps.map((e) => ({ t0: e.t0 - r.t0, why: e.why, players: Object.fromEntries(["ATT", "DEF"].filter((k) => e.players[k]).map((k) => [k, { sev: e.players[k].sev, sigma: e.players[k].sigma, cls: e.players[k].cls, outcome: e.players[k].outcome, steps: e.players[k].steps.length }])) })) } }; }
if (process.argv[1] && process.argv[1].endsWith("l3_lab_cases.mjs")) { const rows = [];
  for (const tc of LAB_ROWS) { const runs = {}; for (const m of ["S3", "S3B"]) { const { W, row } = labRun(tc, m); row.strikes = W.l3 ? W.l3.contacts : null; row.lamSum = W.l3 ? +W.l3.apps.reduce((a, x) => a + x.lam, 0).toFixed(6) : null; runs[m] = row; } rows.push({ id: tc.id, runs }); process.stderr.write("."); }
  fs.writeFileSync(arg("out", "lab_cases.json"), JSON.stringify(rows, null, 0)); console.log(`\n${rows.length} cases written`); }
