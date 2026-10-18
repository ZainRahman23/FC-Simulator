// receive_kill11/tools/rk_ep.mjs — quick look at control episodes: node rk_ep.mjs '<cond>' … [env DRAW=TYPICAL|seed3]
import { prepare, runEpisode, runBC, firstContact, drawsFor, DT } from "../rk_sim.js";
import { BC_STEPS } from "../rk_model.js";
const d = process.env.DRAW || "TYPICAL", spec = d.startsWith("seed") ? { seed: +d.slice(4) } : { example: d };
for (const a of process.argv.slice(2)) { const c = JSON.parse(a), P = prepare(c); if (P.plan.none) { console.log(a, "none"); continue; }
  console.log(`\n=== ${a} ${P.plan.sf.key} D ${P.plan.dif.D.toFixed(2)} contact t ${(P.kc * DT).toFixed(2)} z ${P.contact[2].toFixed(2)}`);
  for (const bc of BC_STEPS) { const ep = runEpisode(P, bc, spec), m = ep.m, r1 = runBC(P, bc, drawsFor(Object.assign({}, spec, { event: "kill1" })), { post: 2.2 }), fc = firstContact(P, r1.ex, r1.run);
    console.log(`BC${String(bc).padStart(2)} 1st: v ${fc.speed.toFixed(2)} (id ${fc.idealSpeed.toFixed(2)}) dv ${fc.velErr.toFixed(2)} e.1 ${fc["e0.1"].toFixed(2)} e.25 ${fc["e0.25"].toFixed(2)} e.5 ${fc["e0.5"].toFixed(2)} e1 ${fc["e1"].toFixed(2)} e2 ${fc["e2"].toFixed(2)} drop ${fc.dropErr == null ? "–" : fc.dropErr.toFixed(2)} | ep: n ${m.contacts} ${m.followSurfaces.join(",")} tF ${m.tFollow == null ? "–" : m.tFollow.toFixed(2)} adj ${m.adjust.toFixed(2)} xAdj ${m.extraAdj.toFixed(2)} xT ${m.extraT == null ? '–' : m.extraT.toFixed(2)} tSt ${m.tStable == null ? "–" : m.tStable.toFixed(2)} dSt ${m.dStable == null ? "–" : m.dStable.toFixed(2)} ${m.continuation} ${ep.launched.join("/")} ${ep.notes.join("; ")}`); } }
