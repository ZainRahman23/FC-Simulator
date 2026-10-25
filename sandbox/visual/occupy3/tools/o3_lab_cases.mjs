// occupy3/tools/o3_lab_cases.mjs — the Review Lab's numbers computed in node, for the browser check (page ≡ node): every case the Lab lists (the §16
// matrix with its mirrors, then the rest of Stage 2's review set), both stages — the deepest penetration over the replay's clip, torso, legs, the
// ticks > 5 cm, the tackle outcome, Stage 3's impacts and each player's severity / balance / action / steps. The same definitions as o3_lab.js.
//   node o3_lab_cases.mjs --out f
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O3CASES, MATRIX } from "../o3_cases.js";
import { runO3, outcomeO3 } from "../o3_run.js";
import "../o3_world.js";
import { volumesOf, detect, OCC, GROUP } from "../../occupy1/o_volumes.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DT = 1 / 240, hyp = Math.hypot;
// (the Lab's list, the same construction as o3_lab.js ROWS)
export const LAB_ROWS = (() => { const out = [], base = MATRIX.filter((x) => !x.matrixMirror), groups = [...new Set(base.map((x) => x.group))];
  for (const g of groups) for (const r of base.filter((x) => x.group === g)) { out.push(r); const m = MATRIX.find((x) => x.matrixMirror === r.id); if (m) out.push(m); }
  const ids = new Set(MATRIX.map((x) => x.from || x.id).concat(MATRIX.map((x) => x.id))); for (const r of O3CASES) if (!ids.has(r.id)) out.push(r); return out; })();
export function labRun(tc, m) { const r = runO3(ENV, tc, m, { record: true }), W = r.W, k0 = Math.round(r.clip[0] / DT), k1 = Math.round(r.clip[1] / DT); let best = -1, trunk = -1, legs = -1, over5 = 0;
  for (let k = k0; k <= k1; k++) { const fr = W.frames.get(k); if (!fr) continue; const near = hyp(fr.a.P[0] - fr.d.P[0], fr.a.P[1] - fr.d.P[1]) < OCC.broad + 0.6, P = near ? detect(volumesOf(fr.a.J), volumesOf(fr.d.J), { within: 0.03 }) : [];
    let mres = -1; for (const p of P) { if (!p.both) continue; if (p.pen > mres) mres = p.pen; if (GROUP[p.A] === "TRUNK" && GROUP[p.B] === "TRUNK") trunk = Math.max(trunk, p.pen); else legs = Math.max(legs, p.pen); } if (mres > OCC.hard) over5++; if (mres > best) best = mres; }
  const o = outcomeO3(W), eps = W.imp ? W.imp.episodes : [];
  return { best, trunk, legs, over5, out: o ? o.kind : null, impacts: eps.length, eps: eps.map((e) => ({ t0: e.t0 - r.t0, why: e.why, players: Object.fromEntries(["ATT", "DEF"].filter((k) => e.players[k]).map((k) => [k, { sev: e.players[k].sev, sigma: e.players[k].sigma, cls: e.players[k].cls, outcome: e.players[k].outcome, steps: e.players[k].steps.length }])) })) }; }
if (process.argv[1] && process.argv[1].endsWith("o3_lab_cases.mjs")) { const out = [];
  for (const tc of LAB_ROWS) { out.push({ id: tc.id, runs: { S2D: labRun(tc, "S2D"), S3: labRun(tc, "S3") } }); process.stderr.write("."); }
  fs.writeFileSync(arg("out", "lab_cases.json"), JSON.stringify(out, null, 1)); console.log(`\n${out.length} Lab cases written`); }
