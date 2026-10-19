// technical_control14/tools/tc14_checks.mjs — TECHNICAL-CONTROL-1.4's checks: DETERMINISM (two runs, animation off), THE BODY NEUTRAL (animation on with
// TECHNICAL-CONTROL-1.4's ChopBody gives the same ball / contacts / path), THE POSED SKELETON REPEATABLE (two animated runs, every frame), NO FAILURE,
// over the efficiency matrix (angles × Dribbling 99 / 80 / 50 × seeds × both sides), TECHNICAL-CONTROL-1.2's carry course × its 4 players, the receive
// → dribble chain — and the CARRY MODEL PRESERVED (owner §6): TECHNICAL-CONTROL-1.2's carry metrics on its carry course, TECHNICAL-CONTROL-1.2 vs 1.4.
//   node tc14_checks.mjs <out.json> [shard/of]
import fs from "fs"; import { anyCase, RECEIVE_CHAIN } from "../../technical_control1/tc_course.js"; import { makeCarry, carryMetrics } from "../../technical_control12/tools/tc12_carry.mjs";
import { CARRY_SECTIONS, PLAYERS, carryId } from "../../technical_control12/tc12_cases.js"; import { makeEff } from "./tc14_env.mjs"; import { ANGLES } from "./tc14_eff.mjs";
const out = process.argv[2], [sh, of] = (process.argv[3] || "0/1").split("/").map(Number), jobs = [];
for (const ang of ANGLES) for (const d of [99, 80, 50]) for (const seed of [1, 2, 3]) for (const left of [false, true]) jobs.push({ id: `CUT${ang}${left ? "_L" : ""}_B99_D${d}_A99`, seed, foot: "R", set: "eff" });
for (const s of CARRY_SECTIONS) for (const p of PLAYERS) jobs.push({ id: carryId(s, p), seed: 1, foot: p.foot, set: "carry", pref: p.foot });
for (const rx of RECEIVE_CHAIN) for (const r of [99, 80, 50]) jobs.push({ id: `${rx}_B${r}_D${r}_A${r}`, seed: 1, foot: "R", set: "chain" });
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
const runPosed = (S) => { let h = 2166136261 >>> 0; const n = Math.round(S.cfg.scenario.dur * 240); for (let i = 0; i < n && !S.fault; i++) { S.step(); const m = S.A && S.A.skinMats; if (!m) continue; for (let k = 0; k < m.length; k += 7) { const q = m[k].toFixed(6); for (let c = 0; c < q.length; c++) { h ^= q.charCodeAt(c); h = Math.imul(h, 16777619) >>> 0; } } } return h.toString(16); };
const rows = [];
for (const [j, J] of jobs.entries()) { if (j % of !== sh) continue; const cs = () => anyCase(J.id, J.seed), o = { seed: J.seed, foot: J.foot }, row = { id: J.id, seed: J.seed, set: J.set, foot: J.foot };
  try { const A = makeEff(cs(), o); A.run(); const B = makeEff(cs(), o); B.run(); const C = makeEff(cs(), Object.assign({ anim: true }, o)), pC = runPosed(C), D = makeEff(cs(), Object.assign({ anim: true }, o)), pD = runPosed(D);
    const ep = A.rc2.ep; Object.assign(row, { det: fp(A) === fp(B), bodyNeutral: fp(A) === fp(C), poseDet: pC === pD, failed: !!(ep && ep.failed) || !!A.fault || !!C.fault, contacts: ep ? ep.contacts.length : 0, actions: ep ? ep.techLog.filter((e) => e.ev === "action").map((e) => e.fam) : [] });
    if (J.set === "carry") { const O = makeCarry(cs(), o); O.run(); row.carry = { tc14: carryMetrics(A, J.pref === "B" ? null : J.pref), tc12: carryMetrics(O, J.pref === "B" ? null : J.pref) }; } }
  catch (e) { row.error = String(e && e.stack || e).slice(0, 300); }
  rows.push(row); console.log(JSON.stringify(row).slice(0, 200)); }
fs.writeFileSync(out, JSON.stringify(rows));
