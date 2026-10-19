// technical_control1/tools/tc_det.mjs — DETERMINISM (owner §36 – §37): (1) every run repeated is bit-identical (course + receive chain, presets, styles);
// (2) the Ball Control execution draws are keyed (seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension): the same contact
// index draws the same standard normals at every Ball Control, Dribbling, Agility and STYLE — ratings and style rescale or redirect a touch, they never
// re-roll its mistake; (3) action selection is deterministic (the same actions at the same ticks on repeat); (4) at BC 99 the draws' effect is tiny
//   node tc_det.mjs <out.json> [seeds]
import fs from "fs"; import { makeTech } from "./tc_env.mjs"; import { anyCase, COURSE, RECEIVE_CHAIN } from "../tc_course.js";
const seeds = (process.argv[3] || "1,2").split(",").map(Number), CASES = COURSE.concat(RECEIVE_CHAIN);
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); if (T.executed) for (const x of T.executed.v) mix(x); } return h.toString(16); };
const VAR = [["99/99/99", 99, 99, 99, "NEUTRAL"], ["50/99/99", 50, 99, 99, "NEUTRAL"], ["99/50/99", 99, 50, 99, "NEUTRAL"], ["99/99/50", 99, 99, 50, "NEUTRAL"], ["70/70/70", 70, 70, 70, "NEUTRAL"], ["50/50/50", 50, 50, 50, "NEUTRAL"],
  ["90 DIRECT", 90, 90, 90, "DIRECT_RUNNER"], ["90 CLOSE", 90, 90, 90, "CLOSE_CONTROL"], ["90 FEINT", 90, 90, 90, "FEINT_HEAVY"], ["90 DOMINANT", 90, 90, 90, "DOMINANT_FOOT"]];
const res = { repeat: { runs: 0, identical: 0, actionsSame: 0, fails: [] }, draws: { sets: 0, matched: 0, pairs: 0, fails: [] }, bc99: { maxErr: 0, meanErr: 0, n: 0 } };
for (const c of CASES) for (const sd of seeds) { const byIdx = new Map();
  for (const [tag, b, d, a, st] of VAR) { const id = `${c}_B${b}_D${d}_A${a}` + (st !== "NEUTRAL" ? `_S${st}` : ""), cs = anyCase(id, sd), mk = () => { const S = makeTech(cs, { seed: sd, style: cs.style, ratings: cs.ratings }); S.run(cs.scenario.dur); return S; }, A = mk(), B = mk();
    res.repeat.runs++; if (fp(A) === fp(B)) res.repeat.identical++; else res.repeat.fails.push(id + "@" + sd);
    const acts = (S) => JSON.stringify((S.rc2.ep.techLog || []).filter((e) => e.ev === "action").map((e) => [e.fam, e.t, e.F])); if (acts(A) === acts(B)) res.repeat.actionsSame++;
    for (const ct of A.rc2.ep.contacts) { if (!ct.N || !ct.N.raw) continue; const key = ct.i, raw = JSON.stringify(ct.N.raw); if (!byIdx.has(key)) byIdx.set(key, { raw, tag }); else { res.draws.pairs++; if (byIdx.get(key).raw === raw) res.draws.matched++; else res.draws.fails.push(`${c}@${sd} c${key}: ${byIdx.get(key).tag} vs ${tag}`); } }
    if (b === 99) for (const ct of A.rc2.ep.contacts) { const e = Math.hypot(ct.vExec[0] - ct.vIdeal[0], ct.vExec[1] - ct.vIdeal[1]); res.bc99.maxErr = Math.max(res.bc99.maxErr, e); res.bc99.meanErr += e; res.bc99.n++; } }
  res.draws.sets++; }
res.bc99.meanErr = +(res.bc99.meanErr / Math.max(1, res.bc99.n)).toFixed(4); res.bc99.maxErr = +res.bc99.maxErr.toFixed(4);
fs.writeFileSync(process.argv[2] || "tc_det.json", JSON.stringify(res, null, 1)); console.log(JSON.stringify({ repeat: [res.repeat.identical, res.repeat.runs], actions: [res.repeat.actionsSame, res.repeat.runs], draws: [res.draws.matched, res.draws.pairs], bc99: res.bc99 }), res.repeat.fails.slice(0, 3), res.draws.fails.slice(0, 3));
