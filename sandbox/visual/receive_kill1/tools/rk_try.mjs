// receive_kill1/tools/rk_try.mjs — quick look at conditions: node rk_try.mjs '<cond json>' …
import { matched, DT } from "../rk_sim.js";
import { BC_STEPS } from "../rk_model.js";
const conds = process.argv.slice(2).map((s) => JSON.parse(s));
for (const c of conds) {
  const M = matched(Object.assign({ example: "TYPICAL" }, c), BC_STEPS), P = M.prep, pl = P.plan;
  console.log("\n=== " + JSON.stringify(c), "| solve", P.sol.kind, "K", P.sol.K, "res p", P.sol.residual.p.toExponential(1), "v", P.sol.residual.v.toExponential(1), "it", P.sol.iterations, "ms", P.sol.solveMs.toFixed(1));
  if (pl.none) { console.log("NO FEASIBLE ACTION", JSON.stringify(pl.rej)); continue; }
  console.log("plan", pl.sf.key, "t", (pl.k * DT).toFixed(3), "contact", pl.st.p.map((x) => x.toFixed(2)).join(","), "shift", pl.shift.map((x) => x.toFixed(2)).join(","), "D", pl.dif.D.toFixed(3), JSON.stringify(Object.fromEntries(Object.entries(pl.dif.parts).map(([k, v]) => [k, +v.toFixed(3)]))), "vEff", pl.dif.vEff.toFixed(2));
  console.log("alts", pl.alts.slice(0, 5).map((a) => `${a.key}:${a.J}`).join(" "), "| ideal v", P.ideal.v.map((x) => x.toFixed(2)).join(","), P.ideal.kind, "cap+", P.ideal.capExtra.toFixed(2), "| ideal d1", P.idealRun && (() => { const r = P.idealRun.rec.find((x) => x.i >= 240); return r.p.map((x) => x.toFixed(2)).join(","); })());
  for (const r of M.rows) { const m = r.m; console.log(`  BC${String(r.bc).padStart(2)} E ${r.ex.sig.E.toFixed(4)} σreb ${r.ex.sig.reb.toFixed(2)} | resid ${m.resid.toFixed(2)} (ideal ${m.residIdeal.toFixed(2)}) d.25 ${m["d0.25"].toFixed(2)} d.5 ${m["d0.5"].toFixed(2)} d1 ${m["d1"].toFixed(2)} d* ${m.dStar.toFixed(2)} lat1 ${m["lat1"].toFixed(2)} vert ${m.vertErr.toFixed(2)} final ${m.dFinal.toFixed(2)} ${m.state}${r.ex.capped ? " cap:" + r.ex.capped : ""} ${m.launched}`); }
}
