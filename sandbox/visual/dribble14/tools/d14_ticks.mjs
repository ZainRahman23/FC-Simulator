// dribble14/tools/d14_ticks.mjs — THE SPIKE TIMELINE (the owner's DRIBBLE-1.3 review item F): the wall time of every 240 Hz step of one run, per
// core, and for a DRIBBLE-1.3 core the planner's deterministic work units in that step, its tick budget and whether a planning job was running;
// plus the per-step distribution over every scenario × seeds (p50 / p99 / p99.9 / worst, the share over 4 / 8 / 20 ms) and, for DRIBBLE-1.3, the share
// of ticks given the decision-critical budget.
// usage: node d14_ticks.mjs "ID:seed,…" "IDs|all" seeds [vers d12,d13] [out.json]
import fs from "fs"; import { makeSim } from "./d14_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js";
const [runsA = "CUT90_RUN:1", idsA = "all", nA = "2", versA = "d12,d13", outFile] = process.argv.slice(2), VERS = versA.split(",");
const ids = idsA === "all" ? list().map((s) => s.id) : idsA.split(",");
makeSim(get("STRAIGHT_RUN"), { ver: "d14", seed: 1, opts: { record: false } });          // (warm-up, as every measurement: the rig's speed caches)
const one = (id, sd, ver) => { const S = makeSim(get(id), { ver, seed: sd, opts: { record: false } }), st = S.step.bind(S), ms = [], wu = [], bud = [], job = [];
  S.step = function () { const w0 = this.wuTotal ? this.wuTotal() : 0, t = performance.now(), x = st(); ms.push(+(performance.now() - t).toFixed(3));
    if (this.wuTotal) { wu.push(Math.round(this.wuTotal() - w0)); bud.push(this.p13 ? this.wuBud || 0 : 0); job.push(this.job ? 1 : 0); } return x; };
  S.run(); return { S, ms, wu, bud, job }; };
const q = (a, f) => { const s = Float64Array.from(a).sort(); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : null; }, gt = (a, x) => +(100 * a.filter((v) => v > x).length / a.length).toFixed(3);
const out = { node: process.version, timelines: {}, distribution: {} };
for (const r of runsA.split(",")) { const [id, sd] = r.split(":"); out.timelines[r] = {};
  for (const v of VERS) { const o = one(id, +sd, v); out.timelines[r][v] = { stepMs: o.ms, workUnits: o.S.p13 ? o.wu : null, budget: o.S.p13 ? o.bud : null, job: o.S.p13 ? o.job : null, touches: o.S.touches.filter((t) => t.launched).map((t) => t.k), request: (get(id).cmds || []).filter((c) => c.turn != null).map((c) => Math.round(c.t * 240)) };
    console.log(r, v, "worst step", Math.max(...o.ms).toFixed(1), "ms"); } }
for (const v of VERS) { const all = [], wuA = []; let hi = 0, n = 0, worst = 0, at = null;
  for (const id of ids) for (let sd = 1; sd <= +nA; sd++) { const o = one(id, sd, v); for (let i = 0; i < o.ms.length; i++) { all.push(o.ms[i]); if (o.ms[i] > worst) { worst = o.ms[i]; at = `${id} s${sd} t ${(i / 240).toFixed(2)}`; } }
    if (o.S.p13) { wuA.push(...o.wu); hi += o.S.cpu.budgetHiTicks || 0; n += o.S.cpu.budgetTicks || 0; } }
  out.distribution[v] = { steps: all.length, p50: q(all, 0.5), p99: q(all, 0.99), p999: q(all, 0.999), worst, worstAt: at, over4Pct: gt(all, 4), over8Pct: gt(all, 8), over20Pct: gt(all, 20), over50: all.filter((x) => x > 50).length,
    workUnitsPerTick: wuA.length ? { p50: q(wuA, 0.5), p99: q(wuA, 0.99), p999: q(wuA, 0.999), max: Math.max(...wuA) } : null, decisionBudgetTickPct: n ? +(100 * hi / n).toFixed(1) : null };
  console.log(v, JSON.stringify(out.distribution[v])); }
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out));
