// technical_control13/tools/tc13_checks.mjs — TECHNICAL-CONTROL-1.3's checks: the body is presentation only. Per run: TECHNICAL-CONTROL-1.2's CarrySim
// (animation off) — the reference; FlowSim (animation off) gives the same fingerprint (the hand-off history it records is presentation data);
// FlowSim + FlowBody (animation on) gives the same fingerprint (the legs leave gameplay untouched); a second FlowSim + FlowBody run gives the same
// gameplay AND the same posed skeleton every frame (the presentation is deterministic). Over the transition torture set × 99 / 80 / 50,
// TECHNICAL-CONTROL-1.2's carry course × its four players (99) and the receive → dribble chain (99).   node tc13_checks.mjs <out.json> [shard/of]
import fs from "fs"; import { anyCase, RECEIVE_CHAIN } from "../../technical_control1/tc_course.js"; import { makeCarry } from "../../technical_control12/tools/tc12_carry.mjs";
import { CARRY_SECTIONS, PLAYERS, carryId } from "../../technical_control12/tc12_cases.js"; import { tortureIds, specId } from "../tc13_cases.js"; import { makeFlow } from "./tc13_phase.mjs"; import { FlowBody } from "../tc13_body.js";
const out = process.argv[2], [sh, of] = (process.argv[3] || "0/1").split("/").map(Number), jobs = [];
for (const j of tortureIds()) for (const r of [99, 80, 50]) { const s = specId(j.spec, [r, r, r]); jobs.push({ id: s.id, foot: s.foot, style: s.style, set: "torture", spec: j.spec, r }); }
for (const s of CARRY_SECTIONS) for (const p of PLAYERS) jobs.push({ id: carryId(s, p), foot: p.foot, set: "carry" });
for (const rx of RECEIVE_CHAIN) jobs.push({ id: `${rx}_B99_D99_A99`, foot: "R", set: "chain" });
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
// the posed skeleton's fingerprint: every frame's skinning matrices (the legs' joints), stepped as the simulation runs
const runPosed = (S) => { let h = 2166136261 >>> 0; const n = Math.round(S.cfg.scenario.dur * 240); for (let i = 0; i < n && !S.fault; i++) { S.step(); const m = S.A && S.A.skinMats; if (!m) continue; for (let k = 0; k < m.length; k += 7) { const q = m[k].toFixed(6); for (let c = 0; c < q.length; c++) { h ^= q.charCodeAt(c); h = Math.imul(h, 16777619) >>> 0; } } } return h.toString(16); };
const rows = [];
for (const [j, J] of jobs.entries()) { if (j % of !== sh) continue; const cs = () => anyCase(J.id, 1), o = { seed: 1, foot: J.foot, style: J.style || undefined }, row = { id: J.id, set: J.set, spec: J.spec, r: J.r, foot: J.foot, style: J.style };
  try { const A = makeCarry(cs(), o); A.run(); const B = makeFlow(cs(), o); B.run(); const C = makeFlow(cs(), Object.assign({ anim: true, Body: FlowBody }, o)), pC = runPosed(C), D = makeFlow(cs(), Object.assign({ anim: true, Body: FlowBody }, o)), pD = runPosed(D);
    const ep = A.rc2.ep; Object.assign(row, { flowSimNeutral: fp(A) === fp(B), bodyNeutral: fp(A) === fp(C), det: fp(C) === fp(D), poseDet: pC === pD, failed: !!(ep && ep.failed) || !!A.fault || !!C.fault, contacts: ep ? ep.contacts.length : 0, flags: ((C.rc2 && C.rc2._tc11flags) || []).length, states: ((C.rc2 && C.rc2._tc13state) || []).length }); }
  catch (e) { row.error = String(e && e.stack || e).slice(0, 300); }
  rows.push(row); console.log(JSON.stringify(row)); }
fs.writeFileSync(out, JSON.stringify(rows));
