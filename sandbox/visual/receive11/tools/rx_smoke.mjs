import { makeReceive, DT } from "./rx_env.mjs"; import { parseCase, seedCase } from "../rx_cases.js";
const ids = (process.argv[2] || "F_0_RUN_MED").split(","), seed = +(process.argv[3] || 1);
for (const id of ids) { const cs = seedCase(parseCase(id), seed), t0 = performance.now(), S = makeReceive(cs, { seed }); S.run(); const ms = performance.now() - t0;
  const sm = S.summary(), T = S.touches.filter((t) => t.launched);
  console.log(id, "seed", seed, (ms).toFixed(0) + " ms", "fault:", S.fault ? S.fault.message : "-", "launched touches:", T.length, "ctrl end:", S.ctrl.state);
  console.log(JSON.stringify(sm.action)); console.log(JSON.stringify(sm.contact)); console.log(JSON.stringify(sm.handoff)); console.log("rej", JSON.stringify(sm.rej), "plans", sm.plans, "cands", sm.cands, "cpu", JSON.stringify(sm.cpu));
  console.log("log", JSON.stringify(S.rx.log.filter(e => e.ev !== "approach").slice(0, 8)));
  const last = S.rec[S.rec.length - 1]; console.log("end: P", last.P.map(x => x.toFixed(2)), "V", Math.hypot(...last.V).toFixed(2), "ball", last.ball.p.map(x => x.toFixed(2)), "touches", T.map(t => `${(t.k*DT).toFixed(2)}${t.F}${t.reg}${t.receive ? "*" : ""}`).join(" "));
}
