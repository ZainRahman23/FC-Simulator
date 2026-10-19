// receive_moving1/tools/rm1_diag.mjs — one case's planning trace: the meeting estimate, the chosen contact tick, the contact speed (timing vs bounds)
//   node rm1_diag.mjs <caseId> [seed]
import { makeReceiveM, DT } from "./rm1_env.mjs"; import { parseCase, seedCase } from "../rm1_cases.js"; import { momentum } from "./rm1_metrics.mjs";
const id = process.argv[2], sd = +(process.argv[3] || 1), cs = seedCase(parseCase(id), sd), S = makeReceiveM(cs, { seed: sd }); let last = null;
S.dbgCand = (c) => { if (!c.stage) last = c; };
const plan0 = S.planAction.bind(S); S.planAction = (k) => { const b = plan0(k); if (b) console.log(`k ${k} est.k ${S.rx.est.k} (t ${(S.rx.est.t).toFixed(2)}) → ${b.fam.id} ${b.F} kc ${b.kc} (Δ ${((b.kc - S.rx.est.k) * DT).toFixed(3)} s) sC ${b.sC.toFixed(2)} s0 ${Math.hypot(b.V0[0], b.V0[1]).toFixed(2)} score ${b.score.toFixed(3)}`); return b; };
S.run(cs.scenario.dur); console.log(JSON.stringify(momentum(S)));
