// technical_control1/tools/tc_regress.mjs — REGRESSIONS (owner §40 – §41): everything TECHNICAL-CONTROL-1 does not own is bit-identical:
//   1. the receive pipelines it builds on, run in the SAME process before and after TechSim runs (TechSim patches nothing permanently): RECEIVE-MOVING-1
//      (CURRENT) and RECEIVE-ELITE-1 (makeElite) on RECEIVE-CONTROL-2's integrated cases (BC 50 / 99 × seeds 1, 2) and RECEIVE-ELITE-1's set
//   2. TechSim on receives that are not turns with a go intent (kill and hold, aerial control, kill-and-go): ≡ RECEIVE-ELITE-1 (≡ RECEIVE-MOVING-1)
//   3. TechSim on the turns: listed as changed (the technical carry after the receive replaces the exit touch), with the reason
//   node tc_regress.mjs <out.json>
import fs from "fs"; import { makeTech, makeElite, makeCurrent } from "./tc_env.mjs"; import { CASES as C2, parseCase as parse2 } from "../../receive_control2/rc2_cases.js"; import { ALL, parseCase } from "../../receive_elite1/re1_cases.js"; import { anyCase, COURSE } from "../tc_course.js";
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = (+x).toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; for (const r of S.rec) { for (const x of r.ball.p) mix(x); mix(r.P[0]); mix(r.P[1]); mix(r.psi); } for (const T of S.touches) { mix(T.k); if (T.executed) for (const x of T.executed.v) mix(x); } return h.toString(16); };
const run = (mk, cs, sd, o) => { const S = mk(cs, Object.assign({ seed: sd }, o)); S.run(cs.scenario.dur); return S; };
const jobs = []; for (const c of C2) for (const bc of c.bc ? [null] : [50, 99]) for (const sd of [1, 2]) jobs.push({ cs: parse2(bc == null ? c.id : c.id + "_BC" + bc), sd, kind: "rc2" });
for (const id of ALL) jobs.push({ cs: parseCase(id + "_B99_D99_A99"), sd: 1, kind: "re1" });
const res = { isolation: { runs: 0, identical: 0, fails: [] }, nonTurn: { runs: 0, identical: 0, fails: [] }, turns: { runs: 0, changed: 0, list: [] } };
// 1. the baselines BEFORE any TechSim has run in this process
const before = jobs.map((j) => ({ cur: j.kind === "rc2" ? fp(run(makeCurrent, j.cs, j.sd, {})) : null, el: fp(run(makeElite, j.cs, j.sd, {})) }));
// TechSim everywhere (the receive set, the course)
const tech = jobs.map((j) => run(makeTech, j.cs, j.sd, {})); for (const id of COURSE) { const cs = anyCase(id, 1); run(makeTech, cs, 1, { style: cs.style, ratings: cs.ratings }); }
// … and AFTER
jobs.forEach((j, i) => { const cur = j.kind === "rc2" ? fp(run(makeCurrent, j.cs, j.sd, {})) : null, el = fp(run(makeElite, j.cs, j.sd, {})); res.isolation.runs++; if (cur === before[i].cur && el === before[i].el) res.isolation.identical++; else res.isolation.fails.push(j.cs.id + "@" + j.sd);
  const T = tech[i], turn = T.rc2 && T.rc2.kind === "ELITE"; if (!turn) { res.nonTurn.runs++; if (fp(T) === before[i].el) res.nonTurn.identical++; else res.nonTurn.fails.push(j.cs.id + "@" + j.sd); }
  else { res.turns.runs++; if (fp(T) !== before[i].el) res.turns.changed++; res.turns.list.push({ id: j.cs.id, sd: j.sd, family: T.rc2.ep.tech.fid, contacts: T.rc2.ep.contacts.length, reason: "the technical carry (no exit touch) after the receive's turn" }); } });
fs.writeFileSync(process.argv[2] || "tc_regress.json", JSON.stringify(res, null, 1)); console.log(JSON.stringify({ isolation: [res.isolation.identical, res.isolation.runs], nonTurn: [res.nonTurn.identical, res.nonTurn.runs], turnsChanged: [res.turns.changed, res.turns.runs] }), res.isolation.fails.slice(0, 5), res.nonTurn.fails.slice(0, 5));
