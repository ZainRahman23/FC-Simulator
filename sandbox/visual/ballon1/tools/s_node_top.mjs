// speed99/tools/s_node_top.mjs — node's straight full sprint from rest (BALL OFF, the page's defaults), traced like the page's traceFromPress:
// per tick from the first tick with a direction — the request (h, mode), the authoritative speed, the distance (JSON on stdout)
//   node s_node_top.mjs <pace> <heading rad> <dur s>
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
const [pace, h0, dur] = [process.argv[2], +process.argv[3], +process.argv[4]];
const sim = makeSim("TL", { layers: presetLayers("FULL"), ballOn: false, control: "CONTROLLED", attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [52.5, 34], h: 0 }, pace });
for (let k = 0; k < 240; k++) sim.step({ h: null, mode: "SPRINT", keys: 0 });
const k0 = sim.k, P0 = sim.stateAt(k0 * DT).P.slice(), out = { k0, h: [], mode: [], s: [], d: [] };
for (let i = 0; i < Math.round(dur / DT); i++) { sim.step({ h: h0, mode: "SPRINT", keys: 0 }); const st = sim.stateAt(sim.t); out.h.push(h0); out.mode.push("SPRINT"); out.s.push(st.s); out.d.push(Math.hypot(st.P[0] - P0[0], st.P[1] - P0[1])); }
process.stdout.write(JSON.stringify(out));
