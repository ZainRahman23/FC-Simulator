// receive_control2/tools/rc2_det.mjs — RANDOMNESS on the integrated pipeline: (1) matched counterfactuals — for every case and seed the receive
// event's draws are the SAME at BC 50 … 99 (the key never contains Ball Control) and the executed error on each dimension is that draw × σ(BC, D)
// (exact unless a physical cap binds); (2) different seeds differ; (3) one receive event, one key namespace: the same pass resolved as a kill and as
// a turn draws the SAME damping / direction / vertical tendencies (R1, contact 0); (4) the keys are the stand-alone keys (receiver, R<event>, c<contact>).
//   node rc2_det.mjs <out.json>
import fs from "fs"; import { makeReceive2, DT } from "./rc2_env.mjs"; import { CASES, parseCase } from "../rc2_cases.js";
const BCS = [50, 70, 80, 90, 99], out = { matched: { sets: 0, same: 0, proportional: 0, checked: 0, capped: 0, maxRel: 0 }, seeds: { pairs: 0, differ: 0 }, kindIndependent: { pairs: 0, same: 0 }, keys: [] };
const drawsOf = (S) => { const c2 = S.rc2, ep = c2.ep; if (!ep) return null; if (c2.kind === "TURN") return { kind: "TURN", N: ep.N, ex: ep.ex }; const c = ep.contacts[0]; return c ? { kind: "KILL", N: c.N, ex: c.ex } : null; };
for (const c of CASES) { if (c.bc) continue; for (const sd of [1, 2, 3, 4]) { out.matched.sets++; const D = BCS.map((bc) => { const S = makeReceive2(parseCase(c.id + "_BC" + bc), { seed: sd }); S.run(Math.min(3.5, parseCase(c.id).scenario.dur)); return drawsOf(S); });
    const dims = D[0].kind === "TURN" ? ["damping", "weight", "direction", "vertical"] : ["reb", "lat", "third"];
    if (D.every((d) => dims.every((k) => Object.is(d.N[k], D[0].N[k])))) out.matched.same++;
    if (D[0].kind === "TURN") for (const d of D) { out.matched.checked++; if (d.ex.capped) { out.matched.capped++; continue; } let ok = true; for (const k of ["weight", "direction"]) { const want = d.ex.sigma[k] * d.N[k], got = d.ex.eAxes[k], rel = Math.abs(got - want) / Math.max(1e-12, Math.abs(want)); out.matched.maxRel = Math.max(out.matched.maxRel, want === 0 ? 0 : rel); if (rel > 1e-9 && Math.abs(want) > 1e-12) ok = false; } if (ok) out.matched.proportional++; }
    if (sd === 1) { const S2 = makeReceive2(parseCase(c.id + "_BC70"), { seed: 101 }); S2.run(3.5); const d2 = drawsOf(S2); out.seeds.pairs++; if (dims.some((k) => d2.N[k] !== D[1].N[k])) out.seeds.differ++; if (out.keys.length < 3 && D[0].N.key) out.keys.push(D[0].N.key); } } }
// the same pass (12 m/s, the same strike) resolved as a kill (A) and as a 90° turn (D): one event R1, contact 0 → the shared dimensions draw the same
for (const sd of [1, 2, 3, 4, 5]) { const a = makeReceive2(parseCase("A_BC70"), { seed: sd }), d = makeReceive2(parseCase("D_BC70"), { seed: sd }); a.run(2.0); d.run(2.0); const Na = drawsOf(a).N, Nd = drawsOf(d).N; out.kindIndependent.pairs++;
  // the kill model's reb / lat / third are the bounded draws of the dimensions damping / direction / vertical (VAR.dims)
  if (Object.is(Na.reb, Nd.damping) && Object.is(Math.abs(Na.third), Math.abs(Nd.vertical)) && Object.is(Math.abs(Na.lat), Math.abs(Nd.direction))) out.kindIndependent.same++; }
fs.writeFileSync(process.argv[2] || "rc2_det.json", JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
