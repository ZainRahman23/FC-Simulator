// receive_kill12/tools/rk_regress.mjs — EXISTING SYSTEMS UNCHANGED by RECEIVE-KILL-1.2: (as RECEIVE-KILL-1.1's, plus RECEIVE-KILL-1 and RECEIVE-KILL-1.1
// themselves — their benchmark grids against their own evidence of record, before and after) in ONE process, (a) the frozen DRIBBLE-V1 core's cut scenarios and
// RECEIVE-CONTROL-1.1's review cases run, (b) every RECEIVE-KILL-1.2 matrix row runs at all eleven Ball Control steps (candidate scale) with the placeholder body posed on
// the real rig, (c) both run again — tick-for-tick fingerprints must match, DRIBBLE-V1 must match its frozen evidence of record, and the frozen
// parameter objects (D1, RX, RXE) must be deeply unchanged. (The kill system imports the ball world directly and writes no shared state.)
//   node rk_regress.mjs <seed a> <seed b> <out.json>
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url"; import { createRequire } from "module";
import { makeSim, PROFILES } from "../../dribble15/tools/d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { cutQuality } from "../../dribble15/tools/d15_quality.mjs";
import { makeReceive, RX, RXE } from "../../receive11/tools/rx_env.mjs"; import { parseCase, VISUAL } from "../../receive11/rx_cases.js"; import { D1 } from "../../dribble15/d15_core.js";
import { prepare, runEpisode, DT } from "../rk_sim.js"; import { BC_STEPS } from "../rk_model.js"; import { MATRICES, condOf } from "../rk_conditions.js"; import { KillBody } from "../rk_body.js";
import * as K1 from "../../receive_kill1/rk_sim.js"; import { BENCHMARKS as B1 } from "../../receive_kill1/rk_conditions.js";
import * as K11 from "../../receive_kill11/rk_sim.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), [a, b, outFile] = process.argv.slice(2), SCN = ["CUT60_RUN", "CUT60L_RUN", "CUT90_RUN", "CUT90L_RUN", "STRAIGHT_RUN"];
const { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const fp = (S) => { let h = 2166136261 >>> 0; const mix = (x) => { const s = x.toFixed(9); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  for (const r of S.rec) { mix(r.ball.p[0]); mix(r.ball.p[1]); mix(r.ball.p[2]); mix(r.P[0]); mix(r.P[1]); } for (const T of S.touches) mix(T.k); return h.toString(16); };
const dribble = () => { const out = {}; for (const id of SCN) for (let sd = +a; sd <= +b; sd++) { const scn = get(id), S = makeSim(scn, { ver: "d15", seed: sd, player: PROFILES.HIGH, opts: { record: true } }); S.run();
  const q = cutQuality(S, scn), T = S.touches.filter((t) => t.launched);
  out[id + "#" + sd] = { fp: fp(S), taken: q ? q.taken : null, clean: q ? q.takenCleanly : null, decisive: q && q.decisive ? { reg: q.decisive.reg, speed: q.decisive.speed, F: q.decisive.F } : null, launches: T.length, end: S.rec[S.rec.length - 1].ctrl }; } return out; };
const receives = () => VISUAL.map((v) => { const S = makeReceive(parseCase(v.id), { seed: v.seed || 1, anim: true }); S.run(); return { id: v.id, fp: fp(S) }; });
const frozen = () => JSON.stringify([D1, RX, RXE]);
// RECEIVE-KILL-1 (receive_kill1/, its own constants): the benchmark grid with the TYPICAL draw, vs its evidence of record
const B10 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99]; // the ten steps of the RECEIVE-KILL-1 / 1.1 evidence of record (1.2 adds 75)
const K1ev = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../../review_artifacts/receive_kill1/evidence/rk_distribution.json"), "utf8")).matrices.BENCH;
const kill1 = () => B1.map((b, j) => { const P = K1.prepare(b.cond), N = K1.drawsFor({ example: "TYPICAL" }); return B10.map((bc, i) => { const d = K1.runBC(P, bc, N, { post: 2.2 }).m.dStar; return Math.round(d * 1e4) / 1e4 === K1ev[j].typical[i].d2 ? 1 : 0; }); }).flat();
// RECEIVE-KILL-1.1 (receive_kill11/, its own constants): the benchmark episodes with the TYPICAL draw (contacts, stable time, extra adjustment) vs its evidence
const K11ev = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../../review_artifacts/receive_kill11/evidence/rk11_distribution.json"), "utf8")).matrices.BENCH;
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const kill11 = () => B1.map((b, j) => { const P = K11.prepare(b.cond); return B10.map((bc, i) => { const e = K11.runEpisode(P, bc, { example: "TYPICAL" }, { every: 2 }).m, t = K11ev[j].typical[i].ep; return e.contacts === t.contacts && r4(e.tStable) === t.tStable && r4(e.extraAdj) === t.extraAdj && e.continuation === t.cls ? 1 : 0; }); }).flat();
const f0 = frozen(), d0 = dribble(), r0 = receives(), k0 = kill1(), q0 = kill11();
let kills = 0; for (const M of MATRICES) for (const r of M.rows) { const P = prepare(condOf(M, r)); if (P.plan.none) continue;
  for (const bc of BC_STEPS) { const ep = runEpisode(P, bc, { seed: 1 }, { every: 8 }); kills++; if (bc === 50) { const B = new KillBody(X.RUN1_V13, X.M4, X.skel, P, ep); for (let k = Math.max(0, P.kc - 200); k < P.kc + 500; k += 4) B.poseAt(k * DT, P.pred.P[Math.min(k, P.pred.P.length - 1)].p); } } }
const f1 = frozen(), d1 = dribble(), r1 = receives(), k1 = kill1(), q1 = kill11();
const ev0 = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../../review_artifacts/dribble15/evidence/score96_d15.json"), "utf8")), ev = ev0.rows || ev0, evBy = new Map(ev.map((r) => [r.id + "#" + r.sd, r]));
let same = 0, evMatch = 0, evN = 0; const diffs = [];
for (const k of Object.keys(d0)) { const x = d0[k], y = d1[k]; if (JSON.stringify(x) === JSON.stringify(y)) same++; else diffs.push({ k, before: x, after: y });
  const e = evBy.get(k); if (e) { evN++; if (e.taken === x.taken && e.clean === x.clean && e.launches === x.launches && e.end === x.end && JSON.stringify(e.decisive) === JSON.stringify(x.decisive)) evMatch++; else diffs.push({ k, evidence: e, now: x }); } }
const rSame = r0.filter((x, i) => x.fp === r1[i].fp).length;
const res = { kill11Cells: q0.length, kill11MatchEvidenceBefore: q0.reduce((a, b) => a + b, 0), kill11MatchEvidenceAfter: q1.reduce((a, b) => a + b, 0), kill1Cells: k0.length, kill1MatchEvidenceBefore: k0.reduce((a, b) => a + b, 0), kill1MatchEvidenceAfter: k1.reduce((a, b) => a + b, 0), dribbleRuns: Object.keys(d0).length, dribbleBeforeEqualsAfter: same, dribbleEvidenceCompared: evN, dribbleEvidenceMatch: evMatch, receive11Cases: r0.length, receive11BeforeEqualsAfter: rSame, killsRunBetween: kills, frozenParamsUnchanged: f0 === f1, receive11Fingerprints: r0, diffs: diffs.slice(0, 20), node: process.version };
fs.writeFileSync(outFile, JSON.stringify(res, null, 1));
console.log(`RECEIVE-KILL-1.1 ${res.kill11MatchEvidenceBefore}/${q0.length} → ${res.kill11MatchEvidenceAfter}/${q0.length} episodes = its evidence; RECEIVE-KILL-1 ${res.kill1MatchEvidenceBefore}/${k0.length} → ${res.kill1MatchEvidenceAfter}/${k0.length} cells = its evidence; DRIBBLE-V1 ${same}/${res.dribbleRuns} before == after ${kills} episodes; frozen evidence ${evMatch}/${evN}; RECEIVE-CONTROL-1.1 cases ${rSame}/${r0.length}; D1 / RX / RXE unchanged ${res.frozenParamsUnchanged}`);
