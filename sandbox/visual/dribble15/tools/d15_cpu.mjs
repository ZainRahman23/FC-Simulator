// dribble15/tools/d15_cpu.mjs — RESOLVER CPU, DRIBBLE-1 vs DRIBBLE-1.1 vs DRIBBLE-1.2: the cores run the same scenario × seed back to back in one
// process (machine load affects all alike); per simulated second: wall, locomotion (TURN-1.2 step + pose + swing adjustment), ball kernel, and the
// RESOLVER = wall − locomotion − ball; per 240 Hz step; the PLANNING SPIKES — the longest single 240 Hz step (wall), the 99.9th / 99th percentile
// step, and the longest single planning pass; the share of steps over 4 / 8 / 20 ms; planning passes per simulated second; the worst scenario; and
// a 22-player projection (every player runs TURN-1.2; only the player(s) with the ball at their feet — the ACTIVE SET — run the dribble resolver).
// usage: node d15_cpu.mjs "IDs|all" seeds out.json [repeats 1] [vers d1,d11,d12]
import fs from "fs"; import { makeSim } from "./d15_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js";
const [idsArg = "all", seedsArg = "2", outFile, repArg = "1", versArg = "d1,d11,d12"] = process.argv.slice(2);
const ids = idsArg === "all" ? list().map((s) => s.id) : idsArg.split(","), N = +seedsArg, REP = +repArg, VERS = versArg.split(",");
const zero = () => ({ wall: 0, loco: 0, ball: 0, sim: 0, steps: 0, plans: 0, planMax: 0, stepMax: 0, stepMaxAt: null, over4: 0, over8: 0, over20: 0, st: [] });
const acc = Object.fromEntries(VERS.map((v) => [v, zero()])), per = {};
const pct = (a, p) => { if (!a.length) return null; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
// (warm-up, all versions alike: the rig's RUN-1 speed grid and TURN-1.2 reference tables are solved once per process — a DRIBBLE-1.3 sim solves
// them at construction; every core shares the rig, so no version pays a first-use solve inside a measured step)
makeSim(get("STRAIGHT_RUN"), { ver: "d15", seed: 1, opts: { record: false } });
for (const id of ids) { const row = Object.fromEntries(VERS.map((v) => [v, zero()]));
  for (let r = 0; r < REP; r++) for (let seed = 1; seed <= N; seed++) for (const ver of VERS) {
    const S = makeSim(get(id), { ver, seed, opts: { record: false } }), st = S.step.bind(S), steps = [];
    S.step = function () { const t = performance.now(), x = st(); steps.push(performance.now() - t); return x; };
    const t0 = performance.now(); S.run(); const w = performance.now() - t0;
    for (const o of [acc[ver], row[ver]]) { o.wall += w; o.loco += S.cpu.loco || 0; o.ball += S.cpu.ball || 0; o.sim += S.k / 240; o.steps += S.k; o.plans += S.cpu.plans || 0; o.planMax = Math.max(o.planMax, S.cpu.planMax || 0);
      for (let i = 0; i < steps.length; i++) { const d = steps[i]; if (d > o.stepMax) { o.stepMax = d; o.stepMaxAt = `${id} s${seed} t ${(i / 240).toFixed(2)}`; } if (d > 4) o.over4++; if (d > 8) o.over8++; if (d > 20) o.over20++; }
      if (o === row[ver]) for (const d of steps) o.st.push(d); else if (o.st.length < 4e6) for (const d of steps) o.st.push(d); } }
  const f = (o) => ({ resolverMsPerSimS: +((o.wall - o.loco - o.ball) / o.sim).toFixed(1), totalMsPerSimS: +(o.wall / o.sim).toFixed(1), locoMsPerSimS: +(o.loco / o.sim).toFixed(1), ballMsPerSimS: +(o.ball / o.sim).toFixed(1),
    worstStepMs: +o.stepMax.toFixed(1), p999StepMs: +pct(o.st, 0.999).toFixed(2), p99StepMs: +pct(o.st, 0.99).toFixed(2), worstPlanMs: +o.planMax.toFixed(1), plansPerSimS: +(o.plans / o.sim).toFixed(1) });
  per[id] = Object.fromEntries(VERS.map((v) => [v, f(row[v])]));
  console.log(id.padEnd(17), VERS.map((v) => `${v} res ${per[id][v].resolverMsPerSimS} worst step ${per[id][v].worstStepMs} p99.9 ${per[id][v].p999StepMs}`).join(" | ")); }
const g = (o) => ({ resolverMsPerSimS: +((o.wall - o.loco - o.ball) / o.sim).toFixed(1), totalMsPerSimS: +(o.wall / o.sim).toFixed(1), locoMsPerSimS: +(o.loco / o.sim).toFixed(1), ballMsPerSimS: +(o.ball / o.sim).toFixed(1),
  resolverUsPerStep: +(1000 * (o.wall - o.loco - o.ball) / o.steps).toFixed(1), worstStepMs: +o.stepMax.toFixed(1), worstStepAt: o.stepMaxAt, p999StepMs: +pct(o.st, 0.999).toFixed(2), p99StepMs: +pct(o.st, 0.99).toFixed(2),
  stepsOver4msPct: +(100 * o.over4 / o.steps).toFixed(3), stepsOver8msPct: +(100 * o.over8 / o.steps).toFixed(3), stepsOver20msPct: +(100 * o.over20 / o.steps).toFixed(3), worstPlanMs: +o.planMax.toFixed(1), plansPerSimS: +(o.plans / o.sim).toFixed(1) });
const all = Object.fromEntries(VERS.map((v) => [v, g(acc[v])]));
const last = VERS[VERS.length - 1], worst = Object.entries(per).sort((a, b) => b[1][last].resolverMsPerSimS - a[1][last].resolverMsPerSimS)[0];
// 22 players: every player runs TURN-1.2 (+ pose); the dribble resolver runs only for the ACTIVE SET (the player(s) with the ball at their feet)
const proj = Object.fromEntries(VERS.map((v) => { const L = all[v].locoMsPerSimS, R = all[v].resolverMsPerSimS, B = all[v].ballMsPerSimS;
  return [v, { activeDribblerResolver: R, oneDribbler: +(22 * L + B + R).toFixed(0), twoContesting: +(22 * L + B + 2 * R).toFixed(0), allTwentyTwoDribbling: +(22 * (L + R) + B).toFixed(0) }]; }));
proj.unit = "ms of one CPU core per simulated second (1000 = real time); the resolver's share is the active set only";
for (const v of VERS) console.log("ALL", v, JSON.stringify(all[v]));
console.log(`worst ${last} scenario`, worst[0], worst[1][last].resolverMsPerSimS, "ms/sim-s"); console.log("22-player projection", JSON.stringify(proj));
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ node: process.version, seeds: N, repeats: REP, versions: VERS, all, worst: { id: worst[0], ...worst[1] }, projection22: proj, perScenario: per }, null, 1));
