// receive_elite1/tools/re1_det.mjs — DETERMINISM (owner #32): (1) every run repeated is bit-identical; (2) the Ball Control execution draws are keyed
// (seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension): the same contact index draws the same standard normals at every
// Ball Control, Dribbling and Agility — the ratings rescale a mistake, they never re-roll it; (3) at BC 99 the draws' effect is tiny
//   node re1_det.mjs <out.json> [ids] [seeds]
import fs from "fs"; import { makeElite } from "./re1_env.mjs"; import { ALL, parseCase } from "../re1_cases.js";
const ids = process.argv[3] ? process.argv[3].split(",") : ALL, seeds = (process.argv[4] || "1,2").split(",").map(Number);
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); for (const x of T.executed.v) mix(x); } return h.toString(16); };
const RT = [[99, 99, 99], [50, 99, 99], [99, 50, 99], [99, 99, 50], [70, 70, 70], [50, 50, 50]], res = { repeat: { runs: 0, identical: 0 }, draws: { sets: 0, matched: 0, pairs: 0, fails: [] }, bc99: { maxErr: 0 } };
for (const id of ids) for (const sd of seeds) { const byIdx = new Map();
  for (const rt of RT) { const cs = parseCase(`${id}_B${rt[0]}_D${rt[1]}_A${rt[2]}`), a = makeElite(cs, { seed: sd }), b = makeElite(cs, { seed: sd }); a.run(cs.scenario.dur); b.run(cs.scenario.dur);
    res.repeat.runs++; if (fp(a) === fp(b)) res.repeat.identical++;
    if (a.rc2 && a.rc2.kind === "ELITE") for (const c of a.rc2.ep.contacts) { const key = c.i, N = [c.N.damping, c.N.weight, c.N.direction, c.N.vertical].map((x) => x.toFixed(12)).join(","); if (!byIdx.has(key)) byIdx.set(key, []); byIdx.get(key).push({ rt, N });
      if (rt[0] === 99) res.bc99.maxErr = Math.max(res.bc99.maxErr, Math.hypot(c.vExec[0] - c.vIdeal[0], c.vExec[1] - c.vIdeal[1])); } }
  for (const [i, L] of byIdx) { res.draws.sets++; const same = L.every((x) => x.N === L[0].N); res.draws.pairs += L.length; if (same) res.draws.matched++; else res.draws.fails.push({ id, sd, contact: i }); } }
fs.writeFileSync(process.argv[2] || "re1_det.json", JSON.stringify(res, null, 1)); console.log(JSON.stringify(res));
