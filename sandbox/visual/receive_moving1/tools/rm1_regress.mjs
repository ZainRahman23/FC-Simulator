// receive_moving1/tools/rm1_regress.mjs — EXISTING SYSTEMS UNCHANGED by RECEIVE-MOVING-1, in ONE process (adapted from receive_turn11/tools/rt11_regress.mjs):
// (a) the frozen DRIBBLE-V1 core's cut scenarios (vs before and vs their evidence of record), RECEIVE-CONTROL-1.1's review cases, RECEIVE-TURN-1's and
// RECEIVE-KILL's stand-alone episodes (fingerprint grids) run, (b) the INTEGRATED pipeline runs every review case at BC 50 / 99 and a slice of RECEIVE-CONTROL-1.1's
// matrix with every presentation body posed, (c) all of (a) runs again — tick-for-tick fingerprints must match, DRIBBLE-V1 must match its frozen evidence, the
// frozen parameter objects (D1, RX, RXE) must be deeply unchanged.   node rc2_regress.mjs <seed a> <seed b> <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url"; import { createRequire } from "module";
import { makeSim, PROFILES } from "../../dribble15/tools/d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "../../dribble15/tools/d15_quality.mjs";
import { makeReceive, RX, RXE } from "../../receive11/tools/rx_env.mjs"; import { parseCase, VISUAL } from "../../receive11/rx_cases.js"; import { D1 } from "../../dribble15/d15_core.js";
import { prepareTurn, runTurn } from "../../receive_turn1/rt_sim.js"; import { DT } from "../../receive_turn1/rk_sim.js"; import * as RKS from "../../receive_turn1/rk_sim.js"; import { MATRICES, condOf } from "../../receive_turn1/rk_conditions.js";
import { makeReceiveM } from "./rm1_env.mjs"; import { CASES, parseCase as parseCaseM, seedCase as seedCaseM, matrix as mtxM } from "../rm1_cases.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), [a, b, outFile] = process.argv.slice(2), SCN = ["CUT60_RUN", "CUT60L_RUN", "CUT90_RUN", "CUT90L_RUN", "STRAIGHT_RUN"];
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
const dribble = () => { const out = {}; for (const id of SCN) for (let sd = +a; sd <= +b; sd++) { const scn = get(id), S = makeSim(scn, { ver: "d15", seed: sd, player: PROFILES.HIGH, opts: { record: true } }); S.run();
  const q = cutQuality(S, scn), T = S.touches.filter((t) => t.launched);
  out[id + "#" + sd] = { fp: fp(S), taken: q ? q.taken : null, clean: q ? q.takenCleanly : null, decisive: q && q.decisive ? { reg: q.decisive.reg, speed: q.decisive.speed, F: q.decisive.F } : null, launches: T.length, end: S.rec[S.rec.length - 1].ctrl }; } return out; };
const receives = () => VISUAL.map((v) => { const S = makeReceive(parseCase(v.id), { seed: v.seed || 1, anim: true }); S.run(); return { id: v.id, fp: fp(S) }; });
const frozen = () => JSON.stringify([D1, RX, RXE]);
const killFp = () => { const out = []; for (const M of MATRICES) for (const r of M.rows.slice(0, 3)) { const P = RKS.prepare(condOf(M, r)); if (P.plan.none) continue; const e = RKS.runEpisode(P, 70, { seed: 4 }, { every: 2 }); out.push(JSON.stringify([P.plan.sf.key, P.kc, e.contacts.map((c) => [c.k, c.ex.v]), e.rec[e.rec.length - 1].p])); } return out; };
const turnFp = () => { const out = []; for (const c of [{ v: 12, theta: 30 }, { v: 12, theta: 90 }, { v: 12, theta: 135 }, { v: 12, theta: 180 }, { v: 4, theta: 90, family: "OUTSIDE_TURN" }, { v: 12, theta: -150 }]) { const P = prepareTurn(c);
  for (const bc of [50, 70, 99]) { const e = runTurn(P, bc, { seed: 5 }, { every: 2 }); out.push(JSON.stringify([P.A.fid, P.A.F, P.kc, e.ex.v, e.m.cls, e.m.tCont, e.rec[e.rec.length - 1].p])); } } return out; };
const f0 = frozen(), d0 = dribble(), r0 = receives(), t0 = turnFp(), q0 = killFp();
// between: the integrated pipeline — every review case × BC 50 / 99 and a slice of RECEIVE-CONTROL-1.1's matrix (standing + moving), presentation bodies on
let turns = 0, poses = 0; const between = []; for (const c of CASES) between.push(c.id); for (const c of mtxM().filter((_, i) => i % 11 === 0)) between.push(c.id);
for (const id of between) { const cs = seedCaseM(parseCaseM(id), 2), S = makeReceiveM(cs, { seed: 2, anim: true }); while (S.k < Math.round(cs.scenario.dur / DT) && !S.fault) { S.step(); if (S.A.skinMats) poses++; } turns++; }
const f1 = frozen(), d1 = dribble(), r1 = receives(), t1 = turnFp(), q1 = killFp();
const ev0 = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../../review_artifacts/dribble15/evidence/score96_d15.json"), "utf8")), ev = ev0.rows || ev0, evBy = new Map(ev.map((r) => [r.id + "#" + r.sd, r]));
let same = 0, evMatch = 0, evN = 0; const diffs = [];
for (const k of Object.keys(d0)) { const x = d0[k], y = d1[k]; if (JSON.stringify(x) === JSON.stringify(y)) same++; else diffs.push({ k, before: x, after: y });
  const e = evBy.get(k); if (e) { evN++; if (e.taken === x.taken && e.clean === x.clean && e.launches === x.launches && e.end === x.end && JSON.stringify(e.decisive) === JSON.stringify(x.decisive)) evMatch++; else diffs.push({ k, evidence: e, now: x }); } }
const res = { dribbleRuns: Object.keys(d0).length, dribbleBeforeEqualsAfter: same, dribbleEvidenceCompared: evN, dribbleEvidenceMatch: evMatch, receive11Cases: r0.length, receive11BeforeEqualsAfter: r0.filter((x, i) => x.fp === r1[i].fp).length,
  turnEpisodes: t0.length, turnBeforeEqualsAfter: t0.filter((x, i) => x === t1[i]).length, killEpisodes: q0.length, killBeforeEqualsAfter: q0.filter((x, i) => x === q1[i]).length, integratedRunsBetween: turns, posesBetween: poses, frozenParamsUnchanged: f0 === f1, diffs };
fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
console.log(`DRIBBLE-V1 ${same}/${res.dribbleRuns} before == after, evidence ${evMatch}/${evN}; RECEIVE-CONTROL-1.1 ${res.receive11BeforeEqualsAfter}/${r0.length}; RECEIVE-TURN-1 ${res.turnBeforeEqualsAfter}/${t0.length}; RECEIVE-KILL ${res.killBeforeEqualsAfter}/${q0.length}; ${turns} integrated runs + ${poses} posed frames between; D1 / RX / RXE unchanged ${res.frozenParamsUnchanged}`);
