// receive_control2/tools/rc2_equiv.mjs — INTEGRATION EQUIVALENCE: the live controllers (rc2_episode.js) running inside a DRIBBLE-V1-frame ball kernel
// reproduce the stand-alone RECEIVE-TURN-1 (runTurn) and RECEIVE-KILL (runEpisode) episodes bit for bit: the same plan, the same keyed draws, the same
// authoritative launches (tick, position, velocity, spin — mirrored between the frames) and the same ball path (every tick, mirrored).
//   node rc2_equiv.mjs <out.json>
import fs from "fs";
import * as RT from "../../receive_turn1/rt_sim.js"; import * as RKS from "../../receive_turn1/rk_sim.js"; import { MATRICES, condOf } from "../../receive_turn1/rk_conditions.js";
import { Frame, TurnEpisode, KillEpisode } from "../rc2_episode.js";
import { surfaceIdeal, idealVel } from "../../receive_turn1/rk_model.js";
const S0 = [40, 34], mir = (p) => [p[0], p[1], -p[2]], mirW = (w) => [-w[0], -w[1], w[2]];
const kernelFrom = (L) => { const W = RKS.mkWorld(mir(L.p), mir(L.v), mirW(L.w)); return W; };
const sameLaunch = (a, b) => a && b && a.kind === b.kind && a.tick === b.tick;
function cmpPath(recSA, W, recK, n) { let bit = true, maxd = 0; for (const r of recSA) { const q = recK.get(r.i); if (!q) continue; const p = r.p; const d = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); maxd = Math.max(maxd, d); if (d !== 0) bit = false; } return { bit, maxd }; }
const out = { turn: { cases: 0, planSame: 0, launchesSame: 0, pathBit: 0, maxDev: 0, fails: [] }, kill: { cases: 0, launchesSame: 0, pathBit: 0, maxDev: 0, fails: [] } };
const F = new Frame(S0, 0);
// ── RECEIVE-TURN-1: 13 angles × right / left × 6 / 12 / 18 m/s (+ the outside-of-foot turn at 4 m/s) × BC 30 / 70 / 99 × seeds 1–3
for (const v of [6, 12, 18]) for (const a of [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]) for (const s of [1, -1]) for (const fam of [undefined, "OUTSIDE_TURN"]) {
  if (fam && v !== 6) continue; const cond = { v: fam ? 4 : v, theta: a * s, family: fam }; if (a === 0 && s < 0) continue; const P = RT.prepareTurn(cond); if (P.A.none) continue;
  for (const bc of [30, 70, 99]) for (const seed of [1, 2, 3]) { out.turn.cases++;
    const spec = { seed }, ep = RT.runTurn(P, bc, spec, { every: 1 });
    // integrated: the plan re-selected on the kernel's own prediction from the strike (same horizon as the stand-alone prediction)
    const W = kernelFrom(P.inc.sol.launch), n = P.inc.pred.P.length, Pk = [];
    { const C = RKS.cloneWorld(W); Pk.push({ p: F.loc(C.ball.p), v: F.locV(C.ball.v) }); for (let i = 1; i < n; i++) { C.step(); Pk.push({ p: F.loc(C.ball.p), v: F.locV(C.ball.v) }); } }
    const A2 = RT.selectTurn({ pred: { P: Pk } }, cond); const planSame = !A2.none && A2.fid === P.A.fid && A2.F === P.A.F && A2.k === P.A.k && A2.J === P.A.J; if (planSame) out.turn.planSame++;
    const E = new TurnEpisode({ A: A2, F, kc: A2.k, bc, spec, carry: "rt" }), recK = new Map(); const nT = A2.k + Math.round(3.0 / RKS.DT);
    while (W.tick <= nT) { E.pre(W); if (W.tick >= A2.k) recK.set(W.tick - A2.k, F.loc(W.ball.p)); W.step(); E.post(W); }
    const la = ["turn1", "turn1.f1", "turn1.carry"].map((id) => W.events.find((e) => e.id === id && (e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED")) || null);
    const ls = ep.launched, okL = la.filter(Boolean).length === ls.filter(Boolean).length && la.filter(Boolean).every((e, j) => e.kind === ls.filter(Boolean)[j]);
    const velSame = E.ex && E.ex.v.every((x, j) => x === ep.ex.v[j]);
    const cmp = cmpPath(ep.rec, W, recK); out.turn.maxDev = Math.max(out.turn.maxDev, cmp.maxd);
    if (okL && velSame) out.turn.launchesSame++; if (cmp.bit) out.turn.pathBit++;
    if (!(okL && velSame && cmp.bit && planSame) && out.turn.fails.length < 12) out.turn.fails.push({ cond, bc, seed, planSame, okL, velSame, maxd: cmp.maxd, sa: ls, k: la.map((e) => e && e.kind) }); } }
// ── RECEIVE-KILL: every kill matrix row × BC 30 / 70 / 99 × seeds 1–3 (the control episode with its follow-ups)
for (const M of MATRICES) for (const r of M.rows) { const cond = condOf(M, r), P = RKS.prepare(cond); if (P.plan.none) continue;
  for (const bc of [30, 70, 99]) for (const seed of [1, 2, 3]) { out.kill.cases++;
    const spec = { seed }, ep = RKS.runEpisode(P, bc, spec, { every: 1 });
    const W = kernelFrom(P.sol.launch), plan = P.plan, ideal = surfaceIdeal(plan.sf, plan.st, plan.inc, plan.shift); ideal.base = RKS.solveExit({ ideal, contact: plan.st.p }); ideal.v = idealVel(ideal, ideal.base.s);
    const E = new KillEpisode({ plan, ideal, F, kc: P.kc, bc, spec }), recK = new Map(), nT = P.kc + Math.round(4.0 / RKS.DT);
    while (W.tick <= nT) { E.pre(W); if (W.tick >= P.kc) recK.set(W.tick - P.kc, F.loc(W.ball.p)); W.step(); E.post(W); }
    const ids = ["kill1", "kill1.f1", "kill1.f2"], la = ids.map((id) => W.events.find((e) => e.id === id && (e.kind === "AUTHORITATIVE_LAUNCH" || e.kind === "LAUNCH_CANCELLED")) || null);
    const ls = ep.launched, okL = JSON.stringify(la.filter(Boolean).map((e) => e.kind)) === JSON.stringify(ls.filter(Boolean)) && E.contacts.length === ep.contacts.length && E.contacts.every((c, j) => c.k === ep.contacts[j].k && c.ex.v.every((x, q) => x === ep.contacts[j].ex.v[q]));
    const cmp = cmpPath(ep.rec, W, recK); out.kill.maxDev = Math.max(out.kill.maxDev, cmp.maxd); if (okL) out.kill.launchesSame++; if (cmp.bit) out.kill.pathBit++;
    if (!(okL && cmp.bit) && out.kill.fails.length < 12) out.kill.fails.push({ M: M.id, r: r.id || r, bc, seed, okL, maxd: cmp.maxd, sa: ls, k: la.map((e) => e && e.kind), nSA: ep.contacts.length, nK: E.contacts.length }); } }
fs.writeFileSync(process.argv[2] || "rc2_equiv.json", JSON.stringify(out, null, 1));
console.log(`turn: ${out.turn.cases} cases · plan re-selected identically ${out.turn.planSame} · launches identical ${out.turn.launchesSame} · ball path bit-identical ${out.turn.pathBit} (max dev ${out.turn.maxDev})`);
console.log(`kill: ${out.kill.cases} cases · launches identical ${out.kill.launchesSame} · ball path bit-identical ${out.kill.pathBit} (max dev ${out.kill.maxDev})`);
if (out.turn.fails.length) console.log("turn fails", JSON.stringify(out.turn.fails.slice(0, 3))); if (out.kill.fails.length) console.log("kill fails", JSON.stringify(out.kill.fails.slice(0, 3)));
