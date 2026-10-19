// technical_control12/tools/tc12_checks.mjs — TECHNICAL-CONTROL-1.2's checks: DETERMINISM (two runs, animation off), the BODY NEUTRAL (animation on with
// TECHNICAL-CONTROL-1.1's legs gives the same ball / contacts / path), NO FAILURE and the separation, over the carry course × players (99), TECHNICAL-
// CONTROL-1's course (neutral style, 99 / 80 / 50) and the receive → dribble chain (99) — each beside TECHNICAL-CONTROL-1's (old) run.
//   node tc12_checks.mjs <out.json> [shard/of]
import fs from "fs"; import { makeTech } from "../../technical_control1/tools/tc_env.mjs"; import { anyCase, COURSE, RECEIVE_CHAIN } from "../../technical_control1/tc_course.js"; import { makeCarry } from "./tc12_carry.mjs";
import { LegBody } from "../../technical_control11/tc11_body.js"; import { CARRY_SECTIONS, PLAYERS, carryId } from "../tc12_cases.js";
const out = process.argv[2], [sh, of] = (process.argv[3] || "0/1").split("/").map(Number), jobs = [];
for (const s of CARRY_SECTIONS) for (const p of PLAYERS) jobs.push({ id: carryId(s, p), foot: p.foot, set: "carry" });
for (const sec of COURSE) for (const r of [99, 80, 50]) jobs.push({ id: `${sec}_B${r}_D${r}_A${r}`, foot: "R", set: "course" });
for (const rx of RECEIVE_CHAIN) jobs.push({ id: `${rx}_B99_D99_A99`, foot: "R", set: "chain" });
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
const sepMax = (S) => { const T = S.touches.filter((t) => t.launched && t.receive), k1 = T.length ? T[0].k : 0; let m = 0; for (const r of S.rec) if (r.k >= k1) m = Math.max(m, Math.hypot(r.ball.p[0] - r.P[0], r.ball.p[2] - r.P[1])); return +m.toFixed(3); };
const rows = [];
for (const [j, J] of jobs.entries()) { if (j % of !== sh) continue; const cs = () => anyCase(J.id, 1), o = { seed: 1, foot: J.foot }, row = { id: J.id, set: J.set, foot: J.foot };
  try { const A = makeCarry(cs(), o); A.run(); const B = makeCarry(cs(), o); B.run(); const C = makeCarry(cs(), Object.assign({ anim: true, Body: LegBody }, o)); C.run(); const O = makeTech(cs(), o); O.run();
    const ep = A.rc2.ep; Object.assign(row, { det: fp(A) === fp(B), bodyNeutral: fp(A) === fp(C), failed: !!(ep && ep.failed) || !!A.fault, contacts: ep ? ep.contacts.length : 0, sep: sepMax(A), oldSep: sepMax(O), oldFailed: !!(O.rc2.ep && O.rc2.ep.failed) || !!O.fault, oldContacts: O.rc2.ep ? O.rc2.ep.contacts.length : 0 }); }
  catch (e) { row.error = String(e).slice(0, 200); }
  rows.push(row); console.log(JSON.stringify(row)); }
fs.writeFileSync(out, JSON.stringify(rows)); 
