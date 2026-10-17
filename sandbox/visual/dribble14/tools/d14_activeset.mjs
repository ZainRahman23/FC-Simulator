// dribble14/tools/d14_activeset.mjs — MATCH ACTIVE SETS (the owner's DRIBBLE-1.3 §25), measured, not extrapolated: 22 players step in lockstep on
// one core for the scenario's duration — the ACTIVE ones run the full dribble resolver (a DribbleSim each, on its own dribble scenario: the ball
// carrier, then a contest participant / an imminent receiver / a defender as further planner instances), every other player runs ordinary TURN-1.2
// locomotion (t1Step + t1Evaluate: pose, skinning) with a straight run input. Reported per configuration: total CPU (ms of one core per simulated
// second; 1000 = real time), the active resolvers' share, the locomotion share, and the worst / 99.9th-percentile tick.
// usage: node d14_activeset.mjs [ver d14] [out.json] [seconds 6]        (D1OVR passes through)
import fs from "fs"; import { makeSim, X } from "./d14_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [ver = "d14", outFile, secA = "6"] = process.argv.slice(2), T = +secA, N = Math.round(T * 240);
const ACT = [["CUT90_RUN", 1], ["CUT60_RUN", 2], ["CUT90L_RUN", 3], ["CUT60L_RUN", 4], ["STRAIGHT_RUN", 5], ["CURVE_RUN", 6], ["CUT45_RUN", 7], ["STRAIGHT_FAST", 8], ["CUT90_JOG", 9], ["REV135_RUN", 10], ["RETARGET_RUN", 11]];
const configs = [{ name: "1 active dribbler", n: 1 }, { name: "1 dribbler + 1 contest participant", n: 2 }, { name: "1 dribbler + receiver + defender", n: 3 }, { name: "pathological: all 22 active", n: 22 }];
makeSim(get("STRAIGHT_RUN"), { ver, seed: 1, opts: { record: false } });          // (warm-up: the rig's speed caches, as every measurement)
const out = { ver, seconds: T, configs: [] };
for (const cf of configs) {
  const sims = []; for (let i = 0; i < cf.n; i++) { const [id, sd] = ACT[i % ACT.length]; sims.push(makeSim(get(id), { ver, seed: sd + 100 * Math.floor(i / ACT.length), opts: { record: false } })); }
  const loco = []; for (let i = cf.n; i < 22; i++) { const A = X.TURN1.t1Make(X.skel, { v: 5.5, heading: 0.3 * i, pos: [10 + i, 20 + 2 * i], turn12: true }); if (X.TURN11) X.TURN11.attach(A, { mode: "t12" }); loco.push({ A, inp: { dir: 0.3 * i, v: 3 + (i % 5) } }); }
  const ticks = []; let tRes = 0, tLoco = 0;
  for (let k = 0; k < N; k++) { const t0 = performance.now();
    for (const S of sims) if (!S.fault && S.k < Math.round(S.cfg.scenario.dur / (1 / 240))) S.step();
    const t1 = performance.now(); for (const L of loco) { X.TURN1.t1Step(L.A, L.inp); X.TURN1.t1Evaluate(L.A); } const t2 = performance.now();
    tRes += t1 - t0; tLoco += t2 - t1; ticks.push(t2 - t0); }
  ticks.sort((a, b) => a - b); const simS = N / 240, active = sims.reduce((a, S) => a + (S.cpu.loco + S.cpu.ball), 0);
  const row = { name: cf.name, activePlanners: cf.n, locomotionOnly: 22 - cf.n, totalMsPerSimS: +((tRes + tLoco) / simS).toFixed(0), activePlayersMsPerSimS: +(tRes / simS).toFixed(0), activeResolverMsPerSimS: +((tRes - active) / simS).toFixed(0),
    otherLocomotionMsPerSimS: +(tLoco / simS).toFixed(0), worstTickMs: +ticks[ticks.length - 1].toFixed(1), p999TickMs: +ticks[Math.floor(0.999 * ticks.length)].toFixed(1), p99TickMs: +ticks[Math.floor(0.99 * ticks.length)].toFixed(1), realTimeFraction: +((tRes + tLoco) / simS / 1000).toFixed(2) };
  out.configs.push(row); console.log(JSON.stringify(row));
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
