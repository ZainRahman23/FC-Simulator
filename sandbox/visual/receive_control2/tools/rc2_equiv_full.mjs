// receive_control2/tools/rc2_equiv_full.mjs — the FULL INTEGRATED PIPELINE against the stand-alone episodes: a ReceiveSim2 (DRIBBLE-V1's simulation,
// RECEIVE-CONTROL-1.1's receiver, the resolver) striking RECEIVE-TURN-1's / RECEIVE-KILL's own solved pass at RECEIVE-KILL's stance (pitch 40, 34)
// must choose the SAME action and reproduce the receive contact, the extra / follow-up controls and the ball, tick for tick, until the integrated
// pipeline's own rejoin touch (the stand-alone turn had only an illustrative push there). The draw keys carry the receive event (R1) and the
// receiver ("CAL-R"): the stand-alone runs are given the same.   node rc2_equiv_full.mjs <out.json>
import fs from "fs"; import { makeReceive2, DT } from "./rc2_env.mjs";
import * as RT from "../../receive_turn1/rt_sim.js"; import * as RKS from "../../receive_turn1/rk_sim.js"; import { MATRICES, condOf } from "../../receive_turn1/rk_conditions.js";
const mir = (p) => [p[0], p[1], -p[2]], mirW = (w) => [-w[0], -w[1], w[2]], S0 = [40, 34];
const scenario = (L, exit, dur) => ({ id: "EQ", init: { v: 0, heading: 0, pos: S0.slice() }, pass: { from: 0, dist: 12, speed: 10, lead: 1 }, launch: { p: mir(L.p), v: mir(L.v), w: mirW(L.w) }, exit, dur });
const out = { turn: { cases: 0, sameAction: 0, contactSame: 0, controlSame: 0, pathSame: 0, fails: [] }, kill: { cases: 0, sameAction: 0, contactsSame: 0, pathSame: 0, fails: [] } };
const pathCmp = (rec, S, kFrom, kTo, toLoc) => { for (const r of rec) { const k = kFrom + r.i; if (k > kTo) break; const q = S.rec[k]; if (!q) continue; const p = toLoc(q.ball.p); if (p[0] !== r.p[0] || p[1] !== r.p[1] || p[2] !== r.p[2]) return { ok: false, k, a: r.p, b: p }; } return { ok: true }; };
// the record's ball is the kernel frame [x, h, y] (rx_metrics.mjs): local = [x − 40, y − 34, h]
const locA = (pk) => [pk[0] - S0[0], pk[2] - S0[1], pk[1]];
for (const v of [6, 12, 18]) for (const a of [0, 30, 60, 90, 120, 135, 150, 180]) for (const s of [1, -1]) { if (a === 0 && s < 0) continue; const cond = { v, theta: a * s }; const P = RT.prepareTurn(cond); if (P.A.none) continue;
  for (const bc of [50, 99]) for (const seed of [1, 2]) { out.turn.cases++;
    const ep = RT.runTurn(P, bc, { seed, receiver: "CAL-R", receiveEvent: "R1" }, { every: 1 });
    const S = makeReceive2({ scenario: scenario(P.inc.sol.launch, { turn: a * s, v: 5.5, intent: "go" }, 4.0) }, { seed, bc, receiverKey: "CAL-R" }); S.run(Math.min(4.0, (P.kc + 400) * DT));
    const c2 = S.rc2, A2 = c2.ep && c2.kind === "TURN" ? c2.ep.A : null, same = !!A2 && A2.fid === P.A.fid && A2.F === P.A.F && A2.k === P.A.k; if (same) out.turn.sameAction++;
    const cSame = same && c2.ep.ex.v.every((x, j) => x === ep.ex.v[j]); if (cSame) out.turn.contactSame++;
    const fSame = (!ep.follow && !c2.ep.follow) || (ep.follow && c2.ep.follow && ep.follow.i === c2.ep.follow.i && ep.follow.ex.v.every((x, j) => x === c2.ep.follow.ex.v[j])); if (fSame) out.turn.controlSame++;
    const kTo = c2.rejoin ? c2.rejoin.kM : P.kc + Math.round(2.0 / DT), pc = pathCmp(ep.rec, S, P.kc, kTo, locA); if (pc.ok) out.turn.pathSame++;
    if (!(same && cSame && fSame && pc.ok) && out.turn.fails.length < 10) out.turn.fails.push({ cond, bc, seed, same, cSame, fSame, path: pc, act: c2.cls && c2.cls.action }); } }
for (const M of MATRICES) for (const r of M.rows) { const cond = condOf(M, r), P = RKS.prepare(cond); if (P.plan.none) continue;
  for (const bc of [50, 99]) for (const seed of [1, 2]) { out.kill.cases++;
    const ep = RKS.runEpisode(P, bc, { seed, receiver: "CAL-R", receiveEvent: "R1" }, { every: 1 });
    const S = makeReceive2({ scenario: scenario(P.sol.launch, { turn: 0, v: 0, intent: "kill" }, 4.0) }, { seed, bc, receiverKey: "CAL-R" }); S.run(Math.min(4.5, (P.kc + 960) * DT));
    const c2 = S.rc2, ok = c2.kind === "KILL" && c2.ep.plan.sf.key === P.plan.sf.key && c2.ep.plan.k === P.plan.k; if (ok) out.kill.sameAction++;
    const cs = ok && c2.ep.contacts.length === ep.contacts.length && c2.ep.contacts.every((c, j) => c.k === ep.contacts[j].k && c.ex.v.every((x, q) => x === ep.contacts[j].ex.v[q])); if (cs) out.kill.contactsSame++;
    const pc = pathCmp(ep.rec, S, P.kc, P.kc + Math.round(3.5 / DT), locA); if (pc.ok) out.kill.pathSame++;
    if (!(ok && cs && pc.ok) && out.kill.fails.length < 10) out.kill.fails.push({ M: M.id, r, bc, seed, ok, cs, path: pc, act: c2.cls && c2.cls.action, want: P.plan.sf.key }); } }
fs.writeFileSync(process.argv[2] || "rc2_equiv_full.json", JSON.stringify(out, null, 1));
console.log(`turn: ${out.turn.cases} · same action ${out.turn.sameAction} · same contact ${out.turn.contactSame} · same extra control ${out.turn.controlSame} · ball path identical to the rejoin ${out.turn.pathSame}`);
console.log(`kill: ${out.kill.cases} · same action ${out.kill.sameAction} · same contacts ${out.kill.contactsSame} · ball path identical ${out.kill.pathSame}`);
if (out.turn.fails.length) console.log("turn fails", JSON.stringify(out.turn.fails.slice(0, 2))); if (out.kill.fails.length) console.log("kill fails", JSON.stringify(out.kill.fails.slice(0, 2)));
