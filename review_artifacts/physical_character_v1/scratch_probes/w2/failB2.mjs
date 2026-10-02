import { runB } from "./clB.mjs"; import { printFail } from "./failan.mjs";
const r = runB({ gains: { f0: [0.1, 0.1], cd: [0.3, 0.3], cv: [0.55, 0.25] }, n: 16, T: 0.40, keep: true }); printFail(r);
for (const e of r.LOCO.planner.rhythm.walkerLog) { const a = e.adj; console.log(`k${e.i} decisions: start df ${e.u[0].toFixed(3)} dl ${e.u[1].toFixed(3)} → in-swing ` + a.filter((_, i) => i % 3 === 0).map(q => `τ${q.tau.toFixed(2)}:${q.df.toFixed(2)}/${q.dl.toFixed(2)}`).join(" ")); }
