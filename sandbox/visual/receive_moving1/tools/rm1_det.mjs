// receive_moving1/tools/rm1_det.mjs — RANDOMNESS of moving receives (the receive event's keyed draws, RECEIVE-CONTROL-2's architecture): (1) matched
// counterfactuals — for every moving case and seed the receive touch draws the SAME tendencies at BC 50 … 99 (the key never contains Ball Control, nor the
// receiver's speed) under the SAME key, and the run up to the contact is identical; (2) different seeds draw differently; (3) the key ids.   node rm1_det.mjs <out.json>
import fs from "fs"; import { makeReceiveM, DT } from "./rm1_env.mjs"; import { CASES, parseCase, seedCase } from "../rm1_cases.js";
const BCS = [50, 70, 80, 90, 99], out = { matched: { sets: 0, sameDraws: 0, sameKey: 0, sameRun: 0 }, seeds: { pairs: 0, differ: 0 }, keys: [] };
const run = (id, bc, sd) => { const cs = seedCase(parseCase(id + "_BC" + bc), sd), S = makeReceiveM(cs, { seed: sd }); S.run(Math.min(3.0, cs.scenario.dur)); const c = S.rx.contact, ex = c && c.ex;
  const k1 = c && c.T ? c.T.k : null; return { N: ex ? ex.N : null, key: ex ? ex.keyId : null, run: k1 != null ? JSON.stringify(S.rec.slice(0, k1).map((r) => [r.P[0], r.P[1], r.V[0], r.V[1], r.psi])) : null }; };
for (const c of CASES) { if (/_BC\d+$/.test(c.id) || /STAND/.test(c.id)) continue;
  for (const sd of [1, 2, 3]) { const D = BCS.map((bc) => run(c.id, bc, sd)); if (!D[0].N) continue; out.matched.sets++;
    if (D.every((d) => d.N && d.N.every((x, i) => Object.is(x, D[0].N[i])))) out.matched.sameDraws++;
    if (D.every((d) => d.key === D[0].key)) out.matched.sameKey++;
    if (D.every((d) => d.run === D[0].run)) out.matched.sameRun++;
    if (sd === 1) { const o = run(c.id, 70, 101); out.seeds.pairs++; if (o.N && o.N.some((x, i) => x !== D[1].N[i])) out.seeds.differ++; if (out.keys.length < 4 && D[0].key) out.keys.push(D[0].key); } } }
fs.writeFileSync(process.argv[2] || "rm1_det.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
